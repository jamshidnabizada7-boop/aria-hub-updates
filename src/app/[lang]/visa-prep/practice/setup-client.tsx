'use client';

import { useState, useEffect, startTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TranslatedText } from '@/components/ui/translated-text';
import { ArrowLeft, Play } from 'lucide-react';
import Link from 'next/link';

export default function VisaPracticeSetup({ countries, categories, lang }: { countries: any[], categories: any[], lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCountry = searchParams.get('country');
  const initialCategory = searchParams.get('category');
  
  const [countryId, setCountryId] = useState(initialCountry || '');
  const [categoryId, setCategoryId] = useState(initialCategory || '');
  const [mode, setMode] = useState('mock'); // mock or single
  const [difficulty, setDifficulty] = useState('medium');

  const selectedCountry = countries.find(c => c.id === countryId);

  // Reset category if country changes (derived adjustment in a transition,
  // not a synchronous effect setState)
  useEffect(() => {
    if (selectedCountry && !categories.find((c: any) => c.id === categoryId)) {
      startTransition(() => setCategoryId(''));
    }
  }, [countryId, categories, categoryId, selectedCountry]);

  const handleStart = () => {
    if (!countryId) return;
    
    const params = new URLSearchParams();
    params.set('countryId', countryId);
    if (categoryId) params.set('categoryId', categoryId);
    params.set('mode', mode);
    params.set('difficulty', difficulty);
    
    router.push(`/${lang}/visa-prep/practice/session?${params.toString()}`);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="mb-4">
          <Link href={`/${lang}/visa-prep`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
          </Link>
        </div>
        <CardTitle className="text-2xl">Setup Visa Interview Practice</CardTitle>
        <CardDescription>Configure your practice session to match your specific visa application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Target Country</Label>
          <Select value={countryId} onValueChange={setCountryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(c => {
                const name = typeof c.nameI18n === 'object' && c.nameI18n !== null && (c.nameI18n as any)[lang] ? (c.nameI18n as any)[lang] : c.name;
                return (
                  <SelectItem key={c.id} value={c.id}>{name}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Visa Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={!countryId}>
            <SelectTrigger>
              <SelectValue placeholder={countryId ? "Select Category (Optional)" : "Select Country First"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Category</SelectItem>
              {categories.map((c: any) => {
                const name = typeof c.nameI18n === 'object' && c.nameI18n !== null && (c.nameI18n as any)[lang] ? (c.nameI18n as any)[lang] : c.name;
                return (
                  <SelectItem key={c.id} value={c.id}>{name}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Practice Mode</Label>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setMode('mock')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${mode === 'mock' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <span className="font-bold mb-1">Full Mock Interview</span>
              <span className="text-xs text-muted-foreground text-center">Continuous simulated interview</span>
            </button>
            <button 
              onClick={() => setMode('single')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${mode === 'single' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <span className="font-bold mb-1">Single Questions</span>
              <span className="text-xs text-muted-foreground text-center">Practice one by one</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Select Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy (Basic Questions)</SelectItem>
              <SelectItem value="medium">Medium (Standard Officer)</SelectItem>
              <SelectItem value="hard">Hard (Strict Officer)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        <Button size="lg" className="w-full gap-2" onClick={handleStart} disabled={!countryId}>
          <Play className="h-4 w-4" /> Start Interview
        </Button>
      </CardFooter>
    </Card>
  );
}
