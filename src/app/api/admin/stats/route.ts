import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';

// Local YYYY-MM-DD (avoids UTC off-by-one in visit chart)
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use allSettled so a single failed count doesn't break the whole dashboard.
  const counts = await Promise.allSettled([
    db.service.count(),
    db.visa.count(),
    db.opportunity.count(),
    db.news.count(),
    db.testimonial.count(),
    db.partner.count(),
    db.galleryItem.count(),
    db.paymentMethod.count(),
    db.faq.count(),
    db.contactMessage.count(),
    db.subscriber.count(),
    db.visit.count(),
  ]);
  const v = (i: number, fallback = 0) => counts[i].status === 'fulfilled' ? (counts[i] as PromiseFulfilledResult<number>).value : fallback;

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const [
    opportunityActive,
    opportunityPublished,
    opportunityDraft,
    opportunityExpired,
    opportunityArchived,
  ] = await Promise.all([
    db.opportunity.count({
      where: {
        status: 'published',
        OR: [{ deadline: null }, { deadline: { gte: todayUtc } }],
      },
    }).catch(() => 0),
    db.opportunity.count({ where: { status: 'published' } }).catch(() => 0),
    db.opportunity.count({ where: { status: 'draft' } }).catch(() => 0),
    db.opportunity.count({ where: { status: 'expired' } }).catch(() => 0),
    db.opportunity.count({ where: { status: 'archived' } }).catch(() => 0),
  ]);

  const [newMessages, recentMessages, recentSubscribers] = await Promise.all([
    db.contactMessage.count({ where: { status: 'new' } }).catch(() => 0),
    db.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
    db.subscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
  ]);

  // Visits last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentVisits = await db.visit.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, device: true, browser: true },
  }).catch(() => []);

  // Group by LOCAL day (UTC slice causes off-by-one in non-UTC timezones)
  const byDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay[localDay(d)] = 0;
  }
  recentVisits.forEach((visit) => {
    const day = localDay(visit.createdAt);
    if (byDay[day] !== undefined) byDay[day]++;
  });

  const deviceBreakdown = {
    desktop: recentVisits.filter((x) => x.device === 'desktop').length,
    mobile: recentVisits.filter((x) => x.device === 'mobile').length,
    tablet: recentVisits.filter((x) => x.device === 'tablet').length,
    other: recentVisits.filter((x) => x.device && !['desktop', 'mobile', 'tablet'].includes(x.device)).length,
  };

  // Moderation-queue counts (community submissions + UGC stories + alerts)
  const [pendingSubmissions, pendingStories, totalStories, alertSubscribers, activeAlertSubscribers] = await Promise.all([
    db.opportunitySubmission.count({ where: { status: 'pending' } }).catch(() => 0),
    db.successStory.count({ where: { status: 'pending' } }).catch(() => 0),
    db.successStory.count().catch(() => 0),
    db.alertSubscriber.count().catch(() => 0),
    db.alertSubscriber.count({ where: { status: 'active' } }).catch(() => 0),
  ]);

  const opportunityTotal = v(2);
  const opportunityHidden = Math.max(0, opportunityTotal - opportunityActive);
  const opportunityPublishedPastDeadline = Math.max(0, opportunityPublished - opportunityActive);

  return NextResponse.json({
    opportunityLifecycle: {
      total: opportunityTotal,
      activePublished: opportunityActive,
      published: opportunityPublished,
      publishedPastDeadline: opportunityPublishedPastDeadline,
      draft: opportunityDraft,
      expired: opportunityExpired,
      archived: opportunityArchived,
      hiddenFromPublic: opportunityHidden,
    },
    counts: {
      services: v(0), visas: v(1), opportunities: v(2), news: v(3), testimonials: v(4),
      partners: v(5), galleryItems: v(6), paymentMethods: v(7), faqs: v(8), contactMessages: v(9),
      subscribers: v(10), visits: v(11), newMessages,
      pendingSubmissions,
      pendingStories,
      totalStories,
      alertSubscribers,
      activeAlertSubscribers,
    },
    recentMessages,
    recentSubscribers,
    visitChart: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    deviceBreakdown,
  });
}
