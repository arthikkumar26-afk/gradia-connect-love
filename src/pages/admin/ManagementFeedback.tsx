import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Loader2,
  Star,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Calendar,
  Target,
  MessageSquare,
  Award,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock
} from "lucide-react";

interface ReviewData {
  id: string;
  session_id: string;
  reviewer_email: string;
  reviewer_name: string | null;
  status: string;
  feedback_token_expires_at: string;
  candidate_name?: string;
  candidate_email?: string;
  demo_score?: number;
  demo_feedback?: string;
  demo_recording_url?: string;
}

export default function ManagementFeedback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    reviewer_name: "",
    overall_rating: 0,
    teaching_skills_rating: 0,
    communication_rating: 0,
    subject_knowledge_rating: 0,
    recommendation: "",
    feedback_text: "",
    strengths: "",
    areas_for_improvement: ""
  });

  useEffect(() => {
    if (token) {
      loadReviewData();
    } else {
      setError("Invalid feedback link. No token provided.");
      setIsLoading(false);
    }
  }, [token]);

  const loadReviewData = async () => {
    try {
      // Fetch review by token
      const { data: reviewData, error: reviewError } = await supabase
        .from('management_reviews')
        .select('*')
        .eq('feedback_token', token)
        .maybeSingle();

      if (reviewError) throw reviewError;

      if (!reviewData) {
        setError("Invalid feedback link. Review not found.");
        return;
      }

      // Check if already submitted
      if (reviewData.status === 'submitted') {
        setIsSubmitted(true);
        setReview(reviewData);
        return;
      }

      // Check if expired
      if (new Date(reviewData.feedback_token_expires_at) < new Date()) {
        setIsExpired(true);
        setReview(reviewData);
        return;
      }

      // Get session and candidate details
      const { data: sessionData } = await supabase
        .from('mock_interview_sessions')
        .select('candidate_id')
        .eq('id', reviewData.session_id)
        .single();

      if (sessionData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', sessionData.candidate_id)
          .single();

        // Get demo round results
        const { data: demoResult } = await supabase
          .from('mock_interview_stage_results')
          .select('ai_score, ai_feedback, recording_url')
          .eq('session_id', reviewData.session_id)
          .eq('stage_order', 4)
          .single();

        setReview({
          ...reviewData,
          candidate_name: profileData?.full_name,
          candidate_email: profileData?.email,
          demo_score: demoResult?.ai_score,
          demo_feedback: demoResult?.ai_feedback,
          demo_recording_url: demoResult?.recording_url
        });
      } else {
        setReview(reviewData);
      }

      setFormData(prev => ({
        ...prev,
        reviewer_name: reviewData.reviewer_name || ""
      }));

    } catch (error) {
      console.error('Error loading review data:', error);
      setError("Failed to load feedback form. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!review || !token) return;

    // Validate form
    if (!formData.overall_rating || !formData.recommendation) {
      toast.error("Please provide overall rating and recommendation");
      return;
    }

    setIsSubmitting(true);
    try {
      const strengthsArray = formData.strengths
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      const improvementsArray = formData.areas_for_improvement
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { error } = await supabase
        .from('management_reviews')
        .update({
          reviewer_name: formData.reviewer_name || review.reviewer_name,
          overall_rating: formData.overall_rating,
          teaching_skills_rating: formData.teaching_skills_rating || null,
          communication_rating: formData.communication_rating || null,
          subject_knowledge_rating: formData.subject_knowledge_rating || null,
          recommendation: formData.recommendation,
          feedback_text: formData.feedback_text || null,
          strengths: strengthsArray.length > 0 ? strengthsArray : null,
          areas_for_improvement: improvementsArray.length > 0 ? improvementsArray : null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('feedback_token', token);

      if (error) throw error;

      toast.success("Feedback submitted successfully!");
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingStars = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number; 
    onChange: (v: number) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
            <p className="text-muted-foreground">
              This feedback link has expired. Please contact the admin for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    // Auto close after 3 seconds
    setTimeout(() => {
      window.close();
    }, 3000);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your feedback has been submitted successfully. The candidate will be able to view your review.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              This window will close automatically in a few seconds...
            </p>
            <Button onClick={() => window.close()} variant="outline">
              Close Window Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Demo Round Feedback</h1>
          <p className="text-muted-foreground">
            Please provide your feedback for the candidate's teaching demonstration
          </p>
        </div>

        {/* Candidate Info */}
        {review && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{review.candidate_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{review.candidate_email || "N/A"}</span>
                </div>
              </div>
              
              {review.demo_score !== undefined && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AI Score</span>
                    <Badge className={review.demo_score >= 65 ? "bg-green-500" : "bg-orange-500"}>
                      {review.demo_score}%
                    </Badge>
                  </div>
                </div>
              )}

              {review.demo_recording_url && (
                <div className="pt-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(review.demo_recording_url, '_blank')}
                  >
                    View Demo Recording
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your Feedback
            </CardTitle>
            <CardDescription>
              Rate the candidate and provide constructive feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reviewer Name */}
            <div className="space-y-2">
              <Label htmlFor="reviewer_name">Your Name</Label>
              <Input
                id="reviewer_name"
                value={formData.reviewer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, reviewer_name: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>

            {/* Overall Rating */}
            <RatingStars
              label="Overall Rating *"
              value={formData.overall_rating}
              onChange={(v) => setFormData(prev => ({ ...prev, overall_rating: v }))}
            />

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RatingStars
                label="Teaching Skills"
                value={formData.teaching_skills_rating}
                onChange={(v) => setFormData(prev => ({ ...prev, teaching_skills_rating: v }))}
              />
              <RatingStars
                label="Communication"
                value={formData.communication_rating}
                onChange={(v) => setFormData(prev => ({ ...prev, communication_rating: v }))}
              />
              <RatingStars
                label="Subject Knowledge"
                value={formData.subject_knowledge_rating}
                onChange={(v) => setFormData(prev => ({ ...prev, subject_knowledge_rating: v }))}
              />
            </div>

            {/* Recommendation */}
            <div className="space-y-3">
              <Label>Recommendation *</Label>
              <RadioGroup
                value={formData.recommendation}
                onValueChange={(v) => setFormData(prev => ({ ...prev, recommendation: v }))}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="strongly_recommend" id="strongly_recommend" />
                  <Label htmlFor="strongly_recommend" className="cursor-pointer flex-1">
                    <span className="font-medium text-green-600">Strongly Recommend</span>
                    <p className="text-xs text-muted-foreground">Excellent candidate</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="recommend" id="recommend" />
                  <Label htmlFor="recommend" className="cursor-pointer flex-1">
                    <span className="font-medium text-blue-600">Recommend</span>
                    <p className="text-xs text-muted-foreground">Good fit for role</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="needs_improvement" id="needs_improvement" />
                  <Label htmlFor="needs_improvement" className="cursor-pointer flex-1">
                    <span className="font-medium text-orange-600">Needs Improvement</span>
                    <p className="text-xs text-muted-foreground">Potential with training</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="not_recommend" id="not_recommend" />
                  <Label htmlFor="not_recommend" className="cursor-pointer flex-1">
                    <span className="font-medium text-red-600">Do Not Recommend</span>
                    <p className="text-xs text-muted-foreground">Not suitable</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Detailed Feedback */}
            <div className="space-y-2">
              <Label htmlFor="feedback_text">Detailed Feedback</Label>
              <Textarea
                id="feedback_text"
                value={formData.feedback_text}
                onChange={(e) => setFormData(prev => ({ ...prev, feedback_text: e.target.value }))}
                placeholder="Provide detailed feedback about the candidate's performance..."
                rows={4}
              />
            </div>

            {/* Strengths */}
            <div className="space-y-2">
              <Label htmlFor="strengths" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Strengths
              </Label>
              <Textarea
                id="strengths"
                value={formData.strengths}
                onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                placeholder="List strengths (one per line)..."
                rows={3}
              />
            </div>

            {/* Areas for Improvement */}
            <div className="space-y-2">
              <Label htmlFor="areas_for_improvement" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                Areas for Improvement
              </Label>
              <Textarea
                id="areas_for_improvement"
                value={formData.areas_for_improvement}
                onChange={(e) => setFormData(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                placeholder="List areas for improvement (one per line)..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
