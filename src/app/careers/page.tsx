import HeroSection from '@/components/careers/HeroSection';
import WhyJoinUs from '@/components/careers/WhyJoinUs';
import OpenPositions from '@/components/careers/OpenPositions';
import HiringProcess from '@/components/careers/HiringProcess';
import FaqSection from '@/components/careers/FaqSection';

export default function CareersLandingPage() {
  return (
    <div className="space-y-0">
      <HeroSection />
      <WhyJoinUs />
      <OpenPositions />
      <HiringProcess />
      <FaqSection />
    </div>
  );
}
