import {clone,localDate} from './core.mjs?v=33';
import {isDate,planForDate} from './sport-data.mjs?v=33';
export function setPlanCheck(db,{date,activityId,status},today=localDate()){
 if(!isDate(date)||date>today)throw Error('Podés marcar actividades de hoy o de fechas anteriores.');
 const activity=planForDate(db,date).find(a=>a.id===activityId);
 if(!activity||activity.isRest)throw Error('La actividad ya no está disponible para esa fecha.');
 if(!['pending','complete','missed'].includes(status))throw Error('Elegí si hiciste la actividad.');
 const next=clone(db);next.planChecks=(next.planChecks||[]).filter(c=>c.date!==date||c.activityId!==activityId);
 if(status!=='pending')next.planChecks.push({date,activityId,status});
 return next;
}
