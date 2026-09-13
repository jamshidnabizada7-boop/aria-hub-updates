'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Linkedin, Twitter, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '../section-heading';
import { SmartImage } from '../smart-image';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { TeamMember } from '@/lib/types';

export function TeamSection({ members }: { members: TeamMember[] }) {
  const t = useT();
  if (!members.length) return null;

  return (
    <section id="team" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('team.eyebrow')}
          title={t('team.title')}
          subtitle={t('team.subtitle')}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px' }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}
            >
              <TeamCard member={m} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  const lang = useLangStore((s) => s.code);
  const [hovered, setHovered] = useState(false);
  
  const name = getLocalizedContent(member.name, member.nameI18n as any, lang);
  const role = getLocalizedContent(member.role, member.roleI18n as any, lang);
  const bio = getLocalizedContent(member.bio, member.bioI18n as any, lang);
  
  return (
    <Card
      className="group relative overflow-hidden border-border/60 p-0 shadow-premium transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <SmartImage
          src={member.photo}
          alt={name}
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          gradient="from-primary/30 via-chart-2/20 to-chart-3/20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Social overlay (slides up on hover) */}
        <motion.div
          initial={false}
          animate={{ y: hovered ? 0 : 60, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2"
        >
          {member.email && (
            <a href={`mailto:${member.email}`} className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-primary" aria-label="Email">
              <Mail className="h-4 w-4" />
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-primary" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </a>
          )}
          {member.twitter && (
            <a href={member.twitter} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-primary" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </a>
          )}
        </motion.div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-bold leading-tight">{name}</h3>
        <p className="mt-0.5 text-sm font-medium text-primary">{role}</p>
        {bio && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{bio}</p>
        )}
      </div>
    </Card>
  );
}
