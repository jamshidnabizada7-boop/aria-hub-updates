'use client';

/**
 * MultilingualInput Component
 * 
 * A tabbed input component that allows administrators to enter content in all three
 * languages (English, Persian, Pashto) simultaneously.
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useT } from '@/hooks/use-t';

interface MultilingualInputProps {
  field: string;
  value: any; // Current single-language value (for backward compatibility)
  i18nValue?: Record<string, string> | null; // { en: "...", fa: "...", ps: "..." }
  isLong?: boolean; // textarea vs input
  onChange: (baseValue: string, i18nValue: Record<string, string>) => void;
}

export function MultilingualInput({ 
  field, 
  value, 
  i18nValue, 
  isLong, 
  onChange 
}: MultilingualInputProps) {
  const [activeTab, setActiveTab] = useState<'en' | 'fa' | 'ps'>('en');
  const t = useT();
  
  // Initialize translations from either i18nValue prop or fallback to value
  const [translations, setTranslations] = useState<Record<string, string>>(() => {
    if (i18nValue && typeof i18nValue === 'object') {
      return {
        en: i18nValue.en || '',
        fa: i18nValue.fa || '',
        ps: i18nValue.ps || ''
      };
    }
    
    // If no i18n value but we have a base value, assume it's English
    return {
      en: value || '',
      fa: '',
      ps: ''
    };
  });

  // Update translations when i18nValue or value props change (for edit mode)
  useEffect(() => {
    if (i18nValue && typeof i18nValue === 'object') {
      setTranslations({
        en: i18nValue.en || '',
        fa: i18nValue.fa || '',
        ps: i18nValue.ps || ''
      });
    } else if (value) {
      // If we have a base value but no i18n, assume it's English
      setTranslations(prev => ({
        ...prev,
        en: value
      }));
    }
  }, [i18nValue, value]);

  const handleChange = (lang: string, newValue: string) => {
    const updated = { ...translations, [lang]: newValue };
    setTranslations(updated);
    // Update base value to English for backward compatibility
    onChange(updated.en, updated);
  };

  // Try to get translation for field label, fallback to capitalized field name
  const getFieldLabel = () => {
    const key = `admin.form.${field}`;
    const translated = t(key);
    // If translation returns the key itself (not found), use capitalized field name
    return translated !== key ? translated : field.charAt(0).toUpperCase() + field.slice(1);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{getFieldLabel()}</Label>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="fa">فارسی</TabsTrigger>
          <TabsTrigger value="ps">پښتو</TabsTrigger>
        </TabsList>
        
        <TabsContent value="en" className="mt-2">
          {isLong ? (
            <Textarea
              value={translations.en}
              onChange={(e) => handleChange('en', e.target.value)}
              rows={4}
              className="resize-y"
              placeholder="Enter English text..."
            />
          ) : (
            <Input
              type="text"
              value={translations.en}
              onChange={(e) => handleChange('en', e.target.value)}
              placeholder="Enter English text..."
            />
          )}
        </TabsContent>
        
        <TabsContent value="fa" className="mt-2" dir="rtl">
          {isLong ? (
            <Textarea
              value={translations.fa}
              onChange={(e) => handleChange('fa', e.target.value)}
              rows={4}
              className="resize-y"
              placeholder="متن فارسی را وارد کنید..."
            />
          ) : (
            <Input
              type="text"
              value={translations.fa}
              onChange={(e) => handleChange('fa', e.target.value)}
              placeholder="متن فارسی را وارد کنید..."
            />
          )}
        </TabsContent>
        
        <TabsContent value="ps" className="mt-2" dir="rtl">
          {isLong ? (
            <Textarea
              value={translations.ps}
              onChange={(e) => handleChange('ps', e.target.value)}
              rows={4}
              className="resize-y"
              placeholder="پښتو متن دلته ولیکئ..."
            />
          ) : (
            <Input
              type="text"
              value={translations.ps}
              onChange={(e) => handleChange('ps', e.target.value)}
              placeholder="پښتو متن دلته ولیکئ..."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
