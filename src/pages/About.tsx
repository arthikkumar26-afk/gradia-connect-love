import { Helmet } from "react-helmet-async";
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
import WhyPriceFAQ from "@/components/shared/WhyPriceFAQ";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us - Gradia</title>
        <meta name="description" content="Learn about Gradia's mission to transform hiring. AI-powered recruitment connecting talent with opportunity across software and education sectors." />
        <link rel="canonical" href="https://gradiaa.com/about" />
      </Helmet>
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
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <WhyPriceFAQ />
        </div>
      </section>
    </div>
  );
};

export default About;
