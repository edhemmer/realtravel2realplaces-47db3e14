import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdminUsers';
import { useAdminSupportTickets, useUpdateTicketStatus, SupportTicket } from '@/hooks/useAdminSupportTickets';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { MessageSquare, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type TicketStatus = 'open' | 'in_progress' | 'closed';
type PlanFilter = 'all' | 'free' | 'pro';
type StatusFilter = 'all' | TicketStatus;

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusIndicatorColors: Record<TicketStatus, string> = {
  open: 'bg-muted-foreground/50',
  in_progress: 'bg-blue-500',
  closed: 'bg-green-500',
};

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};

const planColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary',
};

export default function AdminSupportTickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: tickets = [], isLoading: ticketsLoading } = useAdminSupportTickets();
  const updateStatusMutation = useUpdateTicketStatus();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Get filters from URL params (persists across navigation)
  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';
  const planFilter = (searchParams.get('plan') as PlanFilter) || 'all';

  // Update URL params when filters change
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Filter tickets client-side
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPlan = planFilter === 'all' || (ticket.user_plan || 'free') === planFilter;
      return matchesStatus && matchesPlan;
    });
  }, [tickets, statusFilter, planFilter]);

  // Count open tickets for empty state
  const openTicketsCount = useMemo(() => {
    return tickets.filter(t => t.status === 'open').length;
  }, [tickets]);

  // Save scroll position before opening dialog
  const handleTicketClick = (ticket: SupportTicket) => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = window.scrollY;
    }
    setSelectedTicket(ticket);
  };

  // Restore scroll position after closing dialog
  const handleDialogClose = () => {
    setSelectedTicket(null);
    // Restore scroll position on next tick
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  };

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else if (isAdmin === false) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ ticketId, status: newStatus });
      toast.success(`Ticket status updated to ${statusLabels[newStatus]}`);
      
      // Update selected ticket if it's the one being modified
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  // Show loading while checking auth/admin status
  if (authLoading || adminLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Don't render if not admin (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div ref={scrollContainerRef} className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Back to Plans link */}
        <div className="mb-4">
          <Link 
            to="/admin/plans" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plan Management
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Admin: Support Tickets</CardTitle>
                <CardDescription>
                  View and manage user support requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-70" />
                <p className="font-medium">No open support tickets</p>
                <p className="text-sm mt-1">You're all caught up.</p>
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select
                      value={statusFilter}
                      onValueChange={(value: StatusFilter) => updateFilter('status', value)}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Plan:</span>
                    <Select
                      value={planFilter}
                      onValueChange={(value: PlanFilter) => updateFilter('plan', value)}
                    >
                      <SelectTrigger className="w-24 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(statusFilter !== 'all' || planFilter !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setSearchParams({}, { replace: true })}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>

                {filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {statusFilter === 'open' && openTicketsCount === 0 ? (
                      <>
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-70" />
                        <p className="font-medium">No open support tickets</p>
                        <p className="text-sm mt-1">You're all caught up.</p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No tickets match your filters</p>
                      </>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[3px] p-0"></TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>User Email</TableHead>
                        <TableHead>Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => {
                        const isOpen = ticket.status === 'open';
                        return (
                          <TableRow 
                            key={ticket.id}
                            className={`cursor-pointer hover:bg-muted/50 ${isOpen ? 'bg-muted/20' : ''}`}
                            onClick={() => handleTicketClick(ticket)}
                          >
                            {/* Status indicator bar */}
                            <TableCell className="p-0 w-[3px]">
                              <div 
                                className={`w-[3px] h-full min-h-[48px] ${statusIndicatorColors[ticket.status as TicketStatus]}`}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {format(parseISO(ticket.created_at), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={statusColors[ticket.status as TicketStatus]}
                              >
                                {statusLabels[ticket.status as TicketStatus] || ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={`max-w-[200px] truncate ${isOpen ? 'font-semibold' : 'font-medium'}`}>
                              {ticket.subject}
                            </TableCell>
                            <TableCell className="text-sm">
                              {ticket.email}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={planColors[(ticket.user_plan || 'free')] || planColors.free}
                              >
                                {ticket.user_plan || 'free'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Support Ticket</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Subject
                </label>
                <p className="mt-1 font-medium">{selectedTicket.subject}</p>
              </div>

              <Separator />

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Message
                </label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                  {selectedTicket.message}
                </p>
              </div>

              <Separator />

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    User Email
                  </label>
                  <p className="mt-1 text-sm">{selectedTicket.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Created
                  </label>
                  <p className="mt-1 text-sm">
                    {format(parseISO(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Last Updated
                  </label>
                  <p className="mt-1 text-sm">
                    {format(parseISO(selectedTicket.updated_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </label>
                  <div className="mt-1">
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value: TicketStatus) => 
                        handleStatusChange(selectedTicket.id, value)
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Context Section */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Context
                </label>
                <div className="bg-muted/30 rounded-md p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">App Version</span>
                    <span>{selectedTicket.app_version ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User Plan</span>
                    <Badge variant="secondary" className={planColors[selectedTicket.user_plan || 'free'] || ''}>
                      {selectedTicket.user_plan || 'free'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Page Path</span>
                    <span className="font-mono text-xs">{selectedTicket.page_path ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Trip ID</span>
                    {selectedTicket.trip_id ? (
                      <Link 
                        to={`/trip/${selectedTicket.trip_id}`} 
                        className="text-primary hover:underline font-mono text-xs"
                        onClick={() => setSelectedTicket(null)}
                      >
                        {selectedTicket.trip_id.slice(0, 8)}...
                      </Link>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close button */}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={handleDialogClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
