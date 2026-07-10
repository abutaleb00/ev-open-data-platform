import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Stats from '@/components/landing/Stats';
import Compliance from '@/components/landing/Compliance';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'EV Data Hub | Unified Open Charge Point Interface Gateway',
  description: 'The premier open-access roaming data infrastructure engine. Synchronize locations, map hardware assets, configure compliant specifications, and provision keys instantly.',
  keywords: ['EV Open Data', 'OCPI Data Feed', 'CPO Operator Registry', 'Roaming Infrastructure Network'],
  openGraph: {
    title: 'EV Data Hub - Open EV Charging Infrastructure Gateway',
    description: 'Synchronize multi-tenant charging hubs and stream real-time operational feeds.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-[#FFAF00] selection:text-slate-950 scroll-smooth flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <Compliance />
        <Stats />
      </main>
      <Footer />
    </div>
  );
}