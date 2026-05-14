import { useRef } from "react";
import { Helmet } from "react-helmet-async";
import { SponsorHero } from "@/components/sponsor-landing/SponsorHero";
import { SponsorshipPackages } from "@/components/sponsor-landing/SponsorshipPackages";
import { StallReservation } from "@/components/sponsor-landing/StallReservation";
import { CandidateAccess } from "@/components/sponsor-landing/CandidateAccess";
import { AnalyticsROI } from "@/components/sponsor-landing/AnalyticsROI";
import { BrandVisibility } from "@/components/sponsor-landing/BrandVisibility";
import { SponsorSupport } from "@/components/sponsor-landing/SponsorSupport";
import { PostEventDeliverables } from "@/components/sponsor-landing/PostEventDeliverables";
import { TrustedSponsors } from "@/components/sponsor-landing/TrustedSponsors";
import { FinalCTA } from "@/components/sponsor-landing/FinalCTA";

export default function SponsorLanding() {
  const packagesRef = useRef<HTMLDivElement>(null);
  const stallsRef = useRef<HTMLDivElement>(null);

  const scrollToPackages = () => {
    packagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToStalls = () => {
    stallsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>Become a Sponsor - Gradia</title>
        <meta name="description" content="Partner with Gradia to sponsor job melas, reach top talent, and grow your brand visibility." />
        <link rel="canonical" href="https://gradiaa.com/sponsor" />
      </Helmet>
      <div className="min-h-screen">
      <SponsorHero onReserveStall={scrollToStalls} onViewPackages={scrollToPackages} />
      <div ref={packagesRef}>
        <SponsorshipPackages />
      </div>
      <div ref={stallsRef}>
        <StallReservation />
      </div>
      <CandidateAccess />
      <AnalyticsROI />
      <BrandVisibility />
      <SponsorSupport />
      <PostEventDeliverables />
      <TrustedSponsors />
      <FinalCTA onReserveStall={scrollToStalls} />
    </div>
    </>
  );
}
