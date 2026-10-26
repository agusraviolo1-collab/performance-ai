import {YOGA} from './base.mjs?v=19';
export function migrateMobilityRoutine(data){
 if(data.mobilityRoutineMigrated)return data;
 const d=JSON.parse(JSON.stringify(data));d.mobilityRoutineMigrated=true;
 const weeks=[d.week,...Object.values(d.planWeeks||{})],hasData=d.routines.length||weeks.some(w=>w.some(day=>day.some(a=>!a.isRest&&a.sport==='Movilidad / yoga')));
 if(!hasData)return d;
 let routine=d.routines.find(r=>r.sport==='Movilidad / yoga');
 if(!routine&&d.routines.length<100){let id='movilidad';while(d.routines.some(r=>r.id===id))id+='-yoga';routine={id,title:'Movilidad / yoga',sport:'Movilidad / yoga',warm:'Ejercicios de tu bloque de movilidad. Ajustá las series, repeticiones o tiempos desde Editar rutina.',ex:YOGA.map(name=>[name,'Sin dosis indicada'])};d.routines.push(routine);}
 if(routine){if(!d.sports.includes(routine.sport))d.sports.push(routine.sport);for(const week of weeks)for(const day of week)for(const a of day)if(!a.isRest&&!a.routineId&&a.sport===routine.sport)a.routineId=routine.id;}
 return d;
}
