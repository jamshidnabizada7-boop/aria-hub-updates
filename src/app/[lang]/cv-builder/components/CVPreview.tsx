import React from 'react';
import { CVData, TemplateType } from '../types';
import { Mail, Phone, MapPin, Linkedin, Globe, User, Link as LinkIcon } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import ReactMarkdown from 'react-markdown';

interface CVPreviewProps {
  data: CVData;
  template: TemplateType;
  settings?: any;
}

export function CVPreview({ data, template, settings }: CVPreviewProps) {
  const t = useT();
  const lang = useLangStore(state => state.code);
  const isRtl = lang === 'fa' || lang === 'ps';
  
  // If all fields are empty, show a placeholder overlay
  const isEmpty = !data.personal.fullName && data.education.length === 0 && data.experience.length === 0 && data.skills.length === 0;

  const parseI18n = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return null; }
    }
    return val;
  };

  const siteNameI18n = parseI18n(settings?.siteNameI18n);
  const descriptionI18n = parseI18n(settings?.descriptionI18n);
  const addressI18n = parseI18n(settings?.addressI18n);

  const siteName = siteNameI18n?.[lang] || settings?.siteName || 'ARIA HUB';
  const description = descriptionI18n?.[lang] || settings?.description || 'Your Gateway to Global Opportunities';
  const address = addressI18n?.[lang] || settings?.address || 'Sediqyar Square, Opposite of Balkh Medical Faculty, Mazar-e-Sharif, Afghanistan';

  const PrintFooter = () => (
    <div className="hidden print:flex flex-row items-center justify-between border-t-2 border-slate-200 pt-4 mt-auto w-full gap-4 page-break-inside-avoid" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col text-xs text-slate-600 text-start whitespace-nowrap">
        <p className="m-0 font-medium">{address}</p>
        <p className="m-0">{settings?.email || 'info@ariahub.com'}</p>
        <p className="m-0" dir="ltr">{settings?.phone || '+93 123 456 789'}</p>
      </div>
      <div className="flex flex-row items-center gap-4 text-end">
        <div className="flex flex-col text-end">
          <h2 className="text-xl font-bold text-slate-800 m-0 leading-tight">{siteName}</h2>
          <p className="text-xs text-slate-500 max-w-[300px] m-0 leading-snug whitespace-pre-wrap">{description}</p>
        </div>
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt={siteName} className="h-14 w-auto object-contain shrink-0" />
        ) : (
          <div className="text-2xl font-bold text-slate-800 shrink-0">{siteName}</div>
        )}
      </div>
    </div>
  );

  if (template === 'professional') {
    return (
      <div className="w-full min-h-[1414px] flex flex-col bg-white text-slate-900 shadow-2xl overflow-hidden relative text-[11px] leading-relaxed p-0 print:p-8">
        {isEmpty && (
          <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-50 print:hidden">
            <span className="text-slate-400 font-medium text-base">{t('tools.cvBuilder.previewPlaceholder')}</span>
          </div>
        )}
        


        <div className="flex flex-1 h-full">
          {/* Left Column - Dark Blue */}
          <div className="w-1/3 bg-[#0f172a] text-white p-6 flex flex-col print:bg-[#0f172a] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {data.personal.picture && (
              <div className="mb-6 flex justify-center">
                <img src={data.personal.picture} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-slate-700/50" />
              </div>
            )}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1 leading-tight">{data.personal.fullName || t('tools.cvBuilder.yourName')}</h1>
              <div className="w-10 h-1 bg-blue-500 mt-2 rounded"></div>
            </div>

            <div className="space-y-3 mb-8 text-slate-300">
              {data.personal.email && <div className="flex items-center"><Mail className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" /> <span className="break-all">{data.personal.email}</span></div>}
              {data.personal.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" /> {data.personal.phone}</div>}
              {data.personal.location && <div className="flex items-center"><MapPin className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" /> {data.personal.location}</div>}
              {data.personal.gender && <div className="flex items-center"><User className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" /> {data.personal.gender === 'Male' ? (t('tools.cvBuilder.personal.male') || 'Male') : data.personal.gender === 'Female' ? (t('tools.cvBuilder.personal.female') || 'Female') : (t('tools.cvBuilder.personal.other') || 'Other')}</div>}
              
              {/* Render new socialLinks (and fallback to old linkedIn/website if available but not in socialLinks) */}
              {data.socialLinks && data.socialLinks.length > 0 ? (
                data.socialLinks.map(link => (
                  <div key={link.id} className="flex items-center">
                    <LinkIcon className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" />
                    <a href={link.url} target="_blank" rel="noreferrer" className="hover:text-white break-all">{link.platform}</a>
                  </div>
                ))
              ) : (
                <>
                  {data.personal.linkedIn && <div className="flex items-center"><Linkedin className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" /> <span className="break-all">{data.personal.linkedIn}</span></div>}
                  {data.personal.website && <div className="flex items-center"><Globe className="w-3 h-3 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" /> <span className="break-all">{data.personal.website}</span></div>}
                </>
              )}
            </div>

            {data.skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold tracking-wider uppercase mb-3 text-blue-400">{t('tools.cvBuilder.skills.title')}</h2>
                <div className="space-y-2 text-slate-300">
                  {data.skills.map(s => (
                    <div key={s.id}>
                      <div className="flex justify-between mb-1">
                         <span>{s.name}</span>
                         <span className="text-[9px] uppercase">
                            {s.level === 'Beginner' ? t('tools.cvBuilder.skills.beginner') :
                             s.level === 'Intermediate' ? t('tools.cvBuilder.skills.intermediate') :
                             t('tools.cvBuilder.skills.expert')}
                         </span>
                      </div>
                      <div className="w-full bg-slate-700 h-1 rounded">
                        <div className="bg-blue-500 h-1 rounded" style={{ width: s.level === 'Expert' ? '100%' : s.level === 'Intermediate' ? '66%' : '33%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.languages.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold tracking-wider uppercase mb-3 text-blue-400">{t('tools.cvBuilder.languages.title')}</h2>
                <div className="space-y-2 text-slate-300">
                  {data.languages.map(l => (
                    <div key={l.id} className="flex justify-between border-b border-slate-700 pb-1">
                      <span>{l.name}</span>
                      <span className="text-[10px] text-slate-400">{l.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - White */}
          <div className="w-2/3 p-6 flex flex-col">
            {data.personal.summary && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 border-b-2 border-slate-200 pb-1 mb-2 uppercase tracking-wider">{t('tools.cvBuilder.personal.summary')}</h2>
                <div className="text-slate-600 text-[11px] leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                  <ReactMarkdown>{data.personal.summary}</ReactMarkdown>
                </div>
              </div>
            )}

            {data.experience.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 border-b-2 border-slate-200 pb-1 mb-3 uppercase tracking-wider">{t('tools.cvBuilder.experience.title')}</h2>
                <div className="space-y-4">
                  {data.experience.map(exp => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-slate-800">{exp.role}</h3>
                        <span className="text-slate-500 text-[9px] font-medium bg-slate-100 px-1.5 py-0.5 rounded">{exp.startDate} - {exp.endDate}</span>
                      </div>
                      <div className="text-blue-600 font-medium text-[10px] mb-1">{exp.company} {exp.location && `• ${exp.location}`}</div>
                      <div className="text-slate-600 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
                        <ReactMarkdown>{exp.description}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.education.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 border-b-2 border-slate-200 pb-1 mb-3 uppercase tracking-wider">{t('tools.cvBuilder.education.title')}</h2>
                <div className="space-y-4">
                  {data.education.map(ed => (
                    <div key={ed.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-slate-800">{ed.degree}</h3>
                        <span className="text-slate-500 text-[9px] font-medium bg-slate-100 px-1.5 py-0.5 rounded">{ed.startDate} - {ed.endDate}</span>
                      </div>
                      <div className="text-slate-700 font-medium text-[10px] mb-1">{ed.institution} {ed.location && `• ${ed.location}`}</div>
                      <div className="text-slate-600 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
                        <ReactMarkdown>{ed.description}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.projects.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-900 border-b-2 border-slate-200 pb-1 mb-3 uppercase tracking-wider">{t('tools.cvBuilder.projects.title')}</h2>
                <div className="space-y-4">
                  {data.projects.map(proj => (
                    <div key={proj.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-slate-800">{proj.name}</h3>
                        {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" className="text-blue-500 text-[9px]">{t('tools.cvBuilder.projects.link')}</a>}
                      </div>
                      <div className="text-slate-600 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
                        <ReactMarkdown>{proj.description}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {data.certifications.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-900 border-b-2 border-slate-200 pb-1 mb-3 uppercase tracking-wider">{t('tools.cvBuilder.certifications.title')}</h2>
                  <div className="space-y-2">
                    {data.certifications.map(cert => (
                      <div key={cert.id}>
                        <h3 className="font-semibold text-slate-800 text-[10px]">{cert.name}</h3>
                        <div className="text-slate-500 text-[9px]">{cert.issuer} • {cert.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.references.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-900 border-b-2 border-slate-200 pb-1 mb-3 uppercase tracking-wider">{t('tools.cvBuilder.references.title')}</h2>
                  <div className="space-y-2">
                    {data.references.map(ref => (
                      <div key={ref.id}>
                        <h3 className="font-semibold text-slate-800 text-[10px]">{ref.name}</h3>
                        <div className="text-slate-600 text-[9px]">{ref.company}</div>
                        <div className="text-slate-500 text-[9px]">{ref.contact}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <PrintFooter />
      </div>
    );
  }

  // Scholar Template
  return (
    <div className="w-full min-h-[1414px] flex flex-col bg-white text-slate-900 shadow-2xl overflow-hidden relative font-serif text-[11px] leading-relaxed p-10 print:p-10">
      {isEmpty && (
        <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-50 print:hidden font-sans">
          <span className="text-slate-400 font-medium text-base">{t('tools.cvBuilder.previewPlaceholder')}</span>
        </div>
      )}
      

      
      <div className="flex-1 space-y-5">
        <div className="text-center mb-6">
        {data.personal.picture && (
          <div className="flex justify-center mb-4">
            <img src={data.personal.picture} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-slate-200" />
          </div>
        )}
        <h1 className="text-3xl font-normal mb-2 text-slate-900">{data.personal.fullName || t('tools.cvBuilder.yourName')}</h1>
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-slate-600 text-[10px]">
          {data.personal.location && <span>{data.personal.location}</span>}
          {data.personal.phone && <span>• {data.personal.phone}</span>}
          {data.personal.email && <span>• {data.personal.email}</span>}
          {data.personal.gender && <span>• {data.personal.gender === 'Male' ? (t('tools.cvBuilder.personal.male') || 'Male') : data.personal.gender === 'Female' ? (t('tools.cvBuilder.personal.female') || 'Female') : (t('tools.cvBuilder.personal.other') || 'Other')}</span>}
          
          {data.socialLinks && data.socialLinks.length > 0 ? (
            data.socialLinks.map(link => (
              <span key={link.id}>• <a href={link.url} target="_blank" rel="noreferrer" className="hover:text-slate-800">{link.platform}</a></span>
            ))
          ) : (
            <>
              {data.personal.website && <span>• {data.personal.website}</span>}
              {data.personal.linkedIn && <span>• {data.personal.linkedIn}</span>}
            </>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {data.personal.summary && (
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.personal.summary')}</h2>
            <div className="text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
              <ReactMarkdown>{data.personal.summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {data.education.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.education.title')}</h2>
            <div className="space-y-3">
              {data.education.map(ed => (
                <div key={ed.id}>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{ed.institution} {ed.location && `, ${ed.location}`}</span>
                    <span className="font-normal text-slate-600">{ed.startDate} – {ed.endDate}</span>
                  </div>
                  <div className="italic text-slate-700 mb-1">{ed.degree}</div>
                  <div className="text-slate-700 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
                    <ReactMarkdown>{ed.description}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.experience.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.experience.title')}</h2>
            <div className="space-y-3">
              {data.experience.map(exp => (
                <div key={exp.id}>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{exp.role}</span>
                    <span className="font-normal text-slate-600">{exp.startDate} – {exp.endDate}</span>
                  </div>
                  <div className="italic text-slate-700 mb-1">{exp.company} {exp.location && `, ${exp.location}`}</div>
                  <div className="text-slate-700 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
                    <ReactMarkdown>{exp.description}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.projects.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.projects.title')}</h2>
            <div className="space-y-3">
              {data.projects.map(proj => (
                <div key={proj.id}>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{proj.name}</span>
                    {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" className="font-normal text-blue-600">{t('tools.cvBuilder.projects.link')}</a>}
                  </div>
                  <div className="text-slate-700 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0">
                    <ReactMarkdown>{proj.description}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {data.skills.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.skills.title')}</h2>
              <div className="text-slate-700">
                {data.skills.map(s => `${s.name} (${s.level})`).join(' • ')}
              </div>
            </div>
          )}

          {data.languages.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.languages.title')}</h2>
              <div className="text-slate-700">
                {data.languages.map(l => `${l.name} (${l.proficiency})`).join(' • ')}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {data.certifications.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.certifications.title')}</h2>
              <div className="space-y-2">
                {data.certifications.map(cert => (
                  <div key={cert.id} className="text-slate-700">
                    <span className="font-bold">{cert.name}</span> — {cert.issuer} ({cert.date})
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.references.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-slate-800 border-b border-slate-300 mb-2 uppercase tracking-widest">{t('tools.cvBuilder.references.title')}</h2>
              <div className="space-y-2">
                {data.references.map(ref => (
                  <div key={ref.id} className="text-slate-700">
                    <span className="font-bold">{ref.name}</span> — {ref.company}
                    <br />
                    <span className="italic text-slate-500">{ref.contact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PrintFooter />

      </div>
    </div>
  );
}
