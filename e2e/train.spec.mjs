import {test,expect} from '@playwright/test';
import {blankDefaults,validate} from '../core.mjs';
const date='2026-11-01';
function fixture(){
 const d=blankDefaults();d.planWeekStart='2026-10-26';d.mobilityRoutineMigrated=true;
 d.profile={name:'Prueba',birthDate:'1990-01-01',weightKg:75,heightCm:175};
 d.routines=[{id:'r',title:'Fuerza',sport:'Gimnasio',warm:'',ex:[['Press','3 × 8']]},{id:'legacy-r',title:'Rutina anterior',sport:'Gimnasio',warm:'',ex:[['Press','3 × 8']]}];
 d.week[6]=[{id:'done',sport:'Running',title:'Carrera completa'},{id:'partial',sport:'Fútbol',title:'Fútbol parcial'},{id:'pending',sport:'Gimnasio',routineId:'r',title:'Fuerza pendiente'},{id:'legacy',sport:'Gimnasio',routineId:'legacy-r',title:'Plan antiguo'}];
 const s={date,duration:null,rpe:5,note:'Conservar',routineId:null,routineTitle:''};
 d.sessions=[{...s,id:'done-s',sport:'Running',planActivityId:'done',plannedTitle:'Carrera completa'},{...s,id:'partial-s',sport:'Fútbol',planActivityId:'partial',planStatus:'partial',plannedTitle:'Fútbol parcial',duration:60,details:{football:{type:'match',format:'7',minutesPlayed:30,participation:'substitute',content:'Dato previo'}}},{...s,id:'legacy-s',sport:'Gimnasio',routineId:'legacy-r',routineTitle:'Rutina anterior'}];
 return validate(d);
}
test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2026-11-01T15:00:00Z')});
 await page.addInitScript(data=>{if(!localStorage.getItem('pa_v6'))localStorage.setItem('pa_v6',JSON.stringify(data));},fixture());
 await page.goto('/');await page.locator('[data-tab="entrenar"]').click();
});
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('pa_v6')));
async function save(page,rpe='6'){await page.locator('#rpeScale button').filter({hasText:new RegExp('^'+rpe+'$')}).click();await page.locator('#saveSessionButton').click();await expect(page.locator('#sessionSavedSummary')).toBeVisible();}
test('separa pendientes e historial, guarda y edita sin duplicar ni perder datos',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page.locator('[data-suggested-activity]')).toHaveCount(1);
 await expect(page.locator('[data-suggested-activity="pending"]')).toBeVisible();
 await expect(page.locator('#sessionList .item')).toHaveCount(3);
 await expect(page.locator('#sessionPlanLink')).toHaveValue('pending');
 await save(page);
 await expect(page.locator('#sessionList .item')).toHaveCount(4);
 await page.locator('[data-next-session]').click();
 await expect(page.locator('[data-suggested-activity]')).toHaveCount(0);
 await expect(page.locator('#sessionPlanLink')).toHaveValue('');
 await page.locator('#activityRoutine').selectOption('r');await save(page,'7');
 let data=await stored(page);expect(data.sessions).toHaveLength(5);expect(data.sessions.at(-1).planUnlinked).toBe(true);expect(data.sessions.at(-1).planActivityId).toBeUndefined();
 await page.locator('[data-next-session]').click();await page.locator('#activityRoutine').selectOption('r');await save(page,'4');
 data=await stored(page);expect(data.sessions).toHaveLength(6);expect(data.sessions.filter(s=>s.planUnlinked)).toHaveLength(2);
 await page.locator('[data-edit-session="partial-s"]').click();
 await page.locator('#sessionPlanStatus').selectOption('complete');await save(page,'8');
 data=await stored(page);expect(data.sessions).toHaveLength(6);expect(data.sessions[1]).toMatchObject({duration:60,planStatus:'complete',rpe:8,note:'Conservar',details:fixture().sessions[1].details});
 await page.reload();await page.locator('[data-tab="entrenar"]').click();
 expect((await stored(page)).sessions).toEqual(data.sessions);
 await expect(page.locator('[data-suggested-activity]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('entrenar-mobile.png'),fullPage:true});
 for(const name of ['inicio','plan','progreso','ajustes']){await page.locator(`[data-tab="${name}"]`).click();await expect(page.locator('#'+name)).toBeVisible();}
 expect(errors).toEqual([]);
});
test('extra directo conserva plan pendiente y protege borrador al cambiar de destino',async({page})=>{
 const initial=await stored(page);
 await page.locator('#addExtraSession').click();await expect(page.locator('#sessionPlanLink')).toHaveValue('');
 await page.locator('#activityRoutine').selectOption('r');await page.locator('#activityNote').fill('Extra de prueba');
 await page.locator('[data-suggested-activity="pending"]').click();
 await expect(page.locator('#sessionDiscardPanel')).toBeVisible();await page.locator('[data-keep-session]').click();
 await expect(page.locator('#activityNote')).toHaveValue('Extra de prueba');await expect(page.locator('#sessionPlanLink')).toHaveValue('');
 await save(page);
 const data=await stored(page);expect(data.week).toEqual(initial.week);expect(data.sessions.slice(0,3)).toEqual(initial.sessions);expect(data.sessions.at(-1)).toMatchObject({planUnlinked:true,routineId:'r',note:'Extra de prueba'});
 await page.locator('[data-next-session]').click();await expect(page.locator('[data-suggested-activity="pending"]')).toBeVisible();
 await page.locator('#activityNote').fill('Descartar');await page.locator('[data-suggested-activity="pending"]').click();await page.locator('[data-discard-session]').click();
 await expect(page.locator('#sessionPlanLink')).toHaveValue('pending');await expect(page.locator('#activityNote')).toHaveValue('');
 await save(page);expect((await stored(page)).sessions).toHaveLength(5);
});
test('instalación vacía permite extra libre y fecha retrospectiva sin inventar plan',async({page})=>{
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('pa_v6'));d.week=Array.from({length:7},()=>[]);d.sessions=[];d.routines=[];localStorage.setItem('pa_v6',JSON.stringify(d));});
 await page.reload();await page.locator('[data-tab="entrenar"]').click();
 await expect(page.locator('[data-suggested-activity]')).toHaveCount(0);
 await page.locator('#activityDate').fill('2026-10-20');await page.locator('#activityDate').dispatchEvent('change');
 await page.locator('#activitySport').selectOption('Running');await save(page);
 expect((await stored(page)).sessions[0]).toMatchObject({date:'2026-10-20',sport:'Running',routineId:null,planUnlinked:true});
});
test('Inicio y semana compactos, copiar arriba y navegar semanas no completa actividades',async({page})=>{
 const initial=await stored(page);
 await page.locator('[data-tab="inicio"]').click();
 expect((await page.locator('#dailyRecovery').boundingBox()).height).toBeLessThan(95);
 await expect(page.getByText('Tu plan, a tu manera.',{exact:true})).toHaveCount(0);
 await page.locator('[data-checkin-open]').first().click();await expect(page.locator('#wellnessDialog')).toBeVisible();await page.locator('[data-close="wellnessDialog"]').click();
 await page.screenshot({path:test.info().outputPath('inicio-compacto.png'),fullPage:false});
 await page.locator('[data-tab="plan"]').click();
 const copy=await page.locator('#copyPreviousPlanWeek').boundingBox(),week=await page.locator('#weekList').boundingBox();
 expect(copy.y).toBeLessThan(week.y);expect(week.height).toBeLessThan(400);
 await expect(page.getByText('Opciones de la semana',{exact:true})).toHaveCount(0);
 await expect(page.locator('#currentPlanWeek')).toHaveText('Ir a semana actual');
 await page.screenshot({path:test.info().outputPath('mi-plan-compacto.png'),fullPage:false});
 await page.locator('#nextPlanWeek').click();await expect(page.locator('#copyPreviousPlanWeek')).toBeEnabled();
 await page.locator('#copyPreviousPlanWeek').click();
 let data=await stored(page);expect(data.sessions).toEqual(initial.sessions);expect(data.week[6].map(a=>a.title)).toEqual(initial.week[6].map(a=>a.title));expect(data.week[6][0].id).not.toBe(initial.week[6][0].id);
 await page.locator('#undoPlan').click();data=await stored(page);expect(data.week.every(day=>day.length===0)).toBe(true);
 await page.locator('#currentPlanWeek').click();data=await stored(page);expect(data.week).toEqual(initial.week);expect(data.sessions).toEqual(initial.sessions);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('marcas plegables por ejercicio y buscador tolerante a errores con teclado y selección táctil',async({page})=>{
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('pa_v6'));d.marks=[{exercise:'Press banca',weight:50,reps:8,date:'2026-10-10'},{exercise:'Press banca',weight:55,reps:8,date:'2026-10-20'},{exercise:'Remo',weight:20,reps:10,date:'2026-10-21'}];localStorage.setItem('pa_v6',JSON.stringify(d));});
 await page.reload();await page.locator('[data-tab="progreso"]').click();
 await expect(page.locator('#markHistory')).not.toHaveAttribute('open');
 await page.locator('#markHistory>summary').click();await expect(page.locator('#marksList details')).toHaveCount(2);
 await page.locator('#marksList details').filter({has:page.locator('summary strong',{hasText:'Press banca'})}).locator('summary').click();
 await expect(page.locator('#marksList .item:visible')).toHaveCount(2);await expect(page.locator('#marksList .item:visible').first()).toContainText('55 kg');
 const input=page.locator('#markExercise');await input.fill('sentadila');
 await expect(page.getByRole('option',{name:'Sentadilla',exact:true})).toBeVisible();await page.getByRole('option',{name:'Sentadilla',exact:true}).click();await expect(input).toHaveValue('Sentadilla');
 await input.fill('press bnca');await input.press('ArrowDown');await input.press('Enter');await expect(input).toHaveValue('Press banca');
 await page.locator('#markWeight').fill('60');await page.locator('#markReps').fill('8');await page.locator('#markForm button').filter({hasText:'Guardar marca'}).click();
 const data=await stored(page);expect(data.marks).toHaveLength(4);expect(data.marks.at(-1).exercise).toBe('Press banca');expect(data.marks.slice(0,3).map(m=>m.weight)).toEqual([50,55,20]);
 await page.locator('#toggleExerciseSuggestions').click();await expect(page.getByRole('option',{name:'Hip thrust',exact:true})).toBeVisible();
 await page.locator('#toggleExerciseSuggestions').click();await expect(page.locator('#exerciseSuggestions')).toBeHidden();
 await page.locator('#toggleExerciseSuggestions').click();await expect(page.locator('#exerciseSuggestions')).toBeVisible();
 await input.fill('nombre nuevo zzq');await expect(page.locator('#exerciseSuggestions')).toContainText('Sin coincidencias');await input.press('Escape');await expect(page.locator('#exerciseSuggestions')).toBeHidden();await expect(input).toHaveValue('nombre nuevo zzq');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('marcas-mobile.png'),fullPage:false});
});
test('Perfil reemplaza enfoque deportivo y la vista general conserva datos de usuarios anteriores',async({page})=>{
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('pa_v6'));d.focus='football';d.goals.football={title:'Objetivo anterior',date:'2026-11-10'};localStorage.setItem('pa_v6',JSON.stringify(d));});
 const before=await stored(page);await page.reload();
 await expect(page.locator('#genericHome')).toBeVisible();await expect(page.locator('#sportHome')).toBeHidden();
 await expect(page.locator('#headerEditProfile')).toHaveCount(0);
 await expect(page.locator('[data-tab="ajustes"]')).toHaveText('Perfil');await page.locator('[data-tab="ajustes"]').click();await expect(page.locator('#ajustes h1')).toHaveText('Perfil');await expect(page.locator('#settingsFocus')).toHaveCount(0);
 await page.locator('#editProfile').click();await expect(page.locator('#profileDialog')).toBeVisible();await page.locator('#cancelProfile').click();
 const after=await stored(page);expect(after.sessions).toEqual(before.sessions);expect(after.goals).toEqual(before.goals);expect(after.routines).toEqual(before.routines);
});
