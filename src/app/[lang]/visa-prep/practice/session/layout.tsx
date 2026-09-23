import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Visa Practice Session | ARIA HUB',
  description: 'Interactive voice and speech AI simulator for embassy visa interview preparation on ARIA HUB.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VisaSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
