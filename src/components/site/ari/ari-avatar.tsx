import { ARI_ENABLED, type AriVariant } from '@/lib/ari';

/** Decorative artwork: the adjacent localized text supplies its meaning. */
export function AriAvatar({ variant = 'classic', size = 64, animated = false }: { variant?: AriVariant; size?: number; animated?: boolean }) {
  if (!ARI_ENABLED) return null;
  return <span className={animated ? 'ari-float relative inline-block' : 'relative inline-block'} style={{ width: size, height: size }} aria-hidden="true">
    <img src={`/images/ari/${variant}-128.webp`} srcSet={`/images/ari/${variant}-64.webp 64w, /images/ari/${variant}-128.webp 128w, /images/ari/${variant}-256.webp 256w, /images/ari/${variant}-512.webp 512w`} sizes={`${size}px`} width={size} height={size} alt="" loading="lazy" decoding="async" className={animated && variant === 'classic' ? 'ari-open-eyes object-contain' : 'object-contain'} />
    {animated && variant === 'classic' ? <img src="/images/ari/blink-128.webp" width={size} height={size} alt="" loading="lazy" decoding="async" className="ari-blink pointer-events-none absolute inset-0 object-contain" /> : null}
  </span>;
}
