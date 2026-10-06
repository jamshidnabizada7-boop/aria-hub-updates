const { PrismaClient } = require('/opt/aria-hub/releases/20261004-1822-03db843/node_modules/@prisma/client');
const fs = require('fs');
const dir = process.argv[2];
const p = new PrismaClient({ log: ['error'] });
async function dumpTable(name, where = '') {
  const rows = await p.$queryRawUnsafe(`SELECT * FROM "${name}"${where}`);
  fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(rows));
  return rows.length;
}
(async () => {
  const meta = { takenAt: new Date().toISOString(), purpose: 'pre-final-release migration backup (4 additive migrations)', database: 'Supabase project (see DATABASE_URL host in web.env)', migrationStateBefore: null };
  const migs = await p.$queryRawUnsafe(`SELECT migration_name, started_at, finished_at FROM _prisma_migrations ORDER BY started_at`);
  fs.writeFileSync(`${dir}/_prisma_migrations.json`, JSON.stringify(migs, null, 1));
  meta.migrationStateBefore = migs.map(m => m.migration_name);
  const counts = {};
  counts.User = await dumpTable('User');
  counts.ImportSource = await dumpTable('ImportSource');
  counts.RateLimitBucket = await dumpTable('RateLimitBucket').catch(() => 'absent');
  const userCols = await p.$queryRawUnsafe(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='User' ORDER BY ordinal_position`);
  const srcCols = await p.$queryRawUnsafe(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='ImportSource' ORDER BY ordinal_position`);
  fs.writeFileSync(`${dir}/schema-snapshot.json`, JSON.stringify({ User: userCols, ImportSource: srcCols }, null, 1));
  counts.Organization = await dumpTable('Organization');
  counts.OrganizationMember = await dumpTable('OrganizationMember');
  counts.OpportunitySourceObservation = await dumpTable('OpportunitySourceObservation');
  fs.writeFileSync(`${dir}/BACKUP-META.json`, JSON.stringify({ ...meta, tableRowCounts: counts }, null, 1));
  console.log('BACKUP_OK rows:', JSON.stringify(counts));
  await p.$disconnect();
})().catch(e => { console.error('BACKUP_FAIL: ' + String(e.message).slice(0, 140)); process.exit(1); });
