import {addDays,dateKey,isDate} from './sport-data.mjs?v=29';
const mean=rows=>rows.length?Math.round(rows.reduce((n,x)=>n+x,0)/rows.length*10)/10:null;
export function recoverySummary(db,today=dateKey()){
 if(!isDate(today))throw Error('Fecha de análisis inválida.');
 const start=addDays(today,-6),priorStart=addDays(today,-13),priorEnd=addDays(today,-7);
 const sessions=(db.sessions||[]).filter(s=>isDate(s.date)&&s.date<=today&&s.date>=priorStart);
 const stats=(from,to)=>{const rows=sessions.filter(s=>s.date>=from&&s.date<=to),timed=rows.filter(s=>Number.isFinite(s.duration)&&s.duration>0&&Number.isFinite(s.rpe));return {sessions:rows.length,days:new Set(rows.map(s=>s.date)).size,rpe:mean(rows.filter(s=>Number.isFinite(s.rpe)&&s.rpe>=1&&s.rpe<=10).map(s=>s.rpe)),timed:timed.length,load:timed.length?timed.reduce((n,s)=>n+s.duration*s.rpe,0):null};};
 const recent=stats(start,today),previous=stats(priorStart,priorEnd),history=(db.wellness||[]).filter(w=>isDate(w.date)&&w.date<=today).sort((a,b)=>b.date.localeCompare(a.date)),week=history.filter(w=>w.date>=start),baseline=history.filter(w=>w.date<start&&w.date>=addDays(today,-34));
 const trends=['moodScore','sleepScore','physicalScore'].map(key=>{const current=week.filter(w=>Number.isInteger(w[key])&&w[key]>=1&&w[key]<=5).map(w=>w[key]),past=baseline.filter(w=>Number.isInteger(w[key])&&w[key]>=1&&w[key]<=5).map(w=>w[key]);return {key,count:current.length,average:mean(current),baselineCount:past.length,baseline:mean(past),delta:current.length>=3&&past.length>=7?Math.round((mean(current)-mean(past))*10)/10:null};});
 const entry=history.find(w=>w.date===today),messages=[];
 if(entry?.soreness)messages.push({kind:'attention',text:'Hoy anotaste dolor. Revisá qué movimientos lo provocan con tu entrenador; si persiste, empeora o limita la actividad, consultá a un profesional de salud.'});
 for(const [key,label] of [['sleepScore','sueño'],['physicalScore','estado físico'],['moodScore','ánimo']]){
 const streak=[0,1,2].every(n=>{const w=history.find(w=>w.date===addDays(today,-n));return Number.isInteger(w?.[key])&&w[key]<=2;});
 if(streak)messages.push({kind:'attention',text:`Anotaste ${label} en 1 o 2 de 5 durante tres días seguidos. Revisá tu recuperación y el entrenamiento previsto con tu entrenador.`});
 else if(entry?.[key]<=2)messages.push({kind:'attention',text:`Hoy tu ${label} está en ${entry[key]}/5. Tenelo en cuenta al revisar el esfuerzo previsto para hoy.`});
 }
 for(const t of trends)if(t.delta!==null&&t.delta<=-1)messages.push({kind:'attention',text:`Tu ${({'moodScore':'ánimo','sleepScore':'sueño','physicalScore':'estado físico'})[t.key]} medio bajó ${Math.abs(t.delta).toLocaleString('es-AR')} punto(s) frente a tus registros previos. Comparación basada en ${t.count} y ${t.baselineCount} respuestas.`});
 const painDays=week.filter(w=>w.soreness).length;
 if(painDays>=2)messages.push({kind:'attention',text:`Anotaste dolor en ${painDays} de los ${week.length} días con respuestas de los últimos 7 días. Revisá su evolución; no se atribuye automáticamente al entrenamiento.`});
 const fullLoad=recent.sessions>0&&previous.sessions>0&&recent.timed===recent.sessions&&previous.timed===previous.sessions;
 return {today,start,priorStart,priorEnd,recent,previous,history:history.slice(0,14),weekCount:week.length,entry,trends,messages,painDays,loadDelta:fullLoad&&previous.load>0?Math.round((recent.load/previous.load-1)*100):null};
}
