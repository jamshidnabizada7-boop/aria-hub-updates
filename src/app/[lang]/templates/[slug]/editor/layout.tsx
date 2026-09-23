import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Template Document Editor | ARIA HUB',
  description: 'Interactive document editor for scholarship and job application templates on ARIA HUB.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TemplateEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
