import {planForDate} from './sport-data.mjs?v=14';
import {localDate} from './core.mjs?v=14';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function todayRoutineMarkup(db,date=localDate()){
 const activities=planForDate(db,date);
 if(!activities.length)return '<p class="note">Hoy no tenés actividades programadas. Podés organizar tu día desde Mi plan.</p>';
 return activities.map(a=>{const r=!a.isRest&&db.routines.find(r=>r.id===a.routineId);return `<section class="today-routine-section"><p class="small">${esc(a.sport)}</p><h3>${esc(a.title)}</h3>${a.isRest?'<p>Descanso / recuperación</p>':r?`${r.title!==a.title?`<p class="small">${esc(r.title)}</p>`:''}${r.warm?`<div class="note"><strong>Calentamiento / indicaciones</strong><p>${esc(r.warm)}</p></div>`:''}<ol class="today-exercises">${r.ex.map(e=>`<li><strong>${esc(e[0])}</strong><span>${esc(e[1])}</span></li>`).join('')}</ol>`:'<p class="small">Esta actividad no tiene una rutina vinculada. Podés vincularla desde Mi plan para ver sus ejercicios acá.</p>'}</section>`;}).join('');
}
export function mountTodayRoutine(getData,go){
 const dialog=document.createElement('dialog');dialog.id='todayRoutineDialog';dialog.setAttribute('aria-labelledby','todayRoutineTitle');dialog.innerHTML='<div class="row"><h2 id="todayRoutineTitle">Tu rutina de hoy</h2><button type="button" class="close" aria-label="Cerrar rutina">×</button></div><p id="todayRoutineDate" class="small"></p><div id="todayRoutineContent"></div><div class="toolbar"><button type="button" class="btn" id="todayRoutineRegister">Registrar actividad</button><button type="button" class="btn outline" id="todayRoutinePlan">Ir a Mi plan</button></div>';
 document.body.append(dialog);dialog.querySelector('.close').onclick=()=>dialog.close();document.getElementById('todayRoutineRegister').onclick=()=>{dialog.close();go('entrenar');};document.getElementById('todayRoutinePlan').onclick=()=>{dialog.close();go('plan');};
 document.addEventListener('click',e=>{if(!e.target.closest('[data-view-today-routine]'))return;document.getElementById('todayRoutineDate').textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});document.getElementById('todayRoutineContent').innerHTML=todayRoutineMarkup(getData());dialog.showModal();});
}
