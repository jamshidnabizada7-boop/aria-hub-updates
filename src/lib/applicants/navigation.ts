/** Only return to a native application in the current locale; never an arbitrary redirect. */
export function applicantReturnPath(raw:string|null|undefined,lang:'en'|'fa'|'ps'):string{
 const fallback='/'+lang+'/portal',prefix='/'+lang+'/apply/';
 if(!raw||raw.length>1000||!raw.startsWith(prefix))return fallback;
 try{const slug=decodeURIComponent(raw.slice(prefix.length));return /^[\p{L}\p{N}-]{1,220}$/u.test(slug)?prefix+encodeURIComponent(slug):fallback;}catch{return fallback;}
}
