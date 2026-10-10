import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseText,selectData,separate,automaticThreshold,wideLines,makeBatches} from '../core.js';
function experiment(n){let rows=[],t=0;for(let c=0;c<n;c++){for(let j=0;j<10;j++)rows.push({t:t++,v:j/10,rawT:String(t-1),rawV:String(j/10)});for(let j=10;j>0;j--)rows.push({t:t++,v:j/10,rawT:String(t-1),rawV:String(j/10)});}rows.push({t,v:0,rawT:String(t),rawV:'0'});return rows;}
test('three cycles with no missing or duplicated rows',()=>{const rows=experiment(3),r=separate(rows,.2);assert.equal(r.cycles.length,3);assert.deepEqual(r.cuts,[20,40]);assert.deepEqual(r.cycles.flatMap((c,i)=>rows.slice(c.start+(i?1:0),c.end)),rows);for(let i=1;i<r.cycles.length;i++)assert.equal(r.cycles[i-1].end-1,r.cycles[i].start);});
test('ten thousand cycles',()=>{const rows=experiment(10000),r=separate(rows,automaticThreshold(rows));assert.equal(r.cycles.length,10000);assert.equal(r.cycles.reduce((n,c)=>n+c.end-c.start,0),rows.length+9999);});
test('small fluctuations do not create false cycles',()=>{const rows=experiment(3);rows.forEach((r,i)=>r.v+=i%2?.004:-.004);assert.equal(separate(rows,.2).cycles.length,3);});
test('recording begins during discharge',()=>{const rows=experiment(3).slice(15);assert.equal(separate(rows,.2).cycles.length,3);});
test('monotonic and constant recordings remain one segment',()=>{assert.equal(separate(experiment(1).slice(0,8),.2).cycles.length,1);assert.equal(separate([{v:0},{v:0},{v:0}],.2).cycles.length,1);});
test('quoted headers, BOM, tab and scientific notation',()=>{const p=parseText('\uFEFF"Time", "Potential"\r\n0,1e-3\r\n1,0.2\r\n2,0.3');assert.equal(selectData(p,0,1).rows[0].v,.001);assert.deepEqual(parseText('0\t.1\n1\t.2').headers,['Column 1','Column 2']);});
test('bad selected rows are explicitly counted',()=>{const p=parseText('t,v\n0,0\n1,\n2,0.1\n3,0.2');assert.equal(selectData(p,0,1).skipped,1);});
test('wide export preserves exact text with blank columns',()=>{const rows=experiment(2);const r=separate(rows,.2);const lines=[...wideLines(rows,r.cycles)];assert.equal(lines[0],'Cycle 1 Time\tCycle 1 Potential\t\tCycle 2 Time\tCycle 2 Potential\n');assert.equal(lines[1],'0\t0\t\t20\t0\n');assert.equal(lines.at(-1),'20\t0\t\t40\t0\n');assert.equal(rows[r.cycles[0].end-1].v,0);assert.equal(rows[r.cycles[1].start].v,0);});
test('invalid settings rejected',()=>{assert.throws(()=>separate(experiment(1),0));assert.throws(()=>selectData(parseText('t,v\n0,0'),0,0));assert.throws(()=>parseText(''));});

test('E-step tolerance accepts near-window peaks and troughs plus overshoots',()=>{for(const [peak,low]of [[.397,.003],[.399,-.002],[.4004,-.004]]){const vs=[0,.2,peak,.2,low,.2,peak,.2,low];const rows=vs.map(v=>({v}));const r=separate(rows,.08,{windowMin:0,windowMax:.4,eStep:.004});assert.equal(r.cycles.length,2);assert.equal(r.cycles[0].end-1,r.cycles[1].start);}});
test('small reversals away from window endpoints do not count as full cycles',()=>{const rows=[0,.2,.399,.2,.1,.2,.399,.2,0].map(v=>({v}));assert.equal(separate(rows,.08,{windowMin:0,windowMax:.4,eStep:.004}).cycles.length,1);});

test('mandatory grouping at 3000-cycle boundary',()=>{assert.deepEqual(makeBatches(3000),[{from:0,to:3000}]);assert.deepEqual(makeBatches(3001),[{from:0,to:3000},{from:3000,to:3001}]);assert.deepEqual(makeBatches(10000),[{from:0,to:3000},{from:3000,to:6000},{from:6000,to:9000},{from:9000,to:10000}]);});
