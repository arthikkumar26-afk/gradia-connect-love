import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, Star, Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Business & Management", count: 92, icon: "💼" },
  { name: "Communication & Leadership", count: 76, icon: "🎤" },
  { name: "Design & Creativity", count: 65, icon: "🎨" },
  { name: "Finance & Entrepreneurship", count: 54, icon: "💰" },
  { name: "Marketing & Branding", count: 68, icon: "📱" },
  { name: "Personal Development", count: 43, icon: "🌱" },
];

const featuredCourses = [
  {
    id: 1,
    title: "Strategic Business Management",
    description: "Master business strategy, operations, and organizational leadership",
    level: "Intermediate",
    duration: "28 hours",
    students: 1845,
    rating: 4.7,
    category: "Business & Management",
  },
  {
    id: 2,
    title: "Digital Marketing Masterclass",
    description: "Learn SEO, social media, content marketing, and analytics",
    level: "Beginner",
    duration: 24,
    students: 3127,
    rating: 4.8,
    category: "Marketing & Branding",
  },
];

export default function NonTechLearning() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-card border-b">
        <div className="container mx-auto px-4 py-12">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold mb-3">Non-Tech Learning</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Build essential business and soft skills for career success
          </p>
          <div className="max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search business, design, marketing courses..."
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card
                key={category.name}
                className="hover:shadow-medium transition-all cursor-pointer hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.count} courses</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Courses</h2>
            <Button variant="outline">View All Courses</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline">{course.category}</Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="font-semibold">{course.rating}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <CardDescription className="text-base">{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.level}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration} hours
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.students.toLocaleString()}
                    </div>
                  </div>
                  <Button className="w-full">Start Learning</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
