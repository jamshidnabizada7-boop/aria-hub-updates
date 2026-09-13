'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mic, Square, Loader2, ArrowRight, RefreshCcw } from 'lucide-react';
import { useLangStore } from '@/lib/lang-store';

const SESSION_LENGTH = { mock: 5, timed: 3, random: 1 } as const;

function InterviewSessionContent({ lang }: { lang: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hrefFn = useLangHref();
  const t = useT();
  const dir = useLangStore((s) => (s.languages.find((l) => l.code === s.code)?.direction as 'ltr' | 'rtl') || 'rtl');
  const rtl = dir === 'rtl';

  const mode = searchParams.get('mode') || 'voice';
  const type = (searchParams.get('type') || 'mock') as keyof typeof SESSION_LENGTH;
  const major = searchParams.get('major') || 'Computer Science';
  const targetCountry = searchParams.get('country') || 'USA';
  const scholarshipType = searchParams.get('scholarship') || 'Fulbright';
  const maxQuestions = SESSION_LENGTH[type] ?? 5;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchQuestion = useCallback(async () => {
    setIsGeneratingQuestion(true);
    try {
      const res = await fetch('/api/interviews/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          targetCountry,
          major,
          scholarshipType,
          currentIndex: questionIndex,
          previousQuestions,
        }),
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setCurrentQuestion(data.question);
        setPreviousQuestions((prev) => [...prev, data.question]);
      } else {
        setCurrentQuestion(t('interview.loadingQuestion'));
      }
    } catch (error) {
      console.error(error);
      setCurrentQuestion(t('interview.loadingQuestion'));
    } finally {
      setIsGeneratingQuestion(false);
    }
  }, [lang, targetCountry, major, scholarshipType, questionIndex, t]);

  useEffect(() => {
    fetchQuestion();

    if (mode === 'video') {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          setCameraError(t('interview.clickMic'));
        });
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          setSpeechError(null);
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'no-speech') {
            setSpeechError(t('interview.clickMic'));
          } else {
            setSpeechError(t('interview.clickMic'));
          }
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mode]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert(t('interview.clickMic'));
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      setFeedback(null);
      setSpeechError(null);
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
        setSpeechError(t('interview.clickMic'));
        setIsRecording(false);
      }
    }
  };

  const submitAnswer = async () => {
    if (!transcript) return;

    setIsEvaluating(true);
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    try {
      const res = await fetch('/api/interviews/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          questionText: currentQuestion,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(data);
      } else {
        alert(data.error || t('interview.aiEvaluation'));
      }
    } catch (error) {
      console.error(error);
      alert(t('interview.aiEvaluation'));
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = () => {
    setTranscript('');
    setFeedback(null);

    if (questionIndex < maxQuestions - 1) {
      setQuestionIndex((prev) => prev + 1);
      fetchQuestion();
    } else {
      alert(t('interview.sessionComplete'));
      router.push(hrefFn('/interview-prep'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      {/* Progress Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('interview.aiCoach')}</h1>
        <div className="text-sm font-medium text-muted-foreground">
          {t('interview.questionNo', { current: questionIndex + 1, total: maxQuestions })}
        </div>
      </div>

      {/* Question Card */}
      <Card className="relative mb-6 overflow-hidden border-primary/20 bg-primary/5">
        {isGeneratingQuestion && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm font-medium text-primary">{t('interview.generatingQuestion')}</p>
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-xl text-primary">
            <span>{t('interview.aiInterviewer')}</span>
            <span className="rounded-full bg-background px-3 py-1 text-sm font-normal text-muted-foreground shadow-sm">
              {t('interview.profile')}: {major} | {targetCountry}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-medium leading-relaxed">
            {currentQuestion ? `"${currentQuestion}"` : t('interview.loadingQuestion')}
          </p>
        </CardContent>
      </Card>

      {/* Input Area */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              {t('interview.yourAnswer')}
              {mode !== 'text' && (
                <Button
                  variant={isRecording ? 'destructive' : 'default'}
                  size="icon"
                  onClick={toggleRecording}
                  disabled={isEvaluating || isGeneratingQuestion}
                  className="rounded-full"
                  aria-label={isRecording ? t('interview.clear') : t('interview.yourAnswer')}
                >
                  {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === 'video' && (
              <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-md bg-slate-900">
                {cameraError ? (
                  <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-red-400">
                    {cameraError}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
            {mode === 'text' ? (
              <textarea
                className="h-48 w-full resize-none rounded-md border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={t('interview.typeAnswer')}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isEvaluating || isGeneratingQuestion}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {speechError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {speechError}
                  </div>
                )}
                <div
                  className={`${mode === 'video' ? 'h-32' : 'h-48'} overflow-y-auto rounded-md border bg-muted/40 p-4`}
                >
                  {transcript ? (
                    <p className="text-foreground">{transcript}</p>
                  ) : (
                    <p className="flex h-full items-center justify-center italic text-muted-foreground">
                      {isRecording ? t('interview.listening') : t('interview.clickMic')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setTranscript('')}
              disabled={!transcript || isEvaluating || isRecording}
            >
              {t('interview.clear')}
            </Button>
            <Button onClick={submitAnswer} disabled={!transcript || isEvaluating || isRecording}>
              {isEvaluating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2" /> {t('interview.evaluating')}
                </>
              ) : (
                t('interview.submitAnswer')
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Feedback Area */}
        <Card className={!feedback ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">{t('interview.aiEvaluation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!feedback ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
                <RefreshCcw className="mb-2 h-8 w-8 opacity-20" />
                <p>{t('interview.submitForFeedback')}</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {t('interview.confidence')}
                    </div>
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                      {feedback.confidenceScore}/100
                    </div>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-4 text-center dark:bg-violet-900/20">
                    <div className="text-sm font-medium text-violet-600 dark:text-violet-400">
                      {t('interview.content')}
                    </div>
                    <div className="text-3xl font-bold text-violet-700 dark:text-violet-300">
                      {feedback.contentStrengthScore || feedback.fluencyScore || 85}/100
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 font-semibold">{t('interview.feedback')}</h4>
                  <p className="text-sm text-muted-foreground">{feedback.overallFeedback}</p>
                </div>

                <div>
                  <h4 className="mb-1 font-semibold">{t('interview.tipsToImprove')}</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {feedback.tipsForImprovement?.map((tip: string, i: number) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {feedback.idealAnswer && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/20">
                    <h4 className="mb-1 font-semibold text-green-700 dark:text-green-400">
                      {t('interview.idealAnswer')}
                    </h4>
                    <p className="text-sm italic text-green-800 dark:text-green-300">
                      &ldquo;{feedback.idealAnswer}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {feedback && (
            <CardFooter>
              <Button className="w-full font-bold" onClick={nextQuestion}>
                {t('interview.nextQuestion')}
                <ArrowRight className={`ml-2 h-4 w-4 rtl:ml-0 rtl:mr-2 ${rtl ? 'rotate-180' : ''}`} />
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function InterviewSessionClient({ lang }: { lang: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InterviewSessionContent lang={lang} />
    </Suspense>
  );
}
