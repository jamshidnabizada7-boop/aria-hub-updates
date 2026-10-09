import 'server-only';
import { spawn } from 'node:child_process';

/** Fail closed: staging needs an explicitly installed local virus scanner. */
export async function scanCV(bytes: Uint8Array): Promise<boolean> {
  if (process.env.CV_CLAMAV_ENABLED !== 'true') return false;
  return new Promise(resolve => {
    let settled=false;
    const finish=(clean:boolean)=>{if(!settled){settled=true;clearTimeout(timeout);resolve(clean);}};
    // Never interpolate user input or invoke a shell.
    const child=spawn('clamscan',['--no-summary','-'],{stdio:['pipe','ignore','ignore']});
    const timeout=setTimeout(()=>{child.kill('SIGKILL');finish(false);},30000);
    child.on('error',()=>finish(false));
    child.on('close',code=>finish(code===0)); // 1 = infected; 2 = scanner error
    child.stdin.on('error',()=>finish(false));
    child.stdin.end(Buffer.from(bytes));
  });
}
