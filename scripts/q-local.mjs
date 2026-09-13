import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable', max: 2 });
const tables = ['Opportunity','OpportunityCategory','ImportSource','ImportRun','Language','SiteSetting','MenuItem','Section','Service','ServiceCategory','Visa','News','NewsCategory','Faq','FooterLink','PaymentMethod','PricingPackage','MonetizationOrder','OpportunitySubmission','Subscriber','AlertSubscriber','AdminUser','SuccessStory','Visit','Counter','Testimonial','Partner','SocialLink','WhyChooseUsFeature','ProcessStep','ComparisonRow','CtaBanner','GalleryAlbum','GalleryItem','TeamMember','Advertisement','ContactMessage','AuditLog'];
console.log('=== LOCAL DB ROW COUNTS ===');
for (const t of tables) {
  try { const { rows } = await pool.query(`SELECT COUNT(*)::int c FROM "${t}"`); console.log(`${t.padEnd(24)} ${String(rows[0].c).padStart(6)}`); }
  catch { console.log(`${t.padEnd(24)} (missing table)`); }
}
console.log('\n=== LOCAL OPPORTUNITIES (title, i18n, source, status) ===');
const { rows } = await pool.query(`SELECT title, slug, status, "sourceName", "titleI18n" IS NOT NULL AS has_i18n, "aiSummaryI18n" IS NOT NULL AS has_sum FROM "Opportunity" ORDER BY "createdAt" DESC LIMIT 20`);
rows.forEach(r => console.log(`${r.title.padEnd(45).slice(0,45)} ${r.status.padEnd(10)} src=${String(r.sourceName||'-').padEnd(12)} i18n=${r.has_i18n?'Y':'N'} sumI18n=${r.has_sum?'Y':'N'}`));
await pool.end();
