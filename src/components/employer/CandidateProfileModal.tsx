import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Candidate } from '@/contexts/EmployerContext';
import { Mail, Phone, FileText, Briefcase } from 'lucide-react';

interface CandidateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onShortlist: () => void;
  onReject: () => void;
}

export default function CandidateProfileModal({
  isOpen,
  onClose,
  candidate,
  onShortlist,
  onReject,
}: CandidateProfileModalProps) {
  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="pl-6 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{candidate.email}</span>
              </p>
              {candidate.phone && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium">{candidate.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Experience
            </h3>
            <div className="pl-6">
              <p className="text-sm font-medium">{candidate.experience}</p>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Skills</h3>
            <div className="pl-6 flex flex-wrap gap-2">
              {candidate.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* AI Score */}
          {candidate.aiScore && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">AI Assessment Score</h3>
              <div className="pl-6">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-primary">{candidate.aiScore}/100</div>
                  <div className="flex-1">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${candidate.aiScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {candidate.summary && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Summary</h3>
              <div className="pl-6">
                <p className="text-sm text-muted-foreground">{candidate.summary}</p>
              </div>
            </div>
          )}

          {/* Resume Link */}
          {candidate.resumeUrl && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Resume</h3>
              <div className="pl-6">
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-2" />
                    View Resume
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Status</h3>
            <div className="pl-6">
              <Badge
                className={
                  candidate.status === 'Available'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : candidate.status === 'In Process'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                }
              >
                {candidate.status}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="destructive" onClick={onReject}>
            Reject Profile
          </Button>
          <Button onClick={onShortlist}>
            Shortlist Candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
