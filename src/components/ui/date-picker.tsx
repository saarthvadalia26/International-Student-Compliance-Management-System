"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RotateCcw 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string; // Expected format: YYYY-MM-DD
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
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface PopoverCoordinates {
  top: number;
  left: number;
  width: number;
  isAbove: boolean;
  isCentered: boolean;
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
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
      startYear = 1920,
      endYear,
      align = "auto",
      size = "default"
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [coords, setCoords] = React.useState<PopoverCoordinates>({
      top: 0,
      left: 0,
      width: 310,
      isAbove: false,
      isCentered: false
    });

    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const popoverRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    // Ensure portal only mounts on client
    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Parse incoming date safely (supports YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, ISO strings)
    const parsedDate = React.useMemo(() => {
      if (!value) return null;
      let y = 0, m = 0, d = 0;
      const strVal = String(value).trim();

      if (strVal.includes("-")) {
        const clean = strVal.includes("T") ? strVal.split("T")[0] : strVal;
        const parts = clean.split("-");
        if (parts.length === 3) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        }
      } else if (strVal.includes("/")) {
        const parts = strVal.split("/");
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            d = parseInt(parts[2], 10);
          } else if (parts[2].length === 4) {
            m = parseInt(parts[0], 10) - 1;
            d = parseInt(parts[1], 10);
            y = parseInt(parts[2], 10);
          }
        }
      } else {
        const dt = new Date(strVal);
        if (!isNaN(dt.getTime())) {
          y = dt.getFullYear();
          m = dt.getMonth();
          d = dt.getDate();
        }
      }

      if (y > 0 && d > 0 && m >= 0 && m <= 11) {
        const dt = new Date(y, m, d);
        return isNaN(dt.getTime()) ? null : { year: y, month: m, day: d, date: dt };
      }
      return null;
    }, [value]);

    // Internal calendar view navigation state
    const today = React.useMemo(() => new Date(), []);
    const currentYear = today.getFullYear();
    const resolvedEndYear = endYear || (disableFuture ? currentYear : currentYear + 25);

    const [viewYear, setViewYear] = React.useState<number>(
      parsedDate ? parsedDate.year : (disableFuture ? currentYear - 18 : currentYear)
    );
    const [viewMonth, setViewMonth] = React.useState<number>(
      parsedDate ? parsedDate.month : today.getMonth()
    );

    // Sync view year/month when value changes externally
    React.useEffect(() => {
      if (parsedDate) {
        setViewYear(parsedDate.year);
        setViewMonth(parsedDate.month);
      }
    }, [parsedDate]);

    // Calculate smart positioning with collision detection & responsive clamping
    const updatePosition = React.useCallback(() => {
      if (!triggerRef.current || typeof window === "undefined") return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const margin = 8;
      const verticalGap = 6;
      // Fluid responsive width: on narrow viewports take available width minus margin, max 310px
      const targetWidth = Math.min(Math.max(260, viewportWidth - (margin * 2)), 310);
      const estimatedHeight = 355; // Height of calendar with month/year selects and day grid

      // 1. Vertical Positioning: Check space below vs space above
      const spaceBelow = viewportHeight - triggerRect.bottom - margin;
      const spaceAbove = triggerRect.top - margin;

      let top = 0;
      let isAbove = false;

      if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
        // Position below trigger
        top = triggerRect.bottom + verticalGap;
        isAbove = false;
        // Clamp if overflowing bottom
        if (top + estimatedHeight > viewportHeight - margin) {
          top = Math.max(margin, viewportHeight - estimatedHeight - margin);
        }
      } else {
        // Position above trigger (Flip)
        top = triggerRect.top - estimatedHeight - verticalGap;
        isAbove = true;
        // Clamp if overflowing top
        if (top < margin) {
          top = margin;
        }
      }

      // 2. Horizontal Positioning: Check bounds, screen size, and alignment
      let left = 0;
      let isCentered = false;

      if (viewportWidth <= 440) {
        // Mobile screen: center horizontally
        left = Math.max(margin, (viewportWidth - targetWidth) / 2);
        isCentered = true;
      } else {
        // Desktop / iPad / Tablet
        const openRightEdge = triggerRect.left + targetWidth;
        const overflowsRight = openRightEdge > viewportWidth - margin;

        if (align === "right" || overflowsRight) {
          // Align right edge of popover with right edge of input trigger
          left = triggerRect.right - targetWidth;
        } else {
          // Align left edge of popover with left edge of input trigger
          left = triggerRect.left;
        }

        // Safety clamp strictly inside viewport bounds
        left = Math.max(margin, Math.min(left, viewportWidth - targetWidth - margin));
      }

      setCoords({
        top: Math.round(top),
        left: Math.round(left),
        width: Math.round(targetWidth),
        isAbove,
        isCentered
      });
    }, [align]);

    // Recalculate on open, resize, or scroll
    React.useEffect(() => {
      if (!isOpen) return;

      updatePosition();
      const rafId = requestAnimationFrame(updatePosition);

      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (
          containerRef.current?.contains(target) ||
          triggerRef.current?.contains(target) ||
          popoverRef.current?.contains(target)
        ) {
          return;
        }
        setIsOpen(false);
      };

      const handleScrollOrResize = () => {
        updatePosition();
      };

      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick, { passive: true });
      window.addEventListener("resize", handleScrollOrResize);
      window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });

      return () => {
        cancelAnimationFrame(rafId);
        document.removeEventListener("mousedown", handleOutsideClick);
        document.removeEventListener("touchstart", handleOutsideClick);
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      };
    }, [isOpen, updatePosition]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "Tab" && !popoverRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    };

    // Calculate dates for current view month
    const daysInMonth = React.useMemo(() => {
      return new Date(viewYear, viewMonth + 1, 0).getDate();
    }, [viewYear, viewMonth]);

    const firstDayOfWeek = React.useMemo(() => {
      return new Date(viewYear, viewMonth, 1).getDay();
    }, [viewYear, viewMonth]);

    const daysInPrevMonth = React.useMemo(() => {
      return new Date(viewYear, viewMonth, 0).getDate();
    }, [viewYear, viewMonth]);

    // Date limits
    const isDateDisabled = React.useCallback(
      (year: number, month: number, day: number) => {
        const testDate = new Date(year, month, day);

        if (disableFuture) {
          const nowMidnight = new Date();
          nowMidnight.setHours(23, 59, 59, 999);
          if (testDate > nowMidnight) return true;
        }

        if (maxDate) {
          const maxObj = typeof maxDate === "string" ? new Date(maxDate) : maxDate;
          if (!isNaN(maxObj.getTime())) {
            const maxMidnight = new Date(maxObj);
            maxMidnight.setHours(23, 59, 59, 999);
            if (testDate > maxMidnight) return true;
          }
        }

        if (minDate) {
          const minObj = typeof minDate === "string" ? new Date(minDate) : minDate;
          if (!isNaN(minObj.getTime())) {
            const minMidnight = new Date(minObj);
            minMidnight.setHours(0, 0, 0, 0);
            if (testDate < minMidnight) return true;
          }
        }

        return false;
      },
      [disableFuture, maxDate, minDate]
    );

    // Emit value change
    const handleSelectDate = (year: number, month: number, day: number) => {
      if (isDateDisabled(year, month, day)) return;

      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(day).padStart(2, "0");
      const formattedIso = `${year}-${mStr}-${dStr}`;

      if (onValueChange) {
        onValueChange(formattedIso);
      }
      if (onChange) {
        onChange({
          target: {
            id,
            name,
            value: formattedIso
          }
        });
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    };

    const handleClearDate = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;

      if (onValueChange) {
        onValueChange("");
      }
      if (onChange) {
        onChange({
          target: {
            id,
            name,
            value: ""
          }
        });
      }
    };

    const handleSelectToday = () => {
      const now = new Date();
      if (!isDateDisabled(now.getFullYear(), now.getMonth(), now.getDate())) {
        handleSelectDate(now.getFullYear(), now.getMonth(), now.getDate());
      }
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(prev => Math.max(startYear, prev - 1));
      } else {
        setViewMonth(prev => prev - 1);
      }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(prev => Math.min(resolvedEndYear, prev + 1));
      } else {
        setViewMonth(prev => prev + 1);
      }
    };

    // Human-readable formatted display date: strictly DD/MM/YYYY (e.g. 14/08/2000)
    const displayValue = React.useMemo(() => {
      if (!parsedDate) return "";
      const dayPadded = String(parsedDate.day).padStart(2, "0");
      const monthPadded = String(parsedDate.month + 1).padStart(2, "0");
      return `${dayPadded}/${monthPadded}/${parsedDate.year}`;
    }, [parsedDate]);

    // Generate year options for quick dropdown jump
    const yearOptions = React.useMemo(() => {
      const years: number[] = [];
      for (let y = resolvedEndYear; y >= startYear; y--) {
        years.push(y);
      }
      return years;
    }, [startYear, resolvedEndYear]);

    return (
      <div 
        ref={containerRef} 
        className={cn("relative w-full flex flex-col space-y-1.5", className)}
      >
        {/* DatePicker Input / Trigger */}
        <button
          ref={triggerRef}
          type="button"
          id={id}
          name={name}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(prev => !prev);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            "group relative flex w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm transition-all outline-none select-none text-left",
            size === "sm" ? "h-8 px-2.5 text-xs" : "h-10",
            "dark:bg-input/30 dark:hover:bg-input/50",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50 bg-input/50",
            error ? "border-rose-500 focus-visible:ring-rose-500" : "hover:border-foreground/30",
            isOpen && "border-primary ring-3 ring-primary/20"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <CalendarIcon className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              displayValue ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(
              "truncate font-sans",
              displayValue ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {displayValue || placeholder}
            </span>
          </div>

          {/* Action indicator: Clear button or Dropdown chevron */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {displayValue && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                title="Clear date"
                onClick={handleClearDate}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors pointer-events-none">
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isOpen ? "rotate-90 text-primary" : "rotate-0"
                )} />
              </span>
            )}
          </div>
        </button>

        {/* Error message */}
        {error && (
          <p className="text-[11px] font-medium text-rose-500 mt-1 animate-in slide-in-from-top-1">
            {error}
          </p>
        )}

        {/* Portal-Rendered Calendar Dropdown Popover */}
        {isOpen && mounted && createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Date Picker Calendar"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999
            }}
            className={cn(
              "p-3 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 select-none",
              "dark:bg-card dark:text-card-foreground dark:border-border/70"
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            {/* Header: Month & Year Controls */}
            <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-border/50">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                title="Previous Month"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border/60 hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
                {/* Month Dropdown */}
                <select
                  value={viewMonth}
                  aria-label="Select month"
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="h-8 px-2 py-0 text-xs font-semibold rounded-md border border-border/60 bg-background text-foreground hover:bg-accent transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/40 truncate"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={viewYear}
                  aria-label="Select year"
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                  className="h-8 px-2 py-0 text-xs font-semibold rounded-md border border-border/60 bg-background text-foreground hover:bg-accent transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/40 truncate"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                title="Next Month"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border/60 hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center" aria-hidden="true">
              {DAY_LABELS.map((day) => (
                <div 
                  key={day} 
                  className="text-[11px] font-semibold text-muted-foreground/80 h-6 flex items-center justify-center select-none"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar days">
              {/* Previous month padding days */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
                const prevMonthDay = daysInPrevMonth - firstDayOfWeek + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    aria-hidden="true"
                    className="h-8 w-full flex items-center justify-center text-[11px] text-muted-foreground/30 select-none pointer-events-none"
                  >
                    {prevMonthDay}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected = Boolean(
                  parsedDate &&
                  parsedDate.year === viewYear &&
                  parsedDate.month === viewMonth &&
                  parsedDate.day === dayNum
                );
                const isToday = 
                  today.getFullYear() === viewYear &&
                  today.getMonth() === viewMonth &&
                  today.getDate() === dayNum;

                const disabledDay = isDateDisabled(viewYear, viewMonth, dayNum);

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    disabled={disabledDay}
                    aria-label={`${dayNum} ${MONTH_NAMES[viewMonth]} ${viewYear}${isToday ? ", Today" : ""}${isSelected ? ", Selected" : ""}`}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
                    className={cn(
                      "h-8 w-full rounded-lg text-xs font-medium transition-all select-none flex items-center justify-center cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 scale-[1.02]"
                        : isToday
                        ? "border border-primary/50 font-semibold text-primary bg-primary/5 hover:bg-primary/10"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      disabledDay && "opacity-25 cursor-not-allowed pointer-events-none text-muted-foreground",
                      "active:scale-95"
                    )}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer quick actions */}
            <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                disabled={isDateDisabled(today.getFullYear(), today.getMonth(), today.getDate())}
                className="flex items-center gap-1 font-medium text-[11px] text-primary hover:underline disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Today
              </button>

              {parsedDate && (
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {displayValue}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
