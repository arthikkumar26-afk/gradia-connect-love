import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllDemoRequests, updateDemoRequestStatus, DemoRequest } from '@/utils/pricingApi';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock, PhoneCall, Video } from 'lucide-react';
import { format } from 'date-fns';

export default function DemoRequestsAdmin() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'scheduled'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    const allRequests = getAllDemoRequests();
    setRequests(allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleStatusUpdate = async (id: string, status: DemoRequest['status']) => {
    const result = await updateDemoRequestStatus(id, status);
    if (result.success) {
      toast({
        title: 'Status updated',
        description: `Demo request marked as ${status}`,
      });
      loadRequests();
    }
  };

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const getStatusBadge = (status: DemoRequest['status']) => {
    const variants = {
      new: { variant: 'default' as const, icon: Clock },
      contacted: { variant: 'secondary' as const, icon: PhoneCall },
      scheduled: { variant: 'outline' as const, icon: Video },
      completed: { variant: 'outline' as const, icon: CheckCircle2 },
    };
    const config = variants[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Demo Requests</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage and track all demo requests
                </p>
              </div>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No demo requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-sm">
                          {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{request.fullName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.companyName}</p>
                            <p className="text-xs text-muted-foreground">{request.jobTitle}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{request.businessEmail}</TableCell>
                        <TableCell className="text-sm">{request.phoneNumber}</TableCell>
                        <TableCell className="text-sm">
                          {request.preferredDemoDate ? (
                            <div>
                              <p>{format(new Date(request.preferredDemoDate), 'MMM dd, yyyy')}</p>
                              {request.preferredDemoTime && (
                                <p className="text-xs text-muted-foreground">{request.preferredDemoTime}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{request.preferredDemoMode}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <Select
                            value={request.status}
                            onValueChange={(value: DemoRequest['status']) =>
                              handleStatusUpdate(request.id, value)
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredRequests.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredRequests.length} of {requests.length} requests
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
