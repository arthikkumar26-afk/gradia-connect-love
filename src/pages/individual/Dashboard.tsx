import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BookOpen, Search, Star, User, Heart,
  Clock, MapPin, ArrowRight, GraduationCap,
  Calendar, Bell, Bookmark, FileText
} from "lucide-react";

const sampleServices = [
  { id: 1, title: "Career Counseling Session", provider: "Dr. Meena Rao", rating: 4.9, price: "₹1,500/session", category: "Career", available: "Mon-Fri" },
  { id: 2, title: "Resume Review & Optimization", provider: "Priya Consultant", rating: 4.7, price: "₹800/review", category: "Resume", available: "Anytime" },
  { id: 3, title: "Interview Preparation Coaching", provider: "Rajesh Mentors", rating: 4.8, price: "₹2,000/session", category: "Interview", available: "Weekends" },
];

const sampleCourses = [
  { id: 1, title: "Communication Skills Masterclass", instructor: "Anita Shah", duration: "8 weeks", enrolled: 234, rating: 4.6, price: "Free" },
  { id: 2, title: "Digital Marketing Fundamentals", instructor: "Vikram Desai", duration: "6 weeks", enrolled: 512, rating: 4.8, price: "₹999" },
  { id: 3, title: "Personal Finance Management", instructor: "Deepa Menon", duration: "4 weeks", enrolled: 189, rating: 4.5, price: "₹499" },
];

const IndividualDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Hello, {profile?.full_name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore services, find mentors, and grow your skills.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Search className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Browse Services</p>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Find Mentors</p>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Courses</p>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">My Bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="bookmarks">Saved</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recommended Services</h2>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-1" /> Search
              </Button>
            </div>

            {sampleServices.map((service) => (
              <Card key={service.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">by {service.provider}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-yellow-500" /> {service.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {service.available}
                        </span>
                        <Badge variant="outline">{service.category}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{service.price}</p>
                      <Button size="sm" className="mt-2 gap-1">
                        Book <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Popular Courses</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {sampleCourses.map((course) => (
                <Card key={course.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">{course.price}</Badge>
                    <h3 className="font-semibold text-foreground">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">by {course.instructor}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {course.enrolled} enrolled
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" /> {course.rating}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-4 w-full">Enroll Now</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="bookmarks">
            <Card>
              <CardContent className="p-12 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Saved Items</h3>
                <p className="text-muted-foreground mb-4">Save services and courses to access them later.</p>
                <Button>Browse Services</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{profile?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{profile?.mobile || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium text-foreground">{profile?.location || "—"}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IndividualDashboard;
