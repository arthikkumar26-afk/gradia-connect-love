import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Briefcase, FileText, MessageSquare, Upload } from "lucide-react";
import { AddMemberModal } from "./AddMemberModal";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  position: string | null;
  department: string | null;
  work_status: string;
  profile_picture: string | null;
  joined_date: string;
}

interface TeamPost {
  id: string;
  team_member_id: string;
  post_type: string;
  title: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
}

export const TeamsContent = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamPosts, setTeamPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadTeamData();
    }
  }, [user]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Load team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("employer_id", user?.id)
        .order("joined_date", { ascending: false });

      if (membersError) throw membersError;

      // Load team posts
      const { data: posts, error: postsError } = await supabase
        .from("team_posts")
        .select("*")
        .eq("employer_id", user?.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      setTeamMembers(members || []);
      setTeamPosts(posts || []);
    } catch (error) {
      console.error("Error loading team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "on_leave":
        return "bg-gray-500";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case "upload":
        return <Upload className="h-4 w-4" />;
      case "announcement":
        return <MessageSquare className="h-4 w-4" />;
      case "task":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getMemberPosts = (memberId: string) => {
    return teamPosts.filter((post) => post.team_member_id === memberId);
  };

  const getMemberName = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    return member?.full_name || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading team data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your team and track their activities
          </p>
        </div>
        <Button onClick={() => setIsAddMemberOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Team Members Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => {
          const memberPosts = getMemberPosts(member.id);
          return (
            <Card key={member.id} className="p-6 space-y-4">
              {/* Member Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.profile_picture || undefined} />
                      <AvatarFallback>
                        {member.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(
                        member.work_status
                      )}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {member.position || "Team Member"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {member.work_status.replace("_", " ")}
                </Badge>
              </div>

              {/* Member Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{member.email}</span>
                </div>
                {member.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{member.department}</span>
                  </div>
                )}
              </div>

              {/* Activity Summary */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recent Activity</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelectedMember(
                        selectedMember === member.id ? null : member.id
                      )
                    }
                  >
                    {selectedMember === member.id ? "Hide" : "View"}
                  </Button>
                </div>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {memberPosts.length} posts
                  </span>
                  <span className="text-muted-foreground">
                    {memberPosts.filter((p) => p.post_type === "upload").length}{" "}
                    uploads
                  </span>
                </div>
              </div>

              {/* Member Posts */}
              {selectedMember === member.id && memberPosts.length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-semibold text-sm">Recent Posts</h4>
                  {memberPosts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        {getPostIcon(post.post_type)}
                        <span className="font-medium text-sm">{post.title}</span>
                      </div>
                      {post.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {teamMembers.length === 0 && (
        <Card className="p-12 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground mb-4">
            Start building your team by adding your first member
          </p>
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add First Member
          </Button>
        </Card>
      )}

      {/* Recent Activity Feed */}
      {teamPosts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Team Activity</h3>
          <div className="space-y-4">
            {teamPosts.slice(0, 10).map((post) => (
              <div key={post.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                <div className="mt-1">{getPostIcon(post.post_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {getMemberName(post.team_member_id)}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {post.post_type}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{post.title}</p>
                  {post.content && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {post.content}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AddMemberModal
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        onMemberAdded={loadTeamData}
      />
    </div>
  );
};
