'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';

const Editor = dynamic(() => import('./mdx-editor-component'), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse border border-slate-200 dark:border-slate-700" />
});

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, className }, ref) => {
    return (
      <div ref={ref} className={`rich-text-editor ${className || ''}`}>
        <Editor markdown={value || ''} onChange={onChange} placeholder={placeholder} />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
