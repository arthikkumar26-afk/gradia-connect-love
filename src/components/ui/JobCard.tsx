import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Building2, 
  Users, 
  Bookmark, 
  BookmarkCheck,
  ExternalLink 
} from "lucide-react";
import { useState } from "react";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship" | "fresher" | "experienced";
  category: "software" | "education";
  salary?: string;
  experience: string;
  posted: string;
  description: string;
  skills: string[];
  applicants?: number;
  featured?: boolean;
}

const JobCard = ({
  id,
  title,
  company,
  location,
  type,
  category,
  salary,
  experience,
  posted,
  description,
  skills,
  applicants,
  featured = false
}: JobCardProps) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSaved(!isSaved);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "full-time": return "bg-accent text-accent-foreground";
      case "part-time": return "bg-secondary text-secondary-foreground";
      case "contract": return "bg-muted text-muted-foreground";
      case "internship": return "bg-primary text-primary-foreground";
      case "fresher": return "bg-success text-success-foreground";
      case "experienced": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    return category === "software" ? "💻" : "🎓";
  };

  return (
    <Card className={`group hover:shadow-medium transition-all duration-200 hover:-translate-y-1 ${featured ? 'ring-2 ring-accent shadow-glow' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getCategoryIcon(category)}</span>
              {featured && (
                <Badge variant="secondary" className="text-xs">
                  Featured
                </Badge>
              )}
              <Badge className={getTypeColor(type)}>
                {type === "fresher" ? "Fresher" : 
                 type === "experienced" ? "Experienced" :
                 type.replace("-", " ")}
              </Badge>
            </div>
            <CardTitle className="text-lg group-hover:text-accent transition-colors">
              <Link to={`/job/${id}`} className="hover:underline">
                {title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Building2 className="h-4 w-4" />
              {company}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="text-muted-foreground hover:text-accent"
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Details */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {location}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {experience}
          </div>
          {salary && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {salary}
            </div>
          )}
          {applicants && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {applicants} applicants
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {skills.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{skills.length - 4} more
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Posted {posted}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/job/${id}`}>
                View Details
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to={`/job/${id}/apply`}>
                Apply Now
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCard;