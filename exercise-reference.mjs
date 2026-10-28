import {isDate,dateKey} from './sport-data.mjs?v=26';
const key=value=>String(value??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exerciseReferences(marks,exercise,today=dateKey()){
 const name=key(exercise);if(!name)return null;
 const rows=(marks||[]).map((m,index)=>({m,index})).filter(({m})=>key(m?.exercise)===name&&isDate(m.date)&&m.date<=today&&Number.isFinite(m.weight)&&m.weight>=0&&Number.isInteger(m.reps)&&m.reps>=1);
 if(!rows.length)return null;
 const latest=rows.slice().sort((a,b)=>b.m.date.localeCompare(a.m.date)||b.index-a.index)[0].m;
 const max=rows.slice().sort((a,b)=>b.m.weight-a.m.weight||b.m.date.localeCompare(a.m.date)||b.index-a.index)[0].m;
 const copy=m=>({weight:m.weight,reps:m.reps,date:m.date});return {max:copy(max),latest:copy(latest)};
}
export function exerciseReferencesMarkup(marks,exercise,today=dateKey()){
 const refs=exerciseReferences(marks,exercise,today);if(!refs)return '<div class="exercise-reference empty-reference">Sin marcas registradas para este ejercicio.</div>';
 const fmt=m=>`${new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(m.weight)} kg × ${m.reps} reps · ${new Date(m.date+'T12:00:00').toLocaleDateString('es-AR')}`;
 const different=refs.max.weight!==refs.latest.weight||refs.max.reps!==refs.latest.reps||refs.max.date!==refs.latest.date;
 return `<div class="exercise-reference"><div><b>Mayor peso registrado</b><span>${esc(fmt(refs.max))}</span></div>${different?`<div><b>Última marca</b><span>${esc(fmt(refs.latest))}</span></div>`:''}</div>`;
}
