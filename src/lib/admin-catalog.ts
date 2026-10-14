/** One home for every admin task. Keys remain stable for existing shortcuts. */
export type AdminCopy = {en:string;fa:string;ps:string};
const copy=(en:string,fa:string,ps:string):AdminCopy=>({en,fa,ps});
export const ADMIN_WORKSPACES = [
 {key:'dashboard',title:copy('Dashboard','داشبورد','ډشبورډ'),panels:['dashboard']},
 {key:'opportunities',title:copy('Opportunities & review','فرصت‌ها و بررسی','فرصتونه او بیاکتنه'),panels:['opportunity','opportunityCategory','submissions','discovery','contentHealth']},
 {key:'publishing',title:copy('Brand & publishing','برند و نشر','برانډ او خپرول'),panels:['brandStudio','automation','socialIdea']},
 {key:'imports',title:copy('Imports & sources','ورود محتوا و منابع','واردول او سرچینې'),panels:['autoImport','importSource']},
 {key:'applicants',title:copy('Applicants & delivery','متقاضیان و ارسال اعلان','غوښتونکي او خبرتیاوې'),panels:['applicantOps','organizations']},
 {key:'inbox',title:copy('Inbox & subscribers','پیام‌ها و مشترکان','پیغامونه او ګډونوال'),panels:['contactMessage','alertSubscriber','subscriber']},
 {key:'services',title:copy('Services & visas','خدمات و ویزه‌ها','خدمتونه او ویزې'),panels:['service','serviceCategory','visa']},
 {key:'news',title:copy('News & stories','خبرها و داستان‌ها','خبرونه او کیسې'),panels:['news','newsCategory','successStory']},
 {key:'documents',title:copy('CV & document tools','ابزارهای سی‌وی و اسناد','سي وي او سندونو وسیلې'),panels:['cvBuilder','documentTemplate','documentCategory','templateComment','templateRating','templateBookmark']},
 {key:'interviews',title:copy('Interview preparation','آمادگی مصاحبه','مرکې ته چمتووالی'),panels:['interviewQuestion','interviewCategory','interviewExperience','interviewSession']},
 {key:'visaPrep',title:copy('Visa preparation','آمادگی ویزه','ویزې ته چمتووالی'),panels:['visaCountry','visaCategory','visaQuestion','visaDocument','visaExperience','visaRejection']},
 {key:'website',title:copy('Website & visibility','وب‌سایت و نمایش محتوا','وېبپاڼه او د منځپانګې ښودنه'),panels:['section','menuItem','footerLink','socialLink','page']},
 {key:'about',title:copy('About & trust','درباره ما و اعتماد','زموږ په اړه او باور'),panels:['whyChooseUsFeature','processStep','faq','testimonial','partner','teamMember','comparisonRow','ctaBanner']},
 {key:'gallery',title:copy('Gallery & albums','گالری و آلبوم‌ها','ګالري او البومونه'),panels:['galleryItem','galleryAlbum']},
 {key:'commerce',title:copy('Orders & promotions','سفارش‌ها و تبلیغات','سپارښتنې او اعلانونه'),panels:['orders','advertisement','pricingPackage','paymentMethod']},
 {key:'settings',title:copy('Settings & contacts','تنظیمات و تماس‌ها','تنظیمات او اړیکې'),panels:['settings','language','department','branch']},
] as const;
export const LEGACY_ADMIN_TARGETS:Record<string,string>={importRun:'autoImport',counter:'section',socialKit:'brandStudio'};
export function canonicalAdminPanel(key:string){return LEGACY_ADMIN_TARGETS[key]||key;}
export function adminWorkspaceFor(key:string){const panel=canonicalAdminPanel(key);return ADMIN_WORKSPACES.find(w=>(w.panels as readonly string[]).includes(panel));}
export const READ_ONLY_ADMIN_MODELS = new Set(['counter','importRun','interviewSession','templateRating','templateBookmark']);
export const ADMIN_PUBLIC_PATHS:Record<string,string>={opportunity:'/opportunities',opportunityCategory:'/opportunities',service:'/services',serviceCategory:'/services',visa:'/visas',news:'/blog',newsCategory:'/blog',successStory:'/success-stories',documentTemplate:'/templates',documentCategory:'/templates',cvBuilder:'/cv-builder',interviewQuestion:'/interview-prep',interviewCategory:'/interview-prep',interviewExperience:'/interview-prep/community',visaCountry:'/visa-prep',visaCategory:'/visa-prep',visaQuestion:'/visa-prep',visaDocument:'/visa-prep',visaExperience:'/visa-prep/community',visaRejection:'/visa-prep/rejections',galleryItem:'/gallery',galleryAlbum:'/gallery',partner:'/partners',department:'/contact',branch:'/contact',organizations:'/organizations',section:'/',menuItem:'/',footerLink:'/',socialLink:'/',advertisement:'/advertise',orders:'/track',pricingPackage:'/#pricing',paymentMethod:'/#payments',whyChooseUsFeature:'/#why-choose-us',processStep:'/#process',faq:'/#faqs',testimonial:'/#testimonials',teamMember:'/#team',comparisonRow:'/#comparison',ctaBanner:'/#cta-banner'};
export const HOMEPAGE_AREAS = [
 {key:'hero',model:null}, {key:'process',model:'processStep'}, {key:'opportunities',model:'opportunity'},
 {key:'counters',model:null}, {key:'services',model:'service'}, {key:'visas',model:'visa'},
 {key:'promote',model:null}, {key:'testimonials',model:'testimonial'}, {key:'pricing',model:'pricingPackage'},
 {key:'payments',model:'paymentMethod'}, {key:'news',model:'news'}, {key:'gallery',model:'galleryItem'},
 {key:'partners',model:'partner'}, {key:'team',model:'teamMember'}, {key:'faqs',model:'faq'},
 {key:'comparison',model:'comparisonRow'}, {key:'whyChooseUs',model:'whyChooseUsFeature'},
 {key:'ctaBanner',model:'ctaBanner'}, {key:'contact',model:null},
] as const;
export const HOMEPAGE_KEYS = new Set<string>(HOMEPAGE_AREAS.map(a=>a.key));
