// Next's ESLint plugin only consumes globSync(pattern, {onlyDirectories:true}).
// Keep that contract without installing the vulnerable braces/micromatch tree.
const path=require('node:path');
const {globSync:tinyGlobSync}=require('tinyglobby');
function globSync(patterns,options={}){
 const results=[];
 for(const pattern of Array.isArray(patterns)?patterns:[patterns]){
  if(typeof pattern!=='string'||pattern.length>8192)throw new TypeError('Invalid root directory pattern');
  const normalized=pattern.replace(/\\/g,'/');
  const root=path.parse(normalized).root;
  const isAbsolute=path.isAbsolute(normalized);
  // Resolve Windows drive roots as cwd. A POSIX-style drive pattern handed
  // directly to tinyglobby can otherwise be interpreted relative to cwd.
  const found=tinyGlobSync(isAbsolute?normalized.slice(root.length):normalized,{
   ...options,...(isAbsolute?{cwd:root,absolute:true}:{}),
  });
  results.push(...found.map(p=>p.replace(/\\/g,'/').replace(/\/$/,'')));
 }
 return [...new Set(results)];
}
module.exports=Object.assign(async(patterns,options)=>globSync(patterns,options),{globSync,sync:globSync});
