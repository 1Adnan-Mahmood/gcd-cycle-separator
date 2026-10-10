export function parseText(text, delimiter='auto') {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length) throw Error('The file is empty.');
  if(delimiter==='auto') delimiter=lines[0].includes('\t')?'\t':lines[0].includes(';')?';':lines[0].includes(',')?',':'space';
  const split=line=>{
    if(delimiter==='space')return line.trim().split(/\s+/);
    let fields=[],value='',quoted=false;
    for(let i=0;i<line.length;i++) {const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){fields.push(value.trim());value='';}else value+=c;}
    if(quoted)throw Error('Unclosed quote. Multiline quoted cells are not supported.');
    fields.push(value.trim());return fields;
  };
  const first=split(lines[0]);
  const numeric=s=>s!==''&&Number.isFinite(Number(s));
  const hasHeader=!first.every(numeric);
  const headers=hasHeader?first:first.map((_,i)=>`Column ${i+1}`);
  if(headers.length<2)throw Error('At least two columns are required. Select the correct delimiter.');
  const rows=lines.slice(hasHeader?1:0).map(split);
  return {headers,rows};
}
export function selectData(parsed, timeColumn, voltageColumn) {
  if(timeColumn===voltageColumn)throw Error('Choose different time and potential columns.');
  const rows=[];let skipped=0;
  for(const row of parsed.rows){const t=row[timeColumn],v=row[voltageColumn];if(t==null||v==null||t===''||v===''||!Number.isFinite(Number(t))||!Number.isFinite(Number(v))){skipped++;continue;}rows.push({t:Number(t),v:Number(v),rawT:t,rawV:v});}
  if(rows.length<3)throw Error('At least three valid numeric measurements are required.');
  return {rows,skipped};
}
// Hysteresis: confirm a trough only after both a substantial fall and rise.
// Adjacent cycles intentionally share the original discharge-minimum row.
export function separate(rows, threshold, {windowMin=null,windowMax=null,eStep=null}={}) {
  if(!(threshold>0&&Number.isFinite(threshold)))throw Error('Voltage reversal threshold must be greater than zero.');
  if(eStep!=null&&!(Number.isFinite(eStep)&&eStep>0))throw Error('E step must be greater than zero in input potential units.');
  const tolerance=eStep??((windowMax!=null&&windowMin!=null)?(windowMax-windowMin)*.01:0);
  let mode='unknown',low=rows[0].v,high=low,lowIndex=0;const cuts=[];
  for(let i=1;i<rows.length;i++) {
    const v=rows[i].v;
    if(mode==='unknown'){
      if(v<low){low=v;lowIndex=i;}if(v>high)high=v;
      if(v-low>=threshold){mode='up';high=v;}else if(high-v>=threshold){mode='down';low=v;lowIndex=i;}
    }else if(mode==='up'){
      if(v>high)high=v;
      if(high-v>=threshold){mode='down';low=v;lowIndex=i;}
    }else{
      if(v<low){low=v;lowIndex=i;}
      if(v-low>=threshold){if(lowIndex>0&&(windowMax==null||high>=windowMax-tolerance)&&(windowMin==null||low<=windowMin+tolerance))cuts.push(lowIndex);mode='up';high=v;}
    }
  }
  const bounds=[0,...cuts,rows.length];
  return {cuts,cycles:bounds.slice(0,-1).map((start,i)=>({start,end:i<cuts.length?bounds[i+1]+1:rows.length}))};
}
export function automaticThreshold(rows){
  const sample=[];const stride=Math.max(1,Math.floor(rows.length/50000));
  for(let i=0;i<rows.length;i+=stride)sample.push(rows[i].v);
  sample.sort((a,b)=>a-b);
  const range=sample[Math.floor((sample.length-1)*.99)]-sample[Math.floor((sample.length-1)*.01)];
  if(range<=0)throw Error('No usable voltage range. Enter a manual threshold or check the potential column.');
  return range*.2;
}
export function makeBatches(count,size=3000){
  if(!Number.isInteger(count)||count<1||!Number.isInteger(size)||size<1)throw Error('Batch sizes and cycle counts must be positive whole numbers.');
  const groups=[];for(let from=0;from<count;from+=size)groups.push({from,to:Math.min(from+size,count)});return groups;
}
export function* wideLines(rows,cycles,{reset=false,delimiter='\t',offset=0}={}){
  yield cycles.flatMap((_,i)=>[...(i?['']:[]),`Cycle ${i+offset+1} Time`,`Cycle ${i+offset+1} Potential`]).join(delimiter)+'\n';
  let length=0;for(const c of cycles)length=Math.max(length,c.end-c.start);
  for(let j=0;j<length;j++){
    const fields=[];
    for(const [ci,c] of cycles.entries()){if(ci)fields.push('');const r=j<c.end-c.start?rows[c.start+j]:null;fields.push(r?(reset?String(Number((r.t-rows[c.start].t).toPrecision(15))):r.rawT):'',r?r.rawV:'');}
    yield fields.join(delimiter)+'\n';
  }
}
