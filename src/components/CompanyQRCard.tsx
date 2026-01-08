import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface CompanyQRCardProps {
  id: string;
  name: string;
  logo?: string;
  location?: string;
  openPositions: number;
  industry?: string;
}

const CompanyQRCard = ({
  id,
  name,
  logo,
  location,
  openPositions,
  industry,
}: CompanyQRCardProps) => {
  const qrUrl = `${window.location.origin}/company/${id}/jobs`;

  return (
    <Card className="hover:shadow-large transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-accent font-semibold">
            {openPositions} Jobs
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-lg shadow-soft">
            <QRCodeSVG value={qrUrl} size={80} level="M" />
          </div>
          <div className="flex-1">
            {industry && (
              <Badge variant="outline" className="mb-2">
                {industry}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mb-3">
              Scan QR to view jobs & apply with AI resume analysis
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/company/${id}/jobs`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Jobs
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyQRCard;
