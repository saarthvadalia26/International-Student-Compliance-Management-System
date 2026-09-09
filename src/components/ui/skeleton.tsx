import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse-subtle rounded-md bg-muted/70 dark:bg-muted/40", className)}
      {...props}
    />
  )
}

export { Skeleton }
