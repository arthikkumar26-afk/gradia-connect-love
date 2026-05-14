import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage = ({ title, description = "This page is being built and will be available soon." }: PlaceholderPageProps) => {
  const { pathname } = useLocation();
  return (
    <>
      <Helmet>
        <title>{`${title} - Gradia`}</title>
        <meta name="description" content={`${title} on Gradia. ${description}`} />
        <link rel="canonical" href={`https://gradiaa.com${pathname}`} />
      </Helmet>
    <div className="min-h-screen flex items-center justify-center bg-subtle">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-accent rounded-lg flex items-center justify-center mx-auto mb-6">
          <Construction className="h-8 w-8 text-accent-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{description}</p>
        <Button variant="cta" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
    </>
  );
};

export default PlaceholderPage;