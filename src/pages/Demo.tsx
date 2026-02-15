import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import demoVideo from "@/assets/gradia-demo-video.mp4";

export default function Demo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Button
          variant="ghost"
          className="mb-8 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            See Gradia in Action
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch how Gradia streamlines the education recruitment process — from profile creation to AI-powered interviews and successful placements.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-black">
          <video
            src={demoVideo}
            controls
            autoPlay
            muted
            className="w-full aspect-video"
            poster=""
          />
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">1</div>
            <h3 className="font-semibold text-foreground mb-1">Create Profile</h3>
            <p className="text-sm text-muted-foreground">Sign up and build your professional profile in minutes.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">2</div>
            <h3 className="font-semibold text-foreground mb-1">AI Mock Interview</h3>
            <p className="text-sm text-muted-foreground">Practice with our AI-powered interview system and get instant feedback.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">3</div>
            <h3 className="font-semibold text-foreground mb-1">Get Hired</h3>
            <p className="text-sm text-muted-foreground">Connect with top education employers and land your dream role.</p>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" onClick={() => navigate("/candidate/signup")} className="gap-2">
            <Play className="h-4 w-4" />
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}
