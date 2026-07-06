import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ModuleBriefItem {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'ready' | 'watch' | 'setup' | 'neutral';
}

interface ModuleOperatingBriefProps {
  items: ModuleBriefItem[];
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    external?: boolean;
    icon?: ReactNode;
  };
  className?: string;
}

const toneClass: Record<NonNullable<ModuleBriefItem['tone']>, string> = {
  ready: 'border-emerald-500/22 bg-emerald-500/8',
  watch: 'border-amber-500/28 bg-amber-500/9',
  setup: 'border-primary/24 bg-primary/8',
  neutral: 'border-border/55 bg-card/72',
};

function BriefAction({ action }: { action: NonNullable<ModuleOperatingBriefProps['primaryAction']> }) {
  const content = (
    <>
      {action.icon}
      <span>{action.label}</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </>
  );

  if (action.href) {
    return (
      <Button asChild size="sm" className="rt-primary-action h-9 px-4">
        <a href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined}>
          {content}
        </a>
      </Button>
    );
  }

  return (
    <Button size="sm" className="rt-primary-action h-9 px-4" onClick={action.onClick}>
      {content}
    </Button>
  );
}

export function ModuleOperatingBrief({ items, primaryAction, className }: ModuleOperatingBriefProps) {
  if (items.length === 0 && !primaryAction) return null;

  return (
    <section className={cn('rt-module-brief', className)}>
      <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={`${item.label}-${item.value}`} className={cn('rt-module-brief-item', toneClass[item.tone || 'neutral'])}>
              <span className="rt-module-brief-icon">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="rt-module-brief-label">{item.label}</p>
                <p className="rt-module-brief-value">{item.value}</p>
                <p className="rt-module-brief-detail">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      {primaryAction && (
        <div className="flex shrink-0 justify-start md:justify-end">
          <BriefAction action={primaryAction} />
        </div>
      )}
    </section>
  );
}
