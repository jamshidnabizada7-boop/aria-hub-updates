"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Star, Download, Bookmark, FileText } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';

interface Template {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  isPremium: boolean;
  successRate: number;
  category?: { name: string };
  _count: { ratings: number, bookmarks: number, comments: number };
}

export default function TemplatesLibraryPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const t = useT();
  const hrefFn = useLangHref();

  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      try {
        const url = new URL('/api/templates', window.location.origin);
        if (categoryFilter) url.searchParams.append('category', categoryFilter);
        
        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.success) {
          setTemplates(json.data);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTemplates();
  }, [categoryFilter]);

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.excerpt && t.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12" dir="ltr">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            {t('templates.title')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('templates.subtitle')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="relative w-full md:max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text"
              placeholder={t('placeholder.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['All', 'CV', 'Cover Letter', 'SOP', 'Visa', 'Email'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'All' ? '' : cat.toLowerCase().replace(' ', '-'))}
                className={`px-4 py-2 whitespace-nowrap rounded-lg font-medium transition-colors ${
                  (categoryFilter === '' && cat === 'All') || categoryFilter === cat.toLowerCase().replace(' ', '-')
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'All' ? t('templates.filters.all') : cat}
              </button>
            ))}
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Filter className="w-4 h-4" /> {t('templates.filters.type')}
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('search.noResults')}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div 
                key={template.id} 
                className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Card Header / Image Area */}
                <div className="h-32 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 relative p-6 flex flex-col justify-end">
                  <div className="absolute top-4 right-4 flex gap-2">
                    {template.isPremium && (
                      <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center">
                        <Star className="w-3 h-3 mr-1 fill-current" /> Premium
                      </span>
                    )}
                  </div>
                  {template.category && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                      {template.category.name}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {template.title}
                  </h3>
                </div>
                
                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
                    {template.excerpt || 'A professionally crafted template to help you succeed.'}
                  </p>
                  
                  {/* Stats & Metadata */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5" title={t('templates.successRate')}>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="font-medium">{template.successRate || 85}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Bookmark className="w-3.5 h-3.5" /> {template._count.bookmarks}</span>
                      <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> {template._count.ratings * 12}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link 
                      href={hrefFn(`/templates/${template.slug}`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {t('common.viewDetails')}
                    </Link>
                    <Link 
                      href={hrefFn(`/templates/${template.slug}/editor`)}
                      className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 rounded-xl transition-colors"
                      title={t('templates.aiAssistant')}
                    >
                      <BookOpen className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
