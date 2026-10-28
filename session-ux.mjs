export function isSessionDraftDirty(initial,current,ignored=[]){if(!initial)return false;return Object.keys(initial).some(key=>!ignored.includes(key)&&String(initial[key]??'')!==String(current[key]??''));}
export function sameSessionTarget(session,date,activity){if(!session||session.date!==date||!activity)return false;return session.planActivityId?session.planActivityId===activity.id:!!session.routineId&&session.routineId===activity.routineId&&session.sport===activity.sport;}
export function sessionRoutineTitle(routine,previous,preservePrevious){return preservePrevious?String(previous?.routineTitle??''):String(routine?.title??'');}
export function sessionPlannedTitle(activity,previous,preservePrevious){return preservePrevious?String(previous?.plannedTitle??''):String(activity?.title??'');}
// A pending transition is consumed exactly once; cancel never executes it.
export function createSessionExitGuard(){let pending=null;return {request(dirty,action){pending=null;if(!dirty){action();return true;}pending=action;return false;},cancel(){pending=null;},discard(){const action=pending;pending=null;action?.();},get pending(){return pending!==null;}};}
