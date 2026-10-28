import {localDate,validDate,clean,plannedFields} from './core.mjs?v=25';
import {durationCoverage} from './sport-data.mjs?v=25';
const DAYS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=n=>Math.round(n*10)/10;
const dateAdd=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d);};
export function nextMonday(today=localDate()){if(!validDate(today))throw Error('Fecha inválida.');const weekday=(new Date(today+'T12:00:00').getDay()+6)%7;return dateAdd(today,weekday?7-weekday:0);}
export function planTotals(week){let load=0,minutes=0,complete=0,missing=0,rest=0;for(const a of week.flat()){const p=plannedFields(a);if(p.isRest){rest++;continue;}if(p.plannedDuration!==null)minutes+=p.plannedDuration;if(p.plannedDuration!==null&&p.plannedRpe!==null){complete++;load+=p.plannedDuration*p.plannedRpe;}else missing++;}return {load:round(load),minutes,complete,missing,rest,partial:missing>0};}
export function buildPlanPackage(db,{weekStart=nextMonday(),includeRoutines=true,includeRecent=false,note='',today=localDate()}={}){
 if(!validDate(weekStart)||new Date(weekStart+'T12:00:00').getDay()!==1)throw Error('Elegí un lunes como inicio de la semana.');
 if(!validDate(today))throw Error('Fecha de creación inválida.');
 const routines=includeRoutines?db.routines.map(r=>({id:r.id,title:r.title,sport:r.sport,warm:r.warm,ex:r.ex.map(e=>[...e])})):[];
 const week=db.week.map((items,i)=>({day:DAYS[i],date:dateAdd(weekStart,i),activities:items.map(a=>({title:a.title,sport:a.sport,routineTitle:db.routines.find(r=>r.id===a.routineId)?.title||'',...plannedFields(a)}))}));
 const result={created:today,weekStart,weekEnd:dateAdd(weekStart,6),note:clean(note,1000),week,routines,includeRoutines,totals:planTotals(db.week)};
 if(includeRecent){const start=dateAdd(today,-27);result.recent={start,end:today,weeks:Array.from({length:4},(_,i)=>{const a=dateAdd(start,i*7),b=dateAdd(a,6),sessions=db.sessions.filter(s=>s.date>=a&&s.date<=b);const coverage=durationCoverage(sessions);return {start:a,end:b,sessions:sessions.length,...coverage,minutes:coverage.minutes===null?null:round(coverage.minutes),load:coverage.load===null?null:round(coverage.load)};})};}
 return result;
}

export {planText,planFragment,planHtml,planCsv,planDocumentCss} from './coach-sheet.mjs?v=25';
