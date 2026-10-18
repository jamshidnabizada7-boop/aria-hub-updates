import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Search, ArrowRight, ArrowLeft, FileText, ScanSearch, ClipboardList } from 'lucide-react';
import { daysUntilDeadline, type OpportunityCardData, type CategoryFacet } from '@/lib/opportunity-shared';
import { AriaPreviewNav } from './aria-preview-nav';
import { AriaNewsletter } from './aria-newsletter';
import { formatDateShort } from '@/lib/date-format';
import type { Lang } from '@/lib/lang-route';

type Props = {
  lang: Lang;
  activeCount: number;
  latest: OpportunityCardData[];
  closingSoon: OpportunityCardData[];
  spotlight: OpportunityCardData | null;
  categories: CategoryFacet[];
  preview?: boolean;
};

const copy = {
  en: {
    navOpp: 'Opportunities', navServices: 'Services', dashboard: 'Dashboard',
    eyebrow: 'UPDATED DAILY', headline: 'Your future starts', highlight: 'right here.',
    summary: 'Jobs, scholarships and trusted career programs in Afghanistan and abroad — all in one place.',
    searchPlaceholder: 'Try graphic designer, scholarship or an organization', search: 'Search',
    searchHint: 'Search in English, Persian (Afghanistan) or Pashto.',
    featured: 'Explore opportunities', categories: 'Discover and apply',
    latestEyebrow: 'LATEST LISTINGS', latest: 'New opportunities, every day.',
    latestSub: 'Gathered from organizations in Afghanistan and international sources.',
    viewAll: 'View all', promoted: 'Promoted', fresh: 'New',
    close: 'Closes', noDeadline: 'Deadline not listed', noItems: 'There are no active listings to show right now.',
    pick: 'Opportunity of the day', viewApply: 'View & apply', urgent: 'Closing soon',
    urgentSub: 'Deadlines in the next few days.', deadlines: 'All deadlines',
    today: 'Last day', days: 'days left', noUrgent: 'No upcoming deadlines in this selection.',
    cta: 'Find opportunities matched to you', ctaInfo: 'Create a free account, save a search and choose the alerts you want.',
    start: 'Create free account', detail: 'Explore the listing'
  },
  fa: {
    navOpp: 'فرصت‌ها', navServices: 'خدمات', dashboard: 'داشبورد',
    eyebrow: 'به‌روزرسانی روزانه', headline: 'فرصت آینده‌ات', highlight: 'همین‌جاست!',
    summary: 'وظایف، بورسیه‌ها و برنامه‌های معتبر در افغانستان و خارج از کشور — همه در یک‌جا.',
    searchPlaceholder: 'عنوان وظیفه، بورسیه یا سازمان را جستجو کنید', search: 'جستجو',
    searchHint: 'جستجو به فارسی (افغانستان)، پشتو یا انگلیسی.',
    featured: 'جستجوی فرصت‌ها', categories: 'کشف و درخواست',
    latestEyebrow: 'تازه‌ترین فرصت‌ها', latest: 'هر روز فرصت‌های تازه.',
    latestSub: 'فرصت‌ها از سازمان‌ها و منابع بین‌المللی گردآوری می‌شوند.',
    viewAll: 'مشاهده همه', promoted: 'ویژه', fresh: 'تازه',
    close: 'آخرین مهلت', noDeadline: 'مهلت مشخص نیست', noItems: 'در حال حاضر فرصتی برای نمایش وجود ندارد.',
    pick: 'فرصت امروز', viewApply: 'مشاهده و درخواست', urgent: 'مهلت‌های نزدیک',
    urgentSub: 'فرصت‌هایی که در چند روز آینده پایان می‌یابند.', deadlines: 'همه مهلت‌ها',
    today: 'روز آخر', days: 'روز باقی مانده', noUrgent: 'در این بخش مهلت نزدیکی وجود ندارد.',
    cta: 'فرصت‌های متناسب با خود را بیابید', ctaInfo: 'حساب رایگان بسازید، جستجو را ذخیره و هشدارهای دلخواه خود را فعال کنید.',
    start: 'ایجاد حساب رایگان', detail: 'مشاهده فرصت'
  },
  ps: {
    navOpp: 'فرصتونه', navServices: 'خدمتونه', dashboard: 'زما حساب',
    eyebrow: 'هره ورځ تازه کېږي', headline: 'ستاسو راتلونکی فرصت', highlight: 'همدلته دی!',
    summary: 'په افغانستان او بهر کې دندې، بورسونه او باوري مسلکي پروګرامونه — ټول په یوه ځای کې.',
    searchPlaceholder: 'دنده، بورس يا اداره ولټوئ', search: 'لټون',
    searchHint: 'په پښتو، فارسي (افغانستان) او انګلیسي ژبو لټون.',
    featured: 'فرصتونه وګورئ', categories: 'موندنه او غوښتنلیک',
    latestEyebrow: 'تازه فرصتونه', latest: 'هره ورځ نوي فرصتونه.',
    latestSub: 'له افغانستان او نړیوالو سرچینو راټول شوي فرصتونه.',
    viewAll: 'ټول وګورئ', promoted: 'ځانګړی', fresh: 'نوی',
    close: 'وروستۍ نېټه', noDeadline: 'وروستۍ نېټه نه ده ټاکل شوې', noItems: 'اوس د ښودلو لپاره فعال فرصت نشته.',
    pick: 'د نن فرصت', viewApply: 'وګورئ او غوښتنه وکړئ', urgent: 'ژر پای ته رسېږي',
    urgentSub: 'په راتلونکو څو ورځو کې ختمېدونکي فرصتونه.', deadlines: 'ټولې نېټې',
    today: 'وروستۍ ورځ', days: 'ورځې پاتې', noUrgent: 'په دې لړ کې نږدې وروستۍ نېټه نشته.',
    cta: 'خپل مناسب فرصتونه ومومئ', ctaInfo: 'وړیا حساب جوړ کړئ، لټون خوندي او خپلې خبرتیاوې فعالې کړئ.',
    start: 'وړیا حساب جوړ کړئ', detail: 'فرصت وګورئ'
  }
} as const;

