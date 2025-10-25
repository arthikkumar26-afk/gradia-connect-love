import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, Calendar, User, ArrowRight, Clock } from "lucide-react";

const Blog = () => {
  const posts = [
    {
      title: "The Future of Remote Hiring: Trends for 2024",
      excerpt: "Explore how remote hiring practices are evolving and what it means for both candidates and employers.",
      author: "Sarah Johnson",
      date: "March 15, 2024",
      readTime: "5 min read",
      category: "Hiring Trends",
      image: "📊"
    },
    {
      title: "Building a Standout Tech Resume",
      excerpt: "Essential tips for creating a resume that gets noticed by top tech companies.",
      author: "Michael Chen",
      date: "March 12, 2024", 
      readTime: "8 min read",
      category: "Career Advice",
      image: "📝"
    },
    {
      title: "Navigating Career Transitions in Education",
      excerpt: "How educators can successfully transition between academic roles and institutions.",
      author: "Dr. Amanda Rodriguez",
      date: "March 10, 2024",
      readTime: "6 min read", 
      category: "Education",
      image: "🎓"
    }
  ];

  const categories = ["All", "Career Advice", "Hiring Trends", "Education", "Technology", "Industry Insights"];

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Gradia Blog</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Career insights, hiring trends, and industry expertise to help you succeed.
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-12">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search articles..." className="pl-10" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <Button key={category} variant="outline" size="sm" className="whitespace-nowrap">
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Blog Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <Card key={index} className="hover:shadow-medium transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="text-4xl mb-4">{post.image}</div>
                  <Badge variant="secondary" className="w-fit mb-2">{post.category}</Badge>
                  <CardTitle className="text-xl hover:text-accent transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription>{post.excerpt}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {post.readTime}
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full mt-4">
                    Read More
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Articles
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Stay Updated</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter for the latest career insights and hiring trends.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input placeholder="Enter your email" className="flex-1" />
            <Button variant="cta">Subscribe</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog;