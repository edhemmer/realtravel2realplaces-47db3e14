import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdminUsers';
import { useAccess } from '@/hooks/useAccess';
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, MessageCircleQuestion, ShieldCheck, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactSupportDialog } from '@/components/support/ContactSupportDialog';
import { BrandHeader } from '@/components/BrandHeader';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { FloatingHelpButton } from '@/components/FloatingHelpButton';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { canAccessBusinessFeatures } = useAccess();
  const navigate = useNavigate();
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);

  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header — refined depth with layered shadow */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 shadow-header">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <BrandHeader variant="app">

          {user && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <NetworkStatusIndicator />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl shadow-xl border-border/50 p-1.5">
                <div className="px-3 py-2 text-sm text-muted-foreground font-medium">
                  {user.email}
                </div>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer rounded-xl h-10 gap-3 px-3 font-medium">
                  <Settings className="w-4 h-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/help')} className="cursor-pointer rounded-xl h-10 gap-3 px-3 font-medium">
                  <MessageCircleQuestion className="w-4 h-4" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSupportDialogOpen(true)} className="cursor-pointer rounded-xl h-10 gap-3 px-3 font-medium">
                  <MessageCircleQuestion className="w-4 h-4" />
                  Contact Support
                </DropdownMenuItem>
                {canAccessBusinessFeatures && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem onClick={() => navigate('/reports')} className="cursor-pointer rounded-xl h-10 gap-3 px-3 font-medium">
                      <BarChart3 className="w-4 h-4" />
                      Reports
                    </DropdownMenuItem>
                  </>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer rounded-xl h-10 gap-3 px-3 font-medium">
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer rounded-xl h-10 gap-3 px-3 font-medium">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          )}
          </BrandHeader>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Contact Support Dialog */}
      <ContactSupportDialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen} />

      {/* Floating help button */}
      {user && <FloatingHelpButton />}
    </div>
  );
}