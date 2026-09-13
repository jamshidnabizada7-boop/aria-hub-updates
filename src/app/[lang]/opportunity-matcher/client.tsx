'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, CheckCircle2, Search, Briefcase, GraduationCap, Globe, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';

type Goal = 'Scholarship' | 'Internship' | 'Work Visa';

interface UserData {
  age: string;
  targetCountry: string;
  education: string;
  goal: Goal | '';
}

interface MatchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  match: number;
  chanceOfAcceptance: 'High' | 'Medium' | 'Low';
  rationale: string;
}

// Regional-first list: Afghanistan audience's most relevant destinations.
const COUNTRIES = [
  'Afghanistan', 'Pakistan', 'Iran', 'Türkiye', 'United Arab Emirates', 'Qatar', 'India',
  'Germany', 'Canada', 'United States', 'United Kingdom', 'Australia',
  'France', 'Netherlands', 'Sweden', 'Italy', 'Spain', 'Japan'
];

const CHANCE_KEY: Record<MatchResult['chanceOfAcceptance'], string> = {
  High: 'tools.oppMatcher.chance.high',
  Medium: 'tools.oppMatcher.chance.medium',
  Low: 'tools.oppMatcher.chance.low',
};

export function OpportunityMatcherClient() {
  const t = useT();
  const hrefFn = useLangHref();
  const lang = useLangStore((s) => s.code);
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<UserData>({
    age: '',
    targetCountry: '',
    education: '',
    goal: '',
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [hadError, setHadError] = useState(false);
  const [mounted, setMounted] = useState(false);

  const EDUCATION_LEVELS = [
    t('tools.oppMatcher.edu.highSchool'),
    t('tools.oppMatcher.edu.bachelors'),
    t('tools.oppMatcher.edu.masters'),
    t('tools.oppMatcher.edu.phd'),
    t('tools.oppMatcher.edu.other')
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNext = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    } else if (step === 4) {
      calculateResults();
    }
  };

  const calculateResults = async () => {
    setIsCalculating(true);
    setHadError(false);
    setStep(5);

    try {
      const res = await fetch('/api/opportunities/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, lang }),
      });

      if (!res.ok) throw new Error(`matcher api ${res.status}`);

      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        setResults(data.results as MatchResult[]);
      } else {
        // No live listings matched — show guidance instead of fake data.
        setResults([]);
        setHadError(true);
      }
    } catch (e) {
      console.error('[matcher]', e);
      setResults([]);
      setHadError(true);
    }

    setIsCalculating(false);
    setStep(6);
  };

  const restart = () => {
    setStep(1);
    setUserData({ age: '', targetCountry: '', education: '', goal: '' });
    setResults([]);
    setHadError(false);
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return userData.age.trim() !== '' && parseInt(userData.age) > 0;
      case 2: return userData.targetCountry !== '';
      case 3: return userData.education !== '';
      case 4: return userData.goal !== '';
      default: return true;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 z-10 font-sans">
      <AnimatePresence mode="wait">

        {/* Step 1: Age */}
        {step === 1 && (
          <motion.div key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <GlassCard>
              <StepHeader step={1} title={t('tools.oppMatcher.step1.title')} subtitle={t('tools.oppMatcher.step1.subtitle')} />
              <div className="my-8">
                <Label htmlFor="age" className="text-lg mb-2 block text-slate-700 dark:text-slate-300">{t('tools.oppMatcher.step1.label')}</Label>
                <Input
                  id="age"
                  type="number"
                  min={1}
                  max={99}
                  placeholder={t('tools.oppMatcher.step1.placeholder')}
                  value={userData.age}
                  onChange={(e) => setUserData({ ...userData, age: e.target.value })}
                  className="text-xl p-6 bg-white/50 dark:bg-black/50 border-white/30 focus-visible:ring-amber-500"
                />
              </div>
              <StepFooter onNext={handleNext} isValid={isStepValid()} nextText={t('common.next')} />
            </GlassCard>
          </motion.div>
        )}

        {/* Step 2: Target Country */}
        {step === 2 && (
          <motion.div key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <GlassCard>
              <StepHeader step={2} title={t('tools.oppMatcher.step2.title')} subtitle={t('tools.oppMatcher.step2.subtitle')} />
              <div className="my-8">
                <Label className="text-lg mb-2 block text-slate-700 dark:text-slate-300">{t('tools.oppMatcher.step2.label')}</Label>
                <Select value={userData.targetCountry} onValueChange={(val) => setUserData({ ...userData, targetCountry: val })}>
                  <SelectTrigger className="text-xl p-6 h-auto bg-white/50 dark:bg-black/50 border-white/30 focus:ring-amber-500">
                    <SelectValue placeholder={t('tools.oppMatcher.step2.placeholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-white/20 max-h-72">
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country} className="text-lg">{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <StepFooter onNext={handleNext} isValid={isStepValid()} onBack={() => setStep(1)} nextText={t('common.next')} backText={t('common.back')} />
            </GlassCard>
          </motion.div>
        )}

        {/* Step 3: Education */}
        {step === 3 && (
          <motion.div key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <GlassCard>
              <StepHeader step={3} title={t('tools.oppMatcher.step3.title')} subtitle={t('tools.oppMatcher.step3.subtitle')} />
              <div className="my-8">
                <RadioGroup value={userData.education} onValueChange={(val) => setUserData({ ...userData, education: val })} className="space-y-3">
                  {EDUCATION_LEVELS.map(level => (
                    <div key={level} className="flex items-center space-x-3 space-x-reverse border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-black/60 transition-colors cursor-pointer" onClick={() => setUserData({ ...userData, education: level })}>
                      <RadioGroupItem value={level} id={level} className="text-amber-600" />
                      <Label htmlFor={level} className="text-lg cursor-pointer flex-1 text-right ml-2">{level}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <StepFooter onNext={handleNext} isValid={isStepValid()} onBack={() => setStep(2)} nextText={t('common.next')} backText={t('common.back')} />
            </GlassCard>
          </motion.div>
        )}

        {/* Step 4: Goal */}
        {step === 4 && (
          <motion.div key="step4" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <GlassCard>
              <StepHeader step={4} title={t('tools.oppMatcher.step4.title')} subtitle={t('tools.oppMatcher.step4.subtitle')} />
              <div className="my-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <GoalOption
                  icon={<GraduationCap className="w-8 h-8 mb-2" />}
                  title={t('tools.oppMatcher.goal.scholarship')}
                  selected={userData.goal === 'Scholarship'}
                  onClick={() => setUserData({ ...userData, goal: 'Scholarship' })}
                />
                <GoalOption
                  icon={<Globe className="w-8 h-8 mb-2" />}
                  title={t('tools.oppMatcher.goal.internship')}
                  selected={userData.goal === 'Internship'}
                  onClick={() => setUserData({ ...userData, goal: 'Internship' })}
                />
                <GoalOption
                  icon={<Briefcase className="w-8 h-8 mb-2" />}
                  title={t('tools.oppMatcher.goal.workVisa')}
                  selected={userData.goal === 'Work Visa'}
                  onClick={() => setUserData({ ...userData, goal: 'Work Visa' })}
                />
              </div>
              <StepFooter onNext={handleNext} isValid={isStepValid()} onBack={() => setStep(3)} nextText={t('tools.oppMatcher.findMatches')} backText={t('common.back')} />
            </GlassCard>
          </motion.div>
        )}

        {/* Step 5: Loading/Calculating */}
        {step === 5 && (
          <motion.div key="step5" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="text-center py-20">
            <GlassCard className="flex flex-col items-center justify-center p-12">
              <div className="relative w-24 h-24 mb-8" role="status" aria-label={t('tools.oppMatcher.loading.title')}>
                <div className="absolute inset-0 border-t-4 border-amber-500 border-solid rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-4 border-orange-400 border-solid rounded-full animate-spin direction-reverse"></div>
                <div className="absolute inset-4 border-b-4 border-[#d4af37] border-solid rounded-full animate-spin"></div>
                <Search className="absolute inset-0 m-auto text-amber-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent mb-2">{t('tools.oppMatcher.loading.title')}</h3>
              <p className="text-slate-500 dark:text-slate-400">{t('tools.oppMatcher.loading.subtitle')}</p>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 6: Results */}
        {step === 6 && hadError && (
          <motion.div key="step6err" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <GlassCard className="text-center p-10">
              <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('tools.oppMatcher.results.errorTitle')}</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-8">{t('tools.oppMatcher.results.error')}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={restart} variant="outline" className="rounded-full px-6">
                  {t('tools.oppMatcher.results.retry')}
                </Button>
                <Button asChild className="rounded-full px-6 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white">
                  <Link href={hrefFn('/opportunities')}>
                    {t('tools.oppMatcher.results.browseAll')} <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {step === 6 && !hadError && (
          <motion.div key="step6" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t('tools.oppMatcher.results.title')}</h2>
              <p className="text-slate-600 dark:text-slate-300">{t('tools.oppMatcher.results.subtitle')}</p>
            </div>

            <div className="space-y-4 mb-8">
              {results.map((result, idx) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.2 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-lg border-white/20 shadow-xl overflow-hidden group hover:shadow-2xl hover:border-amber-300/50 transition-all">
                    <div className="flex flex-col md:flex-row items-stretch p-0">
                      <Link href={hrefFn(`/opportunities/${result.slug}`)} className="flex-1 p-6 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-t-xl md:rounded-tr-none">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                            {result.type}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {result.location}
                          </span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                            result.chanceOfAcceptance === 'High' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            result.chanceOfAcceptance === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                            'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {t(CHANCE_KEY[result.chanceOfAcceptance])} {t('tools.oppMatcher.chance')}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 group-hover:text-amber-600 transition-colors flex items-center gap-2">
                          {result.title}
                          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </h3>
                        {result.rationale && (
                          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                              <span className="font-semibold text-amber-700 dark:text-amber-400 not-italic mr-1">{t('tools.oppMatcher.results.rationale')}:</span>
                              {result.rationale}
                            </p>
                          </div>
                        )}
                      </Link>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 w-full md:w-32 h-auto shrink-0">
                        <div className="text-3xl font-bold text-[#d4af37]">{result.match}%</div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-center mt-1">{t('tools.oppMatcher.results.matchRating')}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <GlassCard className="text-center p-8 border-amber-500/30">
              <h3 className="text-2xl font-bold mb-4">{t('tools.oppMatcher.results.ctaTitle')}</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">{t('tools.oppMatcher.results.ctaDesc')}</p>
              <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all text-lg">
                <Link href={hrefFn('/services')}>
                  {t('tools.oppMatcher.results.ctaBtn')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <div className="mt-4">
                <Button variant="ghost" onClick={restart} className="text-slate-500">
                  {t('tools.oppMatcher.results.startOver')}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components

function GlassCard({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`backdrop-blur-xl bg-white/30 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-8 ${className}`}>
      {children}
    </div>
  );
}

function StepHeader({ step, title, subtitle }: { step: number, title: string, subtitle: string }) {
  const t = useT();
  return (
    <div className="text-center mb-8">
      <div className="inline-block px-4 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold text-sm mb-4">
        {t('tools.oppMatcher.step')} {step} {t('tools.oppMatcher.of')} 4
      </div>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function StepFooter({ onNext, onBack, isValid, nextText = 'Next', backText = 'Back' }: { onNext: () => void, onBack?: () => void, isValid: boolean, nextText?: string, backText?: string }) {
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="text-slate-600 dark:text-slate-400">{backText}</Button>
      ) : <div></div>}

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="bg-amber-600 hover:bg-amber-700 text-white px-8 rounded-full"
      >
        {nextText} <ChevronRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
}

function GoalOption({ icon, title, selected, onClick }: { icon: React.ReactNode, title: string, selected: boolean, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`
        cursor-pointer rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all border-2
        ${selected
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shadow-md'
          : 'border-transparent bg-white/50 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/50 text-slate-600 dark:text-slate-400 hover:shadow'}
      `}
    >
      <div className={selected ? 'text-amber-500' : 'text-slate-400'}>{icon}</div>
      <span className="font-semibold text-lg">{title}</span>
    </div>
  );
}
