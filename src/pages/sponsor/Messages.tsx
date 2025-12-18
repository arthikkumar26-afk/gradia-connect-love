import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Bell,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  User,
} from "lucide-react";
import SponsorDashboardLayout from "./SponsorDashboard";
import { toast } from "sonner";

// Mock data
const mockMessages = [
  {
    id: "1",
    sender: "Event Manager - Rahul",
    message: "Your stall has been confirmed for the Hyderabad Job Mela. Please upload your branding assets by Feb 10.",
    timestamp: "2024-01-15T10:30:00",
    read: false,
  },
  {
    id: "2",
    sender: "Gradia Support",
    message: "Welcome to Gradia! Your sponsor account has been activated. Let us know if you need any help.",
    timestamp: "2024-01-14T15:20:00",
    read: true,
  },
  {
    id: "3",
    sender: "Event Manager - Priya",
    message: "Thank you for participating in the Bangalore Hiring Mela. Here's your event summary report.",
    timestamp: "2024-01-10T09:00:00",
    read: true,
  },
];

const mockAnnouncements = [
  {
    id: "1",
    title: "New Job Mela Announced - Chennai",
    content: "We're excited to announce a new tech hiring mela in Chennai on March 25, 2024. Early bird pricing available!",
    date: "2024-01-16",
    priority: "high",
  },
  {
    id: "2",
    title: "Updated Branding Guidelines",
    content: "Please review our updated branding guidelines for stall setup. New banner sizes are now standard.",
    date: "2024-01-14",
    priority: "medium",
  },
  {
    id: "3",
    title: "Holiday Schedule",
    content: "Our support team will have limited availability during Republic Day (Jan 26). Emergency support available via email.",
    date: "2024-01-12",
    priority: "low",
  },
];

const mockTickets = [
  {
    id: "TKT-001",
    subject: "Invoice discrepancy for Hyderabad Mela",
    status: "open",
    priority: "high",
    created: "2024-01-15",
    lastUpdate: "2024-01-16",
  },
  {
    id: "TKT-002",
    subject: "Need additional power outlet at stall",
    status: "in_progress",
    priority: "medium",
    created: "2024-01-14",
    lastUpdate: "2024-01-15",
  },
  {
    id: "TKT-003",
    subject: "Logo not displaying correctly on website",
    status: "resolved",
    priority: "low",
    created: "2024-01-10",
    lastUpdate: "2024-01-12",
  },
];

export default function Messages() {
  const [newMessage, setNewMessage] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      open: { label: "Open", className: "bg-blue-100 text-blue-800", icon: <AlertCircle className="h-3 w-3" /> },
      in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
      resolved: { label: "Resolved", className: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
    };
    const statusConfig = config[status] || config.open;
    return (
      <Badge className={`${statusConfig.className} flex items-center gap-1`}>
        {statusConfig.icon}
        {statusConfig.label}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "border-l-red-500",
      medium: "border-l-yellow-500",
      low: "border-l-green-500",
    };
    return colors[priority] || colors.low;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    toast.success("Message sent!");
    setNewMessage("");
  };

  const handleCreateTicket = () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success("Support ticket created!");
    setTicketSubject("");
    setTicketDescription("");
  };

  const unreadCount = mockMessages.filter(m => !m.read).length;

  return (
    <SponsorDashboardLayout activeTab="messages">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Messages & Support</h1>
          <p className="text-muted-foreground mt-1">Communicate with Gradia and get help</p>
        </div>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Support Tickets
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Message List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Inbox</CardTitle>
                  <CardDescription>Messages from Gradia team</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {mockMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                            !message.read ? "bg-primary/5 border-primary/20" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium truncate">{message.sender}</p>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(message.timestamp).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {message.message}
                              </p>
                              {!message.read && (
                                <Badge variant="secondary" className="mt-2 text-xs">New</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Quick Reply */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Message</CardTitle>
                  <CardDescription>Send a message to your event manager</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={6}
                  />
                  <Button className="w-full" onClick={handleSendMessage}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="mt-6">
            <div className="space-y-4">
              {mockAnnouncements.map((announcement) => (
                <Card key={announcement.id} className={`border-l-4 ${getPriorityColor(announcement.priority)}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        <CardDescription>
                          {new Date(announcement.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="capitalize">{announcement.priority}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{announcement.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="support" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Ticket List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Your Tickets</CardTitle>
                  <CardDescription>Track your support requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
                              {getStatusBadge(ticket.status)}
                            </div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              Created: {ticket.created} • Last update: {ticket.lastUpdate}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Create Ticket */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Ticket</CardTitle>
                  <CardDescription>Submit a new support request</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      placeholder="Brief description of issue"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Provide details about your issue..."
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreateTicket}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SponsorDashboardLayout>
  );
}
