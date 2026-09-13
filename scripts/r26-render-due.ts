import { renderDueQueue } from '../src/lib/social/publisher';
const r = await renderDueQueue('http://127.0.0.1:3000', 3);
console.log(JSON.stringify(r));
process.exit(0);
