import { Estedad, Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Shared preview fonts. Only redesign surfaces use these variables.
 * The live site's existing Geist/Vazirmatn font stacks remain unchanged.
 */
export const ariaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--aria-font-sans',
});

export const ariaRtl = Estedad({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--aria-font-rtl',
});
