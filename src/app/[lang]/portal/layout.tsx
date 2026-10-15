import { PortalBackNavigation } from '@/components/site/portal-back-navigation';
import { JourneyShell } from '@/components/site/journey-shell';
export default function Layout({children}:{children:React.ReactNode}) { return <JourneyShell><PortalBackNavigation />{children}</JourneyShell>; }
