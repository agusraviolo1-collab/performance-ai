import {planForDate,duplicateSession} from './sport-data.mjs?v=25';

const sameValue=(a,b,key)=>(a?.[key]??null)===(b?.[key]??null);
const sameIdentity=(a,b)=>['date','sport','routineId','planActivityId'].every(key=>sameValue(a,b,key));

// El plan puede cambiar después de entrenar. La identidad histórica no depende
// de la rutina que actualmente esté vinculada a ese día.
export function prepareSessionSave(db,candidate,previous=null){
 const session={...candidate};
 if(previous&&(!db.sessions.some(s=>s.id===previous.id)||session.id!==previous.id))throw Error('El registro ya no está disponible. Cancelá la edición y volvé a abrirlo.');
 const unchanged=!!previous&&sameIdentity(session,previous);
 if(!unchanged){
  if(session.routineId){const routine=db.routines.find(r=>r.id===session.routineId);if(!routine||routine.sport!==session.sport)throw Error('Elegí una rutina disponible para el deporte seleccionado.');}
  if(session.planActivityId){
   const activity=planForDate(db,session.date).find(a=>a.id===session.planActivityId);
   if(!activity||activity.isRest)throw Error('La actividad planificada ya no está disponible para esa fecha. Elegí otra actividad o registrala sin vincular.');
   if(activity.sport!==session.sport||(activity.routineId&&activity.routineId!==session.routineId))throw Error('La rutina o el deporte no coinciden con la actividad planificada. Revisá la selección.');
  }else if(session.routineId){
   const matches=planForDate(db,session.date).filter(a=>!a.isRest&&a.routineId===session.routineId&&a.sport===session.sport);
   if(matches.length===1){session.planActivityId=matches[0].id;session.planStatus='complete';}
  }
  if(duplicateSession(db.sessions,session,previous?.id||null))throw Error('Esta rutina o actividad ya está registrada en esta fecha. Editá el registro existente para corregirlo o completar una actividad parcial.');
 }
 return session;
}
