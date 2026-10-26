// Calendar-day arithmetic avoids daylight-saving changes affecting inactivity.
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dayNumber=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return NaN;const [y,m,d]=s.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d));return t.toISOString().slice(0,10)===s?+t/86400000:NaN;};
export function reminderDefaults(){return {daily:false,time:'09:00',days:[0,1,2,3,4,5,6],inactive:false,inactiveDays:3,enabledSince:null,dismissedDate:null};}
export function normalizeReminders(raw){
 const d=reminderDefaults();if(!raw||typeof raw!=='object')return d;
 return {...d,daily:raw.daily===true,inactive:raw.inactive===true,time:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.time)?raw.time:d.time,days:Array.isArray(raw.days)?[...new Set(raw.days.filter(x=>Number.isInteger(x)&&x>=0&&x<7))].sort():d.days,inactiveDays:[2,3,5,7,14].includes(raw.inactiveDays)?raw.inactiveDays:d.inactiveDays,enabledSince:Number.isFinite(dayNumber(raw.enabledSince))?raw.enabledSince:null,dismissedDate:Number.isFinite(dayNumber(raw.dismissedDate))?raw.dismissedDate:null};
}
export function reminderMessages(data,now=new Date()){
 const r=normalizeReminders(data.reminders),today=dateKey(now),n=dayNumber(today),day=(now.getDay()+6)%7;
 if(r.dismissedDate===today)return [];
 const sessions=(data.sessions||[]).filter(s=>Number.isFinite(dayNumber(s.date))&&s.date<=today),registeredToday=sessions.some(s=>s.date===today),messages=[];
 const activities=(data.week?.[day]||[]).filter(a=>!a.isRest);
 if(r.daily&&r.days.includes(day)&&!registeredToday&&activities.length&&`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`>=r.time)messages.push({kind:'daily',title:'Tu plan de hoy',text:activities.map(a=>a.title).join(' · ')+'. Si ya entrenaste, podés registrarlo.'});
 const last=sessions.map(s=>s.date).sort().at(-1)||r.enabledSince,elapsed=n-dayNumber(last);
 if(r.inactive&&!registeredToday&&elapsed>=r.inactiveDays)messages.push({kind:'inactive',title:'¿Querés actualizar tus registros?',text:sessions.length?`Pasaron ${elapsed} días desde tu última actividad registrada. Si entrenaste, podés cargarla; si estás descansando, no hace falta registrar nada.`:`Hace ${elapsed} días activaste este aviso y todavía no hay actividades registradas. Podés cargar tu primera sesión cuando quieras.`});
 return messages;
}
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
// RFC 5545: fold physical lines at 75 UTF-8 octets, preserving characters.
function fold(line){let parts=[],part='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>75){parts.push(part);part=' ';bytes=1;}part+=ch;bytes+=size;}parts.push(part);return parts.join('\r\n');}
const stamp=d=>dateKey(d).replaceAll('-','')+'T'+[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join('');
export function reminderCalendar(data,now=new Date()){
 const r=normalizeReminders(data.reminders);if(!r.daily)throw Error('Activá el recordatorio del plan y guardá tus preferencias primero.');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Performance AI//Recordatorios//ES','CALSCALE:GREGORIAN','X-WR-CALNAME:Performance AI · Mi plan'];let count=0;
 for(const day of r.days){const activities=(data.week?.[day]||[]).filter(a=>!a.isRest);if(!activities.length)continue;
  const start=new Date(now);start.setDate(start.getDate()+(day-(now.getDay()+6)%7+7)%7);const [h,m]=r.time.split(':').map(Number);start.setHours(h,m,0,0);if(start<=now)start.setDate(start.getDate()+7);const end=new Date(+start+5*60000);
  const titles=activities.map(a=>a.title).join(' · '),description='Recordatorio, no horario de entrenamiento. Plan: '+titles+'. Abrí Performance AI para consultar tu rutina o registrar la actividad. Este calendario no se sincroniza si cambiás el plan.';
  lines.push('BEGIN:VEVENT',`UID:performance-ai-plan-${day}@performance-ai.local`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,'RRULE:FREQ=WEEKLY;COUNT=8',`SUMMARY:${esc('Tu plan · '+titles)}`,`DESCRIPTION:${esc(description)}`,'URL:https://agusraviolo1-collab.github.io/performance-ai/','TRANSP:TRANSPARENT','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Tu plan de entrenamiento','TRIGGER:PT0M','END:VALARM','END:VEVENT');count++;
 }
 if(!count)throw Error('No hay actividades de entrenamiento en los días elegidos. Agregalas en Mi plan; los descansos no generan avisos.');
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}

