import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  IndianRupee,
  Calendar,
  Receipt,
} from "lucide-react";
import SponsorDashboardLayout from "./SponsorDashboard";
import { toast } from "sonner";

// Mock data
const mockInvoices = [
  {
    id: "INV-2024-001",
    description: "Gold Sponsorship - Hyderabad Job Mela 2024",
    amount: 150000,
    date: "2024-01-15",
    dueDate: "2024-02-15",
    status: "paid",
  },
  {
    id: "INV-2024-002",
    description: "Stall Booking - Bangalore Startup Mela",
    amount: 50000,
    date: "2024-01-20",
    dueDate: "2024-02-20",
    status: "pending",
  },
  {
    id: "INV-2023-045",
    description: "Platinum Sponsorship - Delhi NCR Job Fair",
    amount: 250000,
    date: "2023-12-01",
    dueDate: "2024-01-01",
    status: "paid",
  },
  {
    id: "INV-2023-044",
    description: "Silver Sponsorship - Mumbai Hiring Mela",
    amount: 75000,
    date: "2023-11-15",
    dueDate: "2023-12-15",
    status: "paid",
  },
];

const mockSubscription = {
  plan: "Gold Partner",
  status: "active",
  amount: 500000,
  billingCycle: "annual",
  nextBilling: "2024-12-01",
  features: [
    "Unlimited job mela participation",
    "Priority stall selection",
    "Featured logo placement",
    "Access to candidate database",
    "Dedicated account manager",
  ],
};

export default function Billing() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      paid: { label: "Paid", className: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
      overdue: { label: "Overdue", className: "bg-red-100 text-red-800", icon: <AlertCircle className="h-3 w-3" /> },
    };
    const statusConfig = config[status] || config.pending;
    return (
      <Badge className={`${statusConfig.className} flex items-center gap-1`}>
        {statusConfig.icon}
        {statusConfig.label}
      </Badge>
    );
  };

  const handleDownload = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`Downloading invoice ${invoiceId}...`);
    setDownloadingId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalPaid = mockInvoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPending = mockInvoices
    .filter(inv => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <SponsorDashboardLayout activeTab="billing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Billing & Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage payments and download invoices</p>
          </div>
          <Button variant="outline">
            <Receipt className="mr-2 h-4 w-4" />
            Download All Invoices
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{mockInvoices.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Plan */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan: {mockSubscription.plan}
                </CardTitle>
                <CardDescription className="mt-1">
                  Your subscription renews on {new Date(mockSubscription.nextBilling).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(mockSubscription.amount)}</p>
                <p className="text-sm text-muted-foreground">per year</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Plan Benefits:</p>
                <ul className="space-y-1">
                  {mockSubscription.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
              <Button variant="outline">Manage Subscription</Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>View and download your past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.id}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{invoice.description}</TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === "pending" && (
                            <Button size="sm" onClick={() => toast.info("Opening payment gateway...")}>
                              Pay Now
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(invoice.id)}
                            disabled={downloadingId === invoice.id}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your payment options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Bank Transfer (NEFT/RTGS)</p>
                  <p className="text-sm text-muted-foreground">Primary payment method</p>
                </div>
              </div>
              <Badge variant="outline">Default</Badge>
            </div>
            <Button variant="outline" className="mt-4">
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>
    </SponsorDashboardLayout>
  );
}
