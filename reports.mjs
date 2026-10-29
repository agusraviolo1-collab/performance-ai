import {durationCoverage} from './sport-data.mjs?v=29';
import {localDate,validDate} from './core.mjs?v=29';
export const monthKey=(date=localDate())=>date.slice(0,7);
export function shiftMonth(key,offset){const [y,m]=key.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+offset,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
export function monthDays(key){const [y,m]=key.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate();}
const endDate=(key,day)=>`${key}-${String(day).padStart(2,'0')}`;
const round=n=>Math.round(n*10)/10;
export function summarize(sessions){const coverage=durationCoverage(sessions);return {sessions:sessions.length,days:new Set(sessions.map(s=>s.date)).size,...coverage,minutes:coverage.minutes===null?null:round(coverage.minutes),load:coverage.load===null?null:round(coverage.load),avgRpe:sessions.length?round(sessions.reduce((sum,s)=>sum+s.rpe,0)/sessions.length):null};}
function groups(sessions,key,label){const map=new Map();for(const s of sessions){const k=key(s);if(!map.has(k))map.set(k,[]);map.get(k).push(s);}return [...map.entries()].map(([key,rows])=>({key,label:label(rows),...summarize(rows)})).sort((a,b)=>b.minutes-a.minutes||String(a.label.name??a.label).localeCompare(String(b.label.name??b.label),'es'));}
export function monthlyReport(db,{month=monthKey(),sport='',today=localDate()}={}){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))<1900||!validDate(today))throw Error('Seleccioná un mes válido.');
 if(month>monthKey(today))throw Error('El informe está disponible hasta el mes actual.');
 const current=month===monthKey(today),day=current?Number(today.slice(-2)):monthDays(month),cutoff=endDate(month,day),prev=shiftMonth(month,-1),previousDay=current?Math.min(day,monthDays(prev)):monthDays(prev),previousEnd=endDate(prev,previousDay);
 // Trabaja sobre una copia y nunca reescribe el historial o el calendario actual.
 const all=(db.sessions||[]).filter(s=>s&&validDate(s.date)&&s.date<=today&&(s.duration===null||(Number.isFinite(s.duration)&&s.duration>0))&&Number.isFinite(s.rpe)&&s.rpe>=1&&s.rpe<=10).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const filtered=all.filter(s=>!sport||s.sport===sport),sessions=filtered.filter(s=>s.date>=month+'-01'&&s.date<=cutoff),previousSessions=filtered.filter(s=>s.date>=prev+'-01'&&s.date<=previousEnd),totals=summarize(sessions),previous=summarize(previousSessions);
 const weeks=[];for(let start=1;start<=day;){const [y,m]=month.split('-').map(Number),weekday=new Date(Date.UTC(y,m-1,start)).getUTCDay(),end=Math.min(day,start+(7-(weekday+6)%7)-1);weeks.push({start,end,label:`${start}–${end}`, ...summarize(sessions.filter(s=>Number(s.date.slice(-2))>=start&&Number(s.date.slice(-2))<=end))});start=end+1;}
 const bySport=groups(sessions,s=>s.sport,rows=>rows[0].sport);
 const byRoutine=groups(sessions,s=>JSON.stringify([s.sport,s.routineId||s.routineTitle||s.plannedTitle||'']),rows=>{const last=rows.at(-1);return {name:last.routineTitle||last.plannedTitle||'Sin rutina registrada',sport:last.sport};});
 const trend=Array.from({length:6},(_,i)=>{const key=shiftMonth(month,i-5),limit=key===month?cutoff:endDate(key,monthDays(key));return {month:key,partial:key===month&&current,...summarize(filtered.filter(s=>s.date>=key+'-01'&&s.date<=limit))};});
 const marks=sport?[]:(db.marks||[]).filter(m=>validDate(m.date)&&m.date>=month+'-01'&&m.date<=cutoff).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const future=(db.sessions||[]).filter(s=>s&&typeof s.date==='string'&&s.date.startsWith(month)&&s.date>today&&(!sport||s.sport===sport)).length;
 return {month,sport,current,cutoff,previousMonth:prev,previousEnd,day,previousDay,totals,previous,sessions,bySport,byRoutine,weeks,trend,marks,future};
}
function csvCell(value){let s=String(value??'');if(/^[=+\-@\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function reportCsv(report){const rows=[['Informe mensual',report.month],['Filtro deporte',report.sport||'Todos'],['Periodo','01 a '+report.cutoff],['Sesiones',report.totals.sessions],['Dias con registros',report.totals.days],['Minutos',report.totals.minutes],['Carga estimada RPE',report.totals.load],['RPE medio por sesion',report.totals.avgRpe??'Sin datos'],[],['Fecha','Deporte','Rutina registrada','Duracion minutos','RPE','Carga estimada']];for(const s of report.sessions)rows.push([s.date,s.sport,s.routineTitle||s.plannedTitle||'Sin rutina registrada',s.duration,s.rpe,s.duration==null?null:round(s.duration*s.rpe)]);return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}

export function sportReportCsv(report){const rows=[['Enfoque',report.focus],['Mes',report.month],['Sesiones',report.sessions.length],['Sesiones con duración',report.timedSessions],['Sesiones sin duración',report.missingDuration],['Minutos conocidos',report.minutes],['Minutos jugados anotados',report.matches?report.played:null],[],['Categoria','Sesiones con esta actividad','Minutos conocidos','Distancia anotada km','Tramos con distancia'],...report.categories.map(c=>[c.name,c.sessions,c.minutes,c.distanceRecords?c.distanceKm:null,c.distanceRecords]),[],['Fecha','Deporte','Rutina','RPE','Duracion anotada min'],...report.sessions.map(s=>[s.date,s.sport,s.routineTitle||'',s.rpe,s.duration])];return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
