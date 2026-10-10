const $=id=>document.getElementById(id);
$('motionToggle').onclick=()=>{const button=$('motionToggle'),paused=button.getAttribute('aria-pressed')!=='true';document.body.classList.toggle('motion-paused',paused);button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'Resume animation':'Pause animation';button.setAttribute('aria-label',paused?'Resume background animation':'Pause background animation');};
const worker=new Worker('./worker.js',{type:'module'});
let cycles=[],start=0,rowStart=0,rowMax=0,trace=null,currentText='',busy=false,expected=0,groups=[],groupIndex=0;
const active=()=>groups[groupIndex]??{from:0,to:cycles.length};
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
function pending(value){busy=value;for(const id of ['run','copyAll','download','copySingle','downloadSingle','copyBatch','downloadBatch'])$(id).disabled=value||!$('time').options.length;}
function request(data){if(busy)return;pending(true);status('Processing…');worker.postMessage(data);}
function preview(){worker.postMessage({action:'preview',start,end:active().to,rowStart,reset:false});}
function invalidate(){if($('continueReview'))$('continueReview').hidden=true;cycles=[];groups=[];trace=null;$('results').hidden=true;$('batchesPage').hidden=true;$('fallback').hidden=true;}
function load(text){currentText=text;invalidate();request({action:'parse',text,delimiter:$('delimiter').value==='tab'?'\t':$('delimiter').value});}
async function readFile(file){if(!file||busy)return;if(file.size>50*1024*1024){status('File exceeds 50 MB. Export a smaller file.',true);return;}try{load(await file.text());}catch(e){status(e.message,true);}}

function screen(page){
  for(const id of ['startPage','dataPage','batchesPage','results'])$(id).hidden=id!==page;
  const step=page==='startPage'?'stepStart':page==='dataPage'?'stepData':'stepReview';
  for(const id of ['stepStart','stepData','stepReview'])$(id).classList.toggle('active',id===step);
  window.scrollTo({top:0,behavior:'smooth'});
}
function begin(){
  if(busy)return;const n=Number($('expectedCount').value);
  if(!Number.isInteger(n)||n<1){status('Enter a positive whole number of expected cycles.',true);return;}
  expected=n;
  $('welcome').textContent=n<=3000?'You’re ready! Place your data below, separate your cycles, and enjoy exploring your electrochemical experiment.':`Your ${n.toLocaleString()} expected cycles will be organised into ${Math.ceil(n/3000)} groups of up to 3,000. Place your complete data below; we’ll find the cycle boundaries before creating the groups.`;
  screen('dataPage');status('Load a file or try the sample to begin.');
}
$('begin').onclick=begin;$('expectedCount').onkeydown=e=>{if(e.key==='Enter')begin();};
$('backPlan').onclick=()=>{if(!busy)screen('startPage');};
for(const id of ['backData','editData'])$(id).onclick=()=>{if(!busy){screen('dataPage');status('Adjust your settings and separate again, or use Continue to review to return to existing results.');}};
$('chooseGroup').onclick=()=>{if(!busy)screen('batchesPage');};
function activateGroup(index,cycle=null){
  if(busy)return;groupIndex=index;const g=active();start=cycle??g.from;rowStart=0;
  $('activeGroup').value=String(index);$('jumpCycle').value=start+1;$('jumpCycle').max=cycles.length;
  $('batchFrom').value=g.from+1;$('batchTo').value=g.to;
  for(const id of ['batchFrom','batchTo']){$(id).min=g.from+1;$(id).max=g.to;}
  $('single').replaceChildren(...cycles.slice(g.from,g.to).map((_,i)=>new Option(`Cycle ${g.from+i+1}`,String(g.from+i))));$('single').value=String(start);
  $('activeRange').textContent=`GROUP ${index+1} OF ${groups.length} · CYCLES ${g.from+1}–${g.to}`;
  $('readyMessage').textContent=`Your data is organised! Review cycles ${(g.from+1).toLocaleString()}–${g.to.toLocaleString()}, copy or download them, and continue with your electrochemical interpretation. Happy exploring!`;
  $('chooseGroup').hidden=groups.length===1;$('activeGroup').disabled=groups.length===1;
  $('excelWarning').textContent=`This group contains ${g.to-g.from} cycles and ${(g.to-g.from)*3-1} columns, including blank separators. All exports on this page use the active group.`;
  $('fallback').hidden=true;screen('results');draw();preview();
}
$('activeGroup').onchange=()=>{if(!busy)activateGroup(Number($('activeGroup').value));};
function groupPlan(){
  $('groupMessage').textContent=`${cycles.length.toLocaleString()} cycle segments detected. We’ve created ${groups.length} groups: ${groups.map(g=>(g.to-g.from).toLocaleString()).join(' + ')} cycles. Choose a group to review.`;
  $('groupCards').replaceChildren(...groups.map((g,i)=>{const button=document.createElement('button');button.className='group-card';const title=document.createElement('small');title.textContent=`GROUP ${i+1}`;const range=document.createElement('strong');range.textContent=`Cycles ${g.from+1}–${g.to}`;const count=document.createElement('small');count.textContent=`${(g.to-g.from).toLocaleString()} cycles · Review & export →`;button.append(title,range,count);button.onclick=()=>activateGroup(i);return button;}));
  $('activeGroup').replaceChildren(...groups.map((g,i)=>new Option(`Group ${i+1}: ${g.from+1}–${g.to}`,String(i))));
}
const continueButton=document.createElement('button');continueButton.id='continueReview';continueButton.className='secondary';continueButton.textContent='Continue to review →';continueButton.hidden=true;continueButton.onclick=()=>{if(!busy&&cycles.length){if(groups.length>1)screen('batchesPage');else activateGroup(0);}};$('run').parentNode.append(continueButton);
screen('startPage');

