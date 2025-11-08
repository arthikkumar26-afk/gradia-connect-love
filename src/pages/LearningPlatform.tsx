import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Star, ExternalLink, ArrowLeft } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  category: string;
  url: string;
}

const COURSE_RECOMMENDATIONS: Record<string, Course[]> = {
  'Skill gap': [
    {
      id: '1',
      title: 'React Fundamentals: Complete Guide',
      description: 'Master React from basics to advanced concepts including hooks, context, and performance optimization.',
      duration: '12 hours',
      level: 'Intermediate',
      rating: 4.8,
      category: 'Frontend Development',
      url: '#',
    },
    {
      id: '2',
      title: 'TypeScript Mastery',
      description: 'Learn TypeScript from scratch and apply it to build type-safe React applications.',
      duration: '8 hours',
      level: 'Beginner',
      rating: 4.7,
      category: 'Programming Languages',
      url: '#',
    },
    {
      id: '3',
      title: 'Modern JavaScript ES6+',
      description: 'Deep dive into modern JavaScript features, async programming, and best practices.',
      duration: '10 hours',
      level: 'Intermediate',
      rating: 4.9,
      category: 'Programming Languages',
      url: '#',
    },
  ],
  'Failed test': [
    {
      id: '4',
      title: 'Problem Solving & Algorithms',
      description: 'Strengthen your problem-solving skills with data structures and algorithms practice.',
      duration: '15 hours',
      level: 'Intermediate',
      rating: 4.6,
      category: 'Computer Science',
      url: '#',
    },
    {
      id: '5',
      title: 'Technical Interview Preparation',
      description: 'Comprehensive guide to ace technical interviews with coding challenges and system design.',
      duration: '20 hours',
      level: 'Advanced',
      rating: 4.8,
      category: 'Career Development',
      url: '#',
    },
  ],
  'Communication issues': [
    {
      id: '6',
      title: 'Effective Communication for Developers',
      description: 'Learn to communicate technical concepts clearly to both technical and non-technical audiences.',
      duration: '6 hours',
      level: 'Beginner',
      rating: 4.5,
      category: 'Soft Skills',
      url: '#',
    },
    {
      id: '7',
      title: 'Presentation Skills Masterclass',
      description: 'Master the art of presenting ideas, demos, and technical solutions effectively.',
      duration: '5 hours',
      level: 'Beginner',
      rating: 4.6,
      category: 'Soft Skills',
      url: '#',
    },
  ],
  'Experience mismatch': [
    {
      id: '8',
      title: 'Full Stack Development Bootcamp',
      description: 'Comprehensive course covering frontend, backend, databases, and deployment.',
      duration: '40 hours',
      level: 'Intermediate',
      rating: 4.9,
      category: 'Web Development',
      url: '#',
    },
    {
      id: '9',
      title: 'Project-Based Learning: Build 5 Real Apps',
      description: 'Gain practical experience by building real-world applications from scratch.',
      duration: '25 hours',
      level: 'Intermediate',
      rating: 4.7,
      category: 'Web Development',
      url: '#',
    },
  ],
  default: [
    {
      id: '10',
      title: 'Career Growth for Developers',
      description: 'Strategic guidance on advancing your tech career, building portfolio, and networking.',
      duration: '8 hours',
      level: 'Beginner',
      rating: 4.7,
      category: 'Career Development',
      url: '#',
    },
    {
      id: '11',
      title: 'Software Engineering Best Practices',
      description: 'Learn industry-standard practices for writing clean, maintainable, and scalable code.',
      duration: '12 hours',
      level: 'Intermediate',
      rating: 4.8,
      category: 'Software Engineering',
      url: '#',
    },
    {
      id: '12',
      title: 'Building a Developer Portfolio',
      description: 'Create an impressive portfolio that showcases your skills and attracts employers.',
      duration: '4 hours',
      level: 'Beginner',
      rating: 4.6,
      category: 'Career Development',
      url: '#',
    },
  ],
};

export default function LearningPlatform() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const rejectionReason = searchParams.get('reason') || 'default';
    setReason(rejectionReason);
    
    const recommendedCourses = COURSE_RECOMMENDATIONS[rejectionReason] || COURSE_RECOMMENDATIONS.default;
    setCourses(recommendedCourses);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Your Learning Journey Starts Here
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We've curated personalized course recommendations to help you improve your skills and succeed in your next opportunity.
          </p>
        </div>

        {/* Reason Badge */}
        {reason && reason !== 'default' && (
          <div className="mb-8 flex justify-center">
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 text-sm">
              Recommended based on: {reason}
            </Badge>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="p-6 flex flex-col hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Badge variant="outline" className="text-xs">
                  {course.category}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{course.rating}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">{course.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{course.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      course.level === 'Beginner'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : course.level === 'Intermediate'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-orange-100 dark:bg-orange-900/30'
                    }
                  >
                    {course.level}
                  </Badge>
                </div>

                <Button className="w-full" asChild>
                  <a href={course.url} target="_blank" rel="noopener noreferrer">
                    Start Learning
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Additional Resources */}
        <Card className="mt-12 p-6 bg-gradient-to-br from-primary/5 to-blue-500/5">
          <h2 className="text-xl font-semibold text-foreground mb-4">Need More Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium text-foreground mb-2">Career Coaching</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Get personalized guidance from industry experts.
              </p>
              <Button variant="outline" size="sm">Learn More</Button>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Mock Interviews</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Practice with real interview scenarios and feedback.
              </p>
              <Button variant="outline" size="sm">Schedule Now</Button>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Community Support</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Join our community of learners and mentors.
              </p>
              <Button variant="outline" size="sm">Join Community</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
