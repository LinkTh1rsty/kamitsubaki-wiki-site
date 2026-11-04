// URL/state policy shared by controls and regression tests. Dates remain wall dates.
export const addDays=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function readActivityState(params,today,{source='community',mobile=false}={}){
 const month=/^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('month')||'')?params.get('month'):today.slice(0,7);
 const offset=Number(params.get('pastOffsetDays'));
 return {source:['official','community'].includes(params.get('source'))?params.get('source'):source,month,view:['calendar','agenda'].includes(params.get('view'))?params.get('view'):mobile?'agenda':'calendar',range:['next','deadline','past'].includes(params.get('range'))?params.get('range'):'month',date:/^\d{4}-\d{2}-\d{2}$/.test(params.get('date')||'')?params.get('date'):'',deadlines:params.get('deadlines')!=='0',pastOffsetDays:Number.isSafeInteger(offset)&&offset>=0&&offset<=36500?Math.floor(offset/365)*365:0};
}
export function activityRange(state,today,q=''){
 if(state.range==='past')return {from:addDays(today,-365-state.pastOffsetDays),to:addDays(today,-state.pastOffsetDays-(state.pastOffsetDays?1:0))};
 if(q.trim()&&state.range==='month')return {from:addDays(today,-270),to:addDays(today,90)};
 if(state.range!=='month')return {from:today,to:addDays(today,29)};
 const first=state.month+'-01',weekday=(new Date(first+'T12:00Z').getUTCDay()+6)%7,from=addDays(first,-weekday);return {from,to:addDays(from,41)};
}
export function transitionActivity(state,action,today){
 const next={...state,date:''};
 if(action==='calendar')return {...next,range:'month',view:'calendar'};
 if(action==='agenda')return {...next,view:'agenda',date:state.date};
 if(action==='today')return {...next,range:'month',month:today.slice(0,7),date:today};
 if(action==='prev'||action==='next-month'){const d=new Date(state.month+'-01T12:00Z');d.setUTCMonth(d.getUTCMonth()+(action==='prev'?-1:1));return {...next,range:'month',month:d.toISOString().slice(0,7)};}
 if(action==='older')return {...next,range:'past',view:'agenda',pastOffsetDays:Math.min(36500,state.pastOffsetDays+365)};
 return {...next,range:action,view:'agenda',pastOffsetDays:0};
}
export function pastActivities(items,{from,to},now=Date.now()){
 const ended=item=>{const s=item.schedule;if(!s||s.kind==='undated'||['cancelled','postponed'].includes(item.eventStatus))return false;if(s.kind==='timed')return !!s.endAt&&Date.parse(s.endAt)<now;const today=new Intl.DateTimeFormat('en-CA',{timeZone:s.timeZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);return (s.endDate||s.startDate)<today;};
 const endDay=item=>{const s=item.schedule;return s.kind==='allDay'?s.endDate||s.startDate:new Intl.DateTimeFormat('en-CA',{timeZone:s.timeZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s.endAt));};
 return [...new Map(items.filter(ended).map(a=>[a.id,a])).values()].filter(a=>endDay(a)>=from&&endDay(a)<=to).sort((a,b)=>endDay(b).localeCompare(endDay(a))||(b.schedule.endAt||'').localeCompare(a.schedule.endAt||'')||a.id.localeCompare(b.id));
}