const toolsCopy: Record<Lang, { title:string; subtitle:string; items: {title:string; summary:string; path:string}[] }> = {
  en: { title:'Career tools, made simpler.', subtitle:'Organize each step of your opportunity search in one place.', items:[
    {title:'Build your CV',summary:'Prepare and edit a professional CV for your next application.',path:'/cv-builder'},
    {title:'Find my matches',summary:'Compare real opportunity requirements with your own profile.',path:'/portal/matcher'},
    {title:'Track applications',summary:'Save deadlines and keep private notes on your progress.',path:'/portal/career'}]},
  fa: { title:'ابزارهای کاری، ساده‌تر از همیشه.', subtitle:'مراحل جستجو و درخواست فرصت‌ها را در یک‌جا مدیریت کنید.', items:[
    {title:'ساخت سی‌وی',summary:'سی‌وی حرفه‌ای خود را برای درخواست‌ها آماده و ویرایش کنید.',path:'/cv-builder'},
    {title:'فرصت‌های مناسب من',summary:'شرایط فرصت‌های واقعی را با مشخصات خود مقایسه کنید.',path:'/portal/matcher'},
    {title:'پیگیری درخواست‌ها',summary:'مهلت‌ها و یادداشت‌های شخصی خود را مدیریت کنید.',path:'/portal/career'}]},
  ps: { title:'مسلکي وسيلې په ساده بڼه.', subtitle:'د فرصتونو لټون او غوښتنلیکونه په یوه ځای کې تنظیم کړئ.', items:[
    {title:'سي وي جوړ کړئ',summary:'خپل مسلکي سي وي جوړ او سم کړئ.',path:'/cv-builder'},
    {title:'زما مناسب فرصتونه',summary:'د فرصتونو شرطونه له خپلو معلوماتو سره پرتله کړئ.',path:'/portal/matcher'},
    {title:'غوښتنلیکونه تعقیب کړئ',summary:'وروستۍ نېټې او شخصي یادښتونه وساتئ.',path:'/portal/career'}]}
};