$('file').onchange=e=>readFile(e.target.files[0]);
$('drop').ondragover=e=>{e.preventDefault();$('drop').classList.add('over');};
$('drop').ondragleave=()=>$('drop').classList.remove('over');
$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('over');readFile(e.dataTransfer.files[0]);};
$('loadPaste').onclick=()=>load($('paste').value);
$('delimiter').onchange=()=>{if(currentText&&!busy)load(currentText);};
$('demo').onclick=()=>{if(busy)return;let text='Time,Potential\n',t=0;for(let c=0;c<3;c++){for(let i=0;i<50;i++)text+=`${t++},${(i*.008).toFixed(4)}\n`;for(let i=50;i>0;i--)text+=`${t++},${(i*.008).toFixed(4)}\n`;}text+=`${t},0\n`;$('delimiter').value='auto';load(text);};
for(const id of ['time','voltage','threshold','windowMin','windowMax','eStep'])$(id).onchange=()=>{invalidate();status('Settings changed. Separate cycles again.');};
$('run').onclick=()=>{invalidate();request({action:'separate',timeColumn:Number($('time').value),voltageColumn:Number($('voltage').value),threshold:$('threshold').value===''?null:Number($('threshold').value),windowMin:$('windowMin').value===''?null:Number($('windowMin').value),windowMax:$('windowMax').value===''?null:Number($('windowMax').value),eStep:$('eStep').value===''?null:Number($('eStep').value)});};
$('reset').onchange=()=>{if(cycles.length)preview();};
function jumpToCycle(){if(busy||!cycles.length)return;const n=Number($('jumpCycle').value);if(!Number.isInteger(n)||n<1||n>cycles.length){status(`Enter a whole cycle number between 1 and ${cycles.length.toLocaleString()}.`,true);return;}activateGroup(Math.floor((n-1)/3000),n-1);status(`Showing cycle ${n.toLocaleString()} onward. Copy cycle will copy cycle ${n.toLocaleString()} in full.`);}
$('jump').onclick=jumpToCycle;
$('jumpCycle').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jumpToCycle();}};
$('single').onchange=()=>{$('jumpCycle').value=Number($('single').value)+1;jumpToCycle();};
$('prev').onclick=()=>{start=Math.max(active().from,start-4);rowStart=0;preview();};
$('next').onclick=()=>{start=Math.min(active().to-1,start+4);rowStart=0;preview();};
$('prevRows').onclick=()=>{rowStart=Math.max(0,rowStart-5000);preview();};
$('nextRows').onclick=()=>{rowStart+=5000;preview();};
for(const [id,copy,single] of [['copyAll',true,false],['download',false,false],['copySingle',true,true],['downloadSingle',false,true]])$(id).onclick=()=>{if(cycles.length)request({action:'export',copy,cycle:single?Number($('single').value):null,from:active().from,to:active().to,reset:false});};
for(const [id,copy] of [['copyBatch',true],['downloadBatch',false]])$(id).onclick=()=>{if(!cycles.length)return;const from=Number($('batchFrom').value)-1,to=Number($('batchTo').value),g=active();if(!Number.isInteger(from)||!Number.isInteger(to)||from<g.from||to>g.to||to<=from){status(`Choose a cycle range within the active group: ${g.from+1}–${g.to}.`,true);return;}request({action:'export',copy,from,to,reset:false});};
$('selectText').onclick=()=>{$('copyText').focus();$('copyText').select();};
worker.onerror=()=>{pending(false);status('The processing worker could not start. Open the app through http://localhost:3000, not by double-clicking index.html.',true);};
worker.onmessage=async({data:d})=>{
  if(d.type==='error'){pending(false);status(d.message,true);return;}
  if(d.type==='parsed'){
    for(const id of ['time','voltage']){$(id).replaceChildren(...d.headers.map((h,i)=>new Option(h,String(i))));$(id).disabled=false;}
    let ti=d.headers.findIndex(h=>/time/i.test(h)),vi=d.headers.findIndex(h=>/potential|voltage|ewe/i.test(h));
    ti=ti<0?0:ti;vi=vi<0?(ti===0?1:0):vi;if(vi===ti)vi=ti===0?1:0;$('time').value=ti;$('voltage').value=vi;
    $('fileInfo').textContent=`${d.count.toLocaleString()} input rows · ${d.headers.length} columns`;pending(false);status('Measurements loaded. Check your columns and separate cycles.');
  }
  if(d.type==='result'){
    pending(false);cycles=d.cycles;start=0;rowStart=0;trace=d;groups=d.batches;groupIndex=0;
    $('observedWindow').textContent=`Your observed potential window ranges from ${d.observedMin} to ${d.observedMax} (input potential units). Original measurements are preserved.`;
    $('cycleCount').textContent=cycles.length.toLocaleString();$('pointCount').textContent=d.count.toLocaleString();$('usedThreshold').textContent=Number(d.threshold.toPrecision(4));
    groupPlan();$('continueReview').hidden=false;
    const mismatch=expected!==cycles.length?`You entered ${expected.toLocaleString()} expected cycles, but ${cycles.length.toLocaleString()} segments were detected. Review the settings and trace; grouping uses the detected count. `:'';
    status(`${mismatch}${d.skipped?`${d.skipped} invalid rows were skipped. `:''}${cycles.length===1?'No internal boundaries detected. Check the threshold and potential column.':'Review the trace and boundary count before interpreting results.'}`,Boolean(mismatch)||d.skipped>0);
    if(groups.length>1)screen('batchesPage');else activateGroup(0);
  }
  if(d.type==='preview'){
    rowMax=d.max;const head=document.createElement('thead'),tr=document.createElement('tr');
    for(let i=0;i<d.cycleCount;i++){if(i){const gap=document.createElement('th');gap.textContent='';tr.append(gap);}for(const label of ['Time','Potential']){const th=document.createElement('th');th.textContent=`Cycle ${d.start+i+1} ${label}`;tr.append(th);}}head.append(tr);
    const body=document.createElement('tbody');for(const cells of d.cells){const tr=document.createElement('tr');for(const value of cells){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}$('table').replaceChildren(head,body);
    $('range').textContent=`CYCLES ${d.start+1}–${d.start+d.cycleCount} · ROWS ${d.rowStart+1}–${d.rowStart+d.cells.length}`;
    $('prev').disabled=start===active().from;$('next').disabled=start+4>=active().to;$('prevRows').disabled=rowStart===0;$('nextRows').disabled=rowStart+5000>=rowMax;
  }
  if(d.type==='export'){
    pending(false);
    if(d.copy){try{await navigator.clipboard.writeText(d.text);status('All requested data copied. Paste into Excel, Origin or another spreadsheet.');$('fallback').hidden=true;}catch{$('fallback').hidden=false;$('copyText').value=d.text;$('copyText').focus();$('copyText').select();status('Select the text below and press Ctrl+C to copy.');}}
    else{const url=URL.createObjectURL(d.blob),a=document.createElement('a');a.href=url;a.download=d.cycle==null?`gcd-cycles-${d.from+1}-${d.to}.csv`:`gcd-cycle-${d.cycle+1}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('CSV download prepared.');}
  }
};
function draw(){if(!trace)return;const canvas=$('chart'),ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=220,dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);const sample=trace.sample;let lo=Infinity,hi=-Infinity;for(const [,v]of sample){lo=Math.min(lo,v);hi=Math.max(hi,v);}const pad=(hi-lo)*.08||.01;lo-=pad;hi+=pad;const x=i=>50+i/(trace.count-1)*(w-65),y=v=>15+(hi-v)/(hi-lo)*(h-40);
 ctx.font='11px system-ui';for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;ctx.strokeStyle='#e5ecf4';ctx.beginPath();ctx.moveTo(50,y(v));ctx.lineTo(w-15,y(v));ctx.stroke();ctx.fillStyle='#697f97';ctx.fillText(v.toFixed(3),2,y(v)+4);}
 ctx.strokeStyle='#7795b8';ctx.setLineDash([3,4]);for(const cut of trace.cuts){ctx.beginPath();ctx.moveTo(x(cut),15);ctx.lineTo(x(cut),h-25);ctx.stroke();}ctx.setLineDash([]);ctx.lineWidth=1.7;for(let j=1;j<sample.length;j++){const [pi,pv]=sample[j-1],[i,v]=sample[j];ctx.strokeStyle=v>=pv?'#087f8c':'#d38b19';ctx.beginPath();ctx.moveTo(x(pi),y(pv));ctx.lineTo(x(i),y(v));ctx.stroke();}ctx.fillStyle='#697f97';ctx.fillText('0',50,h-5);ctx.fillText(String(trace.count-1),w-65,h-5);
}
window.addEventListener('resize',draw);
