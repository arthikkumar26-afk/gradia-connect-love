import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

export default function SubmitProposal() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Submit Partnership Proposal</h1>
          <p className="text-xl text-muted-foreground">
            Share your collaboration ideas with us
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <Card className="lg:col-span-2 p-8">
            <form className="space-y-6">
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" placeholder="Enter your company name" />
              </div>

              <div>
                <Label htmlFor="contact">Contact Person</Label>
                <Input id="contact" placeholder="Your full name" />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your.email@company.com" />
              </div>

              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input id="website" type="url" placeholder="https://yourcompany.com" />
              </div>

              <div>
                <Label htmlFor="proposal">Project Proposal Description</Label>
                <Textarea 
                  id="proposal" 
                  rows={6}
                  placeholder="Example: We want to collaborate on a mobile security testing solution."
                />
              </div>

              <div>
                <Label htmlFor="file">Upload PDF</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Input id="file" type="file" accept=".pdf" className="flex-1" />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your detailed proposal (PDF format, max 5MB)
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Submit Proposal
              </Button>
            </form>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">What Happens Next?</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li>✓ We review your proposal</li>
                <li>✓ Initial screening within 24 hours</li>
                <li>✓ Detailed evaluation by team</li>
                <li>✓ Response via email</li>
              </ul>
            </Card>

            <Card className="p-6 bg-primary/5">
              <h3 className="text-lg font-semibold mb-2">Average Approval Time</h3>
              <p className="text-3xl font-bold text-primary mb-2">2–3</p>
              <p className="text-muted-foreground">business days</p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Contact our partnership team
              </p>
              <Button variant="outline" className="w-full">
                partnerships@gradia.com
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
