import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeBatches} from '../core.js';

// DOM adapter checks page transitions and export scope without a browser.
function harness(){
  class Element{
    constructor(){this.value='';this.hidden=false;this.disabled=false;this.children=[];this.classList={toggle(){},add(){},remove(){}};this.clientWidth=900;this.checked=false;}
    append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
    replaceChildren(...nodes){this.children=[];this.append(...nodes);}
    get options(){return this.children;}
    getContext(){return new Proxy({},{get:()=>()=>{}});}
  }
  const nodes=new Map([...fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
  const created=[];const document={getElementById:id=>nodes.get(id)??created.find(n=>n.id===id),createElement:()=>{const node=new Element();created.push(node);return node;}};
  nodes.get('run').parentNode=new Element();let worker;const requests=[];
  class Worker{constructor(){worker=this;}postMessage(d){requests.push(d);}}
  const context=vm.createContext({document,Worker,Option:class extends Element{constructor(label,value){super();this.textContent=label;this.value=value;}},window:{scrollTo(){},addEventListener(){},devicePixelRatio:1},console,Number,Math,URL,Blob,setTimeout});
  vm.runInContext(fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),context);
  const get=id=>document.getElementById(id);
  const result=async n=>{get('time').append(new Element());await worker.onmessage({data:{type:'result',cycles:Array.from({length:n},(_,i)=>({start:i*10,end:i*10+11})),count:n*10+1,threshold:.08,skipped:0,observedMin:0,observedMax:.4,batches:makeBatches(n),sample:[[0,0],[n*10,.4]],cuts:[]}});};
  return {get,result,requests};
}
test('small experiment goes straight to review; large experiment requires group selection',async()=>{
  for(const n of [3,3000,3001,10000]){const {get,result}=harness();get('expectedCount').value=String(n);get('begin').onclick();assert.equal(get('dataPage').hidden,false);await result(n);assert.equal(get('results').hidden,n>3000);assert.equal(get('batchesPage').hidden,n<=3000);if(n>3000){assert.equal(get('groupCards').children.length,Math.ceil(n/3000));get('groupCards').children[0].onclick();assert.equal(get('results').hidden,false);}}
});
test('global jump switches groups and copies are scoped to the active group',async()=>{
  const {get,result,requests}=harness();get('expectedCount').value='10000';get('begin').onclick();await result(10000);get('groupCards').children[0].onclick();get('jumpCycle').value='4000';get('jump').onclick();assert.equal(get('activeGroup').value,'1');assert.equal(get('single').value,'3999');assert.equal(requests.at(-1).start,3999);assert.equal(requests.at(-1).end,6000);get('copyAll').onclick();assert.equal(requests.at(-1).from,3000);assert.equal(requests.at(-1).to,6000);
});
test('expected count mismatches are visible and actual count controls grouping',async()=>{
  const {get,result}=harness();get('expectedCount').value='3';get('begin').onclick();await result(10000);assert.equal(get('batchesPage').hidden,false);assert.match(get('status').textContent,/3 expected cycles, but 10,000/);assert.equal(get('groupCards').children.length,4);
});
