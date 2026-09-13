import { TranslatedText } from '@/components/ui/translated-text';
import { PageShell } from '@/components/site/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { db as prisma } from '@/lib/db';
import { MessageSquare, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export const metadata = {
  title: 'Interview Community | ARIA HUB',
  description: 'Read and share real scholarship interview experiences.'
};

export default async function InterviewCommunityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  
  // Fetch published interview experiences
  const experiences = await prisma.interviewExperience.findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-slate-50 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href={`/${lang}/interview-prep`} className="mb-4 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Prep Center
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">Community Experiences</h1>
              <p className="mt-2 text-muted-foreground">Learn from the real interview experiences of other students.</p>
            </div>
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" /> Share Experience
            </Button>
          </div>

          {experiences.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-12 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No experiences shared yet</h3>
              <p className="mt-2 text-muted-foreground">Be the first to share your scholarship interview experience!</p>
              <Button className="mt-6">Share Now</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {experiences.map((exp) => {
                const content = typeof exp.contentI18n === 'object' && exp.contentI18n !== null && (exp.contentI18n as any)[lang] ? (exp.contentI18n as any)[lang] : exp.content;
                const studentName = typeof exp.studentNameI18n === 'object' && exp.studentNameI18n !== null && (exp.studentNameI18n as any)[lang] ? (exp.studentNameI18n as any)[lang] : (exp.studentName || 'Anonymous');
              
                return (
                  <Card key={exp.id} className="flex flex-col justify-between">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{exp.scholarshipName || 'General Scholarship'}</CardTitle>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < exp.rating ? 'fill-current' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {exp.university && <span>{exp.university} • </span>}
                        <span>{exp.country || 'Global'}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-4 text-sm leading-relaxed">{content}</p>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{studentName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
