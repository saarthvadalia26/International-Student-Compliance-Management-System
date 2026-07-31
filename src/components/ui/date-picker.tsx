import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, value, onChange, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        <div className="relative w-full">
          {/* Custom calendar icon to replace native where possible, or just as visual enhancement */}
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            ref={ref}
            value={value}
            onChange={onChange}
            className={cn(
              "w-full pl-10 pr-3 py-2 h-10 text-sm transition-colors rounded-lg border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              // Hiding the default webkit calendar icon so our custom one shows without overlap
              "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
              error ? "border-rose-500 focus-visible:ring-rose-500" : "",
              className
            )}
            placeholder="DD/MM/YYYY"
            {...props}
          />
        </div>
        {error && (
          <p className="text-[11px] font-medium text-rose-500 mt-1 animate-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
