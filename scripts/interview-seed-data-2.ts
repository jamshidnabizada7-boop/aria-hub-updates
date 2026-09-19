/**
 * Interview seed data — part 2: exchange & fellowship, graduate admissions,
 * NGO & humanitarian questions. All content trilingual { en, fa, ps }.
 */
import type { Trilingual, TrilingualList } from './interview-seed-types';
import type { SeedQuestion } from './interview-seed-data-1';

export const SEED_QUESTIONS_PART2: SeedQuestion[] = [
  // ─── Exchange & fellowships ───
  {
    categorySlug: 'exchange-fellowships',
    question: {
      en: 'Why did you apply for this exchange program, and what do you expect to gain from it?',
      fa: 'چرا برای این برنامه تبادلی درخواست دادید و چه چیزی از آن انتظار دارید؟',
      ps: 'ولې د دې تبادلي پروګرام لپاره غوښتنه وکړه او له هغه څه تمه لرې؟',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'I applied because the program\u2019s focus on civic leadership matches the work I already do with youth groups in Mazar-e-Sharif. I expect three things: training in project management that our organizations lack, a network of peers across the region facing similar challenges, and first-hand experience of how community programs are run at scale. I will bring all three back into my current organization immediately after the exchange.',
      fa: 'درخواست دادم زیرا تمرکز این برنامه بر رهبری مدنی با کاری که هم‌اکنون با گروه‌های جوانان در مزار شریف انجام می‌دهم مطابقت دارد. سه چیز انتظار دارم: آموزش مدیریت پروژه که سازمان‌های ما از آن بی‌بهره‌اند، شبکه‌ای از همتایان در منطقه که با چالش‌های مشابه روبه‌رو هستند، و تجربه مستقیم از نحوه اداره برنامه‌های اجتماعی در مقیاس بزرگ. هر سه را بلافاصله پس از تبادل به سازمان فعلی‌ام منتقل می‌کنم.',
      ps: 'ځکه غوښتنه مې وکړه چې د دې پروګرام د مدني مشرتوب تمرکز له هغه کار سره سمون لري چې اوس په مزار شریف کې د ځوانانو ډلو سره کوم. درې شي تمه لرم: د پروژې ادارې روزنه چې زموږ بنسټونه ورنه برخمن دي، په سیمه کې د ورته ننګونو سره مخامخ سیالانو شبکه، او دا چې ټولنیز پروګرامونه په لویه کچه څنګه اداره کیږي. درې واړه سم د تبادلې وروسته خپلې اوسنۍ ادارې ته راوړم.',
    },
    strongExample: {
      en: '\u201CYour entrepreneurship module directly upgrades the women\u2019s tailoring cooperative I manage — I come to learn systems, not to sightsee.\u201D',
      fa: '\u00ABماژول کارآفرینی شما مستقیماً تعاونی خیاطی زنانی را که مدیریت می‌کنم ارتقا می‌دهد — برای یادگیری سیستم‌ها می‌آیم، نه برای گردش.\u00BB',
      ps: '\u00ABستا د کاروبار مضمون هغه د ښځو کپنګ چې زه یې اداره کوم مستقیماً پرمخ وړي — د سیسټمونو د زده‌کړې لپاره راځم، نه سیلانیې.\u00BB',
    },
    weakExample: {
      en: '\u201CI want to see the world and experience life abroad. It will be a great opportunity for me.\u201D',
      fa: '\u00ABمی‌خواهم جهان را ببینم و زندگی در خارج را تجربه کنم. برایم فرصت بزرگی خواهد بود.\u00BB',
      ps: '\u00ABغواړم نړۍ ووینم او بهر ژوند تجربه کړم. زما لپاره لوی فرصت به وي.\u00BB',
    },
    tips: {
      en: 'Exchange programs select for multiplier effect: show what you will do WITH the experience, not just why you deserve it. Connect the program\u2019s stated goals to your ongoing work.',
      fa: 'برنامه‌های تبادلی به دنبال اثر چندبرابری هستند: نشان دهید با این تجربه چه خواهید کرد، نه فقط اینکه چرا مستحق آن هستید. اهداف اعلام‌شده برنامه را به کار جاری خود پیوند دهید.',
      ps: 'تبادلي پروګرامونه ډېر وال اغېز لټوي: وښيه چې له دې تجربې وروسته به څه کوې، نه یوازې دا چې ولې یې مستحق یې. د پروګرام اعلان شوې موخې خپلې روانې کار سره ونښلوه.',
    },
    commonMistakes: {
      en: ['\u201CTravel and see the world\u201D framing', 'Not knowing the program\u2019s actual themes', 'No plan for sharing knowledge at home'],
      fa: ['چارچوب \u201Cسفر و دیدن جهان\u201D', 'ندانستن موضوعات واقعی برنامه', 'نبود برنامه برای انتقال دانش به وطن'],
      ps: ['د \u00ABسفر او نړۍ لیدل\u00BB چوکاټ', 'د پروګرام ریښتیني موضوعات نه پوهېدل', 'کور ته د پوهې د رسولو پلان نه لرل'],
    },
    followUps: {
      en: ['What will you do in the first month after returning?', 'Which part of the program will be hardest for you?'],
      fa: ['در نخستین ماه پس از بازگشت چه خواهید کرد؟', 'کدام بخش برنامه برای شما سخت‌تر خواهد بود؟'],
      ps: ['له راستنېدو لومړنې میاشت کې به څه کوې؟', 'د پروګرام کومه برخه ستا لپاره سخته به وي؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'exchange-fellowships',
    question: {
      en: 'How will you share what you learn with your community in Afghanistan?',
      fa: 'چگونه آموخته‌های خود را با جامعه افغانستان به اشتراک می‌گذارید؟',
      ps: 'زه په تبادله کې زده کړي شوي څه له خپلې ټولنې سره څنګه شریکوم؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'I have a concrete distribution plan. First, a two-hour workshop for the 25 members of our youth network within one month of returning, using the program materials. Second, I run a Telegram channel with 1,900 followers where I publish weekly summaries — I will document the whole experience there. Third, I have agreed with my old school principal to give a career talk to grade 11 and 12 students each visit home.',
      fa: 'برنامه مشخصی برای انتقال دانش دارم. نخست، یک ورکشاپ دوساعته برای ۲۵ عضو شبکه جوانان ما در یک ماه نخست پس از بازگشت، با استفاده از مواد برنامه. دوم، یک کانال تلگرام با ۱۹۰۰ فالوور دارم که خلاصه‌های هفتگی را آنجا نشر می‌کنم — تمام تجربه را همانجا مستند خواهم کرد. سوم، با مدیر مکتب قدیمی خود توافق کرده‌ام که در هر سفر به وطن، برای صنوف یازده و دوازده گفتگوی راهنمایی مسیر شغلی داشته باشم.',
      ps: 'د پوهې د رسولو ځانګړی پلان لرم. لومړی، د راستنېدو لومړنۍ میاشت کې زموږ د ځوانانو شبکې ۲۵ غړو لپاره د پروګرام په موادو دوه ساعته ورکشاپ. دویم، زما یو ټیلیګرام چینل دی ۱۹۰۰ تعقیبوونکي لري چرته چې اونیزې لنډې خپروم — ټوله تجربه به هلته سند کړم. درېیم، له خپل پخواني ښوونځي مدیر سره هوکړه ده چې هر کورني سفر کې د ۱۱ او ۱۲ ټولګیو زده‌کوونکو ته د مسلکي لارښوونې غونډه وکړم.',
    },
    strongExample: {
      en: '\u201CI will translate the program\u2019s leadership materials into Farsi and Pashto and run three district-level workshops — I already have venue commitments from two district directors.\u201D',
      fa: '\u00ABمواد رهبری برنامه را به فارسی و پشتو ترجمه می‌کنم و سه ورکشاپ در سطح ولسوالی اجرا خواهم کرد — از دو ریاست ولسوالی از قبل تعهد مکان دارم.\u00BB',
      ps: '\u00ABد پروګرام مشرتوب مواد به ښکلي او پښتو ژباړم او درې ولسوالۍ کچې ورکشاپونه به پلي کړم — له دوه ولسوالیو مدیرانو څخه د ځای ژمنې لرم.\u00BB',
    },
    weakExample: {
      en: '\u201CI will share my experience with my friends and family whenever there is a chance.\u201D',
      fa: '\u00ABهر وقت فرصت باشد، تجربه‌ام را با دوستان و خانواده به اشتراک می‌گذارم.\u00BB',
      ps: '\u00ABهر وخت چې فرصت وي، تجربه به مې له ملګرو او کورنۍ سره شریکه کړم.\u00BB',
    },
    tips: {
      en: 'Name exact channels, audiences and numbers. \u201CI will share with my community\u201D is invisible; \u201C25 youth members, one Telegram channel, two school sessions\u201D is fundable.',
      fa: 'کانال‌ها، مخاطبان و اعداد دقیق را نام ببرید. جمله \u201Cبا جامعه‌ام به اشتراک می‌گذارم\u201D نامرئی است؛ اما \u00AB۲۵ عضو جوانان، یک کانال تلگرام، دو نشست مکتب\u00BB قابل اعتناست.',
      ps: 'ځانګړې لارې، اورېدونکي او شمېرې ونوموه. \u00ABله ټولنې سره به شریکه کړم\u00BB نه لیدل کیږي؛ خو \u00AB۲۵ ځوان غړي، یو ټیلیګرام چینل، دوه ښوونځیو غونډې\u00BB د پام وړ ده.',
    },
    commonMistakes: {
      en: ['Vague \u201CI will inspire others\u201D answers', 'No existing platform or audience to share with', 'Promising things that depend on others\u2019 permission'],
      fa: ['پاسخ‌های کلی مانند \u201Cبه دیگران الهام می‌بخشم\u201D', 'نبود پلتفرم یا مخاطب واقعی برای نشر', 'قول دادن چیزهایی که به اجازه دیگران بستگی دارد'],
      ps: ['عمومي ځوابونه لکه \u00ABنورو ته به هڅول شم\u00BB', 'د خپرولو لپاره ریښتینې پلټفارم یا اورېدونکي نه لرل', 'داسې ژمنې چې پر بل چا د اجازې باندې ولاړې دي'],
    },
    followUps: {
      en: ['What if you cannot conduct workshops due to restrictions?', 'How will you measure whether your sharing worked?'],
      fa: ['اگر به دلیل محدودیت‌ها نتوانید ورکشاپ برگزار کنید چه؟', 'چگونه اندازه می‌گیرید که نشر دانش شما مؤثر بوده؟'],
      ps: ['که د محدودیتونو له امله ورکشاپ نه شې جوړولی څه به کوې؟', 'څنګه به اندازه کړې چې ستا شریکول اغېزمن شول؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'exchange-fellowships',
    question: {
      en: 'Tell us about a community project you led or participated in. What was your specific role?',
      fa: 'درباره یک پروژه اجتماعی که رهبری کرده یا در آن مشارکت داشته‌اید بگویید. نقش مشخص شما چه بود؟',
      ps: 'د یوې ټولنیزې پروژې په اړه ووایه چې مشري دې کړې یا پکې برخه اخیستې. ستا ځانګړې ونډه څه وه؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'I led a four-month literacy circle for 30 working children in my district. My specific role was designing the schedule around their shift times, recruiting two volunteer teachers, and negotiating free space with the mosque committee. Attendance reached 85% by the third month, and 11 of the children enrolled in public school the following year. I learned that sustainability depends on local ownership — that is why we trained two mothers as assistants.',
      fa: 'من یک حلقه سوادآموزی چهارماهه را برای ۳۰ کودک شاغل در ولسوالی خودم رهبری کردم. نقش مشخص من طراحی برنامه زمانی متناسب با شیفت‌های کاری‌شان، استخدام دو معلم داوطلب، و مذاکره با کمیته مسجد برای فضای رایگان بود. حضور تا ماه سوم به ۸۵٪ رسید و ۱۱ کودک سال بعد در مکتب دولتی ثبت‌نام کردند. آموختم که پایداری به مالکیت محلی بستگی دارد — به همین دلیل دو مادر را به‌عنوان مساعد تربیه کردیم.',
      ps: 'زه خپله ولسوالۍ کې د ۳۰ کار کوونکو ماشومانو لپاره څلور میاشتنی د لوستون ډایر کړ. زما ځانګړې ونډه د دوی د کار شیفتونو سره سم د وخت جوړښت و، د دوو رضاکار ښوونکو راښکېلول او د جومات کمېټې سره د وړیا ځای خبرې اترې وې. تر درېیمې میاشتې حاضري ۸۵٪ ته ورسېده او ۱۱ ماشومانو بل کال په دولتي ښوونځي کې نوم ولیکه. زده مې کړه چې دوام د ځایی مالکیت سره تړلی دی — ځکه دوه میندې مرستیالانو په توګه وروزلو.',
    },
    strongExample: {
      en: '\u201CI coordinated 14 volunteers across 6 villages for a vaccination-awareness drive; our area reached 92% coverage versus 61% the previous year — I handled the data collection.\u201D',
      fa: '\u00ABبرای کمپین آگاهی واکسیناسیون، ۱۴ داوطلب را در ۶ قریه هماهنگ کردم؛ پوشش منطقه ما به ۹۲٪ رسید در حالی که سال قبل ۶۱٪ بود — جمع‌آوری معلومات با من بود.\u00BB',
      ps: '\u00ABد واکسین آګاهي کمپاین لپاره مې ۶ کلیو کې ۱۴ رضاکاران همغږي کړل؛ زموږ سیمې پوښښ ۹۲٪ ته ورسېد پداسې حال کې چې تېر کال ۶۱٪ و — د معلوماتو راټولول زما دنده وه.\u00BB',
    },
    weakExample: {
      en: '\u201COur community has many problems and we all work together to help each other.\u201D',
      fa: '\u00ABجامعه ما مشکلات زیادی دارد و ما همه برای کمک به یکدیگر تلاش می‌کنیم.\u00BB',
      ps: '\u00ABزموږ ټولنې ډېرې ستونزې لري او موږ ټول یو بل ته مرسته کوو.\u00BB',
    },
    tips: {
      en: 'Pick ONE project and go deep: numbers, your personal actions, and one lesson learned. \u201CWe\u201D stories hide you — the interviewer must hear \u201CI did this specifically\u201D.',
      fa: 'یک پروژه را انتخاب کنید و عمیق بروید: اعداد، اقدامات شخصی شما، و یک درس‌آموخته. داستان‌های \u201Cما\u201D شما را پنهان می‌کنند — مصاحبه‌گر باید بشنود که \u201Cمن مشخصاً این کار را کردم\u201D.',
      ps: 'یوه پروژه غوره کړه او ژور ورشه: شمېرې، ستا شخصي اقدامات، او یوه زده‌کړه. \u00ABموږ\u00BB کیسې تا پټوي — مصاحبه کوونکې باید واوري چې \u00ABزه په ځانګړي ډول دا مې کړه\u00BB.',
    },
    commonMistakes: {
      en: ['Describing a project with no personal role', 'No measurable outcome', 'Listing five shallow projects instead of one deep one'],
      fa: ['توصیف پروژه‌ای بدون نقش شخصی', 'نبود نتیجه قابل اندازه‌گیری', 'برشمردن پنج پروژه سطحی به جای یک پروژه عمیق'],
      ps: ['د بې شخصي ونډې پروژې بیانول', 'د اندازه کېدونکې پایلې نه لرل', 'د یوې ژورې پر ځای پنځو سطحو پروژو یادول'],
    },
    followUps: {
      en: ['What was the hardest moment in that project?', 'If you had double the budget, what would you change?'],
      fa: ['سخت‌ترین لحظه آن پروژه چه بود؟', 'اگر بودجه دو برابر بود، چه چیزی را تغییر می‌دادید؟'],
      ps: ['په هغه پروژه کې تر ټولو سخته شېږه څه وه؟', 'که بودجه دوه برابره وای، څه به بدلوې؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'exchange-fellowships',
    question: {
      en: 'How would you handle a situation where a host-community member questions your presence or values?',
      fa: 'اگر عضوی از جامعه میزبان حضور یا ارزش‌های شما را زیر سوال ببرد، چگونه واکنش نشان می‌دهید؟',
      ps: 'که د کوربه ټولنې غړی ستا حاضري یا ارزښتونه تر پوښتنې لاندې راولي، څنګه ځواب ورکوې؟',
    },
    difficulty: 'hard',
    sampleAnswer: {
      en: 'I would treat it as a chance for exchange, not a confrontation. First, I would listen fully without interrupting, because most objections come from unfamiliarity. Then I would share my own perspective as an Afghan Muslim calmly, and look for a value we both share — most communities respect hospitality, family and education. If the person remains hostile, I would disengage politely and inform my program coordinator. I represent my country, so composure matters more than winning an argument.',
      fa: 'آن را فرصت تبادل می‌دانم نه مقابله. نخست، بدون قطع حرف، کامل گوش می‌دهم، زیرا بیشتر مخالفت‌ها از ناآشنایی سرچشمه می‌گیرد. سپس دیدگاه خود را به‌عنوان یک مسلمان افغان با آرامش بیان می‌کنم و ارزش مشترکی می‌جویم که هر دو باور داریم — بیشتر جوامع به مهمان‌نوازی، خانواده و تحصیل احترام می‌گذارند. اگر فرد همچنان خصمانه بماند، مؤدبانه فاصله می‌گیرم و هماهنگ‌کننده برنامه را آگاه می‌سازم. من نماینده کشورم هستم، پس حفظ آرامش مهم‌تر از برنده شدن در بحث است.',
      ps: 'زه به دا د تبادلې فرصت ګڼم، نه مخالفت. لومړی، پرته د خبرې پرې کولو بشپړ غوږ نیوم، ځکه ډېرې مخالفتونه له نااشنايي راپورته کیږي. بیا خپل لید د یو افغان مسلمان په توګه په ارامه بیانوم او داسې ګډ ارزښت لټوم چې دواړه یې لرو — ډېرې ټولنې مېلمستیا، کورنۍ او تعلیم ته درناوی لري. که کس تراوسه دښمنانه پاتې شي، په ادب ځان بېلوم او د پروګرام همغږي کوونکي ته خبر ورکوم. زه د خپل هېواد استازې یم، نو ارام ساتل له جدل ګټلو مهم دي.',
    },
    strongExample: {
      en: '\u201CI answered questions about my scarf and prayer with patience and humor, invited my neighbor to cook with me — by week two she was defending me to others.\u201D',
      fa: '\u00ABدرباره شال و نمازم با صبر و شوخی پاسخ دادم، همسایه‌ام را به آشپزی با هم دعوت کردم — هفته دوم او از من دفاع می‌کرد.\u00BB',
      ps: '\u00ABد شال او لمونځ په اړه مې په صبر او خندا ځواب ورکړ، ګاونډیانې مې د یوځای پخلي ته وباله — دویمه اونۍ هغه نورو ته زما دفاع کوله.\u00BB',
    },
    weakExample: {
      en: '\u201CI would ignore them completely or ask to change host families immediately.\u201D',
      fa: '\u00ABکاملاً نادیده می‌گیرم یا فوراً درخواست تغییر خانواده میزبان می‌کنم.\u00BB',
      ps: '\u00ABبشپړ نه پام ورته کوم یا سمدلاسه د کوربه کورنۍ بدلون غواړم.\u00BB',
    },
    tips: {
      en: 'Programs fear incidents more than anything — show you can de-escalate. Listening first, finding shared values, and knowing when to involve the coordinator is the full answer.',
      fa: 'برنامه‌ها بیش از هر چیز از حادثه می‌ترسند — نشان دهید که می‌توانید تنش را کاهش دهید. نخست گوش دادن، یافتن ارزش‌های مشترک، و دانستن زمان مناسب برای اطلاع به هماهنگ‌کننده، پاسخ کامل است.',
      ps: 'پروګرامونه له پېښو له هر څه ډېر وېريږي — وښيه چې کولی شې کړکېچ راکم کړې. لومړی غوږ نیول، ګډ ارزښتونه موندل، او دا چې کله همغږي کوونکي ته خبر ورکوې، بشپړ ځواب دی.',
    },
    commonMistakes: {
      en: ['Promising to debate or \u201Cwin\u201D the confrontation', 'Saying you would stay silent about harassment', 'Not mentioning the coordinator escalation path'],
      fa: ['قول جدل یا \u201Cبرنده شدن\u201D در مقابله', 'گفتن اینکه در برابر آزار سکوت می‌کنید', 'ذکر نکردن مسیر اطلاع‌رسانی به هماهنگ‌کننده'],
      ps: ['د شخړې جدل یا \u00ABګټلو\u00BB ژمنه', 'وایل چې پر آزار سکوت به کوې', 'د همغږي کوونکي ته د خبر رسولو لار نه یادول'],
    },
    followUps: {
      en: ['What if the question comes from a teacher at your host school?', 'How would you prepare before departure?'],
      fa: ['اگر سوال از معلم مکتب میزبان باشد چه؟', 'قبل از سفر چگونه آماده می‌شوید؟'],
      ps: ['که پوښتنه د کوربه ښوونځي ښوونکي وي څه به کوې؟', 'له سفر مخکې څنګه چمتو کېږې؟'],
    },
    expectedDuration: '2-3 mins',
  },

  // ─── Graduate admissions ───
  {
    categorySlug: 'graduate-admissions',
    question: {
      en: 'Why did you choose this specific program and university?',
      fa: 'چرا این برنامه و دانشگاه خاص را انتخاب کردید؟',
      ps: 'ولې دا ځانګړی پروګرام او پوهنتون دې غوره کړ؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'Three concrete reasons. Professor [Name]\u2019s research on low-cost water filtration matches my undergraduate thesis on rural water access in Balkh. Second, your program is one of few that combines engineering with development policy — I need both for my career goal. Third, the university\u2019s partnership with agencies working in Afghanistan means my eventual fieldwork can be supervised remotely with real local data.',
      fa: 'سه دلیل مشخص. تحقیقات پروفسور [نام] درباره فیلتراسیون ارزان‌قیمت آب با تیزس لیسانس من درباره دسترسی به آب در روستاهای بلخ مطابقت دارد. دوم، برنامه شما یکی از معدود برنامه‌هایی است که مهندسی را با سیاست توسعه ترکیب می‌کند — برای هدف شغلی‌ام به هر دو نیاز دارم. سوم، همکاری این دانشگاه با سازمان‌های فعال در افغانستان یعنی پژوهش میدانی من می‌تواند از راه دور با معلومات واقعی محلی راهبری شود.',
      ps: 'درې ځانګړي دلیلونه. د پروفیسور [نوم] څېړنه د ارزانه د اوبو فیلټرونو په اړه زما د لیسانس تیزس سره سمون لري چې په بلخ کې کلیوالي سیمو ته د اوبو لاسرسی و. دویم، ستا پروګرام له ډېرو کمو پروګرامونو څخه دی چې انجینري د پراختیا پالیسي سره یوځاي کوي — زما مسلکي موخې لپاره دواړه اړین دي. درېیم، دا پوهنتون په افغانستان کې د فعالو بنسټونو سره شریکه ده، یعنی زما میداني څېړنه کولی شي له لرې ځایه ریښتینو ځایی معلوماتو سره اداره شي.',
    },
    strongExample: {
      en: '\u201CI chose X because of its drought-modeling lab and Professor Y\u2019s fieldwork in Central Asia — my thesis proposal builds directly on her 2023 paper.\u201D',
      fa: '\u00ABدانشگاه X را به‌خاطر لابراتوار مدل‌سازی خشکسالی و کار میدانی پروفسور Y در آسیای مرکزی انتخاب کردم — پیشنهاد تیزس من مستقیماً بر مقاله ۲۰۲۳ او بنا شده است.\u00BB',
      ps: '\u00ABد X پوهنتون مې د وچکالۍ ماډل جوړونې لابراتوار او د پروفیسور Y د مرکزي اسیا میداني څېړنې لپاره غوره کړ — زما تیزس وړاندیز مستقیماً پر هغې د ۲۰۲۳ مقالې ولاړ دی.\u00BB',
    },
    weakExample: {
      en: '\u201CYour university is famous and highly ranked in the world rankings.\u201D',
      fa: '\u00ABدانشگاه شما مشهور است و در رتبه‌بندی‌های جهانی جایگاه بالایی دارد.\u00BB',
      ps: '\u00ABستا پوهنتون مشهور دی او په نړیوالو درجه‌بندیو کې لوړ مقام لري.\u00BB',
    },
    tips: {
      en: 'Name a professor, a lab, a course or a partnership. Ranking answers are instant red flags — they suggest you applied everywhere and memorized nothing.',
      fa: 'نام یک استاد، لابراتوار، درس یا همکاری را ببرید. پاسخ‌های رتبه‌بندی محور فوراً نگران‌کننده‌اند — یعنی همه‌جا درخواست داده‌اید و چیزی به یاد نیاورده‌اید.',
      ps: 'یو پروفیسور، لابراتوار، مضمون یا شریک بنسټ ونوموه. درجه‌بندی ځوابونه سمدلاسه بد ښکاري — یعنی چرته هم غوښتنه کړې او هېڅ نه یې یادول.',
    },
    commonMistakes: {
      en: ['Only citing rankings or \u201Cprestige\u201D', 'Not knowing any faculty member\u2019s work', 'Copy-paste answers reusable for any university'],
      fa: ['ذکر صرفاً رتبه‌بندی یا \u00ABاعتبار\u00BB', 'ندانستن کار هیچ استاد', 'پاسخ‌های کپی‌شده که برای هر دانشگاه قابل استفاده باشد'],
      ps: ['یوازې درجه‌بندی یا \u00ABنوم\u00BB یادول', 'د هیڅ پروفیسور کار نه پوهېدل', 'کاپي شوي ځوابونه چې هر پوهنتون ته کارېږي'],
    },
    followUps: {
      en: ['Which of our professors would you want as your supervisor?', 'What other universities did you apply to?'],
      fa: ['کدام استاد ما را برای راهنمایی خود می‌خواهید؟', 'به کدام دانشگاه‌های دیگر هم درخواست داده‌اید؟'],
      ps: ['زموږ کوم پروفیسور د خپل لارښود په توګه غواړې؟', 'کومو نورو پوهنتونونو ته غوښتنه کړې ده؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'graduate-admissions',
    question: {
      en: 'What research topic interests you, and why does it matter?',
      fa: 'کدام موضوع پژوهشی شما را جلب می‌کند و چرا مهم است؟',
      ps: 'کومه څېړنیزه موضوع تا راجذبوي او ولې مهمه ده؟',
    },
    difficulty: 'hard',
    sampleAnswer: {
      en: 'I want to research low-cost groundwater quality monitoring for rural Afghanistan. Over 60% of Kabul\u2019s shallow wells exceed safe salinity limits, but testing one sample costs more than a family earns in a week. My proposed approach uses community volunteers with simple test strips and a smartphone reporting app — the research question is whether that data quality is good enough for public-health decisions. The stakes are real: without affordable monitoring, interventions target the wrong villages.',
      fa: 'می‌خواهم درباره نظارت ارزان‌قیمت بر کیفیت آب‌های زیرزمینی در روستاهای افغانستان پژوهش کنم. بیش از ۶۰٪ چاه‌های سطحی کابل از حد مجاز شور بودن عبور می‌کند، اما آزمایش یک نمونه بیشتر از درآمد یک هفته یک خانواده هزینه دارد. رویکرد پیشنهادی من استفاده از داوطلبان محلی با نوارهای آزمایش ساده و یک اپلیکیشن گزارش‌دهی با تلفن است — پرسش پژوهشی این است که آیا کیفیت آن معلومات برای تصمیم‌های صحت عامه کافی است یا نه. موضوع حیاتی است: بدون نظارت مقرون‌به‌صرفه، مداخلات قریه‌های اشتباه را هدف می‌گیرند.',
      ps: 'غواړم د افغانستان کلیوالو سیمو کې د ځمک‌لاندې اوبو د کیفیت ارزانه څارنه وڅېړم. د کابل له ۶۰٪ زیاتې سطحي کړۍ له خوندي کچې مالګینتورې تېرېږي، خو یوه نمونې ازموینه له یوې کورنۍ یو اونۍ عاید ډېر لګښت لري. زما وړاندیز شوی لار د ځایی رضاکارانو د ساده ازمویښت پټو او یو د موبایل رپوټ اپلیکیشن کارول دي — څېړنیزه پوښتنه دا ده چې هغه معلومات د عامه روغتیا پرېکړو لپاره کافي کیفیت لري کنه. موضوع حیاتي ده: بې د ارزانه څارنې، مداخلې غلطو کلیو ته لارښوونه کوي.',
    },
    strongExample: {
      en: '\u201CI want to study why 40% of returned migrants re-migrate within two years — existing surveys stop at the border; I plan to follow 50 families for 18 months.\u201D',
      fa: '\u00ABمی‌خواهم بررسی کنم چرا ۴۰٪ مهاجران برگشته ظرف دو سال دوباره مهاجرت می‌کنند — نظرسنجی‌های موجود در مرز متوقف می‌شوند؛ من ۵۰ خانواده را ۱۸ ماه دنبال می‌کنم.\u00BB',
      ps: '\u00ABغواړم وڅېړم چې ولې ۴۰٪ راستون شوي مهاجر په دوه کلونو کې بیا مهاجر کیږي — موجودې سروې په سرحدي بند کیږي؛ زه به ۵۰ کورنۍ ۱۸ میاشتې تعقیب کړم.\u00BB',
    },
    weakExample: {
      en: '\u201CI am interested in many topics — climate change, education, economy. I am open to whatever the department suggests.\u201D',
      fa: '\u00ABبه موضوعات زیادی علاقه دارم — تغییرات اقلیمی، آموزش، اقتصاد. برای هر چیزی که بخش پیشنهاد کند آماده‌ام.\u00BB',
      ps: '\u00ABپه ډېرو موضوعاتو مینه لرم — اقلیمي بدلون، تعلیم، اقتصاد. له هر څه چې څانګه وړاندیز کوي چمتو یم.\u00BB',
    },
    tips: {
      en: 'Show a specific problem, a method, and why you are the person to study it. A topic you can\u2019t connect to your own experience reads as borrowed from the internet.',
      fa: 'یک مشکل مشخص، یک روش، و اینکه چرا شما فرد مناسبی برای این پژوهش هستید را نشان دهید. موضوعی که به تجربه خودتان وصل نیست، وام‌گرفته از انترنت به نظر می‌رسد.',
      ps: 'ځانګړې ستونزه، یوه طریقه، او دا چې ولې ته یې د څېړنې وړ کس یې وښيه. موضوع چې ستا د تجربې سره نه نښلي، له انټرنټ اخیستل شوې ښکاري.',
    },
    commonMistakes: {
      en: ['Listing multiple unrelated interests', 'No research question — just a broad theme', 'Nothing linking the topic to Afghanistan or your experience'],
      fa: ['برشمردن علایق متعدد و بی‌ربط', 'نبود پرسش پژوهشی — فقط موضوع کلی', 'هیچ پیوندی با افغانستان یا تجربه شما ندارد'],
      ps: ['ډېرې بې‌تړلې مینې یادول', 'بې څېړنیزې پوښتنې — یوازې پراخه موضوع', 'هېڅ تړاو افغانستان یا ستا تجربې ته نه لري'],
    },
    followUps: {
      en: ['What methodology would you use?', 'Which existing studies on this topic have you read?'],
      fa: ['چه روش‌شناسی به کار می‌برید؟', 'کدام مطالعات موجود در این موضوع را خوانده‌اید؟'],
      ps: ['کومه مېتود به کاروې؟', 'د دې موضوع پر کومو موجودو څېړنو لوستل کړي دي؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'graduate-admissions',
    question: {
      en: 'What are your strengths and weaknesses as a student?',
      fa: 'نقاط قوت و ضعف شما به‌عنوان یک دانشجو چیست؟',
      ps: 'د یو زده‌کوونکي په توګه ستا ځواکمنې او کمزورې خواوې څه دي؟',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'My strength is disciplined self-study: during school closures I completed the full physics syllabus independently and scored in the top 1% of the Kankor exam in my province. My weakness is over-researching before I start writing — I once delayed a lab report for a week collecting more sources than required. I now set a fixed research deadline and start drafting with what I have; the quality of my submissions improved once I did.',
      fa: 'نقطه قوت من مطالعه منظم مستقل است: در دوران تعطیلی مکتب‌ها سرفصل کامل فزیک را خودم تکمیل کردم و در امتحان کانکور ولایتم در یک درصد نخست قرار گرفتم. ضعف من بیش‌ازحد تحقیق پیش از شروع نوشتن است — یک بار گزارش لابراتوار را یک هفته به تأخیر انداختم چون بیش از حد منبع جمع می‌کردم. اکنون ضرب‌الاجل مشخص برای تحقیق می‌گذارم و با همان چیزی که دارم نوشتن را شروع می‌کنم؛ کیفیت کارهایم پس از این تغییر بهتر شد.',
      ps: 'زما ځواکمنه خوا منظم خپلواکه مطالعه ده: د ښوونځیو د تړلو په مهال مې بشپړ فزیک نصاب په خپله بشپړ کړ او په خپل ولایت کې د کانکور په ازموینه کې په لومړۍ سل کچه کې راتلم. زما کمزورې خوا دا ده چې له لیکلو مخکې ډېره څېړنه کوم — یو ځل لابراتواري رپوټ مې یوه اونۍ ځنډولی ځکه له اړتیا زیاتې سرچینې راټولولې. اوس د څېړنې لپاره ټاکلی وخت اېښوم او له هماغه څه چې لرم لیکلو پیلوم؛ د دې بدلون وروسته زما د کار کیفیت ښه شو.',
    },
    strongExample: {
      en: '\u201CI speak up late in groups — I once lost an idea that later won. Now I set myself a rule: contribute within the first ten minutes of any meeting.\u201D',
      fa: '\u00ABدر گروه‌ها دیر صحبت می‌کنم — یک بار عقیده‌ای داشتم که بعداً برنده شد. حالا برای خودم قاعده گذاشته‌ام: در ده دقیقه نخست هر جلسه مشارکت کنم.\u00BB',
      ps: '\u00ABپه ډلو کې ناوخته خبرې کوم — یو ځل داسې نظرونه لرم چې وروسته بریالي شول. اوس ځانته قاعده اېښې: په هره غونډه کې لومړنۍ لس دقیقې کې ونډه واخلم.\u00BB',
    },
    weakExample: {
      en: '\u201CMy weakness is that I am a perfectionist and I work too hard. My strength is everything.\u201D',
      fa: '\u00ABضعف من این است که کمال‌گرا هستم و بیش از حد کار می‌کنم. نقطه قوتم همه‌چیز است.\u00BB',
      ps: '\u00ABزما کمزوري خوا دا ده چې بشپړتيا غوښتونکی یم او ډېر کار کوم. زما ځواکمنه خوا هر څه دي.\u00BB',
    },
    tips: {
      en: 'One real strength with evidence, one real weakness with an active fix. Fake weaknesses (\u201Ctoo hardworking\u201D) tell the committee you\u2019re not self-aware.',
      fa: 'یک نقطه قوت واقعی با سند، و یک ضعف واقعی با راه‌حل فعال. ضعف‌های جعلی (\u00ABزیاد سخت‌کوشم\u00BB) به کمیسیون می‌گوید که خودآگاهی ندارید.',
      ps: 'یوه ریښتینې ځواکمنه خوا د ثبوت سره، او یوه ریښتینې کمزورې خوا د فعال حل سره. جعلي کمزوریو (\u00ABډېر زحمتکش یم\u00BB) کمیسیون ته وایي چې ځان نه پېژنې.',
    },
    commonMistakes: {
      en: ['Disguised strengths as weaknesses', 'A weakness with no improvement plan', 'Strengths listed with no evidence'],
      fa: ['ضعف‌های دروغین که در واقع قوت هستند', 'ضعف بدون برنامه بهبود', 'نقاط قوت بدون هیچ سند'],
      ps: ['پټې ځواکمنې خواوې چې کمزورې ښکاري', 'بې د ښه کولو پلان کمزورتیا', 'بې شواهدو د ځواکمنتیاوو لیست'],
    },
    followUps: {
      en: ['How will you handle a heavy course load here?', 'What did your last teacher say you should improve?'],
      fa: ['بار سنگین درس‌ها را اینجا چگونه مدیریت می‌کنید؟', 'آخرین معلمتان گفت چه چیزی را باید بهبود ببخشید؟'],
      ps: ['دلته د درسونو درنې بار څنګه اداره کوې؟', 'ستا وروستي ښوونکي وویل کوم څه باید ښه کړې؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'graduate-admissions',
    question: {
      en: 'Where do you see yourself in five years?',
      fa: 'پنج سال دیگر خود را کجا می‌بینید؟',
      ps: 'په پنځو کلونو کې ځان چېرته ګورې؟',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'Two years after this program, I see myself back in Kabul working as a junior lecturer and finishing a professional engineering license. By year five, I want to be teaching undergraduates while leading a small research unit on urban water systems at a university or a national agency. The exact employer may change, but the direction — building engineering capacity inside Afghanistan — will not.',
      fa: 'دو سال پس از این برنامه، خودم را در کابل می‌بینم که به‌عنوان استاد پوهنځی تازه‌کار کار می‌کنم و لیسانس حرفه‌ای مهندسی را تکمیل می‌نمایم. تا سال پنجم می‌خواهم در کنار تفارسیس، یک واحد کوچک تحقیقاتی درباره سیستم‌های آب شهری را در یک دانشگاه یا اداره ملی رهبری کنم. کارفرمای دقیق ممکن است تغییر کند، اما جهت — ساختن ظرفیت مهندسی در داخل افغانستان — تغییر نخواهد کرد.',
      ps: 'د دې پروګرام له دوه کلونو وروسته، ځان په کابل کې ګورم چې د نوې راتلونکې ښوونکي په توګه کار کوم او مسلکي انجینري جواز بشپړوم. تر پنځم کال پورې، غواړم له ښوونې سره سم په یو پوهنتون یا ملي اداره کې د ښاري د اوبو سیسټمونو کوچنې څېړنیزه برخه مشري وکړم. ځانګړی کارګمارونکی بدلېدلی شي، خو لوری — په افغانستان کې د انجینري ظرفیت جوړول — نه بدلیږي.',
    },
    strongExample: {
      en: '\u201CBy year five I\u2019m a licensed engineer leading a two-person design office in Herat, with three completed public-building projects and one junior engineer trained under me.\u201D',
      fa: '\u00ABتا سال پنجم یک مهندس دارای جواز هستم که یک دفتر طراحی دو نفره در هرات رهبری می‌کنم، با سه پروژه ساختمان عامه تکمیل‌شده و یک مهندس تازه‌کاری که تربیه کرده‌ام.\u00BB',
      ps: '\u00ABتر پنځم کال به جواز لرونکی انجینر وم چې په هرات کې د دوه کسانو ډیزاین دفتر مشري کوم، درې بشپړ شوي عامه ودانیو پروژې او یو نوې ګمارل شوی انجینر چې زه یې روزلی وم.\u00BB',
    },
    weakExample: {
      en: '\u201CHonestly, it depends on the situation in Afghanistan. Maybe I will still be studying, maybe working abroad.\u201D',
      fa: '\u00ABراستش به وضعیت افغانستان بستگی دارد. شاید هنوز درس بخوانم، شاید در خارج کار کنم.\u00BB',
      ps: '\u00ABرښتیا په افغانستان کې د حالت پورې تړلی ده. کېدا شي لا هم ولولم، کېدا شي بهر کار کوم.\u00BB',
    },
    tips: {
      en: 'Give a direction, not a rigid map. Committees know five years is uncertain for Afghans — they test whether your plan survives contact with reality.',
      fa: 'یک جهت بدهید، نه نقشه صلب. کمیسیون می‌داند که پنج سال برای افغان‌ها نامطمئن است — آن‌ها می‌سنجند که آیا برنامه شما با واقعیت سازگار می‌ماند.',
      ps: 'یو لوری ورکړه، نه کلک نقشه. کمیسیون پوهېږي چې پنځه کال افغانانو لپاره ناڅرګنده وي — دا ګوري چې پلان دې له واقعیت سره ژوندی پاتې کیږي کنه.',
    },
    commonMistakes: {
      en: ['\u201CIt depends on the situation\u201D without a plan', 'Plans that only work abroad', 'Unrealistic seniority (\u201CCEO of a company\u201D)'],
      fa: ['\u00ABبه وضعیت بستگی دارد\u00BB بدون برنامه', 'برنامه‌هایی که فقط در خارج جواب می‌دهند', 'وعده‌های غیرواقعی (\u00ABمدیرعامل شرکت\u00BB)'],
      ps: ['\u00ABپه حالت پورې اړه لري\u00BB بې پلانه', 'هغه پلانونه چې یوازې بهر کار کوي', 'غیر واقعي لوړ مقامونه (\u00ABد شرکت CEO\u00BB)'],
    },
    followUps: {
      en: ['What is your plan B if teaching jobs are scarce?', 'How does this program fit that five-year picture?'],
      fa: ['اگر فرصت‌های تفارسیس کم باشد، پلان B شما چیست؟', 'این برنامه چگونه در تصویر پنج‌ساله شما می‌گنجد؟'],
      ps: ['که ښوونکي دندې کمې وي، ستا پلان B څه ده؟', 'دا پروګرام ستا په پنځه کلنه انځور کې څنګه ځای نیسي؟'],
    },
    expectedDuration: '1-2 mins',
  },

  // ─── NGO & humanitarian ───
  {
    categorySlug: 'ngo-humanitarian',
    question: {
      en: 'Why do you want to work in the humanitarian sector?',
      fa: 'چرا می‌خواهید در بخش بشردوستانه کار کنید؟',
      ps: 'ولې غواړې په بشري سکتور کې کار وکړې؟',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'My family benefited from humanitarian food assistance during the 2022 drought in Faryab, so I have seen the difference a functioning distribution system makes. I studied economics and I want to apply it where the need is measurable: targeting, cash-transfer design and anti-fraud checks. Beyond gratitude, I stay because the sector offers professional depth — standards, accountability and skills that grow with every response.',
      fa: 'خانواده من در خشکسالی ۲۰۲۲ فاریاب از کمک‌های غذایی بشردوستانه بهره‌مند شد، بنابراین تفاوت یک سیستم توزیع فعال را دیده‌ام. اقتصاد خوانده‌ام و می‌خواهم آن را جایی به کار ببرم که نیاز قابل اندازه‌گیری است: هدف‌مندسازی، طراحی کمک‌های نقدی و کنترل تقلب. علاوه بر قدردانی، در این بخش می‌مانم زیرا عمق حرفه‌ای دارد — معیارها، پاسخ‌گویی و مهارت‌هایی که با هر عملیات رشد می‌کنند.',
      ps: 'زما کورنۍ په فاریاب کې د ۲۰۲۲ وچکالۍ کې له بشري خوړو مرستو ګټه اخیستې، نو د یو فعالي وېش سیسټم توپیر مې لیدلی دی. اقتصاد مې لوستی او غواړم هغه هلته وکاروم چې اړتیا اندازه کېدلې شي: نښه کول، د نغډو مرستو ډیزاین او د درغلیو کنټرول. له مننې هاخوا، پدې سکتور پاتې شم ځکه مسلکي ژوروالی لري — معیارونه، ځواب ویونکېتوب او هغه مهارتونه چې له هرې عملیات سره وده کوي.',
    },
    strongExample: {
      en: '\u201COur village received three inconsistent distributions from three agencies. I want to fix coordination from the inside — that\u2019s why I studied supply chains.\u201D',
      fa: '\u00ABقریه ما سه توزیع ناهماهنگ از سه سازمان فارسیافت کرد. می‌خواهم هماهنگی را از درون اصلاح کنم — برای همین زنجیره تأمین خواندم.\u00BB',
      ps: '\u00ABزموږ کلي ته له درېو بنسټونو درې ناهمغږې وېشونه ورسېدل. غواړم همغږي له دننه سموم — ځکه مې پېرودنې زنځیر لوستی.\u00BB',
    },
    weakExample: {
      en: '\u201CI want to help poor people and there is a good salary in NGOs.\u201D',
      fa: '\u00ABمی‌خواهم به مردم فقیر کمک کنم و در مردم‌نهادها حقوق خوب است.\u00BB',
      ps: '\u00ABغواړم بېوزلو کسانو مرسته وکړم او په نادولتو کې ښه معاش دی.\u00BB',
    },
    tips: {
      en: 'Connect a real experience to a professional skill. If you have personal exposure to aid programs, that is an asset — tell it briefly and pivot to competence.',
      fa: 'یک تجربه واقعی را به یک مهارت حرفه‌ای پیوند دهید. اگر با برنامه‌های کمک رسانی مواجهه شخصی دارید، این یک دارایی است — کوتاه بگویید و به توانمندی خود منتقل شوید.',
      ps: 'یوه ریښتینې تجربه د مسلکي مهارت سره ونښلوه. که له مرستیو پروګرامونو سره شخصي مخکېدنه لرې، دا یو ذخیره دی — لنډ یې ووایه او خپل وړتیا ته راواړوه.',
    },
    commonMistakes: {
      en: ['Only emotional or religious motivation with no skill link', 'Mentioning NGO salaries as the draw', 'No knowledge of humanitarian principles'],
      fa: ['انگیزه صرفاً احساسی یا مذهبی بدون پیوند مهارتی', 'اشاره به حقوق مردم‌نهاد به‌عنوان جذابیت', 'نبود آشنایی با اصول بشردوستانه'],
      ps: ['یوازې احساساتي یا مذهبي موټیویشن بې مهارتي تړاو', 'د نادولتو معاش د راکښلو لامل په توګه یادول', 'د بشري اصولو نه پوهېدل'],
    },
    followUps: {
      en: ['What are the four humanitarian principles?', 'Which of our programs interests you most and why?'],
      fa: ['اصول چهارگانه بشردوستانه کدام‌اند؟', 'کدام برنامه ما بیش از همه شما را جذب می‌کند و چرا؟'],
      ps: ['د بشري کارونو څلور اصول کوم دي؟', 'زموږ کوم پروګرام تر ټولو زیات راجذبوي او ولې؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'ngo-humanitarian',
    question: {
      en: 'How would you maintain neutrality when working with different communities or authorities?',
      fa: 'در کار با جوامع یا نهادهای مختلف، بی‌طرفی خود را چگونه حفظ می‌کنید؟',
      ps: 'له بېلابېلو ټولنو یا ادارو سره په کار کې بې‌پلویتوب څنګه ساتې؟',
    },
    difficulty: 'hard',
    sampleAnswer: {
      en: 'Neutrality is procedural, not just an attitude. I follow selection criteria exactly as the project document defines them — vulnerability scores, not relationships. For every distribution I keep the beneficiary list documented and cross-checked by two people, so any elder or authority can see how decisions were made. When authorities request changes, I refer them to the agreed criteria and escalate to my supervisor rather than negotiating on my own. Equal treatment is what protects both the community and our access.',
      fa: 'بی‌طرفی یک فرایند است، نه صرفاً یک نگرش. معیارهای انتخاب را دقیقاً همان‌گونه که سند پروژه تعریف کرده اجرا می‌کنم — نمرات آسیب‌پذیری، نه روابط. در هر توزیع، فهرست مستفیدکنندگان را مستند و توسط دو نفر متقابلاً بررسی می‌کنم تا هر شخص یا مقام ببیند تصمیم‌ها چگونه گرفته شده‌اند. وقتی نهادها درخواست تغییر می‌کنند، آن‌ها را به معیارهای توافق‌شده ارجاع می‌دهم و به‌جای مذاکره شخصی، موضوع را به مسؤولم ارجاع می‌دهم. رفتار برابر هم جامعه را محافظت می‌کند و هم دسترسی ما را.',
      ps: 'بې‌پلویتوب یوه پروسه ده، نه یوازې چلند. د ټاکنې معیارونه هومرانه پلي کوم لکه څنګه چې د پروژې سند تعریفوي — د زیان منونکې نمرې، نه اړیکې. په هر وېش کې د ګټه اخیستونکو لست سند کوم او د دوو کسانو له خوا یو ځل بیا کتل کیږي، نو هر مشر یا مقام ګوري چې پرېکړې څنګه شوې. کله چې ادارې بدلون غواړي، هغوی د متقابل شویو معیارونو ته راجع کوم او پر ځای د شخصي خبرو، موضوع خپل مسؤل ته راولم. برابر چلند هم ټولنه خوندي کوي هم زموږ لاسرسی.',
    },
    strongExample: {
      en: '\u201CWhen a local commander asked me to add his relatives to the list, I showed him the vulnerability criteria and invited him to observe the registration — the list stood.\u201D',
      fa: '\u00ABوقتی یک مقام محلی از من خواست اقاربش را به فهرست اضافه کنم، معیارهای آسیب‌پذیری را نشان دادم و از او دعوت کردم ثبت‌نام را از نزدیک ببیند — فهرست سر پا ماند.\u00BB',
      ps: '\u00ABکله چې یو ځایی قوماندان غوښتل خپل خپلوان لست ته زیات کړم، د زیان منونکې معیارونه مې وښودل او هغه یې د نوم لیکلو کتلو ته وبللو — لست پاتې شو.\u00BB',
    },
    weakExample: {
      en: '\u201CI respect everyone and I would find a way to satisfy all sides.\u201D',
      fa: '\u00ABبه همه احترام می‌گذارم و راهی پیدا می‌کنم که همه راضی شوند.\u00BB',
      ps: '\u00AB له هر چا درناوی کوم او داسې لار به پیدا کړم چې ټول خوښ شي.\u00BB',
    },
    tips: {
      en: 'Use the vocabulary of the sector: criteria-based targeting, documentation, escalation, \u201Cdo no harm\u201D. Satisfying all sides is favoritism — neutrality means following transparent rules.',
      fa: 'از واژگان این بخش استفاده کنید: هدف‌مندی مبتنی بر معیار، مستندسازی، ارجاع به رده بالاتر، \u00ABآسیب نرسانید\u00BB. راضی نگه داشتن همه طرف‌ها جانبداری است — بی‌طرفی یعنی پیروی از قواعد شفاف.',
      ps: 'د سکتور اړوند ویي وکاروه: معیار پر بنسټ نښه کول، سند جوړول، لوړ مقام ته راجع کول، \u00ABزIANورمن نه جوړول\u00BB. ټول خوښ ساتل خواښیانه ده — بې‌پلویتوب د روښانه قواعدو تعقیب دی.',
    },
    commonMistakes: {
      en: ['\u201CI would satisfy everyone\u201D — impossible and biased', 'No mention of documentation or criteria', 'Suggesting personal negotiation with authorities'],
      fa: ['\u00ABهمه را راضی می‌کنم\u00BB — ناممکن و جانبدارانه', 'ذکر نکردن مستندسازی یا معیارها', 'پیشنهاد مذاکره شخصی با نهادها'],
      ps: ['\u00ABټول خوښوم\u00BB — ناممکنه او خواښیانه', 'د سند یا معیارونو نه یادول', 'له ادارو سره شخصي خبرو وړاندیز کول'],
    },
    followUps: {
      en: ['What do you do if a supervisor asks for a favor?', 'How do you document a pressure attempt?'],
      fa: ['اگر مسؤولتان درخواست لطفی کرد چه می‌کنید؟', 'تلاش برای اعمال فشار را چگونه مستند می‌کنید؟'],
      ps: ['که ستا مسؤل د ګټې غوښتنه وکړي څه کوې؟', 'د فشار هڅه څنګه سند کړې؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'ngo-humanitarian',
    question: {
      en: 'Describe your experience with reporting, documentation or accountability to donors.',
      fa: 'تجربه خود را درباره گزارش‌دهی، مستندسازی یا پاسخ‌گویی به تمویل‌کنندگان توضیح دهید.',
      ps: 'د رپوټ ورکولو، سند جوړولو یا تمویل کوونکو ته د ځواب ویونکېتوب تجربه بیان کړه.',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'For eighteen months I was the reporting focal point of a WFP-supported food project covering 6,100 households. My routine: collecting distribution data from five field teams weekly, reconciling it against warehouse records, and producing the monthly indicator report against the logframe. I built a master Excel tracker with automatic flags for variances above 2% — our error detection time dropped from weeks to days, and our final external audit had zero material findings.',
      fa: 'به مدت هجده ماه، نقطه اتصال گزارش‌دهی یک پروژه غذایی حمایت‌شده از سوی WFP بودم که ۶۱۰۰ خانواده را پوشش می‌داد. کار روتین من: جمع‌آوری معلومات توزیع از پنج تیم میدانی به‌صورت هفتگی، تطبیق آن با سوابق انبار، و تهیه گزارش ماهانه شاخص‌ها بر اساس لوج‌فریم. یک ترکر اکسل با فلگ‌های خودکار برای اختلاف بیش از ۲٪ ساختم — زمان کشف خطاهای ما از هفته‌ها به روزها رسید و آudit خارجی نهایی ما هیچ یافته مهمی نداشت.',
      ps: 'د اتلسو میاشتو لپاره د WFP ملاتړې خوراکي پروژې د رپوټ نقطه وم چې ۶۱۰۰ کورنۍ پراختیا کوله. زما عادي کار: له پنځو میداني ټیمونو اونیزه معلومات راټولول، د ګدام ریکارډونو سره سمون ورکول، او د لوجفریم پر بنسټ میاشتنی د شاخصونو رپوټ جوړول. ما یو ماسټر اکسل ټریکر جوړ کړ چې له ۲٪ زیات توپیر په اتومات ډول په ګوته کوي — زموږ د تېروتنو د موندلو وخت له اونیو ورځو ته راښکته شو او وروستۍ بهرنۍ اډیټ پکې هیڅ مهمه موندنه ونه لرله.',
    },
    strongExample: {
      en: '\u201CI prepared the donor\u2019s quarterly narrative plus the data annexes; during the audit I produced every beneficiary verification within 48 hours because our files were standardized from day one.\u00BB',
      fa: '\u00ABگزارش روایی فصلی تمویل‌کننده连同 ضمائم داده‌ها را تهیه می‌کردم؛ در آudit، هر راستی‌آزمایی مستفیدکننده را در ۴۸ ساعت ارائه دادم چون فایل‌های ما از روز اول استاندارد بودند.\u00BB',
      ps: '\u00ABد تمویل کوونکي ربع وار روایتي رپوټ او د معلوماتو ضمیمې چمتو کوم؛ په اډیټ کې هره د ګټه اخیستونکو تایید په ۴۸ ساعتو کې وړاندې کړه ځکه زموږ فایلونه له لومړي ورځې معیاري وو.\u00BB',
    },
    weakExample: {
      en: '\u201CI wrote activity reports whenever my supervisor asked me to write something.\u201D',
      fa: '\u00ABهر وقت مسؤولم می‌گفت چیزی بنویس، گزارش فعالیت می‌نوشتم.\u00BB',
      ps: '\u00ABهر وخت چې مسؤل مې ویلی چې څه ولیکه، د فعالیت رپوټ مې لیکلو.\u00BB',
    },
    tips: {
      en: 'Quantify: how many households, which indicators, what error rate, what audit result. If you lack direct experience, describe the documentation systems you built in any job or study.',
      fa: 'کمی کنید: چند خانواده، کدام شاخص‌ها، چه نرخ خطا، چه نتیجه آudit. اگر تجربه مستقیم ندارید، سیستم‌های مستندسازی‌ای را که در هر کار یا تحصیل ساخته‌اید توصیف کنید.',
      ps: 'شمېرې ورکړه: څو کورنۍ، کوم شاخصونه، څومره د تېروتنې کچه، کومه د اډیټ پایله. که مستقیمه تجربه نه لرې، هغه د سند نظامونه بیان کړه چې په هر کار یا لوستلو کې جوړ کړي یې.',
    },
    commonMistakes: {
      en: ['Describing \u201Cwriting reports\u201D with no system or scale', 'Not knowing what a logframe or indicator is', 'Claiming audit experience with no specifics'],
      fa: ['توصیف \u00ABنوشتن گزارش\u00BB بدون سیستم یا مقیاس', 'ندانستن اینکه لوج‌فریم یا شاخص چیست', 'ادعای تجربه آudit بدون جزئیات'],
      ps: ['د \u00ABرپوټ لیکل\u00BB بیان بې سیسټم یا کچې', 'نه پوهېدل چې لوجفریم یا شاخص څه دي', 'د اډیټ تجربې دعوه بې جزئیاتو'],
    },
    followUps: {
      en: ['Which reporting software or tools do you use?', 'How do you verify field data before submitting it?'],
      fa: ['از کدام نرم‌افزار یا ابزارهای گزارش‌دهی استفاده می‌کنید؟', 'معلومات میدانی را پیش از ارسال چگونه راستی‌آزمایی می‌کنید؟'],
      ps: ['کوم رپوټيټ سافټویر یا توکي کاروې؟', 'میداني معلومات له لېږد مخکې څنګه تاییدوې؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'ngo-humanitarian',
    question: {
      en: 'How do you prioritize needs when resources are limited?',
      fa: 'وقتی منابع محدود است، نیازها را چگونه اولویت‌بندی می‌کنید؟',
      ps: 'کله چې سرچینې لږې وي، اړتیاوې څنګه لومړیتوب ورکوې؟',
    },
    difficulty: 'hard',
    sampleAnswer: {
      en: 'I start from the agreed criteria, not from whoever shouts loudest. In our winterization response we had kits for 300 families and assessments showed 480 in need. We scored every family on the project\u2019s vulnerability matrix — income, shelter condition, children under five — ranked them, and published the criteria at the mosque so the community understood the logic. Then we built a waiting list and pushed for additional funding with the scored data. Resources will always be limited; transparent criteria are what make cuts defensible.',
      fa: 'از معیارهای توافق‌شده شروع می‌کنم، نه از کسی که بلندتر فریاد می‌زند. در پاسخ زمستانی ما، کیت برای ۳۰۰ خانواده داشتیم در حالی که ارزیابی‌ها ۴۸۰ خانواده نیازمند نشان می‌داد. هر خانواده را بر اساس ماتریس آسیب‌پذیری پروژه — درآمد، وضعیت سرپناه، کودکان زیر پنج سال — نمره دادیم، رتبه‌بندی کردیم و معیارها را در مسجد نشر کردیم تا جامعه منطق را بفهمد. سپس فهرست انتظار ساختیم و با داده‌های نمره‌شده برای بودجه اضافی لابی کردیم. منابع همیشه محدود خواهند بود؛ معیارهای شفاف هستند که کاهش‌ها را قابل دفاع می‌کنند.',
      ps: 'له متقابل شویو معیارونو پیل کوم، نه له هغه څه چې لوړ چغې وهي. زموږ د ژمني ځانګړنې غبرګون کې موږ د ۳۰۰ کورنیو کټ درلودل خو ارزونې ۴۸۰ اړمنې کورنۍ ښودلې. هره کورنۍ ته مو د پروژې د زیان منونکې مېټرکس پر بنسټ نمره ورکړه — عاید، د استوګنې حالت، تر پنځه کلنو ماشومان — درجه بندي مو کړه او معیارونه په جومات کې خپاره کړل چې ټولنه منطق درک کړي. بیا مو د انتظار لست جوړ کړ او د نمره شویو معلوماتو سره اضافي بودجه مو وغوښته. سرچینې تل به لږې وي؛ روښانه معیارونه هغه دي چې کمښت دفاع کېدونی کوي.',
    },
    strongExample: {
      en: '\u201CWe triaged by the assessment scores, documented every exclusion, and got two donors to fund the waiting list — 90% of the gap was covered in six weeks.\u201D',
      fa: '\u00ABبر اساس نمرات ارزیابی اولویت‌بندی کردیم، هر استثنا را مستند ساختیم و دو تمویل‌کننده را برای فهرست انتظار متقاعد کردیم — ۹۰٪ شکاف در شش هفته پوشش داده شد.\u00BB',
      ps: '\u00ABد ارزونې نمراتو پر بنسټ مو لومړیتوب کړ، هره استثنا سند کړه او دوه تمویل کوونکي مو د انتظار لست لپاره قانع کړل — ۹۰٪ توپیر په شپږو اونیو پوره شو.\u00BB',
    },
    weakExample: {
      en: '\u201CI help whoever comes first. It is impossible to make everyone happy.\u201D',
      fa: '\u00ABبه هر که زودتر بیاید کمک می‌کنم. راضی کردن همه ممکن نیست.\u00BB',
      ps: '\u00ABهر چا چې لومړی راشي ورته مرسته کوم. ټول خوښول ناممکن دي.\u00BB',
    },
    tips: {
      en: 'Show a method: criteria, scoring, documentation, communication. Interviewers test whether you can defend hard choices against pressure — name the pressure and the process that beat it.',
      fa: 'یک روش نشان دهید: معیار، نمره‌دهی، مستندسازی، ارتباطات. مصاحبه‌گر می‌سنجد که آیا می‌توانید تصمیم‌های سخت را در برابر فشار دفاع کنید — فشار و فرایندی را که بر آن غلبه کرد نام ببرید.',
      ps: 'یوه طریقه وښيه: معیار، نمره ورکول، سند جوړول، اړیکه. مصاحبه کوونکی ازموي چې سختې پرېکړې په فشار کې دفاع کولی شې کنه — فشار او هغه پروسه ونوموه چې پرې غلبه وکړه.',
    },
    commonMistakes: {
      en: ['First-come-first-served logic', 'No criteria or documentation mentioned', 'Saying \u201Cthe supervisor decides\u201D with no input of your own'],
      fa: ['منطق \u00ABاولین نفر، اولین خدمت\u00BB', 'ذکر نکردن هیچ معیار یا مستندسازی', 'گفتن \u00ABمسؤول تصمیم می‌گیرد\u00BB بدون هیچ تحلیل خود'],
      ps: ['\u00ABلومړی راغلی، لومړی خدمت\u00BB منطق', 'هیڅ معیار یا سند نه یادول', 'وایل \u00ABمسؤل پرېکړه کوي\u00BB بې خپل تحلیل'],
    },
    followUps: {
      en: ['What do you tell a family that did not qualify?', 'How do you handle pressure from a local elder?'],
      fa: ['به خانواده‌ای که واجد شرایط نشد چه می‌گویید؟', 'فشار یک بزرگ محلی را چگونه مدیریت می‌کنید؟'],
      ps: ['هغې کورنۍ ته چې معیار نه ډکه کړه څه وایې؟', 'د یو ځایی مشر فشار څنګه اداره کوې؟'],
    },
    expectedDuration: '2-3 mins',
  },
];
