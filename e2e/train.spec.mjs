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
async function saveExtra(page,rpe='6'){await page.locator('#extraRpe').fill(rpe);await page.locator('#saveExtraSession').click();await expect(page.locator('#extraSessionDialog')).not.toBeVisible();}
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
 await page.locator('#extraRoutine').selectOption('r');await saveExtra(page,'7');
 let data=await stored(page);expect(data.sessions).toHaveLength(5);expect(data.sessions.at(-1).planUnlinked).toBe(true);expect(data.sessions.at(-1).planActivityId).toBeUndefined();
 await page.locator('[data-next-session]').click();await page.locator('#extraRoutine').selectOption('r');await saveExtra(page,'4');
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
test('extra abre un pop-up y conserva el borrador del plan al guardar o cancelar',async({page})=>{
 const initial=await stored(page);await page.locator('#activityNote').fill('Borrador del plan');
 await page.locator('#addExtraSession').click();await expect(page.locator('#extraSessionDialog')).toBeVisible();
 await page.locator('#extraRoutine').selectOption('r');await page.locator('#extraNote').fill('Extra de prueba');
 await page.locator('[data-close-extra]').first().click();await expect(page.locator('#activityNote')).toHaveValue('Borrador del plan');
 await page.locator('#addExtraSession').click();await page.locator('#extraRoutine').selectOption('r');await page.locator('#extraNote').fill('Extra de prueba');
 await page.screenshot({path:test.info().outputPath('extra-popup.png'),fullPage:false});await saveExtra(page);
 const data=await stored(page);expect(data.week).toEqual(initial.week);expect(data.sessions.slice(0,3)).toEqual(initial.sessions);expect(data.sessions.at(-1)).toMatchObject({planUnlinked:true,routineId:'r',note:'Extra de prueba'});
 await expect(page.locator('#activityNote')).toHaveValue('Borrador del plan');await expect(page.locator('#sessionPlanLink')).toHaveValue('pending');
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
test('Mi plan permite marcar realización retroactiva sin crear ni borrar entrenamientos',async({page})=>{
 const before=await stored(page);await page.locator('[data-tab="plan"]').click();await page.locator('[data-week-day="6"]>summary').click();
 const check=page.locator('[data-plan-check="pending"]');await check.selectOption('complete');
 let data=await stored(page);expect(data.sessions).toEqual(before.sessions);expect(data.planChecks).toEqual([{date,activityId:'pending',status:'complete'}]);
 await check.selectOption('missed');await expect(check).toHaveValue('missed');await page.reload();await page.locator('[data-tab="plan"]').click();await page.locator('[data-week-day="6"]>summary').click();await expect(check).toHaveValue('missed');
 await page.screenshot({path:test.info().outputPath('plan-realizacion.png'),fullPage:false});
 await check.selectOption('pending');expect((await stored(page)).sessions).toEqual(before.sessions);expect((await stored(page)).planChecks).toEqual([]);
 await page.locator('#previousPlanWeek').click();await page.locator('#addActivity').click();await page.locator('#planDay').selectOption('6');await page.locator('#planTitle').fill('Actividad del domingo anterior');await page.locator('#activityForm button').filter({hasText:'Guardar actividad del plan'}).click();if(await page.locator('[data-week-day="6"]').getAttribute('open')===null)await page.locator('[data-week-day="6"]>summary').click();await page.locator('[data-plan-check]').selectOption('complete');data=await stored(page);expect(data.planChecks[0]).toMatchObject({date:'2026-10-25',status:'complete'});expect(data.sessions).toEqual(before.sessions);await page.locator('#currentPlanWeek').click();
 await page.locator('#nextPlanWeek').click();await page.locator('#copyPreviousPlanWeek').click();await page.locator('[data-week-day="6"]>summary').click();await expect(page.locator('[data-plan-check="pending"]')).toHaveCount(0);await expect(page.locator('[data-plan-check]').first()).toBeDisabled();
});
test('editor de plan usa un solo nombre, oculta previsiones y conserva datos previos',async({page})=>{
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('pa_v6'));d.week[6][2].plannedDuration=45;d.week[6][2].plannedRpe=6;localStorage.setItem('pa_v6',JSON.stringify(d));});await page.reload();await page.locator('[data-tab="plan"]').click();await page.locator('[data-week-day="6"]>summary').click();
 await page.locator('[data-edit-activity="pending"]').click();await expect(page.locator('#planRoutine')).toHaveCount(0);await expect(page.locator('#planDuration')).toHaveCount(0);await expect(page.locator('#planRpe')).toHaveCount(0);
 await page.locator('#activityForm button').filter({hasText:'Guardar actividad del plan'}).click();let data=await stored(page);expect(data.week[6].find(a=>a.id==='pending')).toMatchObject({routineId:'r',plannedDuration:45,plannedRpe:6});
 await page.locator('#addActivity').click();await page.locator('#planTitle').fill('Fuerza');await page.locator('#activityForm button').filter({hasText:'Guardar actividad del plan'}).click();data=await stored(page);expect(data.week[0].at(-1)).toMatchObject({title:'Fuerza',routineId:'r'});
});
test('rutinas sin ejercicios se crean, se editan y conservan los ejercicios de otras rutinas',async({page})=>{
 const before=await stored(page);await page.locator('[data-tab="plan"]').click();await page.locator('#addRoutine').click();await expect(page.locator('#exerciseEditor .exercise-row')).toHaveCount(0);await page.locator('#routineTitle').fill('Rodaje libre');await page.locator('#routineSport').selectOption('Running');await page.locator('#routineForm button').filter({hasText:'Guardar rutina'}).click();
 let data=await stored(page);expect(data.routines.at(-1)).toMatchObject({title:'Rodaje libre',sport:'Running',ex:[]});expect(data.routines.slice(0,2)).toEqual(before.routines);
 const id=data.routines.at(-1).id;await page.locator('[data-routine-id="'+id+'"] summary').click();await page.locator('[data-edit-routine="'+id+'"]').click();await page.locator('#routineWarm').fill('Ritmo cómodo');await page.locator('#routineForm button').filter({hasText:'Guardar rutina'}).click();await page.reload();data=await stored(page);expect(data.routines.at(-1)).toMatchObject({warm:'Ritmo cómodo',ex:[]});
});
test('extra conserva borrador al cerrar y permite descartarlo sin perder guardados',async({page})=>{
 await page.locator('#addExtraSession').click();await page.locator('#extraNote').fill('Retomar este borrador');await page.locator('#extraRpe').fill('5.5');await page.keyboard.press('Escape');await page.locator('#addExtraSession').click();await expect(page.locator('#extraNote')).toHaveValue('Retomar este borrador');await expect(page.locator('#extraRpe')).toHaveValue('5.5');await expect(page.locator('#extraDraftHint')).toBeVisible();
 await page.locator('[data-discard-extra]').click();await expect(page.locator('#extraNote')).toHaveValue('');await expect(page.locator('#extraRpe')).toHaveValue('');expect((await stored(page)).sessions).toHaveLength(3);await saveExtra(page);await page.locator('#addExtraSession').click();await expect(page.locator('#extraRpe')).toHaveValue('');
});
test('extra explica esfuerzo y permite agregar deporte sin perder comentario y RPE',async({page})=>{
 await page.locator('#addExtraSession').click();await expect(page.locator('#extraSessionDialog')).toContainText('1 · Muy suave');await expect(page.locator('#extraSessionDialog')).toContainText('toda la sesión');await page.locator('#extraNote').fill('Mi deporte');await page.locator('#extraRpe').fill('6');await page.locator('[data-add-extra-sport]').click();await page.locator('#extraSportName').fill('Tenis');await page.locator('[data-save-extra-sport]').click();await expect(page.locator('#extraSport')).toHaveValue('Tenis');await expect(page.locator('#extraNote')).toHaveValue('Mi deporte');await expect(page.locator('#extraRpe')).toHaveValue('6');await saveExtra(page);expect((await stored(page)).sessions.at(-1)).toMatchObject({sport:'Tenis',note:'Mi deporte',rpe:6,planUnlinked:true});
});
test('Mi plan explica realización y permite registrar esfuerzo desde el día seleccionado',async({page})=>{
 await page.locator('[data-tab="plan"]').click();await page.locator('[data-week-day="6"]>summary').click();await page.locator('[data-plan-check="pending"]').selectOption('complete');await expect(page.locator('#weekList')).toContainText('Cambia el plan; conserva tus registros');await page.locator('#weekList [data-register-planned="pending"]').click();await expect(page.locator('#entrenar')).toBeVisible();await expect(page.locator('#sessionPlanLink')).toHaveValue('pending');await expect(page.locator('#activityDate')).toHaveValue(date);await save(page);await page.locator('[data-tab="plan"]').click();await expect(page.locator('#weekList [data-register-planned="pending"]')).toHaveText('Ver / editar registro');expect((await stored(page)).planChecks).toEqual([]);await expect(page.locator('#notice')).toBeHidden();
});
test('lista explícita de rutinas e Inicio libre se descubren sin conocer nombres',async({page})=>{
 await page.locator('[data-tab="plan"]').click();await page.locator('#addActivity').click();await page.locator('#togglePlanRoutines').click();await page.locator('[data-plan-routine]').filter({hasText:'Fuerza'}).first().click();await expect(page.locator('#planTitle')).toHaveValue('Fuerza');await page.locator('#activityForm button').filter({hasText:'Guardar actividad del plan'}).click();expect((await stored(page)).week[0].at(-1).routineId).toBe('r');await expect(page.locator('#planWeekHelp')).toContainText('Para copiar');
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('pa_v6'));d.routines=[];d.week=Array.from({length:7},()=>[]);d.planWeeks={};d.sessions=[];localStorage.setItem('pa_v6',JSON.stringify(d));});await page.reload();await expect(page.locator('#blankStartHint')).toContainText('actividad libre');await page.locator('#startFreeActivity').click();await expect(page.locator('#activityDialog')).toBeVisible();await expect(page.locator('#planDay')).toHaveValue('6');
});
test('corregir una semana inválida limpia su error sin dejar un aviso obsoleto',async({page})=>{
 await page.locator('[data-tab="plan"]').click();await page.locator('#planWeekPicker').evaluate(input=>{input.value='2026-11-03';input.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('#notice')).toContainText('Elegí el lunes');await page.locator('#nextPlanWeek').click();await expect(page.locator('#planWeekPicker')).toHaveValue('2026-11-02');await expect(page.locator('#notice')).toBeHidden();await expect(page.locator('#planCalendarStatus')).toHaveText('Semana actualizada.');
});
