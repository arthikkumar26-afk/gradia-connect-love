import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, Star, TrendingUp, Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Programming & Development", count: 124, icon: "💻" },
  { name: "Data Science & Analytics", count: 87, icon: "📊" },
  { name: "AI & Machine Learning", count: 56, icon: "🤖" },
  { name: "Cloud & DevOps", count: 64, icon: "☁️" },
  { name: "Cybersecurity & Networking", count: 42, icon: "🔒" },
  { name: "Automation & Tools", count: 38, icon: "⚙️" },
];

const featuredCourses = [
  {
    id: 1,
    title: "Full Stack Web Development with React & Node.js",
    description: "Build modern web applications from scratch using the MERN stack",
    level: "Intermediate",
    duration: "40 hours",
    students: 2543,
    rating: 4.8,
    category: "Programming & Development",
  },
  {
    id: 2,
    title: "Machine Learning A-Z: Hands-On Python & R",
    description: "Master ML algorithms with practical projects and real datasets",
    level: "Beginner",
    duration: "35 hours",
    students: 3821,
    rating: 4.9,
    category: "AI & Machine Learning",
  },
  {
    id: 3,
    title: "AWS Certified Solutions Architect",
    description: "Prepare for certification and learn cloud architecture best practices",
    level: "Advanced",
    duration: "28 hours",
    students: 1876,
    rating: 4.7,
    category: "Cloud & DevOps",
  },
  {
    id: 4,
    title: "Python for Data Science and Data Analytics",
    description: "Analyze data, create visualizations, and build predictive models",
    level: "Beginner",
    duration: "32 hours",
    students: 4291,
    rating: 4.8,
    category: "Data Science & Analytics",
  },
];

export default function TechLearning() {
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
          <h1 className="text-4xl font-bold mb-3">Tech Learning</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Master technical skills with industry-leading courses
          </p>
          <div className="max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search courses, topics, or technologies..."
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

        <Card className="mt-12 bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-2xl">Why Learn Tech Skills?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">High Demand</h3>
                  <p className="text-sm text-muted-foreground">
                    Tech skills are among the most sought-after in the job market
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Flexible Learning</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn at your own pace with hands-on projects and real examples
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Community Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Join thousands of learners and get help when you need it
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
