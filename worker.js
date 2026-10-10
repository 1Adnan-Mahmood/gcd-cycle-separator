import {parseText,selectData,separate,automaticThreshold,wideLines,makeBatches} from './core.js';
let parsed,rows,result;
self.onmessage=({data})=>{try{
  if(data.action==='parse'){parsed=parseText(data.text,data.delimiter);rows=null;result=null;self.postMessage({type:'parsed',headers:parsed.headers,count:parsed.rows.length});}
  if(data.action==='separate'){
    const selected=selectData(parsed,data.timeColumn,data.voltageColumn);rows=selected.rows;
    let observedMin=Infinity,observedMax=-Infinity;for(const r of rows){observedMin=Math.min(observedMin,r.v);observedMax=Math.max(observedMax,r.v);}
    const lower=data.windowMin??observedMin,upper=data.windowMax??observedMax;
    if(!Number.isFinite(lower)||!Number.isFinite(upper)||upper<=lower)throw Error('Window maximum must be greater than minimum.');
    const threshold=data.threshold==null?(data.windowMin!=null||data.windowMax!=null?(upper-lower)*.2:automaticThreshold(rows)):data.threshold;result=separate(rows,threshold,{windowMin:data.windowMin,windowMax:data.windowMax,eStep:data.eStep});
    const sample=[];const step=Math.max(1,Math.ceil(rows.length/3000));for(let i=0;i<rows.length;i+=step)sample.push([i,rows[i].v]);sample.push([rows.length-1,rows.at(-1).v]);
    self.postMessage({type:'result',cycles:result.cycles,count:rows.length,skipped:selected.skipped,threshold,observedMin,observedMax,batches:makeBatches(result.cycles.length),sample,cuts:result.cuts});
  }
  if(data.action==='preview'){
    const cycles=result.cycles.slice(data.start,Math.min(data.start+4,data.end??result.cycles.length));let max=0;for(const c of cycles)max=Math.max(max,c.end-c.start);
    const cells=[];for(let j=data.rowStart;j<Math.min(max,data.rowStart+5000);j++)cells.push(cycles.flatMap((c,ci)=>{const r=j<c.end-c.start?rows[c.start+j]:null;return r?[...(ci?['']:[]),data.reset?String(Number((r.t-rows[c.start].t).toPrecision(15))):r.rawT,r.rawV]:[...(ci?['']:[]),'',''];}));
    self.postMessage({type:'preview',cells,start:data.start,rowStart:data.rowStart,max,cycleCount:cycles.length});
  }
  if(data.action==='export'){
    const from=data.cycle??data.from??0,to=data.cycle!=null?data.cycle+1:(data.to??result.cycles.length);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<=from||to>result.cycles.length)throw Error('Choose a valid cycle range.');
    if(to-from>3000)throw Error('Export one group of up to 3,000 cycles. Select a group before copying or downloading.');
    const cycles=result.cycles.slice(from,to);
    const chunks=[];let size=0,buffer='';const limit=data.copy?20_000_000:150_000_000;
    for(const line of wideLines(rows,cycles,{reset:data.reset,delimiter:data.copy?'\t':',',offset:from})){
      size+=line.length;if(size>limit)throw Error(data.copy?'Too much data for clipboard. Download CSV or copy one cycle.':'Wide CSV exceeds 150 MB. Download individual cycles or reduce the input.');
      buffer+=line;if(buffer.length>1_000_000){chunks.push(buffer);buffer='';}
    }
    chunks.push(buffer);
    self.postMessage(data.copy?{type:'export',text:chunks.join(''),copy:true}:{type:'export',blob:new Blob(chunks,{type:'text/csv;charset=utf-8'}),copy:false,cycle:data.cycle,from,to});
  }
}catch(e){self.postMessage({type:'error',message:e.message});}};
