import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PlacementComment } from '@/contexts/EmployerContext';
import { MessageSquare, Send } from 'lucide-react';

interface CommentSectionProps {
  comments: PlacementComment[];
  currentStage: string;
  onAddComment: (text: string) => void;
  userRole: 'employer' | 'candidate';
}

export default function CommentSection({
  comments,
  currentStage,
  onAddComment,
  userRole,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setLoading(false);
    }
  };

  const stageComments = comments.filter((c) => c.stage === currentStage);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">Comments ({stageComments.length})</h4>
      </div>

      {/* Comment List */}
      {stageComments.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {stageComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg ${
                comment.authorRole === 'employer'
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{comment.author}</span>
                  <Badge
                    variant="outline"
                    className={
                      comment.authorRole === 'employer'
                        ? 'text-xs bg-blue-100 dark:bg-blue-900/30'
                        : 'text-xs bg-green-100 dark:bg-green-900/30'
                    }
                  >
                    {comment.authorRole === 'employer' ? 'Employer' : 'Candidate'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
              </div>
              <p className="text-sm text-foreground">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment (optional)..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || loading}
          >
            <Send className="w-3 h-3 mr-2" />
            {loading ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
