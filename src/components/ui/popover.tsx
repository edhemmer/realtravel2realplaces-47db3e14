import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={cn(
        "motion-cinema z-50 w-[min(18rem,calc(100vw-1.5rem))] max-h-[min(28rem,calc(100dvh-var(--rt2rp-safe-top,0px)-var(--rt2rp-safe-bottom,0px)-1.5rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-border/40 bg-popover/95 p-4 text-popover-foreground shadow-elevation-floating outline-none backdrop-blur-glass data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:w-72 sm:bg-popover/85 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[side=bottom]:slide-in-from-top-2 sm:data-[side=left]:slide-in-from-right-2 sm:data-[side=right]:slide-in-from-left-2 sm:data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
