import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, Star, Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "English Language Skills", count: 89, icon: "🇬🇧" },
  { name: "Foreign Languages", count: 156, icon: "🌍" },
  { name: "Business Communication", count: 47, icon: "💼" },
  { name: "Academic Writing", count: 38, icon: "✍️" },
  { name: "Translation & Interpretation", count: 29, icon: "🔄" },
  { name: "Public Speaking", count: 32, icon: "🎙️" },
];

const featuredCourses = [
  {
    id: 1,
    title: "Business English Mastery",
    description: "Professional English for workplace communication and presentations",
    level: "Intermediate",
    duration: "30 hours",
    students: 2156,
    rating: 4.8,
    category: "English Language Skills",
  },
  {
    id: 2,
    title: "Spanish for Beginners",
    description: "Learn conversational Spanish from scratch with native speakers",
    level: "Beginner",
    duration: "40 hours",
    students: 3842,
    rating: 4.9,
    category: "Foreign Languages",
  },
];

export default function LanguagesLearning() {
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
          <h1 className="text-4xl font-bold mb-3">Languages & Communication</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Master languages and effective communication skills
          </p>
          <div className="max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search languages, writing, communication courses..."
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
                      {course.duration}
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
