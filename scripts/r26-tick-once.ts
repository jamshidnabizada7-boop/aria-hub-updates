import { runTick } from '../src/lib/automation/tick';
const r = await runTick();
console.log(JSON.stringify(r, null, 1));
process.exit(0);
