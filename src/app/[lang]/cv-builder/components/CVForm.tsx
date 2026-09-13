import React from 'react';
import { CVData, Education, Experience, Skill, Language, Certification, Project, Reference } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface CVFormProps {
  data: CVData;
  setData: React.Dispatch<React.SetStateAction<CVData>>;
}

export function CVForm({ data, setData }: CVFormProps) {
  const t = useT();

  const updatePersonal = (field: keyof CVData['personal'], value: string) => {
    setData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  const addEducation = () => {
    setData(prev => ({
      ...prev,
      education: [...prev.education, { id: uuidv4(), degree: '', institution: '', location: '', startDate: '', endDate: '', description: '' }]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map(ed => ed.id === id ? { ...ed, [field]: value } : ed)
    }));
  };

  const removeEducation = (id: string) => {
    setData(prev => ({
      ...prev,
      education: prev.education.filter(ed => ed.id !== id)
    }));
  };

  const addExperience = () => {
    setData(prev => ({
      ...prev,
      experience: [...prev.experience, { id: uuidv4(), role: '', company: '', location: '', startDate: '', endDate: '', description: '' }]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const removeExperience = (id: string) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const addSkill = () => {
    setData(prev => ({
      ...prev,
      skills: [...prev.skills, { id: uuidv4(), name: '', level: 'Intermediate' }]
    }));
  };

  const updateSkill = (id: string, field: keyof Skill, value: string) => {
    setData(prev => ({
      ...prev,
      skills: prev.skills.map(skill => skill.id === id ? { ...skill, [field]: value } : skill)
    }));
  };

  const removeSkill = (id: string) => {
    setData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.id !== id)
    }));
  };

  // Languages
  const addLanguage = () => {
    setData(prev => ({
      ...prev,
      languages: [...prev.languages, { id: uuidv4(), name: '', proficiency: 'Fluent' }]
    }));
  };

  const updateLanguage = (id: string, field: keyof Language, value: string) => {
    setData(prev => ({
      ...prev,
      languages: prev.languages.map(lang => lang.id === id ? { ...lang, [field]: value } : lang)
    }));
  };

  const removeLanguage = (id: string) => {
    setData(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang.id !== id)
    }));
  };

  // Certifications
  const addCertification = () => {
    setData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { id: uuidv4(), name: '', issuer: '', date: '' }]
    }));
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    setData(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert => cert.id === id ? { ...cert, [field]: value } : cert)
    }));
  };

  const removeCertification = (id: string) => {
    setData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }));
  };

  // Projects
  const addProject = () => {
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, { id: uuidv4(), name: '', description: '', link: '' }]
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(proj => proj.id === id ? { ...proj, [field]: value } : proj)
    }));
  };

  const removeProject = (id: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }));
  };

  // References
  const addReference = () => {
    setData(prev => ({
      ...prev,
      references: [...prev.references, { id: uuidv4(), name: '', company: '', contact: '' }]
    }));
  };

  const updateReference = (id: string, field: keyof Reference, value: string) => {
    setData(prev => ({
      ...prev,
      references: prev.references.map(ref => ref.id === id ? { ...ref, [field]: value } : ref)
    }));
  };

  const removeReference = (id: string) => {
    setData(prev => ({
      ...prev,
      references: prev.references.filter(ref => ref.id !== id)
    }));
  };

  // Social Links
  const addSocialLink = () => {
    setData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { id: uuidv4(), platform: '', url: '' }]
    }));
  };

  const updateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
    setData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(link => link.id === id ? { ...link, [field]: value } : link)
    }));
  };

  const removeSocialLink = (id: string) => {
    setData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter(link => link.id !== id)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePersonal('picture', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 border-b pb-2">{t('tools.cvBuilder.personal.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder={t('tools.cvBuilder.personal.fullName')} value={data.personal.fullName} onChange={e => updatePersonal('fullName', e.target.value)} className="form-input" />
          <input type="email" placeholder={t('tools.cvBuilder.personal.email')} value={data.personal.email} onChange={e => updatePersonal('email', e.target.value)} className="form-input" />
          <input type="tel" placeholder={t('tools.cvBuilder.personal.phone')} value={data.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} className="form-input" />
          <input type="text" placeholder={t('tools.cvBuilder.personal.location')} value={data.personal.location} onChange={e => updatePersonal('location', e.target.value)} className="form-input" />
          <select value={data.personal.gender || ''} onChange={e => updatePersonal('gender', e.target.value)} className="form-input">
            <option value="" disabled>{t('tools.cvBuilder.personal.gender') || 'Select Gender'}</option>
            <option value="Male">{t('tools.cvBuilder.personal.male') || 'Male'}</option>
            <option value="Female">{t('tools.cvBuilder.personal.female') || 'Female'}</option>
            <option value="Other">{t('tools.cvBuilder.personal.other') || 'Other'}</option>
          </select>
          <div className="flex items-center space-x-2 rtl:space-x-reverse relative">
            <label className="flex-1 form-input text-slate-400 cursor-pointer flex items-center overflow-hidden whitespace-nowrap">
              <Upload className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" />
              {data.personal.picture ? (t('tools.cvBuilder.personal.pictureSelected') || 'Picture selected') : (t('tools.cvBuilder.personal.picture') || 'Upload Picture')}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {data.personal.picture && (
              <button onClick={() => updatePersonal('picture', '')} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Dynamic Social Links inside Personal */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('tools.cvBuilder.personal.socials') || 'Social Media Links'}</label>
            <button onClick={addSocialLink} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline gap-1">
              <Plus className="w-4 h-4"/> {t('admin.form.add') || 'Add'}
            </button>
          </div>
          <div className="space-y-2">
            {data.socialLinks?.map(link => (
              <div key={link.id} className="flex space-x-2 rtl:space-x-reverse items-center">
                <input type="text" placeholder="Platform (e.g. LinkedIn)" value={link.platform} onChange={e => updateSocialLink(link.id, 'platform', e.target.value)} className="form-input w-1/3" />
                <input type="url" placeholder="URL" value={link.url} onChange={e => updateSocialLink(link.id, 'url', e.target.value)} className="form-input flex-1" />
                <button onClick={() => removeSocialLink(link.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>

        <RichTextEditor placeholder={t('tools.cvBuilder.personal.summary')} value={data.personal.summary} onChange={val => updatePersonal('summary', val)} />
      </div>

      {/* Experience */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.experience.title')}</h3>
          <button onClick={addExperience} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        {data.experience.map(exp => (
          <div key={exp.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3 relative group">
            <button onClick={() => removeExperience(exp.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder={t('tools.cvBuilder.experience.role')} value={exp.role} onChange={e => updateExperience(exp.id, 'role', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.experience.company')} value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.experience.location')} value={exp.location} onChange={e => updateExperience(exp.id, 'location', e.target.value)} className="form-input" />
              <div className="flex space-x-2 rtl:space-x-reverse">
                <input type="text" placeholder={t('tools.cvBuilder.experience.startDate')} value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} className="form-input w-1/2" />
                <input type="text" placeholder={t('tools.cvBuilder.experience.endDate')} value={exp.endDate} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} className="form-input w-1/2" />
              </div>
            </div>
            <RichTextEditor placeholder={t('tools.cvBuilder.experience.description')} value={exp.description} onChange={val => updateExperience(exp.id, 'description', val)} />
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.education.title')}</h3>
          <button onClick={addEducation} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        {data.education.map(ed => (
          <div key={ed.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3 relative group">
            <button onClick={() => removeEducation(ed.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder={t('tools.cvBuilder.education.degree')} value={ed.degree} onChange={e => updateEducation(ed.id, 'degree', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.education.institution')} value={ed.institution} onChange={e => updateEducation(ed.id, 'institution', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.education.location')} value={ed.location} onChange={e => updateEducation(ed.id, 'location', e.target.value)} className="form-input" />
              <div className="flex space-x-2 rtl:space-x-reverse">
                <input type="text" placeholder={t('tools.cvBuilder.education.startDate')} value={ed.startDate} onChange={e => updateEducation(ed.id, 'startDate', e.target.value)} className="form-input w-1/2" />
                <input type="text" placeholder={t('tools.cvBuilder.education.endDate')} value={ed.endDate} onChange={e => updateEducation(ed.id, 'endDate', e.target.value)} className="form-input w-1/2" />
              </div>
            </div>
            <RichTextEditor placeholder={t('tools.cvBuilder.education.description')} value={ed.description} onChange={val => updateEducation(ed.id, 'description', val)} />
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.skills.title')}</h3>
          <button onClick={addSkill} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.skills.map(skill => (
            <div key={skill.id} className="flex space-x-2 items-center">
              <input type="text" placeholder={t('tools.cvBuilder.skills.name')} value={skill.name} onChange={e => updateSkill(skill.id, 'name', e.target.value)} className="form-input flex-1" />
              <select value={skill.level} onChange={e => updateSkill(skill.id, 'level', e.target.value)} className="form-input w-32">
                <option value="Beginner">{t('tools.cvBuilder.skills.beginner')}</option>
                <option value="Intermediate">{t('tools.cvBuilder.skills.intermediate')}</option>
                <option value="Expert">{t('tools.cvBuilder.skills.expert')}</option>
              </select>
              <button onClick={() => removeSkill(skill.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.languages.title')}</h3>
          <button onClick={addLanguage} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.languages.map(lang => (
            <div key={lang.id} className="flex space-x-2 items-center">
              <input type="text" placeholder={t('tools.cvBuilder.languages.name')} value={lang.name} onChange={e => updateLanguage(lang.id, 'name', e.target.value)} className="form-input flex-1" />
              <select value={lang.proficiency} onChange={e => updateLanguage(lang.id, 'proficiency', e.target.value)} className="form-input w-32">
                <option value="Native">{t('tools.cvBuilder.languages.native')}</option>
                <option value="Fluent">{t('tools.cvBuilder.languages.fluent')}</option>
                <option value="Intermediate">{t('tools.cvBuilder.languages.intermediate')}</option>
                <option value="Basic">{t('tools.cvBuilder.languages.basic')}</option>
              </select>
              <button onClick={() => removeLanguage(lang.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.certifications.title')}</h3>
          <button onClick={addCertification} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        {data.certifications.map(cert => (
          <div key={cert.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3 relative group">
            <button onClick={() => removeCertification(cert.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder={t('tools.cvBuilder.certifications.name')} value={cert.name} onChange={e => updateCertification(cert.id, 'name', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.certifications.issuer')} value={cert.issuer} onChange={e => updateCertification(cert.id, 'issuer', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.certifications.date')} value={cert.date} onChange={e => updateCertification(cert.id, 'date', e.target.value)} className="form-input" />
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.projects.title')}</h3>
          <button onClick={addProject} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        {data.projects.map(proj => (
          <div key={proj.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3 relative group">
            <button onClick={() => removeProject(proj.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder={t('tools.cvBuilder.projects.name')} value={proj.name} onChange={e => updateProject(proj.id, 'name', e.target.value)} className="form-input" />
              <input type="url" placeholder={t('tools.cvBuilder.projects.link')} value={proj.link} onChange={e => updateProject(proj.id, 'link', e.target.value)} className="form-input" />
            </div>
            <RichTextEditor placeholder={t('tools.cvBuilder.projects.description')} value={proj.description} onChange={val => updateProject(proj.id, 'description', val)} />
          </div>
        ))}
      </div>

      {/* References */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{t('tools.cvBuilder.references.title')}</h3>
          <button onClick={addReference} className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"><Plus className="w-4 h-4 mr-1"/> {t('admin.form.add')}</button>
        </div>
        {data.references.map(ref => (
          <div key={ref.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3 relative group">
            <button onClick={() => removeReference(ref.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder={t('tools.cvBuilder.references.name')} value={ref.name} onChange={e => updateReference(ref.id, 'name', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.references.company')} value={ref.company} onChange={e => updateReference(ref.id, 'company', e.target.value)} className="form-input" />
              <input type="text" placeholder={t('tools.cvBuilder.references.contact')} value={ref.contact} onChange={e => updateReference(ref.id, 'contact', e.target.value)} className="form-input" />
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .form-input {
          @apply w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-slate-100 transition-colors;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}} />
    </div>
  );
}
