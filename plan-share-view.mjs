import {weekAt} from './sport-data.mjs?v=19';
import {coachPdf,downloadPdf} from './pdf-export.mjs?v=19';
import {nextMonday,buildPlanPackage,planText,planFragment,planHtml,planCsv,planTotals} from './plan-share.mjs?v=19';
const $=id=>document.getElementById(id);
export function mountPlanShare(getData,available=()=>true){
 let packet=null,sharing=false;
 $('shareWeek').value=nextMonday();
 const actionIds=['nativeSharePlan','copyPlan','downloadPlanTxt','downloadPlanHtml','downloadPlanCsv','printPlan'];
 function preview(){
 $('coachPdfLink').classList.add('hide');
  try{if(!available())throw Error('Los datos actuales no se pueden leer. Restaurá un respaldo válido antes de compartir.');packet=buildPlanPackage({...getData(),week:weekAt(getData(),$('shareWeek').value)},{weekStart:$('shareWeek').value,includeRoutines:$('shareRoutines').checked,includeRecent:$('shareRecent').checked,note:$('shareNote').value});$('sharePlanPreview').innerHTML=planFragment(packet);$('sharePlanPreview').classList.remove('hide');$('sharePlanStatus').textContent='Vista previa actualizada. Todavía no se compartió ningún dato.';actionIds.forEach(id=>$(id).disabled=false);$('manualPlanCopy').classList.add('hide');}
  catch(err){packet=null;$('sharePlanPreview').classList.add('hide');$('manualPlanCopy').classList.add('hide');$('sharePlanStatus').textContent=err.message;actionIds.forEach(id=>$(id).disabled=true);}
 }
 $('openPlanShare').onclick=()=>{$('shareWeek').value=getData().planWeekStart;$('shareRecent').checked=false;preview();$('sharePlanDialog').showModal();};
 for(const id of ['shareWeek','shareRoutines','shareRecent'])$(id).addEventListener('change',preview);$('shareNote').addEventListener('input',preview);
 function download(content,extension,type){if(!packet)return;const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download='performance-ai-plan-'+packet.weekStart+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);$('sharePlanStatus').textContent='Archivo preparado. Revisá las descargas de tu dispositivo para enviarlo.';}
 $('downloadPlanTxt').onclick=()=>packet&&download(planText(packet),'txt','text/plain;charset=utf-8');$('downloadPlanHtml').onclick=()=>packet&&download(planHtml(packet),'html','text/html;charset=utf-8');$('downloadPlanCsv').onclick=()=>packet&&download(planCsv(packet),'csv','text/csv;charset=utf-8');
 $('copyPlan').onclick=async()=>{if(!packet)return;const text=planText(packet);try{if(!navigator.clipboard?.writeText)throw Error('Sin acceso al portapapeles');await navigator.clipboard.writeText(text);$('sharePlanStatus').textContent='Planificación copiada. Podés pegarla en el mensaje para tu entrenador.';}catch{$('manualPlanCopy').classList.remove('hide');$('planCopyText').value=text;$('planCopyText').focus();$('planCopyText').select();$('sharePlanStatus').textContent='El navegador no permitió copiar automáticamente. Copiá el texto seleccionado o descargá el archivo TXT.';}};
 $('nativeSharePlan').onclick=async()=>{
  if(!packet||sharing)return;if(typeof navigator.share!=='function'){$('sharePlanStatus').textContent='Este navegador no ofrece compartir directamente. Usá Copiar texto, Descargar TXT o Descargar PDF.';return;}
  sharing=true;$('nativeSharePlan').disabled=true;
  try{const text=planText(packet),title='Planificación · '+packet.weekStart;let payload={title,text};if(typeof navigator.canShare==='function'&&typeof File==='function'){const file=new File([text],'performance-ai-plan-'+packet.weekStart+'.txt',{type:'text/plain'});if(navigator.canShare({files:[file]}))payload={title,files:[file]};}
   $('sharePlanStatus').textContent='Elegí la app y el destinatario en el menú de tu dispositivo.';await navigator.share(payload);$('sharePlanStatus').textContent='La acción de compartir finalizó. La app no puede confirmar la entrega al destinatario.';
  }catch(err){$('sharePlanStatus').textContent=err.name==='AbortError'?'Compartir cancelado. El plan se conserva.':'No se pudo abrir la opción de compartir. Usá Copiar texto o descargá la ficha.';}
  finally{sharing=false;$('nativeSharePlan').disabled=!packet;}
 };
 $('printPlan').onclick=async()=>{if(!packet||$('printPlan').disabled)return;const snapshot=packet;$('printPlan').disabled=true;$('sharePlanStatus').textContent='Generando PDF…';try{const bytes=await coachPdf(snapshot);const ready=downloadPdf(bytes,'performance-ai-plan-'+snapshot.weekStart+'.pdf');$('coachPdfLink').href=ready.url;$('coachPdfLink').download=ready.filename;$('coachPdfLink').classList.remove('hide');$('sharePlanStatus').textContent='PDF listo. Si no se abrió la descarga, tocá Guardar PDF generado.';}catch(error){$('sharePlanStatus').textContent='No se pudo generar el PDF. Revisá la conexión y recargá la app. Podés descargar la ficha HTML o copiar el texto.';}finally{$('printPlan').disabled=!packet;}};
 window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-plan');$('planPrintRoot').textContent='';});
 function renderSummary(){const totals=planTotals(getData().week);$('plannedLoadSummary').textContent=`${totals.partial?'Suma parcial de carga definida':'Carga semanal prevista'}: ${totals.load} u. · ${totals.minutes} min definidos · ${totals.missing} actividad(es) con datos de carga pendientes.`;}
 return {render:renderSummary};
}
