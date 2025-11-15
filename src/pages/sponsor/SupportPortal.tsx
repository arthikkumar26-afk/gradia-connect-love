import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, FileText, Mail } from "lucide-react";

export default function SupportPortal() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Sponsor Support Portal</h1>
          <p className="text-xl text-muted-foreground">
            Access your sponsor dashboard and support resources
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Login Form */}
          <Card className="lg:col-span-2 p-8">
            <h2 className="text-2xl font-bold mb-6">Login to Your Account</h2>
            <form className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="sponsor@company.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                />
              </div>

              <div>
                <Label htmlFor="otp">One-Time Password (OTP)</Label>
                <Input 
                  id="otp" 
                  type="text" 
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  OTP has been sent to your registered email
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Login to Portal
              </Button>

              <div className="text-center pt-4">
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
            </form>
          </Card>

          {/* Support Cards */}
          <div className="space-y-6">
            <Card className="p-6">
              <Ticket className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Submit a Ticket</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Need help? Create a support ticket and our team will respond within 24 hours.
              </p>
              <Button variant="outline" className="w-full">
                New Ticket
              </Button>
            </Card>

            <Card className="p-6">
              <FileText className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Download Reports</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Access your sponsorship analytics, engagement reports, and ROI metrics.
              </p>
              <Button variant="outline" className="w-full">
                View Reports
              </Button>
            </Card>

            <Card className="p-6">
              <Mail className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Contact Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get in touch with our sponsor relations team directly.
              </p>
              <Button variant="outline" className="w-full">
                sponsor-support@qualiron.com
              </Button>
            </Card>
          </div>
        </div>

        {/* Help Section */}
        <Card className="mt-12 p-8 bg-muted/50">
          <h2 className="text-2xl font-bold mb-4">Need Help Accessing Your Account?</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>• Ensure you're using the email address registered with your sponsorship</p>
            <p>• Check your spam folder for OTP emails</p>
            <p>• OTP is valid for 10 minutes only</p>
            <p>• For account issues, contact sponsor-support@qualiron.com</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
