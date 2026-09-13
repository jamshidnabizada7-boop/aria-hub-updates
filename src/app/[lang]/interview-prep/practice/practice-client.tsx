'use client';

import { useState } from 'react';
import { TranslatedText } from '@/components/ui/translated-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Video, Type, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLangHref } from '@/hooks/use-lang-href';

type InputMode = 'voice' | 'video' | 'text';
type SessionType = 'mock' | 'timed' | 'random';

export default function PracticeSetupPage() {
  const router = useRouter();
  const hrefFn = useLangHref();
  const [mode, setMode] = useState<InputMode>('voice');
  const [type, setType] = useState<SessionType>('mock');
  const [loading, setLoading] = useState(false);
  const [major, setMajor] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [scholarshipType, setScholarshipType] = useState('');

  const startSession = () => {
    setLoading(true);
    const m = major.trim() || 'Computer Science';
    const c = targetCountry.trim() || 'USA';
    const s = scholarshipType.trim() || 'Fulbright';
    setTimeout(() => {
      router.push(
        hrefFn(
          `/interview-prep/practice/session?mode=${mode}&type=${type}&major=${encodeURIComponent(m)}&country=${encodeURIComponent(c)}&scholarship=${encodeURIComponent(s)}`
        )
      );
    }, 400);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <TranslatedText tKey="interview.setupTitle" />
        </h1>
        <p className="mt-2 text-muted-foreground">
          <TranslatedText tKey="interview.setupSubtitle" />
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            <TranslatedText tKey="interview.yourProfile" />
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="major" className="text-sm font-medium">
                <TranslatedText tKey="interview.major" />
              </label>
              <input
                type="text"
                id="major"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Computer Science"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="targetCountry" className="text-sm font-medium">
                <TranslatedText tKey="interview.targetCountry" />
              </label>
              <input
                type="text"
                id="targetCountry"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="USA"
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="scholarshipType" className="text-sm font-medium">
                <TranslatedText tKey="interview.scholarshipType" />
              </label>
              <input
                type="text"
                id="scholarshipType"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Fulbright"
                value={scholarshipType}
                onChange={(e) => setScholarshipType(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            <TranslatedText tKey="interview.inputMode" />
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ModeCard
              icon={Mic}
              titleKey="interview.voiceInterview"
              descKey="interview.voiceDesc"
              selected={mode === 'voice'}
              onClick={() => setMode('voice')}
            />
            <ModeCard
              icon={Video}
              titleKey="interview.videoInterview"
              descKey="interview.videoDesc"
              selected={mode === 'video'}
              onClick={() => setMode('video')}
            />
            <ModeCard
              icon={Type}
              titleKey="interview.textInterview"
              descKey="interview.textDesc"
              selected={mode === 'text'}
              onClick={() => setMode('text')}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            <TranslatedText tKey="interview.sessionType" />
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ModeCard
              icon={CheckCircle2}
              titleKey="interview.fullMock"
              descKey="interview.fullMockDesc"
              selected={type === 'mock'}
              onClick={() => setType('mock')}
            />
            <ModeCard
              icon={Play}
              titleKey="interview.timedPractice"
              descKey="interview.timedDesc"
              selected={type === 'timed'}
              onClick={() => setType('timed')}
            />
            <ModeCard
              icon={CheckCircle2}
              titleKey="interview.random"
              descKey="interview.randomDesc"
              selected={type === 'random'}
              onClick={() => setType('random')}
            />
          </div>
        </section>

        <div className="flex justify-center pt-8">
          <Button
            size="lg"
            onClick={startSession}
            disabled={loading}
            className="min-w-[200px] font-bold"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2" />}
            {loading ? <TranslatedText tKey="interview.starting" /> : <TranslatedText tKey="interview.startSession" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  titleKey,
  descKey,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        selected ? 'border-primary ring-1 ring-primary' : ''
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="pb-2">
        <Icon className={`h-8 w-8 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        <CardTitle className="text-lg">
          <TranslatedText tKey={titleKey} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          <TranslatedText tKey={descKey} />
        </CardDescription>
      </CardContent>
    </Card>
  );
}
