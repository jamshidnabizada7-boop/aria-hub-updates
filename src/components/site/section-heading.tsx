'use client';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center', className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            'mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary',
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {eyebrow}
        </div>
      )}
      <h2
        className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg"
        >
          {subtitle}
        </p>
      )}
      {/* Decorative underline */}
      {align === 'center' && (
        <div
          className="mx-auto mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-chart-2"
        />
      )}
    </div>
  );
}
