'use client';

import { useState } from 'react';
import { CVData, TemplateType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CVForm } from './components/CVForm';
import { CVPreview } from './components/CVPreview';
import { ExportModal } from './components/ExportModal';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useT } from '@/hooks/use-t';

const initialData: CVData = {
  personal: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    website: '',
    summary: '',
    gender: '',
    picture: '',
  },
  socialLinks: [],
  education: [],
  experience: [],
  skills: [],
  languages: [],
  certifications: [],
  projects: [],
  references: [],
};

export function CVBuilderClient({ settings }: { settings: any }) {
  const t = useT();
  const [data, setData] = useState<CVData>(initialData);
  const [template, setTemplate] = useState<TemplateType>('professional');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handlePrint = () => {
    setShowExportModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:w-full print:m-0 print:p-0">

      {/* Form Column - Hidden on Print */}
      <div className="space-y-6 print:hidden">
        <div className="glass-card p-6 rounded-2xl shadow-premium border border-white/20 dark:border-white/10 relative overflow-hidden">
           <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-0" />
           <div className="relative z-10 space-y-6">

              <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                 <h2 className="text-2xl font-semibold text-slate-900 dark:text-white font-sans">
                   {t('tools.cvBuilder.title')}
                 </h2>
                 <Button
                   onClick={handleExport}
                   className="bg-gradient-to-r from-[#3b82f6] to-[#0ea5e9] text-white hover:opacity-90 transition-opacity border-0 shadow-lg font-medium"
                 >
                   <Printer className="w-4 h-4 mr-2" />
                   {t('tools.cvBuilder.export')}
                 </Button>
              </div>

              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setTemplate('professional')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    template === 'professional'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {t('tools.cvBuilder.templatePro')}
                </button>
                <button
                  onClick={() => setTemplate('scholar')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    template === 'scholar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {t('tools.cvBuilder.templateScholar')}
                </button>
              </div>

              <CVForm data={data} setData={setData} />
           </div>
        </div>
      </div>

      {/* Preview Column - Full width on Print */}
      <div className="print:w-full print:m-0 print:p-0">
        <div className="sticky top-6 print:static">
          <CVPreview data={data} template={template} settings={settings} />
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handlePrint}
      />
    </div>
  );
}
