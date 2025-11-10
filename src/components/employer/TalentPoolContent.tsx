import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, UserPlus, Mail, Phone, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  location: string | null;
  experience_level: string | null;
  preferred_role: string | null;
  profile_picture: string | null;
  resume_url: string | null;
}

export default function TalentPoolContent() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'employer') {
      loadCandidates();
    }
  }, [profile]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "candidate");

      if (error) throw error;
      setCandidates(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.location && candidate.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No candidates found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {candidate.profile_picture ? (
                        <img
                          src={candidate.profile_picture}
                          alt={candidate.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {candidate.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{candidate.full_name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.preferred_role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">{candidate.email}</p>
                      {candidate.mobile && (
                        <p className="text-sm text-muted-foreground">{candidate.mobile}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {candidate.experience_level ? (
                      <Badge variant="secondary">{candidate.experience_level}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {candidate.location || 'Not specified'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${candidate.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                      {candidate.mobile && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`tel:${candidate.mobile}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {candidate.resume_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Resume
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
