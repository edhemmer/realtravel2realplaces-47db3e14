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

  // v2.1.39: Auto-logout after 2 hours of inactivity
  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 pt-[var(--rt2rp-safe-top,env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <BrandHeader variant="app">

          {user && (
            <div className="flex items-center gap-1">
              <NetworkStatusIndicator />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user.email}
                </div>
                <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/help')} className="cursor-pointer">
                  <MessageCircleQuestion className="w-4 h-4 mr-2" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSupportDialogOpen(true)} className="cursor-pointer">
                  <MessageCircleQuestion className="w-4 h-4 mr-2" />
                  Contact Support
                </DropdownMenuItem>
                {canAccessBusinessFeatures && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/reports')} className="cursor-pointer">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Reports
                    </DropdownMenuItem>
                  </>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
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
      <main
        className="mx-auto w-full max-w-[1400px] overflow-x-clip pt-4 sm:pt-6"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
      >
        {children}
      </main>


      {/* Contact Support Dialog */}
      <ContactSupportDialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen} />

      {/* Floating help button */}
      {user && <FloatingHelpButton />}
    </div>
  );
}