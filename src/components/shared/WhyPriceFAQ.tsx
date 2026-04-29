import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle, TrendingUp, Shield, Sparkles, Wallet, Users } from "lucide-react";

interface WhyPriceFAQProps {
  /** Compact = smaller paddings/heading, suited for inside signup wizard */
  compact?: boolean;
  className?: string;
}

const faqs = [
  {
    icon: TrendingUp,
    q: "Why does Gradia cost more than typical job portals?",
    a: "Gradia isn't a job board — it's an end-to-end career outcome platform. You get AI resume scoring, unlimited mock interviews (Aptitude, Technical, HR, Coding, Demo), pipeline-based applications, recruiter visibility boosts and a 30-day improvement roadmap. Replacing these services individually (resume writer ₹3–8k, interview coach ₹1.5k/hour, mentor ₹10k+) easily crosses ₹50,000. One salary hike from a better offer pays for Gradia 10× over.",
  },
  {
    icon: Sparkles,
    q: "What am I actually paying for?",
    a: "Real AI compute (every mock interview, ATS scan and feedback report runs on premium models like GPT-5 and Gemini 3), human-reviewed pipeline templates built by HR experts, recruiter-side visibility (priority/featured tags), and ongoing infra so you can practice 24×7. It's an investment in your next 2–5 years of earnings, not a monthly subscription you forget about.",
  },
  {
    icon: Wallet,
    q: "Is there a cheaper option if I'm a student or fresher?",
    a: "Yes. Plan A is our budget tier with the essentials (applications, ATS report, 1 mock interview). Students can also apply coupon codes at checkout for additional discounts. Start with Plan A — you can upgrade anytime without losing progress.",
  },
  {
    icon: TrendingUp,
    q: "What's the ROI? Will I actually get a job?",
    a: "Candidates who complete at least 3 mock interviews on Gradia see significantly higher selection rates because they walk into real interviews already trained on the exact pipeline (CV → Written → Technical → Demo → HR). Even a ₹5,000/month salary increase over your first job pays back the entire plan in the first month.",
  },
  {
    icon: Shield,
    q: "Is the payment safe? What if I'm not satisfied?",
    a: "Payments are processed through Razorpay (PCI-DSS Level 1 secure). Your subscription unlocks immediately and your data is protected with bank-grade encryption. If something doesn't work as promised, our support team responds within 24 hours.",
  },
  {
    icon: Users,
    q: "Why not use free tools like ChatGPT or YouTube?",
    a: "Free tools give you generic advice. Gradia gives you a structured, employer-grade pipeline built around real Indian hiring practices, with feedback graded the way actual recruiters grade candidates. You also get visibility to 500+ verified employers — that exposure alone is worth more than the plan price.",
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
            We get this question a lot. Here's the full breakdown of what you're paying for and the ROI.
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
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-5 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm text-foreground">
          <span className="font-semibold">💡 Bottom line:</span> Gradia replaces ₹50,000+ worth of resume
          writers, interview coaches, and career mentors with one AI platform — for a fraction of the cost.
          One better job offer pays for it many times over.
        </p>
      </div>
    </Card>
  );
};

export default WhyPriceFAQ;
