// One-off cleanup: dedupe duplicate menu labels, print final tree
import pg from 'pg';
const local = new pg.Pool({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable', max: 2 });

const { rows: dups } = await local.query(
  `SELECT label, COUNT(*)::int c FROM "MenuItem" WHERE "parentId" IS NOT NULL GROUP BY label HAVING COUNT(*) > 1`);
for (const { label } of dups) {
  const { rows: rs } = await local.query(
    `SELECT id FROM "MenuItem" WHERE label = $1 ORDER BY "createdAt" ASC`, [label]);
  const keep = rs[0].id;
  for (const r of rs.slice(1)) {
    await local.query(`DELETE FROM "MenuItem" WHERE id = $1`, [r.id]);
    console.log('deleted', label, r.id);
  }
  console.log('kept  ', label, keep);
}
const { rows: final } = await local.query(
  `SELECT id, label, "parentId", visible, "order" FROM "MenuItem" ORDER BY "order" ASC`);
const byParent = (id) => final.filter(m => m.parentId === id).map(m => m.label);
console.log('--- FINAL LOCAL MENU (' + final.length + ' items) ---');
for (const r of final.filter(m => !m.parentId)) {
  console.log('• ' + r.label + ' → ' + (byParent(r.id).length ? '[' + byParent(r.id).join(', ') + ']' : '—'));
}
await local.end();
