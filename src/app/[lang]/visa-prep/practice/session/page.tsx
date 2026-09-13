'use client';

import { useLangStore } from '@/lib/lang-store';
import { useLangContext } from '@/components/site/lang-context';
import { useT } from '@/hooks/use-t';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mic, Square, Loader2, ArrowRight, RefreshCcw, ShieldAlert, CheckCircle2, Video, VideoOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function VisaSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const countryId = searchParams.get('countryId');
  const categoryId = searchParams.get('categoryId');
  const difficulty = searchParams.get('difficulty') || 'medium';
  const mode = searchParams.get('mode') || 'mock'; // 'mock' or 'video'

  const storeCode = useLangStore((s) => s.code);
  const code = useLangContext() ?? storeCode;
  const t = useT();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("Loading your first personalized visa question...");
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [targetCountryName, setTargetCountryName] = useState('General');
  const [visaTypeName, setVisaTypeName] = useState('General');
  
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch Country and Category Names
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('/api/visas');
        if (res.ok) {
          const data = await res.json();
          if (countryId) {
            const country = data.find((c: any) => c.id === countryId);
            if (country) {
              setTargetCountryName(country.name);
              if (categoryId && categoryId !== 'all') {
                const cat = country.categories?.find((c: any) => c.id === categoryId);
                if (cat) setVisaTypeName(cat.name);
              }
            }
          }
        }
      } catch (err) {}
    };
    fetchMetadata();
  }, [countryId, categoryId]);

  const fetchQuestion = async () => {
    setIsGeneratingQuestion(true);
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/visas/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCountry: targetCountryName,
          visaType: visaTypeName,
          difficulty,
          currentIndex: questionIndex,
          previousQuestions
        })
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setCurrentQuestion(data.question);
        setPreviousQuestions(prev => [...prev, data.question]);
      } else {
        setCurrentQuestion("Why do you want to travel to this country?");
      }
    } catch (error) {
      console.error(error);
      setCurrentQuestion("Why do you want to travel to this country?");
    } finally {
      setIsGeneratingQuestion(false);
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestion();

    // Start Video if mode is video
    if (mode === 'video') {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => {
                console.error("Camera access denied or failed", err);
                setSpeechError("Camera access denied. Video interview cannot display your camera.");
            });
    }

    // Initialize SpeechRecognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = code === 'fa' ? 'fa-IR' : (code === 'ps' ? 'ps-AF' : 'en-US');
        
        recognitionRef.current.onresult = (event: any) => {
          setSpeechError(null);
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'no-speech') {
            setSpeechError("No speech detected. Please speak clearly into your microphone.");
          } else if (event.error === 'not-allowed') {
            setSpeechError("Microphone access denied. Please allow microphone permissions.");
          }
          setIsRecording(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  // Audio level simulation for visual feedback when recording
  useEffect(() => {
      let interval: any;
      if (isRecording) {
          interval = setInterval(() => {
              setAudioLevel(Math.random() * 100);
          }, 200);
      } else {
          setAudioLevel(0);
      }
      return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Your browser does not support voice recording. Please use Chrome/Edge.");
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
      const res = await fetch('/api/visas/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          questionText: currentQuestion,
          country: targetCountryName,
          category: visaTypeName
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setFeedback(data);
      } else {
        alert(data.error || 'Evaluation failed');
      }
    } catch (error) {
      alert('Network error during evaluation');
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = () => {
    setTranscript('');
    setFeedback(null);
    const maxQuestions = mode === 'single' ? 1 : 10;
    if (questionIndex < maxQuestions - 1) {
      setQuestionIndex(prev => prev + 1);
      fetchQuestion();
    } else {
      alert("Session completed! Great job preparing for your visa interview.");
      router.push(`/${code}/visa-prep`);
    }
  };

  if (loadingQuestions && questionIndex === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-medium">Loading session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Progress Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Visa Interview Session</h1>
          <div className="text-sm font-medium text-muted-foreground">
            Question {questionIndex + 1} {mode === 'single' ? '' : 'of 10'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Question Card */}
            <Card className="border-primary/20 bg-primary/5 shadow-md relative overflow-hidden flex flex-col">
              {isGeneratingQuestion && (
                 <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                   <Loader2 className="w-8 h-8 text-primary animate-spin" />
                   <p className="mt-2 text-sm font-medium text-primary">Officer is thinking...</p>
                 </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center justify-between">
                  <span className="text-primary font-bold">Visa Officer</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{targetCountryName}</Badge>
                    {visaTypeName !== 'General' && <Badge variant="secondary">{visaTypeName}</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <p className="text-2xl font-medium leading-relaxed text-center">
                  "{currentQuestion}"
                </p>
              </CardContent>
            </Card>

            {/* Video Feed (if mode is video) */}
            {mode === 'video' && (
                <Card className="overflow-hidden bg-black flex flex-col items-center justify-center relative aspect-video">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover"
                    />
                    {!streamRef.current && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-slate-900">
                            <VideoOff className="w-12 h-12 mb-2 opacity-50" />
                            <p>Camera is disabled or loading</p>
                        </div>
                    )}
                </Card>
            )}
        </div>

        {/* Input Area */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          
          <Card className="shadow-sm border-t-4 border-t-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                {code === 'fa' ? 'پاسخ شما' : code === 'ps' ? 'ستاسو ځواب' : 'Your Answer'}
                <div className="flex items-center gap-3">
                    {isRecording && (
                        <div className="flex gap-1 items-center h-4">
                            <div className="w-1 bg-red-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, audioLevel)}%` }}></div>
                            <div className="w-1 bg-red-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, audioLevel * 0.8)}%` }}></div>
                            <div className="w-1 bg-red-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, audioLevel * 1.2)}%` }}></div>
                            <div className="w-1 bg-red-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, audioLevel * 0.5)}%` }}></div>
                        </div>
                    )}
                    <Button
                    variant={isRecording ? 'destructive' : 'default'}
                    size="icon"
                    onClick={toggleRecording}
                    disabled={isEvaluating || isGeneratingQuestion}
                    className="rounded-full shadow-sm"
                    >
                    {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {speechError && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                  {speechError}
                </div>
              )}
              <div className="h-48 overflow-y-auto rounded-xl border bg-muted/30 p-5 shadow-inner">
                {transcript ? (
                  <p className="text-foreground leading-relaxed">{transcript}</p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic gap-4">
                    <Mic className="h-10 w-10 opacity-20" />
                    <p>{isRecording ? 
                      (code === 'fa' ? 'در حال گوش دادن...' : code === 'ps' ? 'اوریدل کیږي...' : 'Listening carefully...') : 
                      (code === 'fa' ? 'برای شروع صحبت روی میکروفون کلیک کنید...' : code === 'ps' ? 'د خبرو پیل کولو لپاره په مایکروفون کلیک وکړئ...' : 'Click the microphone to start speaking...')
                    }</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/10 pt-4">
              <Button variant="ghost" onClick={() => setTranscript('')} disabled={!transcript || isEvaluating || isRecording}>
                <RefreshCcw className="mr-2 h-4 w-4" /> {code === 'fa' ? 'بازنشانی' : 'Reset'}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={nextQuestion} disabled={isEvaluating || isRecording}>
                    {code === 'fa' ? 'رد شدن' : 'Skip'}
                </Button>
                <Button onClick={submitAnswer} disabled={!transcript || isEvaluating || isRecording} className="shadow-sm">
                    {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isEvaluating ? (code === 'fa' ? 'در حال ارزیابی...' : 'Evaluating...') : (code === 'fa' ? 'ارسال پاسخ' : 'Submit Answer')}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* AI Feedback Area */}
          <Card className={`shadow-sm transition-all duration-500 ${feedback ? (feedback.passProbability >= 70 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5') : ''}`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                AI Feedback
                {feedback && (
                  feedback.passProbability >= 70 ? 
                    <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1"/> High Chance</span> :
                    <span className="flex items-center text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-full"><ShieldAlert className="w-3 h-3 mr-1"/> Needs Work</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!feedback && !isEvaluating && (
                <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground p-6">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ShieldAlert className="h-8 w-8 opacity-40" />
                  </div>
                  <p>Submit your answer to receive detailed AI feedback on your performance and visa pass probability.</p>
                </div>
              )}
              {isEvaluating && (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                  <p className="animate-pulse font-medium text-primary">The Visa Officer is analyzing your response...</p>
                </div>
              )}
              {feedback && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto max-h-96 pr-2">
                  
                  {/* Pass Probability Hero */}
                  <div className="flex items-center justify-center p-4 bg-background rounded-xl border shadow-sm">
                    <div className="text-center">
                      <div className="text-sm font-semibold uppercase text-muted-foreground mb-1">Pass Probability</div>
                      <div className={`text-4xl font-black ${feedback.passProbability >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {feedback.passProbability}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border bg-background p-3 shadow-sm">
                      <div className="text-xl font-bold text-primary">{feedback.confidenceScore}%</div>
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground mt-1">Confidence</div>
                    </div>
                    <div className="rounded-xl border bg-background p-3 shadow-sm">
                      <div className="text-xl font-bold text-primary">{feedback.fluencyScore}%</div>
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground mt-1">Fluency</div>
                    </div>
                    <div className="rounded-xl border bg-background p-3 shadow-sm">
                      <div className="text-xl font-bold text-primary">{feedback.grammarScore}%</div>
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground mt-1">Grammar</div>
                    </div>
                  </div>

                  <div className="bg-background rounded-xl p-4 border shadow-sm">
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-primary" /> Officer's Assessment
                    </h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feedback.overallFeedback}</p>
                  </div>

                  {feedback.redFlags && feedback.redFlags.length > 0 && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-4 border border-rose-200 dark:border-rose-900 shadow-sm">
                      <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4" /> Red Flags Detected
                      </h4>
                      <ul className="space-y-2 text-sm text-rose-800 dark:text-rose-300">
                        {feedback.redFlags.map((flag: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-bold">•</span> 
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-background rounded-xl p-4 border shadow-sm">
                    <h4 className="font-bold text-foreground mb-2">Tips for Improvement</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {feedback.tipsForImprovement?.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span> 
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
            {feedback && (
              <CardFooter className="flex justify-end border-t bg-muted/10 pt-4">
                <Button onClick={nextQuestion} size="lg" className="w-full sm:w-auto shadow-sm">
                  {questionIndex < (mode === 'single' ? 1 : 10) - 1 ? 'Next Question' : 'Finish Session'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            )}
          </Card>
          
        </div>
      </div>
    </div>
  );
}

export default function VisaSessionPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VisaSessionContent />
    </Suspense>
  );
}
