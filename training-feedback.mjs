import {localDate} from './core.mjs?v=29';
import {monday,addDays,isDate,planForDate,activityStatus,durationCoverage} from './sport-data.mjs?v=29';

// Solo describe los registros existentes; no estima duración ni carga faltante.
export function weeklyFeedback(db,today=localDate()){
 if(!isDate(today))throw Error('Fecha de resumen semanal inválida.');
 const start=monday(today),rows=(db.sessions||[]).filter(s=>isDate(s.date)&&s.date>=start&&s.date<=today),coverage=durationCoverage(rows),efforts=rows.filter(s=>Number.isFinite(s.rpe)&&s.rpe>=1&&s.rpe<=10);
 const result={sessions:rows.length,days:new Set(rows.map(s=>s.date)).size,avgRpe:efforts.length?Math.round(efforts.reduce((n,s)=>n+s.rpe,0)/efforts.length*10)/10:null,timedSessions:coverage.timedSessions,load:coverage.timedSessions?coverage.load:null,plannedUntilToday:0,completedUntilToday:0,partialUntilToday:0,overduePending:0,pendingToday:0,futurePlanned:0};
 for(let i=0;i<7;i++){
  const date=addDays(start,i),activities=planForDate(db,date).filter(a=>!a.isRest);
  if(date>today){result.futurePlanned+=activities.length;continue;}
  result.plannedUntilToday+=activities.length;
  for(const a of activities){const status=activityStatus(db,a,date);if(status==='complete')result.completedUntilToday++;else if(status==='partial')result.partialUntilToday++;else if(status==='pending'){if(date<today)result.overduePending++;else result.pendingToday++;}}
 }
 return result;
}

// Se compara únicamente el nombre exacto (sin espacios exteriores) y las
// mismas repeticiones. Distinta técnica, equipo o esfuerzo no se presuponen.
export function comparableMarks(marks){
 const groups=new Map();
 (marks||[]).forEach((mark,index)=>{const exercise=String(mark?.exercise??'').trim();if(!exercise||!isDate(mark.date)||!Number.isFinite(mark.weight)||mark.weight<0||!Number.isInteger(mark.reps)||mark.reps<1)return;if(!groups.has(exercise))groups.set(exercise,[]);groups.get(exercise).push({mark,index});});
 return [...groups.entries()].map(([exercise,rows])=>{
  rows.sort((a,b)=>b.mark.date.localeCompare(a.mark.date)||b.index-a.index);
  const latest=rows[0].mark,previous=rows.slice(1).find(row=>row.mark.reps===latest.reps)?.mark||null;
  return {exercise,latest:{...latest},previous:previous?{...previous}:null,deltaKg:previous?Math.round((latest.weight-previous.weight)*1000)/1000:null};
 }).sort((a,b)=>b.latest.date.localeCompare(a.latest.date)||a.exercise.localeCompare(b.exercise,'es'));
}
