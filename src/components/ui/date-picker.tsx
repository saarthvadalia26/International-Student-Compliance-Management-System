"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatToDDMMYYYY, parseDateToISO, isValidDDMMYYYY } from "@/lib/utils/date";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string; // Expected format: DD/MM/YYYY or YYYY-MM-DD
  onChange?: (e: { target: { id?: string; name?: string; value: string } }) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  disableFuture?: boolean;
  maxDate?: Date | string;
  minDate?: Date | string;
  startYear?: number;
  endYear?: number;
  align?: "left" | "right" | "auto";
  size?: "default" | "sm";
  required?: boolean;
  "aria-label"?: string;
}

/**
 * Standard Manual Date Input Component for ISCMS
 * 
 * Strict Global Requirements:
 * - NO calendar UI, NO popovers, NO date-picker dropdowns.
 * - Format: DD/MM/YYYY (e.g. 15/08/2026).
 * - Accepts manual typing with numeric inputMode and DD/MM/YYYY placeholder.
 * - Supports keyboard navigation, copy/paste, and smooth backspacing.
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      id,
      name,
      value = "",
      onChange,
      onValueChange,
      placeholder = "DD/MM/YYYY",
      disabled = false,
      error,
      className,
      disableFuture = false,
      maxDate,
      minDate,
      size = "default",
      required = false,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    // Internal display state formatted as DD/MM/YYYY
    const [inputValue, setInputValue] = React.useState<string>(() => {
      return value ? formatToDDMMYYYY(value) : "";
    });

    // Synchronize display value when value prop changes externally
    React.useEffect(() => {
      const formatted = value ? formatToDDMMYYYY(value) : "";
      setInputValue(formatted);
    }, [value]);

    /**
     * Smart formatting on typing:
     * Allows free manual typing while auto-inserting slashes when digits are entered consecutively.
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      // Allow only digits and slashes
      raw = raw.replace(/[^\d/]/g, "");

      // If user is typing consecutive digits without slashes (e.g. 15082026 or 1508), auto-insert slashes
      if (!raw.includes("/") && raw.length >= 2) {
        if (raw.length <= 4) {
          raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
        } else {
          raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
        }
      } else if (raw.split("/").length === 2) {
        const parts = raw.split("/");
        if (parts[1].length >= 2 && !raw.endsWith("/")) {
          if (parts[1].length > 2) {
            raw = `${parts[0]}/${parts[1].slice(0, 2)}/${parts[1].slice(2, 6)}`;
          }
        }
      }

      // Limit to max 10 characters (DD/MM/YYYY)
      if (raw.length > 10) {
        raw = raw.slice(0, 10);
      }

      setInputValue(raw);

      // Propagate change event to parent form handlers
      if (onChange) {
        onChange({
          target: {
            id,
            name,
            value: raw
          }
        });
      }

      if (onValueChange) {
        onValueChange(raw);
      }
    };

    /**
     * Validate and normalize on blur
     */
    const handleBlur = () => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        if (onChange) onChange({ target: { id, name, value: "" } });
        if (onValueChange) onValueChange("");
        return;
      }

      // If user typed 8 digits without slash e.g. "15082026"
      if (/^\d{8}$/.test(trimmed)) {
        const formatted = `${trimmed.slice(0, 2)}/${trimmed.slice(2, 4)}/${trimmed.slice(4, 8)}`;
        setInputValue(formatted);
        if (onChange) onChange({ target: { id, name, value: formatted } });
        if (onValueChange) onValueChange(formatted);
      }
    };

    // Evaluate future date constraints if disableFuture is active
    const inlineValidationError = React.useMemo(() => {
      if (!inputValue || inputValue.length < 10) return null;
      if (!isValidDDMMYYYY(inputValue)) {
        return "Please enter a valid date in DD/MM/YYYY format";
      }

      const iso = parseDateToISO(inputValue);
      if (!iso) return "Invalid date";

      if (disableFuture) {
        const today = new Date().toISOString().split("T")[0];
        if (iso > today) {
          return "Date cannot be in the future";
        }
      }

      if (maxDate) {
        const maxIso = parseDateToISO(maxDate);
        if (maxIso && iso > maxIso) {
          return `Date must be on or before ${formatToDDMMYYYY(maxIso)}`;
        }
      }

      if (minDate) {
        const minIso = parseDateToISO(minDate);
        if (minIso && iso < minIso) {
          return `Date must be on or after ${formatToDDMMYYYY(minIso)}`;
        }
      }

      return null;
    }, [inputValue, disableFuture, maxDate, minDate]);

    const displayError = error || inlineValidationError;

    return (
      <div className="relative w-full space-y-1">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={10}
          autoComplete="off"
          aria-label={ariaLabel || placeholder}
          aria-invalid={Boolean(displayError)}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-xs shadow-xs transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground/60 placeholder:font-sans",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            size === "sm" ? "h-8 text-xs" : "h-9 text-xs",
            displayError ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive text-destructive" : "",
            className
          )}
        />
        {displayError && (
          <p className="text-[11px] text-destructive animate-in fade-in-50 slide-in-from-top-0.5">
            {displayError}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

// Also export DateInput as canonical component alias
export const DateInput = DatePicker;
