import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";

const allCategories = {
  "Tech Learning": [
    { name: "Programming & Development", count: 124, icon: "💻", path: "/learning/tech" },
    { name: "Data Science & Analytics", count: 87, icon: "📊", path: "/learning/tech" },
    { name: "AI & Machine Learning", count: 56, icon: "🤖", path: "/learning/tech" },
    { name: "Cloud & DevOps", count: 64, icon: "☁️", path: "/learning/tech" },
    { name: "Cybersecurity & Networking", count: 42, icon: "🔒", path: "/learning/tech" },
    { name: "Automation & Tools", count: 38, icon: "⚙️", path: "/learning/tech" },
  ],
  "Non-Tech Learning": [
    { name: "Business & Management", count: 92, icon: "💼", path: "/learning/non-tech" },
    { name: "Communication & Leadership", count: 76, icon: "🎤", path: "/learning/non-tech" },
    { name: "Design & Creativity", count: 65, icon: "🎨", path: "/learning/non-tech" },
    { name: "Finance & Entrepreneurship", count: 54, icon: "💰", path: "/learning/non-tech" },
    { name: "Marketing & Branding", count: 68, icon: "📱", path: "/learning/non-tech" },
    { name: "Personal Development", count: 43, icon: "🌱", path: "/learning/non-tech" },
  ],
  "Education & Teaching": [
    { name: "Teaching Methodologies", count: 34, icon: "📚", path: "/learning/education" },
    { name: "Classroom Management", count: 28, icon: "🏫", path: "/learning/education" },
    { name: "Educational Technology", count: 42, icon: "💻", path: "/learning/education" },
    { name: "Curriculum & Lesson Planning", count: 31, icon: "📝", path: "/learning/education" },
    { name: "Assessment & Evaluation", count: 25, icon: "✅", path: "/learning/education" },
    { name: "Inclusive & Special Education", count: 22, icon: "♿", path: "/learning/education" },
  ],
  "Languages & Communication": [
    { name: "English Language Skills", count: 89, icon: "🇬🇧", path: "/learning/languages" },
    { name: "Foreign Languages", count: 156, icon: "🌍", path: "/learning/languages" },
    { name: "Business Communication", count: 47, icon: "💼", path: "/learning/languages" },
    { name: "Academic Writing", count: 38, icon: "✍️", path: "/learning/languages" },
    { name: "Translation & Interpretation", count: 29, icon: "🔄", path: "/learning/languages" },
    { name: "Public Speaking", count: 32, icon: "🎙️", path: "/learning/languages" },
  ],
};

export default function AllCategories() {
  return (
    <>
      <Helmet>
        <title>All Learning Categories - Gradia</title>
        <meta name="description" content="Browse every Gradia learning category — tech, non-tech, education, languages, and more." />
        <link rel="canonical" href="https://gradiaa.com/learning/all-categories" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="All Learning Categories - Gradia" />
        <meta property="og:description" content="Browse every Gradia learning category — tech, non-tech, education, languages, and more." />
        <meta property="og:url" content="https://gradia.world/learning/all-categories" />
        <meta property="og:image" content="https://gradia.world/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="All Learning Categories - Gradia" />
        <meta name="twitter:description" content="Browse every Gradia learning category — tech, non-tech, education, languages, and more." />
        <meta name="twitter:image" content="https://gradia.world/og-image.png" />
      </Helmet>
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-card border-b">
        <div className="container mx-auto px-4 py-12">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold mb-3">All Learning Categories</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Explore our complete catalog of courses and learning paths
          </p>
          <div className="max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search categories, courses, or topics..."
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tech">Tech</TabsTrigger>
            <TabsTrigger value="non-tech">Non-Tech</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            {Object.entries(allCategories).map(([section, categories]) => (
              <div key={section}>
                <h2 className="text-2xl font-bold mb-4">{section}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <Card
                      key={category.name}
                      className="hover:shadow-medium transition-all cursor-pointer hover:-translate-y-1"
                      onClick={() => (window.location.href = category.path)}
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
            ))}
          </TabsContent>

          <TabsContent value="tech">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCategories["Tech Learning"].map((category) => (
                <Card
                  key={category.name}
                  className="hover:shadow-medium transition-all cursor-pointer hover:-translate-y-1"
                  onClick={() => (window.location.href = category.path)}
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
          </TabsContent>

          <TabsContent value="non-tech">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCategories["Non-Tech Learning"].map((category) => (
                <Card
                  key={category.name}
                  className="hover:shadow-medium transition-all cursor-pointer hover:-translate-y-1"
                  onClick={() => (window.location.href = category.path)}
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
          </TabsContent>

          <TabsContent value="education">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCategories["Education & Teaching"].map((category) => (
                <Card
                  key={category.name}
                  className="hover:shadow-medium transition-all cursor-pointer hover:-translate-y-1"
                  onClick={() => (window.location.href = category.path)}
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
          </TabsContent>

          <TabsContent value="languages">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCategories["Languages & Communication"].map((category) => (
                <Card
                  key={category.name}
                  className="hover:shadow-medium transition-all cursor-pointer hover:-translate-y-1"
                  onClick={() => (window.location.href = category.path)}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}
