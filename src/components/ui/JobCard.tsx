import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  Building2, 
  Bookmark, 
  BookmarkCheck
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
  experience,
  skills,
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
    <Card className={`group hover:shadow-medium transition-all duration-200 hover:-translate-y-1 h-full flex flex-col ${featured ? 'ring-2 ring-accent shadow-glow' : ''}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-sm">{getCategoryIcon(category)}</span>
              {featured && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Featured
                </Badge>
              )}
              <Badge className={`${getTypeColor(type)} text-[10px] px-1.5 py-0`}>
                {type === "fresher" ? "Fresher" : 
                 type === "experienced" ? "Experienced" :
                 type.replace("-", " ")}
              </Badge>
            </div>
            <CardTitle className="text-sm font-semibold group-hover:text-accent transition-colors line-clamp-2 leading-tight">
              <Link to={`/jobs-results?job=${id}`} className="hover:underline">
                {title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1 text-xs">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{company}</span>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="text-muted-foreground hover:text-accent h-6 w-6 p-0"
          >
            {isSaved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 flex-1 flex flex-col gap-2">
        {/* Job Details */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{experience}</span>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 flex-1">
          {skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              +{skills.length - 3}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-auto">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs px-2" asChild>
            <Link to={`/jobs-results?job=${id}`}>
              Details
            </Link>
          </Button>
          <Button variant="default" size="sm" className="flex-1 h-7 text-xs px-2" asChild>
            <Link to={`/jobs-results?job=${id}&apply=true`}>
              Apply
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCard;