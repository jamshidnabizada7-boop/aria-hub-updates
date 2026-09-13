import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const opportunities = await prisma.opportunity.findMany({
    where: { sourceName: 'Scholarships.af' }
  });

  console.log(`Found ${opportunities.length} opportunities from Scholarships.af`);

  let updatedCount = 0;
  const stripAfter = [
    'Frequently Asked Questions',
    'Other Opportunities You May Like',
    'Other Opportunities you may like',
    'Follow Us:',
    'Facebook',
    'YouTube',
    'Telegram',
    'Instagram',
    'WhatsApp',
    'Scholarship for Afghanistan — Making Education',
    'Scholarship for Afghanistan',
    'scholarships.af · o4af.com',
    'scholarships.af  o4af.com'
  ];

  for (const opp of opportunities) {
    if (!opp.description) continue;
    
    let desc = opp.description;
    let modified = false;

    for (const phrase of stripAfter) {
      const idx = desc.indexOf(phrase);
      if (idx !== -1) {
        const blockStart = desc.lastIndexOf('<', idx);
        desc = desc.substring(0, blockStart !== -1 ? blockStart : idx);
        modified = true;
      }
    }

    if (modified) {
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: { description: desc.trim() }
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} existing records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
