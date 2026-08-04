"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
import { TOAST_DURATIONS } from "@/lib/notify";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={true}
      duration={TOAST_DURATIONS.INFO}
      position="top-right"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-rose-500" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast group border border-border/80 bg-card/95 backdrop-blur-md shadow-xl text-xs font-sans rounded-xl p-3.5 transition-all duration-300 motion-reduce:transition-none",
          title: "font-semibold text-foreground text-xs",
          description: "text-muted-foreground text-[11px] mt-0.5 leading-relaxed",
          actionButton: "bg-primary text-primary-foreground text-[11px] font-medium px-2.5 py-1 rounded-md",
          cancelButton: "bg-muted text-muted-foreground text-[11px] font-medium px-2.5 py-1 rounded-md",
          closeButton: "bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
