import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  MapPin,
  Calendar,
  CheckCircle2,
  Circle,
  Upload,
  MessageSquare,
  Wifi,
  Zap,
  Monitor,
  Users,
  Image,
  FileText,
} from "lucide-react";
import SponsorDashboardLayout from "./SponsorDashboard";
import { toast } from "sonner";

// Mock data
const mockStalls = [
  {
    id: "1",
    eventName: "Hyderabad Tech Job Mela 2024",
    city: "Hyderabad",
    date: "2024-02-15",
    stallNumber: "A-12",
    size: "3m x 3m (Standard)",
    status: "upcoming",
    amenities: ["power", "wifi", "monitor"],
    brandingChecklist: {
      logo: true,
      banners: true,
      brochures: false,
      standees: true,
      tableCover: false,
    },
    readiness: 70,
  },
  {
    id: "2",
    eventName: "Bangalore Startup Hiring Mela",
    city: "Bangalore",
    date: "2024-03-10",
    stallNumber: "B-05",
    size: "4m x 4m (Premium)",
    status: "upcoming",
    amenities: ["power", "wifi", "monitor", "ac"],
    brandingChecklist: {
      logo: true,
      banners: false,
      brochures: false,
      standees: false,
      tableCover: false,
    },
    readiness: 30,
  },
  {
    id: "3",
    eventName: "Delhi NCR Mega Job Fair",
    city: "Delhi",
    date: "2024-01-20",
    stallNumber: "C-08",
    size: "3m x 3m (Standard)",
    status: "completed",
    amenities: ["power", "wifi"],
    brandingChecklist: {
      logo: true,
      banners: true,
      brochures: true,
      standees: true,
      tableCover: true,
    },
    readiness: 100,
    leadsGenerated: 156,
  },
];

export default function MyStalls() {
  const navigate = useNavigate();
  const [selectedStall, setSelectedStall] = useState<typeof mockStalls[0] | null>(null);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      upcoming: { label: "Upcoming", className: "bg-blue-100 text-blue-800 border-blue-200" },
      live: { label: "Live Now", className: "bg-green-100 text-green-800 border-green-200" },
      completed: { label: "Completed", className: "bg-gray-100 text-gray-800 border-gray-200" },
    };
    const statusConfig = config[status] || config.upcoming;
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: Record<string, React.ReactNode> = {
      power: <Zap className="h-4 w-4" />,
      wifi: <Wifi className="h-4 w-4" />,
      monitor: <Monitor className="h-4 w-4" />,
      ac: <span className="text-xs font-medium">AC</span>,
    };
    return icons[amenity] || null;
  };

  const ChecklistItem = ({ checked, label }: { checked: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );

  const upcomingStalls = mockStalls.filter(s => s.status === "upcoming" || s.status === "live");
  const completedStalls = mockStalls.filter(s => s.status === "completed");

  return (
    <SponsorDashboardLayout activeTab="stalls">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Stalls</h1>
            <p className="text-muted-foreground mt-1">Manage your event stalls and branding</p>
          </div>
          <Button onClick={() => toast.info("Opening stall reservation...")}>
            <Store className="mr-2 h-4 w-4" />
            Reserve New Stall
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingStalls.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedStalls.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingStalls.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Store className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming stalls</p>
                  <Button variant="outline" className="mt-4">Reserve a Stall</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {upcomingStalls.map((stall) => (
                  <Card key={stall.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{stall.eventName}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {stall.city}
                            <span className="mx-1">•</span>
                            <Calendar className="h-4 w-4" />
                            {new Date(stall.date).toLocaleDateString("en-IN", { 
                              day: "numeric", 
                              month: "short", 
                              year: "numeric" 
                            })}
                          </CardDescription>
                        </div>
                        {getStatusBadge(stall.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Stall Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">Stall Number</p>
                          <p className="font-semibold text-lg">{stall.stallNumber}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className="font-semibold">{stall.size}</p>
                        </div>
                      </div>

                      {/* Amenities */}
                      <div>
                        <p className="text-sm font-medium mb-2">Amenities Included</p>
                        <div className="flex gap-2">
                          {stall.amenities.map((amenity) => (
                            <div
                              key={amenity}
                              className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm"
                            >
                              {getAmenityIcon(amenity)}
                              <span className="capitalize">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Branding Checklist */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Branding Readiness</p>
                          <span className="text-sm text-muted-foreground">{stall.readiness}%</span>
                        </div>
                        <Progress value={stall.readiness} className="h-2 mb-3" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <ChecklistItem checked={stall.brandingChecklist.logo} label="Company Logo" />
                          <ChecklistItem checked={stall.brandingChecklist.banners} label="Banners" />
                          <ChecklistItem checked={stall.brandingChecklist.brochures} label="Brochures" />
                          <ChecklistItem checked={stall.brandingChecklist.standees} label="Standees" />
                          <ChecklistItem checked={stall.brandingChecklist.tableCover} label="Table Cover" />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => toast.info("Opening asset upload...")}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Assets
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => toast.info("Contacting event manager...")}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Contact Manager
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {completedStalls.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Store className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed events yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {completedStalls.map((stall) => (
                  <Card key={stall.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{stall.eventName}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {stall.city}
                            <span className="mx-1">•</span>
                            <Calendar className="h-4 w-4" />
                            {new Date(stall.date).toLocaleDateString("en-IN", { 
                              day: "numeric", 
                              month: "short", 
                              year: "numeric" 
                            })}
                          </CardDescription>
                        </div>
                        {getStatusBadge(stall.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{stall.stallNumber}</p>
                          <p className="text-sm text-muted-foreground">Stall</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{stall.leadsGenerated}</p>
                          <p className="text-sm text-muted-foreground">Leads</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">100%</p>
                          <p className="text-sm text-muted-foreground">Readiness</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => navigate(`/sponsor/event-report/${stall.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Event Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Stall Map Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Stall Map</CardTitle>
            <CardDescription>Preview your stall location at upcoming events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 border-2 border-dashed rounded-lg p-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Interactive stall map coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">View your exact stall location and nearby amenities</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SponsorDashboardLayout>
  );
}
