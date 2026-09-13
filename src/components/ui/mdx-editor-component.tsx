'use client';

import '@mdxeditor/editor/style.css';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  linkPlugin,
  linkDialogPlugin,
  ListsToggle,
} from '@mdxeditor/editor';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

export interface EditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export default function Editor({ markdown, onChange, placeholder }: EditorProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = mounted && currentTheme === 'dark';

  return (
    <MDXEditor
      className={`${isDark ? 'dark-theme' : ''} border rounded-md min-h-[150px] bg-white dark:bg-slate-900 transition-colors duration-200`}
      markdown={markdown}
      onChange={onChange}
      contentEditableClassName="prose prose-sm sm:prose dark:prose-invert max-w-none px-4 py-3 min-h-[150px] focus:outline-none"
      placeholder={placeholder}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide p-2 border-b bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
              <UndoRedo />
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />
              <BlockTypeSelect />
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />
              <BoldItalicUnderlineToggles />
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />
              <ListsToggle />
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />
              <CreateLink />
            </div>
          )
        })
      ]}
    />
  );
}
