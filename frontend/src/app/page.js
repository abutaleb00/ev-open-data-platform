import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Compliance from '@/components/landing/Compliance';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'EV Data Hub | Open EV Charging Data Platform',
  description: 'Manage your EV charging network and publish an OCPI-compliant open data feed for maps, apps and roaming partners — all from one multi-tenant platform.',
  keywords: ['EV Open Data', 'OCPI Data Feed', 'Charge Point Operator Platform', 'EV Charging Infrastructure'],
  openGraph: {
    title: 'EV Data Hub - Open EV Charging Data Platform',
    description: 'Manage your charging network and publish a live, OCPI-compliant open data feed.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-[#FFAF00] selection:text-slate-950 scroll-smooth flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Compliance />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
