import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPro } from '@/hooks/useSubscription';
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { Button } from '@/components/ui/button';
import { Plane, LogOut, User, Settings, Crown, MessageCircleQuestion } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactSupportDialog } from '@/components/support/ContactSupportDialog';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const isPro = useIsPro();
  const navigate = useNavigate();
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);

  // v2.1.39: Auto-logout after 2 hours of inactivity
  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-gradient-ocean flex items-center justify-center shadow-sm">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
             <div className="flex items-center gap-2">
               <h1 className="text-lg font-bold text-gradient-ocean leading-tight">
                 Real Travel 2 <span className="italic">Real Places</span>
               </h1>
               {isPro && (
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm shadow-purple-500/25">
                   <Crown className="w-3 h-3" />
                   PRO
                 </span>
               )}
             </div>
          </Link>

          {user && (
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
                <DropdownMenuItem onClick={() => setSupportDialogOpen(true)} className="cursor-pointer">
                  <MessageCircleQuestion className="w-4 h-4 mr-2" />
                  Contact support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {children}
      </main>

      {/* Contact Support Dialog */}
      <ContactSupportDialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen} />
    </div>
  );
}
