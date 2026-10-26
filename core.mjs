import {FOCUS,monday,isDate,sessionDetails,normalizeGoals,normalizeWellness} from './sport-data.mjs?v=19';
import {reminderDefaults,normalizeReminders} from './reminders.mjs?v=19';
import {exercisePair} from './exercise-data.mjs?v=19';
import { BASE, WEEK, SPORTS } from './base.mjs?v=19';
export const KEY='pa_v6';
export const clone=x=>JSON.parse(JSON.stringify(x));
export const uid=()=>globalThis.crypto.randomUUID();
export const clean=(x,max=160)=>String(x??'').trim().slice(0,max);
export const localDate=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return Number.isFinite(+d)&&localDate(d)===s;}
export function defaults(){return {version:6,mobilityRoutineMigrated:false,focus:'general',goals:{},wellness:[],planWeekStart:monday(),planWeeks:{},reminders:reminderDefaults(),profile:null,sessions:[],marks:[],sports:SPORTS.slice(0,5),routines:BASE.map(r=>({...clone(r),sport:'Gimnasio'})),week:WEEK.map((w,i)=>[{id:'base-'+i,title:w[1],sport:[0,1,4].includes(i)?'Gimnasio':[2,5].includes(i)?'Fútbol':'Movilidad / yoga',routineId:BASE.some(r=>r.id===w[2])?w[2]:null,plannedDuration:null,plannedRpe:null,isRest:i===6}]),planBackup:null};}
function requireThat(ok,msg){if(!ok)throw Error(msg);}
export function blankDefaults(){return {...defaults(),routines:[],week:Array.from({length:7},()=>[]),planBackup:null};}
export function validateProfile(input,today=localDate()){
 requireThat(input&&typeof input==='object','Completá tu perfil.');
 const name=clean(input.name,80),birthDate=input.birthDate,weightKg=input.weightKg,heightCm=input.heightCm;
 requireThat(name,'Ingresá tu nombre.');
 requireThat(validDate(birthDate)&&birthDate>='1900-01-01'&&birthDate<=today,'Ingresá una fecha de nacimiento válida, no futura.');
 requireThat(Number.isFinite(weightKg)&&weightKg>=.5&&weightKg<=500,'Ingresá un peso entre 0,5 y 500 kg.');
 requireThat(Number.isFinite(heightCm)&&heightCm>=30&&heightCm<=300,'Ingresá una altura entre 30 y 300 cm.');
 return {name,birthDate,weightKg,heightCm};
}
export function plannedFields(a){const duration=a.plannedDuration??null,rpe=a.plannedRpe??null;requireThat(duration===null||(Number.isInteger(duration)&&duration>=1&&duration<=600),'La duración prevista debe ser de 1 a 600 minutos.');requireThat(rpe===null||(Number.isFinite(rpe)&&rpe>=1&&rpe<=10),'El esfuerzo previsto debe estar entre 1 y 10.');const isRest=a.isRest===true;return {plannedDuration:isRest?null:duration,plannedRpe:isRest?null:rpe,isRest};}
export function normalizeRoutines(rows){
 requireThat(Array.isArray(rows)&&rows.length<=100,'Se esperan hasta 100 rutinas.');
 return rows.map((r,i)=>{
  requireThat(r&&typeof r==='object','Rutina inválida.');
  const title=clean(r.title??r.nombre),sport=clean(r.sport??'Gimnasio',60);
  requireThat(title&&sport,'Cada rutina necesita nombre y deporte.');
  const input=r.ex??r.ejercicios;requireThat(Array.isArray(input)&&input.length>0&&input.length<=150,'Cada rutina necesita entre 1 y 150 ejercicios.');
  const ex=input.map(e=>{const name=clean(Array.isArray(e)?e[0]:e.nombre??e.ejercicio);const dose=clean(Array.isArray(e)?e[1]:e.detalle??[e.series,e.repeticiones].filter(x=>x!=null).join(' × '));const structured=Array.isArray(e)?e[2]:e.prescription;if(structured)return exercisePair(name,structured);requireThat(name&&dose,'Cada ejercicio necesita nombre y series/repeticiones o detalle.');return [name,dose];});
  return {id:clean(r.id,80)||'import-'+i+'-'+uid(),title,sport,warm:clean(r.warm??'',500),ex};
 });
}
export function validate(raw){
 requireThat(raw&&typeof raw==='object'&&!Array.isArray(raw),'Respaldo inválido.');
 const d=defaults();
 d.mobilityRoutineMigrated=raw.mobilityRoutineMigrated===true;
 d.reminders=normalizeReminders(raw.reminders);
 d.focus=Object.hasOwn(FOCUS,raw.focus)?raw.focus:'general';d.goals=normalizeGoals(raw.goals);d.wellness=normalizeWellness(raw.wellness);
 d.profile=raw.profile==null?null:validateProfile(raw.profile);
 for(const key of ['sessions','marks','sports'])requireThat(Array.isArray(raw[key]),'Falta la lista '+key+'.');
 d.sports=[...new Set(raw.sports.map(s=>clean(s,60)).filter(Boolean))];requireThat(d.sports.length>0&&d.sports.length<=100,'Seleccioná entre 1 y 100 deportes.');
 d.sessions=raw.sessions.map(s=>{requireThat(s&&clean(s.sport)&&Number.isFinite(s.duration)&&s.duration>0&&s.duration<=600&&Number.isFinite(s.rpe)&&s.rpe>=1&&s.rpe<=10&&validDate(s.date),'Hay actividades con datos inválidos.');return {id:clean(s.id,80)||uid(),sport:clean(s.sport,60),duration:s.duration,rpe:s.rpe,date:s.date,note:clean(s.note,500),routineId:clean(s.routineId,80)||null,routineTitle:clean(s.routineTitle),...(s.focus&&Object.hasOwn(FOCUS,s.focus)?{focus:s.focus}:{}),...(s.details!=null?{details:sessionDetails(s.details,s.sport,s.duration)}:{}),...(s.planActivityId?{planActivityId:clean(s.planActivityId,80),planStatus:s.planStatus==='partial'?'partial':'complete'}:{})};});
 d.marks=raw.marks.map(m=>{requireThat(m&&clean(m.exercise)&&Number.isFinite(m.weight)&&m.weight>=0&&m.weight<=1500&&Number.isInteger(m.reps)&&m.reps>=1&&m.reps<=1000&&validDate(m.date),'Hay marcas con datos inválidos.');return {exercise:clean(m.exercise),weight:m.weight,reps:m.reps,date:m.date};});
 if(raw.routines!==undefined){d.routines=raw.routines.length?normalizeRoutines(raw.routines):[];requireThat(new Set(d.routines.map(r=>r.id)).size===d.routines.length,'Hay identificadores de rutina repetidos.');}
 function normalizeWeek(input){requireThat(Array.isArray(input)&&input.length===7,'El plan debe tener siete días.');const ids=new Set();return input.map(day=>{requireThat(Array.isArray(day)&&day.length<=30,'Día del plan inválido.');return day.map(a=>{requireThat(a&&clean(a.title),'Actividad del plan inválida.');const id=clean(a.id,80)||uid();requireThat(!ids.has(id),'Actividad del plan repetida.');ids.add(id);return {id,title:clean(a.title),sport:clean(a.sport,60)||'Otros',routineId:d.routines.some(r=>r.id===a.routineId)?a.routineId:null,...plannedFields(a)};});});}
 if(raw.week!==undefined)d.week=normalizeWeek(raw.week);
 d.planWeekStart=isDate(raw.planWeekStart)&&monday(raw.planWeekStart)===raw.planWeekStart?raw.planWeekStart:monday();
 if(raw.planWeeks!==undefined){requireThat(raw.planWeeks&&typeof raw.planWeeks==='object'&&!Array.isArray(raw.planWeeks)&&Object.keys(raw.planWeeks).length<=156,'Calendario inválido o mayor a 156 semanas.');for(const [date,week] of Object.entries(raw.planWeeks)){requireThat(isDate(date)&&monday(date)===date,'Cada semana del calendario debe empezar el lunes.');d.planWeeks[date]=normalizeWeek(week);}}
 delete d.planWeeks[d.planWeekStart];
 for(const r of d.routines)if(!d.sports.includes(r.sport))d.sports.push(r.sport);
 d.planBackup=raw.planBackup&&Array.isArray(raw.planBackup.routines)&&Array.isArray(raw.planBackup.week)?clone(raw.planBackup):null;
 return d;
}
export function load(storage){
 let raw;try{raw=storage.getItem(KEY);}catch{return {data:blankDefaults(),warning:'No pudimos leer el almacenamiento del navegador. Exportá tus datos.'};}
 if(raw){try{return {data:validate(JSON.parse(raw)),warning:''};}catch{return {data:blankDefaults(),blocked:true,warning:'Los datos guardados no se pueden leer. Conservamos el original. Exportá los datos dañados antes de restaurar un respaldo.'};}}
 try{const legacy=storage.getItem('pa_pilot_v4');if(!legacy)return {data:blankDefaults(),warning:'',fresh:true};const parsed=JSON.parse(legacy);const data=validate(parsed);storage.setItem(KEY,JSON.stringify(data));return {data,warning:'Tus registros anteriores se conservaron en la nueva versión.'};}catch{return {data:blankDefaults(),blocked:true,warning:'No pudimos migrar los registros anteriores. Conservamos el original; exportalo antes de restaurar.'};}
}
export function commit(storage,next){const data=validate(next);storage.setItem(KEY,JSON.stringify(data));return data;}
export function snapshotPlan(d){return {routines:clone(d.routines),week:clone(d.week),sports:clone(d.sports),planWeekStart:d.planWeekStart||monday(),planWeeks:clone(d.planWeeks||{})};}
export function planChange(d,mutate){const next=clone(d);next.planBackup=snapshotPlan(d);mutate(next);return validate(next);}
export function undoPlan(d){requireThat(d.planBackup,'No hay cambios para deshacer.');return validate({...d,...clone(d.planBackup),planBackup:null});}
export function removeRoutine(d,id){return planChange(d,next=>{next.routines=next.routines.filter(r=>r.id!==id);next.week=next.week.map(day=>day.map(a=>a.routineId===id?{...a,routineId:null}:a));});}
export function csvRows(text){
 const first=text.split(/\r?\n/)[0];const delim=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delim&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 requireThat(!quoted,'El CSV tiene comillas sin cerrar.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function parseImport(text,name){
 requireThat(text.length<=2000000,'El archivo supera el máximo de 2 MB.');text=text.replace(/^\uFEFF/,'');
 let rows;
 if(/\.json$/i.test(name)){let obj;try{obj=JSON.parse(text);}catch{throw Error('El archivo no contiene JSON válido.');}rows=Array.isArray(obj)?obj:obj.routines??obj.data?.routines;if(!rows)throw Error('El JSON debe contener routines (rutinas con title y ex). Un respaldo antiguo sin rutinas se restaura desde Respaldo.');}
 else if(/\.(csv|txt)$/i.test(name)){
  const table=csvRows(text);requireThat(table.length>=2,'El CSV necesita encabezados y al menos un ejercicio.');
  const header=table.shift().map(x=>x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
  const ix=k=>header.indexOf(k);requireThat(ix('ejercicio')>=0,'Falta la columna ejercicio.');requireThat(ix('detalle')>=0||(ix('series')>=0&&ix('repeticiones')>=0),'Incluí detalle o las columnas series y repeticiones.');
  const groups=new Map();table.forEach((r,i)=>{requireThat(r.length===header.length,'La fila '+(i+2)+' tiene una cantidad incorrecta de columnas.');const at=k=>ix(k)<0?'':r[ix(k)].trim();const title=at('rutina')||'Rutina importada';const sport=at('deporte')||'Gimnasio';const key=title+'\u0000'+sport;if(!groups.has(key))groups.set(key,{title,sport,ex:[]});groups.get(key).ex.push([at('ejercicio'),at('detalle')||[at('series'),at('repeticiones')].filter(Boolean).join(' × ')]);});rows=[...groups.values()];
 }else throw Error('Por ahora se importan CSV, TXT y JSON. Para Excel, exportá la hoja como CSV. El reconocimiento de imágenes estará disponible al conectar el servicio de IA.');
 const routines=normalizeRoutines(rows);requireThat(routines.length>0,'El archivo no contiene rutinas.');return routines.map(r=>({...r,id:uid()}));
}
export function applyImport(d,routines,mode){
 requireThat(['add','replace'].includes(mode),'Elegí agregar o reemplazar.');const incoming=normalizeRoutines(routines).map(r=>({...r,id:uid()}));requireThat(incoming.length>0,'No hay rutinas para importar.');
 return planChange(d,next=>{if(mode==='replace'){next.week=next.week.map(day=>day.map(a=>({...a,routineId:null})));next.routines=[];}for(const r of incoming){const title=r.title;let n=2;while(next.routines.some(x=>x.title===r.title))r.title=title+' ('+n+++')';next.routines.push(r);if(!next.sports.includes(r.sport))next.sports.push(r.sport);}});
}
export function weekSessions(d,now=new Date()){const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7);const end=new Date(start);end.setDate(end.getDate()+7);return d.sessions.filter(s=>{const t=new Date(s.date+'T12:00:00');return t>=start&&t<end;});}