function Card({ item, lang }: { item: OpportunityCardData; lang: Lang }) {
  const c = copy[lang];
  const days = item.deadline ? daysUntilDeadline(item.deadline) : null;
  return (
    <Link href={'/' + lang + '/opportunities/' + item.slug} className="aria-card">
      <div className="aria-card__badges">
        <span className="aria-tag">{item.categoryLabel}</span>
        {item.featured ? <span className="aria-tag aria-tag--orange">{c.promoted}</span> :
          Date.now() - new Date(item.createdAt).getTime() <= 7 * 86400000 ?
            <span className="aria-tag">{c.fresh}</span> : null}
      </div>
      <h3 dir="auto">{item.title}</h3>
      <p className="aria-card__meta" dir="auto">
        {[item.organization, item.country].filter(Boolean).join(' · ')}
      </p>
      <div className="aria-card__footer">
        <span>{item.deadline ? c.close + ': ' + formatDateShort(item.deadline, lang) : c.noDeadline}</span>
        <ArrowUpRight size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
      </div>
      {days !== null && days <= 1 && days >= 0 && <span className="sr-only">{c.today}</span>}
    </Link>
  );
}

export function AriaHomePreview({ lang, activeCount, latest, closingSoon, spotlight, categories, preview = true }: Props) {
  const c = copy[lang];
  const rtl = lang !== 'en';
  const DirArrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <div className="aria-v2" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
      <AriaPreviewNav lang={lang} preview={preview}/>

      <main id="main-content" className="aria-container">
        <section className="aria-hero" aria-labelledby="aria-v2-title">
          <div className="aria-hero__inner">
            <div>
              <span className="aria-hero__eyebrow">{c.eyebrow}</span>
              <h1 id="aria-v2-title">{c.headline} <em>{c.highlight}</em></h1>
              <p>{c.summary}</p>
              <form action={'/' + lang + '/opportunities'} method="get" role="search" className="aria-search">
                <Search size={19} style={{ marginInlineStart: 12, flexShrink: 0 }} aria-hidden="true" />
                <input name="q" type="search" aria-label={c.searchPlaceholder} placeholder={c.searchPlaceholder}/>
                <button className="aria-button" type="submit">{c.search}</button>
              </form>
              <div className="aria-hero__fineprint">{c.searchHint} · {activeCount.toLocaleString('en-US')} {c.navOpp}</div>
            </div>
            <div className="aria-hero__photo">
              {/* Uses the existing ARIA HUB asset until the approved student photograph is supplied. */}
              <Image src="/images/hero/hero-bg.webp" alt="" fill priority sizes="(max-width: 720px) 100vw, 40vw"/>
              <div className="aria-hero__photo-caption">{c.featured}</div>
            </div>
          </div>
        </section>

        {categories.some(category => category.count > 0) && (
          <nav className="aria-categories" aria-label={c.categories}>
            {categories.filter(category => category.count > 0).slice(0,8).map(category => (
              <Link key={category.slug} className="aria-category-chip" href={`/${lang}/opportunities?category=${encodeURIComponent(category.slug)}`}>
                {category.name} <span>{category.count.toLocaleString('en-US')}</span>
              </Link>
            ))}
          </nav>
        )}

        <section className="aria-section" aria-labelledby="aria-v2-listings">
          <div className="aria-section__head">
            <div>
              <span className="aria-eyebrow">{c.latestEyebrow}</span>
              <h2 id="aria-v2-listings">{c.latest}</h2>
              <p className="aria-muted" style={{ fontSize: 13, marginTop: 5 }}>{c.latestSub}</p>
            </div>
            <Link className="aria-button aria-button--outline" href={'/' + lang + '/opportunities'}>
              {c.viewAll}<DirArrow size={16} aria-hidden="true"/>
            </Link>
          </div>
          {latest.length ? <div className="aria-grid">{latest.slice(0,8).map(item => <Card key={item.id} item={item} lang={lang}/>)}</div> :
            <p className="aria-muted">{c.noItems}</p>}
        </section>

        <div className="aria-bands">
          {spotlight ? <section className="aria-spotlight" aria-label={c.pick}>
            <span className="aria-tag aria-tag--orange" style={{ width:'fit-content' }}>{c.pick}</span>
            <h3 dir="auto">{spotlight.title}</h3>
            <p style={{ color:'#d4e0ff', fontSize:13 }}>{[spotlight.organization, spotlight.categoryLabel].filter(Boolean).join(' · ')}</p>
            {spotlight.summary ? <p dir="auto" style={{ fontSize:13, lineHeight:1.7, marginTop:12 }}>{spotlight.summary}</p> : null}
            <Link style={{ marginTop:'auto', color:'#ffbd64', textDecoration:'none', fontWeight:750, display:'flex', alignItems:'center', gap:10 }} href={'/' + lang + '/opportunities/' + spotlight.slug}>
              {c.viewApply}<DirArrow size={16} aria-hidden="true"/>
            </Link>
          </section> : <section className="aria-spotlight"><h3>{c.noItems}</h3></section>}
          <section className="aria-deadlines" aria-label={c.urgent}>
            <div className="aria-section__head">
              <div><h2 style={{ fontSize:24 }}>{c.urgent}</h2><p className="aria-muted" style={{ fontSize:12 }}>{c.urgentSub}</p></div>
              <Link href={'/' + lang + '/deadlines'} style={{ fontSize:12, color:'#b00014', textDecoration:'none', fontWeight:700 }}>{c.deadlines}</Link>
            </div>
            {closingSoon.length ? closingSoon.slice(0,4).map(item => {
              const days = item.deadline ? daysUntilDeadline(item.deadline) : null;
              return (
                <Link href={'/' + lang + '/opportunities/' + item.slug} className="aria-deadlines__row" key={item.id}>
                  <span><strong dir="auto">{item.title}</strong><small dir="auto">{item.organization}</small></span>
                  {days !== null && days >= 0 ? <span className="aria-countdown">{days <= 0 ? c.today : days + ' ' + c.days}</span> : null}
                </Link>
              );
            }) : <p className="aria-muted">{c.noUrgent}</p>}
          </section>
        </div>

        <section className="aria-section" aria-labelledby="aria-v2-tools">
          <div className="aria-section__head">
            <div><span className="aria-eyebrow">{c.categories}</span><h2 id="aria-v2-tools">{toolsCopy[lang].title}</h2><p className="aria-muted" style={{ fontSize:13, marginTop:6 }}>{toolsCopy[lang].subtitle}</p></div>
          </div>
          <div className="aria-tools-grid">
            {toolsCopy[lang].items.map((tool,index) => {
              const Icon = index === 0 ? FileText : index === 1 ? ScanSearch : ClipboardList;
              return <Link key={tool.path} href={`/${lang}${tool.path}`} className="aria-tool-card">
                <Icon size={24} aria-hidden="true"/>
                <strong>{tool.title}</strong><span>{tool.summary}</span>
                <ArrowUpRight size={16} aria-hidden="true" style={{ marginTop:'auto' }}/>
              </Link>;
            })}
          </div>
        </section>

        <section className="aria-footer-cta">
          <div><h2 style={{ fontSize:22, fontWeight:800 }}>{c.cta}</h2><p>{c.ctaInfo}</p></div>
          <Link href={'/' + lang + '/get-started'} className="aria-button aria-button--orange">{c.start} <DirArrow size={16} aria-hidden="true"/></Link>
        </section>
        <AriaNewsletter lang={lang} />
        <footer className="aria-site-footer">
          <span>© {new Date().getFullYear()} ARIA HUB</span>
          <nav aria-label={c.categories}>
            <Link href={`/${lang}/opportunities`}>{c.browse}</Link>
            <Link href={`/${lang}/services`}>{c.navServices}</Link>
            <Link href={`/${lang}/contact`}>{lang === 'en' ? 'Contact' : lang === 'fa' ? 'تماس' : 'اړیکه'}</Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
