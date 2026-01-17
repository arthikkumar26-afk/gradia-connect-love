import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  Check, 
  X, 
  Download, 
  Calendar,
  CheckCircle,
  Clock,
  Receipt,
  Loader2,
  Crown,
  Star,
  Zap,
  Phone
} from "lucide-react";
import { toast } from "sonner";
import { pricingPlans, featureComparison } from "@/utils/pricingApi";

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  started_at: string;
  ends_at: string | null;
  auto_renew: boolean;
}

interface Receipt {
  id: string;
  date: string;
  amount: number;
  status: string;
  planName: string;
  invoiceNumber: string;
}

export const SubscriptionsContent = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("tariffs");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
      generateMockReceipts();
    }
  }, [user?.id]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("employer_id", user?.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockReceipts = () => {
    // Mock receipts for demo
    const mockReceipts: Receipt[] = [
      {
        id: "1",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 7999,
        status: "paid",
        planName: "Growth",
        invoiceNumber: "INV-2025-001",
      },
      {
        id: "2",
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 7999,
        status: "paid",
        planName: "Growth",
        invoiceNumber: "INV-2024-012",
      },
    ];
    setReceipts(mockReceipts);
  };

  const handleSelectPlan = async (planId: string, cta: string) => {
    if (cta === "contact") {
      toast.info("Our sales team will contact you shortly");
      return;
    }

    if (currentSubscription?.plan_id === planId) {
      toast.info("You are already subscribed to this plan");
      return;
    }

    setProcessingPlan(planId);
    try {
      const plan = pricingPlans.find((p) => p.id === planId);
      if (!plan) throw new Error("Plan not found");

      const amount = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;

      // Insert or update subscription
      const { error } = await supabase.from("subscriptions").upsert({
        employer_id: user?.id,
        plan_id: planId,
        plan_name: plan.name,
        status: "active",
        billing_cycle: billingCycle,
        amount,
        currency: "INR",
        started_at: new Date().toISOString(),
        ends_at: new Date(
          Date.now() + (billingCycle === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000
        ).toISOString(),
        auto_renew: true,
      });

      if (error) throw error;

      toast.success(`Successfully subscribed to ${plan.name} plan!`);
      fetchSubscription();
      setActiveTab("confirmation");
    } catch (error: any) {
      toast.error(error.message || "Failed to process subscription");
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "basic":
        return <Star className="h-6 w-6" />;
      case "growth":
        return <Zap className="h-6 w-6" />;
      case "scale":
        return <Crown className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscriptions</h2>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>
        {currentSubscription && (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            {currentSubscription.plan_name} Plan Active
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="tariffs" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Tariffs/Plans
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="confirmation" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Confirmation
          </TabsTrigger>
        </TabsList>

        {/* Tariffs/Plans Tab */}
        <TabsContent value="tariffs" className="space-y-6">
          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 bg-muted/50 rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-full transition-all ${
                  billingCycle === "monthly"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-6 py-2 rounded-full transition-all ${
                  billingCycle === "annual"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="ml-2 text-xs font-semibold text-success">
                  (Save 2 months)
                </span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => {
              const isCurrentPlan = currentSubscription?.plan_id === plan.id;
              const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;

              return (
                <Card
                  key={plan.id}
                  className={`relative transition-all hover:shadow-lg ${
                    plan.popular ? "ring-2 ring-primary shadow-xl" : ""
                  } ${isCurrentPlan ? "border-success border-2" : ""}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 right-4 bg-success">
                      Current Plan
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
                      {getPlanIcon(plan.id)}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.subtitle}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Price */}
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">
                        ₹{price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingCycle === "monthly" ? "month" : "year"}
                      </span>
                      {billingCycle === "annual" && price > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ₹{(price / 12).toFixed(0)}/month billed annually
                        </p>
                      )}
                    </div>

                    {/* Limits */}
                    <div className="p-3 bg-muted/30 rounded-lg text-sm">
                      <p className="text-muted-foreground">{plan.limits.jobPosts}</p>
                      <p className="text-muted-foreground">{plan.limits.seats}</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan.id, plan.cta)}
                      disabled={processingPlan !== null || isCurrentPlan}
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                    >
                      {processingPlan === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        "Current Plan"
                      ) : plan.cta === "contact" ? (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          Contact Sales
                        </>
                      ) : plan.cta === "free" ? (
                        "Get Started Free"
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Feature Comparison */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-center">Compare All Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Feature</th>
                      <th className="text-center py-3 px-4 font-semibold">Basic</th>
                      <th className="text-center py-3 px-4 font-semibold">Growth</th>
                      <th className="text-center py-3 px-4 font-semibold">Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {item.feature}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof item.basic === "boolean" ? (
                            item.basic ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{item.basic}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof item.growth === "boolean" ? (
                            item.growth ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{item.growth}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof item.scale === "boolean" ? (
                            item.scale ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{item.scale}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment methods and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Payment Method */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">No payment method added</p>
                      <p className="text-sm text-muted-foreground">
                        Add a payment method to subscribe to a plan
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Add Card
                  </Button>
                </div>
              </div>

              {/* Billing Information */}
              <div className="space-y-4">
                <h4 className="font-semibold">Billing Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Billing Email</p>
                    <p className="font-medium">{user?.email || "Not set"}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Billing Address</p>
                    <p className="font-medium">Not configured</p>
                  </div>
                </div>
                <Button variant="outline">Update Billing Information</Button>
              </div>

              {/* Current Subscription */}
              {currentSubscription && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Current Subscription</h4>
                  <div className="p-4 border rounded-lg bg-success/5 border-success/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-lg">{currentSubscription.plan_name} Plan</p>
                        <p className="text-sm text-muted-foreground">
                          ₹{currentSubscription.amount.toLocaleString()}/{currentSubscription.billing_cycle}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Renews on{" "}
                          {currentSubscription.ends_at
                            ? new Date(currentSubscription.ends_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <Badge variant="default" className="bg-success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">
                      Change Plan
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History & Receipts</CardTitle>
              <CardDescription>View and download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {receipts.length > 0 ? (
                <div className="space-y-4">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{receipt.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {receipt.planName} Plan •{" "}
                            {new Date(receipt.date).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">₹{receipt.amount.toLocaleString()}</p>
                          <Badge
                            variant={receipt.status === "paid" ? "default" : "secondary"}
                            className={receipt.status === "paid" ? "bg-success" : ""}
                          >
                            {receipt.status === "paid" ? "Paid" : "Pending"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No receipts yet</h3>
                  <p className="text-muted-foreground">
                    Your payment receipts will appear here once you subscribe to a plan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmation Tab */}
        <TabsContent value="confirmation" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              {currentSubscription ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-6 p-4 rounded-full bg-success/10 w-fit">
                    <CheckCircle className="h-16 w-16 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Subscription Confirmed!</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Thank you for subscribing to the {currentSubscription.plan_name} plan. Your
                    subscription is now active.
                  </p>

                  <div className="bg-muted/30 rounded-lg p-6 max-w-md mx-auto mb-6">
                    <h4 className="font-semibold mb-4">Subscription Details</h4>
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{currentSubscription.plan_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Billing Cycle</span>
                        <span className="font-medium capitalize">
                          {currentSubscription.billing_cycle}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">
                          ₹{currentSubscription.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started</span>
                        <span className="font-medium">
                          {new Date(currentSubscription.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next Billing</span>
                        <span className="font-medium">
                          {currentSubscription.ends_at
                            ? new Date(currentSubscription.ends_at).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className="bg-success">Active</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => setActiveTab("receipts")}>
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipts
                    </Button>
                    <Button onClick={() => setActiveTab("tariffs")}>
                      Explore Plans
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto mb-6 p-4 rounded-full bg-muted w-fit">
                    <Clock className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
                  <p className="text-muted-foreground mb-6">
                    Subscribe to a plan to unlock all features and start hiring.
                  </p>
                  <Button onClick={() => setActiveTab("tariffs")}>
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionsContent;
