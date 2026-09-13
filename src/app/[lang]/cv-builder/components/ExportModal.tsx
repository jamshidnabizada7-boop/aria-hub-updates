import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportModal({ isOpen, onClose, onConfirm }: ExportModalProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] print:hidden"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[101] overflow-hidden border border-slate-200 dark:border-slate-800 print:hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('tools.cvBuilder.export.title') || 'Export CV as PDF'}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('tools.cvBuilder.export.desc') || 'We will use your browser\'s built-in print functionality. When the print dialog opens, select <strong>"Save as PDF"</strong> as the destination and ensure <strong>"Background graphics"</strong> is checked for the best result.' }} />
              
              <div className="flex space-x-3 w-full">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  {t('tools.cvBuilder.export.cancel') || 'Cancel'}
                </Button>
                <Button onClick={onConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {t('tools.cvBuilder.export.confirm') || 'Continue to Print'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
