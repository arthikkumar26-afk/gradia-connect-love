import AboutHero from "@/components/about/AboutHero";
import WhoWeAre from "@/components/about/WhoWeAre";
import MissionVision from "@/components/about/MissionVision";
import CoreOfferings from "@/components/about/CoreOfferings";
import ImpactNumbers from "@/components/about/ImpactNumbers";
import WhoWeWorkWith from "@/components/about/WhoWeWorkWith";
import OurValues from "@/components/about/OurValues";
import WhyChooseGradia from "@/components/about/WhyChooseGradia";
import OurJourney from "@/components/about/OurJourney";
import AboutCTA from "@/components/about/AboutCTA";

const About = () => {
  return (
    <div className="min-h-screen">
      <AboutHero />
      <WhoWeAre />
      <MissionVision />
      <CoreOfferings />
      <ImpactNumbers />
      <WhoWeWorkWith />
      <OurValues />
      <WhyChooseGradia />
      <OurJourney />
      <AboutCTA />
    </div>
  );
};

export default About;
