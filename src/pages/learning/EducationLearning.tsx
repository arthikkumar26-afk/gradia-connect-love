import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, Star, Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Teaching Methodologies", count: 34, icon: "📚" },
  { name: "Classroom Management", count: 28, icon: "🏫" },
  { name: "Educational Technology", count: 42, icon: "💻" },
  { name: "Curriculum & Lesson Planning", count: 31, icon: "📝" },
  { name: "Assessment & Evaluation", count: 25, icon: "✅" },
  { name: "Inclusive & Special Education", count: 22, icon: "♿" },
];

const featuredCourses = [
  {
    id: 1,
    title: "Modern Teaching Methods for 21st Century Classrooms",
    description: "Innovative teaching strategies and student engagement techniques",
    level: "Intermediate",
    duration: "22 hours",
    students: 892,
    rating: 4.9,
    category: "Teaching Methodologies",
  },
  {
    id: 2,
    title: "Educational Technology Integration",
    description: "Use technology effectively to enhance learning outcomes",
    level: "Beginner",
    duration: "18 hours",
    students: 1234,
    rating: 4.7,
    category: "Educational Technology",
  },
];

export default function EducationLearning() {
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
          <h1 className="text-4xl font-bold mb-3">Education & Teaching</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Professional development for educators and teaching professionals
          </p>
          <div className="max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search teaching methods, classroom management..."
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
