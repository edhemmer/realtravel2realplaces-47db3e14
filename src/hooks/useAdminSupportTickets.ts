import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportTicket {
  id: string;
  user_id: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  app_version: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch all support tickets (admin only)
 * Uses edge function with service role to bypass RLS
 */
export function useAdminSupportTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['adminSupportTickets'],
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await supabase.functions.invoke('admin-get-support-tickets', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.error) {
        console.error('Error fetching support tickets:', response.error);
        throw new Error(response.error.message || 'Failed to fetch support tickets');
      }

      return response.data?.tickets || [];
    },
    enabled: !!user,
  });
}

/**
 * Hook to update a support ticket's status (admin only)
 */
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: 'open' | 'in_progress' | 'closed' }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await supabase.functions.invoke('admin-update-ticket-status', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: { ticketId, status },
      });

      if (response.error) {
        console.error('Error updating ticket status:', response.error);
        throw new Error(response.error.message || 'Failed to update ticket status');
      }

      return response.data?.ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
    },
  });
}
