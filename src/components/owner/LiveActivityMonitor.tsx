import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  User, 
  Building2, 
  Shield, 
  FileText, 
  Briefcase,
  UserPlus,
  LogIn,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  GitBranch,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityEvent {
  id: string;
  type: 'candidate' | 'employer' | 'admin' | 'system';
  action: string;
  description: string;
  user?: string;
  timestamp: Date;
  icon: React.ElementType;
  color: string;
}

export default function LiveActivityMonitor() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'candidate' | 'employer' | 'admin'>('all');
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalEmployers: 0,
    totalJobs: 0,
    activeInterviews: 0,
    todayApplications: 0,
    onlineUsers: 0
  });

  // Load initial stats
  useEffect(() => {
    loadStats();
    loadRecentActivity();
  }, []);

  const loadStats = async () => {
    try {
      // Get counts from database
      const [candidatesRes, employersRes, jobsRes, interviewsRes, todayAppsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'candidate'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'employer'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('interview_candidates').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('interview_candidates').select('id', { count: 'exact', head: true })
          .gte('applied_at', new Date().toISOString().split('T')[0])
      ]);

      setStats({
        totalCandidates: candidatesRes.count || 0,
        totalEmployers: employersRes.count || 0,
        totalJobs: jobsRes.count || 0,
        activeInterviews: interviewsRes.count || 0,
        todayApplications: todayAppsRes.count || 0,
        onlineUsers: Math.floor(Math.random() * 50) + 10 // Simulated for now
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Load recent interview candidates (applications)
      const { data: recentApps } = await supabase
        .from('interview_candidates')
        .select(`
          id,
          applied_at,
          ai_score,
          candidate:profiles!interview_candidates_candidate_id_fkey (full_name),
          job:jobs!interview_candidates_job_id_fkey (job_title, employer_id)
        `)
        .order('applied_at', { ascending: false })
        .limit(10);

      // Load recent jobs
      const { data: recentJobs } = await supabase
        .from('jobs')
        .select('id, job_title, created_at, employer_id')
        .order('created_at', { ascending: false })
        .limit(5);

      // Load recent interview events
      const { data: recentEvents } = await supabase
        .from('interview_events')
        .select(`
          id,
          status,
          created_at,
          completed_at,
          stage:interview_stages (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const newActivities: ActivityEvent[] = [];

      // Map applications to activities
      recentApps?.forEach(app => {
        newActivities.push({
          id: `app-${app.id}`,
          type: 'candidate',
          action: 'Applied',
          description: `${app.candidate?.full_name || 'A candidate'} applied for ${app.job?.job_title || 'a position'}`,
          user: app.candidate?.full_name,
          timestamp: new Date(app.applied_at),
          icon: FileText,
          color: 'text-blue-500'
        });
      });

      // Map jobs to activities
      recentJobs?.forEach(job => {
        newActivities.push({
          id: `job-${job.id}`,
          type: 'employer',
          action: 'Posted Job',
          description: `New job posted: ${job.job_title}`,
          timestamp: new Date(job.created_at),
          icon: Briefcase,
          color: 'text-green-500'
        });
      });

      // Map interview events to activities
      recentEvents?.forEach(event => {
        const isCompleted = event.status === 'completed';
        newActivities.push({
          id: `event-${event.id}`,
          type: 'candidate',
          action: isCompleted ? 'Completed Stage' : 'Interview Update',
          description: `${event.stage?.name || 'Interview stage'} ${isCompleted ? 'completed' : 'updated'}`,
          timestamp: new Date(event.completed_at || event.created_at),
          icon: isCompleted ? CheckCircle : Clock,
          color: isCompleted ? 'text-green-500' : 'text-yellow-500'
        });
      });

      // Sort by timestamp
      newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(newActivities.slice(0, 20));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    console.log('[Owner Monitor] Setting up real-time subscriptions...');

    const channel = supabase
      .channel('owner-activity-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interview_candidates' },
        async (payload) => {
          console.log('[Owner Monitor] New application:', payload);
          const newCandidate = payload.new as any;
          
          // Fetch candidate and job details
          const [candidateRes, jobRes] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', newCandidate.candidate_id).single(),
            supabase.from('jobs').select('job_title').eq('id', newCandidate.job_id).single()
          ]);

          const activity: ActivityEvent = {
            id: `app-${newCandidate.id}-${Date.now()}`,
            type: 'candidate',
            action: 'Applied',
            description: `${candidateRes.data?.full_name || 'A candidate'} applied for ${jobRes.data?.job_title || 'a position'}`,
            user: candidateRes.data?.full_name,
            timestamp: new Date(),
            icon: FileText,
            color: 'text-blue-500'
          };

          setActivities(prev => [activity, ...prev].slice(0, 20));
          setStats(prev => ({ ...prev, todayApplications: prev.todayApplications + 1 }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        async (payload) => {
          console.log('[Owner Monitor] New job posted:', payload);
          const newJob = payload.new as any;

          const activity: ActivityEvent = {
            id: `job-${newJob.id}-${Date.now()}`,
            type: 'employer',
            action: 'Posted Job',
            description: `New job posted: ${newJob.job_title}`,
            timestamp: new Date(),
            icon: Briefcase,
            color: 'text-green-500'
          };

          setActivities(prev => [activity, ...prev].slice(0, 20));
          setStats(prev => ({ ...prev, totalJobs: prev.totalJobs + 1 }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        async (payload) => {
          console.log('[Owner Monitor] New profile:', payload);
          const newProfile = payload.new as any;

          const activity: ActivityEvent = {
            id: `profile-${newProfile.id}-${Date.now()}`,
            type: newProfile.role === 'employer' ? 'employer' : 'candidate',
            action: 'Registered',
            description: `${newProfile.full_name || 'New user'} registered as ${newProfile.role}`,
            user: newProfile.full_name,
            timestamp: new Date(),
            icon: UserPlus,
            color: newProfile.role === 'employer' ? 'text-purple-500' : 'text-blue-500'
          };

          setActivities(prev => [activity, ...prev].slice(0, 20));
          
          if (newProfile.role === 'candidate') {
            setStats(prev => ({ ...prev, totalCandidates: prev.totalCandidates + 1 }));
          } else if (newProfile.role === 'employer') {
            setStats(prev => ({ ...prev, totalEmployers: prev.totalEmployers + 1 }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'interview_candidates' },
        async (payload) => {
          console.log('[Owner Monitor] Interview candidate updated:', payload);
          const updated = payload.new as any;
          const old = payload.old as any;

          // Check if stage changed
          if (updated.current_stage_id !== old.current_stage_id) {
            const { data: stage } = await supabase
              .from('interview_stages')
              .select('name')
              .eq('id', updated.current_stage_id)
              .single();

            const activity: ActivityEvent = {
              id: `stage-${updated.id}-${Date.now()}`,
              type: 'candidate',
              action: 'Stage Changed',
              description: `Candidate moved to ${stage?.name || 'next stage'}`,
              timestamp: new Date(),
              icon: GitBranch,
              color: 'text-cyan-500'
            };

            setActivities(prev => [activity, ...prev].slice(0, 20));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interview_events' },
        async (payload) => {
          console.log('[Owner Monitor] Interview event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const event = payload.new as any;
            const { data: stage } = await supabase
              .from('interview_stages')
              .select('name')
              .eq('id', event.stage_id)
              .single();

            const isCompleted = event.status === 'completed';
            const activity: ActivityEvent = {
              id: `event-${event.id}-${Date.now()}`,
              type: 'candidate',
              action: isCompleted ? 'Interview Completed' : 'Interview Started',
              description: `${stage?.name || 'Interview'} ${isCompleted ? 'completed' : 'in progress'}`,
              timestamp: new Date(),
              icon: isCompleted ? CheckCircle : Clock,
              color: isCompleted ? 'text-green-500' : 'text-yellow-500'
            };

            setActivities(prev => [activity, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Owner Monitor] Subscription status:', status);
      });

    return () => {
      console.log('[Owner Monitor] Removing channel');
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'candidate': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'employer': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'admin': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <User className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalCandidates}</p>
              <p className="text-xs text-muted-foreground">Candidates</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Building2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalEmployers}</p>
              <p className="text-xs text-muted-foreground">Employers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Briefcase className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
              <p className="text-xs text-muted-foreground">Active Jobs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <GitBranch className="h-4 w-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeInterviews}</p>
              <p className="text-xs text-muted-foreground">In Pipeline</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.todayApplications}</p>
              <p className="text-xs text-muted-foreground">Today's Apps</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.onlineUsers}</p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground absolute bottom-2">Online</p>
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Live Activity Feed
              <span className="relative flex h-2 w-2 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
                <TabsTrigger value="candidate" className="text-xs px-3 h-7">Candidates</TabsTrigger>
                <TabsTrigger value="employer" className="text-xs px-3 h-7">Employers</TabsTrigger>
                <TabsTrigger value="admin" className="text-xs px-3 h-7">Admin</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p>No recent activity</p>
                <p className="text-sm">Activities will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in"
                    >
                      <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('500', '500/10')}`}>
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[10px] ${getTypeColor(activity.type)}`}>
                            {activity.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
