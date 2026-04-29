import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import {
  HelpCircle,
  TrendingUp,
  Shield,
  Sparkles,
  Wallet,
  Users,
  Briefcase,
  GraduationCap,
  Clock,
  Target,
  CheckCircle2,
  Building2,
} from "lucide-react";

interface WhyPriceFAQProps {
  /** Compact = smaller paddings/heading, suited for inside signup wizard */
  compact?: boolean;
  className?: string;
}

const faqs = [
  {
    icon: TrendingUp,
    q: "Why are your prices high?",
    a: `Gradia is not just charging for job access — you're getting a complete career improvement system:

👉 You attend interviews through Gradia
👉 We give you a detailed performance report
👉 That report is analyzed by Skilory
👉 You get personalized courses to improve your weak areas
👉 Then we prepare you again and support you for re-interviews

Most consultancies take one month's salary after placement. Gradia is a transparent one-time investment, and we support you till you get results.
It's not about price — it's about how fast and effectively you can get placed with the right guidance.`,
  },
  {
    icon: Shield,
    q: "Can you guarantee I will get a job?",
    a: `We don't give fake guarantees — no genuine platform can. But what we do guarantee is:

✔ Structured interview process
✔ Clear feedback after every attempt
✔ Continuous improvement with Skilory.in
✔ Multiple opportunities based on your profile

This systematically increases your chances instead of random attempts.`,
  },
  {
    icon: Building2,
    q: "How is Gradia different from a consultancy?",
    a: `Big difference:

❌ Consultancies take one month's salary
❌ No real feedback or improvement
❌ Focus is only on quick placement

✔ Detailed interview report after each round
✔ Skilory-powered skill improvement
✔ Long-term support till you're ready

We focus on building your capability, not just placing you once.`,
  },
  {
    icon: Target,
    q: "What if I pay and don't get placed?",
    a: `That usually happens when candidates repeat the same mistakes. Gradia avoids that by:

👉 Identifying your exact mistakes through reports
👉 Fixing them through targeted upskilling on Skilory
👉 Preparing you before the next interview

So even if your first attempt fails, you are stronger the next time — not starting from zero.`,
  },
  {
    icon: Wallet,
    q: "Why is your price fixed? Can you reduce it?",
    a: `The price is fixed because this is not just a service — it's a structured system that includes:

👉 Interview evaluation
👉 Detailed reporting
👉 AI-based analysis via Skilory
👉 Continuous support

Reducing the price means compromising quality, and we don't do that because your career outcome matters.`,
  },
  {
    icon: Clock,
    q: "Why not pay only after I get a job?",
    a: `If we took payment after placement, it would become like a consultancy — and they charge much higher (one month's salary).

Gradia works differently:
👉 We invest in your evaluation, reports and training from Day 1`,
  },
  {
    icon: CheckCircle2,
    q: "What exactly will I get after payment?",
    a: `You get a complete career pipeline, not just one service:

✔ Interview opportunities
✔ Detailed performance reports
✔ Skill gap identification
✔ Course suggestions via Skilory
✔ Re-interview preparation
✔ Continuous support`,
  },
  {
    icon: Briefcase,
    q: "How many interviews will I get?",
    a: `It's not about the number — it's about quality and readiness. Attending 20 interviews without improvement = same rejection.

Gradia ensures:
👉 Each attempt is better than the previous one
👉 You improve using reports + Skilory
👉 Higher chance of selection in fewer attempts.`,
  },
  {
    icon: GraduationCap,
    q: "I already have skills. Why do I need Gradia?",
    a: `Having skills is different from clearing interviews. Most rejections happen not because of lack of skills, but because of:

❌ Communication gaps
❌ Presentation issues
❌ Interview mistakes

Gradia identifies these through reports and improves them using Skilory.`,
  },
  {
    icon: Sparkles,
    q: "What if I don't have time to do courses?",
    a: `Then the same mistakes will keep repeating in interviews. The advantage with Skilory is:

👉 Only relevant courses are suggested
👉 No unnecessary learning
👉 Focused improvement

So even small effort gives much better results.`,
  },
  {
    icon: Shield,
    q: "Why should I trust Gradia?",
    a: `Fair question. Gradia works across multiple industries and focuses on:

✔ Verified opportunities
✔ Structured hiring process
✔ Transparent system
✔ Continuous candidate support

We are building a long-term career platform, not just a one-time placement service.`,
  },
  {
    icon: Users,
    q: "What's the difference between Gradia, Naukri.com and consultancies?",
    a: `All three serve different purposes:

👉 Naukri.com → gives you job listings, no feedback if rejected, you're on your own
👉 Consultancies → push placements, often take one month salary, no improvement system
👉 Gradia → Interview + Report + Skilory + Upskill + Re-interview + Selection

Simple line:
"Naukri.com gives opportunities. Consultancies push placements. Gradia builds you into a selectable candidate."`,
  },
  {
    icon: Building2,
    q: "Are you a consultancy?",
    a: `No — Gradia is not a consultancy.

❌ No salary cut after placement
❌ No random placements
❌ No 'just push the candidate' approach

✔ Structured interview process
✔ Detailed performance report
✔ Skill gap analysis via Skilory
✔ Personalized upskilling
✔ Re-interview support
✔ Transparent one-time model

Consultancies sell jobs. Gradia builds candidates — we're a career development platform with an interview + feedback + upskilling system.`,
  },
  {
    icon: TrendingUp,
    q: "Why is it better to join now?",
    a: `Every delay means:

❌ More missed opportunities
❌ More repeated mistakes
❌ More time without growth

The earlier you start, the faster you improve and the sooner you get placed.`,
  },
];

export const WhyPriceFAQ = ({ compact = false, className = "" }: WhyPriceFAQProps) => {
  return (
    <Card className={`${compact ? "p-5" : "p-6 md:p-8"} ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <HelpCircle className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
        <div>
          <h3 className={`font-bold text-foreground ${compact ? "text-base" : "text-xl md:text-2xl"}`}>
            Why this price? — Honest answers
          </h3>
          <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"} mt-1`}>
            Pricing, guarantees, consultancy comparison and more — exactly the way we explain it on a call.
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f, i) => {
          const Icon = f.icon;
          return (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="flex items-center gap-2 text-sm md:text-[15px] font-medium pr-2">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  {f.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-5 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm text-foreground">
          <span className="font-semibold">💡 Bottom line:</span> Most candidates fail because they don't know
          their mistakes. Gradia identifies your gaps, improves your skills with Skilory, and prepares you
          until you succeed. So the question isn't <em>"why is the price high?"</em> — it's{" "}
          <em>"how fast do you want to get the right job with the right support?"</em>
        </p>
      </div>
    </Card>
  );
};

export default WhyPriceFAQ;
