'use client';

import { motion } from 'framer-motion';
import { Shield, Award, Globe2, Lock, BadgeCheck, Star } from 'lucide-react';
import { useT } from '@/hooks/use-t';

const badgeKeys = [
  { icon: Shield, labelKey: 'trust.badge.sslSecured.label', subKey: 'trust.badge.sslSecured.sub' },
  { icon: Lock, labelKey: 'trust.badge.dataProtected.label', subKey: 'trust.badge.dataProtected.sub' },
  { icon: Award, labelKey: 'trust.badge.isoCertified.label', subKey: 'trust.badge.isoCertified.sub' },
  { icon: Globe2, labelKey: 'trust.badge.countries.label', subKey: 'trust.badge.countries.sub' },
  { icon: BadgeCheck, labelKey: 'trust.badge.licensed.label', subKey: 'trust.badge.licensed.sub' },
  { icon: Star, labelKey: 'trust.badge.rating.label', subKey: 'trust.badge.rating.sub' },
];

export function TrustBar() {
  const t = useT();
  return (
    <section className="relative border-y border-border/40 bg-card/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-border/40 sm:grid-cols-3 lg:grid-cols-6">
          {badgeKeys.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">{t(b.labelKey)}</p>
                <p className="truncate text-[11px] text-muted-foreground">{t(b.subKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
