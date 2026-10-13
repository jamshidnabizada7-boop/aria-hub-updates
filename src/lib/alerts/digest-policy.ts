import {createHash} from 'node:crypto';
export function digestIsDue(last:Date|null,frequency:string,now:Date){
 return !last||now.getTime()-last.getTime()>=(frequency==='weekly'?7:1)*86400000;
}
export function digestAttemptKey(kind:string,id:string,frequency:string,now:Date){
 const window=(frequency==='weekly'?7:1)*86400000;
 return 'alert-digest:'+createHash('sha256').update([kind,id,frequency,Math.floor(now.getTime()/window)].join(':')).digest('hex');
}
