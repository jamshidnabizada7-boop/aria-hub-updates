import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultFeatures = [
  { icon: 'Globe2', key: 'f1', color: 'from-primary to-chart-2', glow: 'bg-primary/20', title: 'تخصص جهانی', description: 'شبکه جهانی متخصصان در ۵۰+ کشور برای هر جزئیات.', order: 1 },
  { icon: 'Zap', key: 'f2', color: 'from-chart-2 to-chart-3', glow: 'bg-chart-2/20', title: 'سرعت بالا', description: 'فرآیندهای ساده‌شده که زمان پردازش را کاهش می‌دهد.', order: 2 },
  { icon: 'ShieldCheck', key: 'f3', color: 'from-chart-3 to-chart-4', glow: 'bg-chart-3/20', title: 'امنیت بانکی', description: 'داده‌ها و مدارک شما با رمزنگاری سازمانی محافظت می‌شود.', order: 3 },
  { icon: 'BadgeDollarSign', key: 'f4', color: 'from-chart-4 to-primary', glow: 'bg-chart-4/20', title: 'قیمت شفاف', description: 'هزینه‌های واضح بدون هزینه‌های پنهان.', order: 4 },
  { icon: 'Users2', key: 'f5', color: 'from-primary to-chart-4', glow: 'bg-primary/20', title: 'پشتیبانی اختصاصی', description: 'یک مدیر پرونده شخصی که شما را در هر مرحله راهنمایی می‌کند.', order: 5 },
  { icon: 'Award', key: 'f6', color: 'from-chart-2 to-primary', glow: 'bg-chart-2/20', title: 'نتایج اثبات‌شده', description: 'نرخ موفقیت ۹۸٪ پشتیبانی‌شده توسط هزاران درخواست موفق.', order: 6 },
];

async function main() {
  console.log('Seeding Why Choose Us features...');
  
  for (const feature of defaultFeatures) {
    const existing = await prisma.whyChooseUsFeature.findUnique({
      where: { key: feature.key }
    });

    if (!existing) {
      await prisma.whyChooseUsFeature.create({
        data: {
          key: feature.key,
          icon: feature.icon,
          color: feature.color,
          glow: feature.glow,
          title: feature.title,
          description: feature.description,
          order: feature.order,
          enabled: true,
        }
      });
      console.log(`Created feature: ${feature.title}`);
    } else {
      console.log(`Feature already exists: ${feature.title}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
