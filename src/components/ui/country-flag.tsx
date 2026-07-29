"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getCountryByCode } from "@/utils/countries";

export interface CountryFlagProps {
  countryCode?: string;
  fallbackEmoji?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * CountryFlag Component
 * Renders vector SVG flag assets with fallback to Unicode flag emojis.
 */
export function CountryFlag({
  countryCode,
  fallbackEmoji,
  className,
  size = "md"
}: CountryFlagProps) {
  const [hasError, setHasError] = React.useState(false);

  // Convert 3-letter to 2-letter if needed
  const code2 = React.useMemo(() => {
    if (!countryCode) return "";
    const clean = countryCode.trim().toLowerCase();
    if (clean.length === 2) return clean;
    const country = getCountryByCode(clean);
    return country ? country.alpha2.toLowerCase() : clean.substring(0, 2);
  }, [countryCode]);

  const dimensions = {
    sm: "h-3 w-4 min-w-4 text-[10px]",
    md: "h-4 w-5 min-w-5 text-xs",
    lg: "h-5 w-7 min-w-7 text-sm"
  }[size];

  if (!code2 || hasError) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-flex items-center justify-center leading-none select-none", dimensions, className)}
      >
        {fallbackEmoji || "🌐"}
      </span>
    );
  }

  // Use flagcdn SVG assets for crisp vector rendering
  const flagSvgUrl = `https://flagcdn.com/${code2}.svg`;

  return (
    <span className={cn("inline-flex items-center justify-center overflow-hidden rounded-[2px] shadow-2xs border border-border/40 shrink-0 select-none bg-muted/20", dimensions, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagSvgUrl}
        alt={`${countryCode} flag`}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </span>
  );
}
