import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface JobMela {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  expectedAttendees: number;
  spotsAvailable: number;
  status: "upcoming" | "filling-fast" | "sold-out";
}

const upcomingMelas: JobMela[] = [
  {
    id: "1",
    title: "Tech Talent Job Mela 2025",
    date: "2025-02-15",
    time: "9:00 AM - 5:00 PM",
    location: "Bangalore International Exhibition Centre",
    city: "Bangalore",
    state: "Karnataka",
    expectedAttendees: 5000,
    spotsAvailable: 3,
    status: "filling-fast"
  },
  {
    id: "2",
    title: "Engineering Graduate Job Fair",
    date: "2025-02-28",
    time: "10:00 AM - 4:00 PM",
    location: "Pune Convention Center",
    city: "Pune",
    state: "Maharashtra",
    expectedAttendees: 3500,
    spotsAvailable: 8,
    status: "upcoming"
  },
  {
    id: "3",
    title: "IT & Software Job Mela",
    date: "2025-03-10",
    time: "9:00 AM - 5:00 PM",
    location: "Hyderabad Trade Center",
    city: "Hyderabad",
    state: "Telangana",
    expectedAttendees: 4200,
    spotsAvailable: 5,
    status: "upcoming"
  },
  {
    id: "4",
    title: "Mega Campus Recruitment Drive",
    date: "2025-03-22",
    time: "8:30 AM - 6:00 PM",
    location: "Chennai Trade Centre",
    city: "Chennai",
    state: "Tamil Nadu",
    expectedAttendees: 6000,
    spotsAvailable: 0,
    status: "sold-out"
  },
  {
    id: "5",
    title: "Freshers Job Mela 2025",
    date: "2025-04-05",
    time: "10:00 AM - 4:00 PM",
    location: "Mumbai Exhibition Centre",
    city: "Mumbai",
    state: "Maharashtra",
    expectedAttendees: 4500,
    spotsAvailable: 12,
    status: "upcoming"
  },
  {
    id: "6",
    title: "Digital Skills Job Fair",
    date: "2025-04-18",
    time: "9:00 AM - 5:00 PM",
    location: "Delhi International Expo Center",
    city: "New Delhi",
    state: "Delhi",
    expectedAttendees: 5500,
    spotsAvailable: 7,
    status: "upcoming"
  }
];

const JobMelaCalendar = () => {
  const getStatusBadge = (status: JobMela["status"]) => {
    switch (status) {
      case "filling-fast":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Filling Fast</Badge>;
      case "sold-out":
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive">Sold Out</Badge>;
      default:
        return <Badge variant="secondary" className="bg-primary/10 text-primary">Available</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-subtle">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Job Mela Calendar 2025</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Participate in our upcoming offline job melas across India. Connect with thousands of talented candidates.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">6</p>
                  <p className="text-sm text-muted-foreground">Upcoming Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">28,700+</p>
                  <p className="text-sm text-muted-foreground">Expected Attendees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">6</p>
                  <p className="text-sm text-muted-foreground">Cities Covered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          {upcomingMelas.map((mela) => (
            <Card key={mela.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-subtle pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{mela.title}</CardTitle>
                      {getStatusBadge(mela.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(mela.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{mela.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-start gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{mela.location}</p>
                        <p className="text-sm text-muted-foreground">{mela.city}, {mela.state}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{mela.expectedAttendees.toLocaleString()}</span> expected attendees
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      {mela.status !== "sold-out" && (
                        <p className="text-sm text-muted-foreground mb-2">
                          <span className="font-semibold text-foreground">{mela.spotsAvailable}</span> sponsorship spots available
                        </p>
                      )}
                    </div>
                    
                    {mela.status === "sold-out" ? (
                      <Button disabled variant="outline">
                        Sold Out
                      </Button>
                    ) : (
                      <Button variant="cta" asChild>
                        <Link to="/sponsor/become-partner">
                          Reserve Your Spot
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="mt-12 bg-gradient-accent text-center">
          <CardContent className="py-12">
            <h2 className="text-2xl font-bold text-accent-foreground mb-4">
              Don't See Your City?
            </h2>
            <p className="text-accent-foreground/80 mb-6 max-w-2xl mx-auto">
              We're constantly expanding to new locations. Contact us to request a job mela in your city or get notified about upcoming events.
            </p>
            <Button variant="outline" size="lg" className="bg-background/10 border-accent-foreground/20" asChild>
              <Link to="/sponsor/submit-proposal">
                Request New Location
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobMelaCalendar;
