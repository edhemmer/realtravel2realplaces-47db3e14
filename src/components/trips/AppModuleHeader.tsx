import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AppModuleHeaderProps {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  description: string;
  status?: string;
  statusTone?: 'live' | 'cached' | 'setup' | 'neutral';
  children?: ReactNode;
  className?: string;
}

const toneClass: Record<NonNullable<AppModuleHeaderProps['statusTone']>, string> = {
  live: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cached: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  setup: 'border-primary/30 bg-primary/10 text-primary',
  neutral: 'border-border/70 bg-card/70 text-muted-foreground',
};

export function AppModuleHeader({
  icon: Icon,
  title,
  eyebrow = 'Trip module',
  description,
  status,
  statusTone = 'neutral',
  children,
  className,
}: AppModuleHeaderProps) {
  return (
    <section className={cn('rt-command-panel', className)}>
      <div className="rt-panel-body">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="rt-icon-tile mt-0.5">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="rt-muted-label">{eyebrow}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status && (
              <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', toneClass[statusTone])}>
                {status}
              </Badge>
            )}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
