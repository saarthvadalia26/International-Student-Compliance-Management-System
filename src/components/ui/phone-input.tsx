"use client";

import * as React from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { Country, countryList, searchCountries, getCountryByPhoneCode, getCountryByCode, formatE164Phone } from "@/utils/countries";
import { CountryFlag } from "./country-flag";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  id?: string;
  countryCode?: string;
  number?: string;
  value?: string;
  onCountryCodeChange?: (countryCode: string) => void;
  onNumberChange?: (number: string) => void;
  onChange?: (compositeE164: string, countryCode: string, number: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  defaultCountryCode?: string;
}

export function PhoneInput({
  id,
  countryCode: propCountryCode,
  number: propNumber,
  value: propValue,
  onCountryCodeChange,
  onNumberChange,
  onChange,
  placeholder = "Phone number",
  disabled = false,
  required = false,
  className,
  defaultCountryCode = "+91"
}: PhoneInputProps) {
  // Determine initial country code and number
  const parseInitial = () => {
    if (propCountryCode !== undefined || propNumber !== undefined) {
      return {
        code: propCountryCode || defaultCountryCode,
        num: propNumber || ""
      };
    }
    if (propValue) {
      const clean = propValue.trim();
      if (clean.startsWith("+")) {
        // Find best matching country code
        const matched = countryList
          .filter(c => c.phoneCode && clean.startsWith(c.phoneCode))
          .sort((a, b) => (b.phoneCode?.length || 0) - (a.phoneCode?.length || 0))[0];

        if (matched && matched.phoneCode) {
          return {
            code: matched.phoneCode,
            num: clean.substring(matched.phoneCode.length).replace(/[^\d]/g, "")
          };
        }
      }
      return {
        code: defaultCountryCode,
        num: clean.replace(/[^\d]/g, "")
      };
    }
    return {
      code: defaultCountryCode,
      num: ""
    };
  };

  const initial = parseInitial();
  const [internalCode, setInternalCode] = React.useState(initial.code);
  const [internalNumber, setInternalNumber] = React.useState(initial.num);

  const activeCode = propCountryCode !== undefined ? (propCountryCode || defaultCountryCode) : internalCode;
  const activeNumber = propNumber !== undefined ? (propNumber || "") : internalNumber;

  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Selected Country lookup
  const selectedCountry = React.useMemo(() => {
    return getCountryByPhoneCode(activeCode) || getCountryByCode(activeCode) || {
      name: "International",
      code: "INT",
      flag: "🌐",
      phoneCode: activeCode
    };
  }, [activeCode]);

  // Filtered countries for selector
  const filteredCountries = React.useMemo(() => {
    const all = countryList.filter(c => Boolean(c.phoneCode && c.isActive !== false));
    if (!search || !search.trim()) return all;
    return searchCountries(search, true).filter(c => Boolean(c.phoneCode));
  }, [search]);

  const handleSelectCountry = (code: string) => {
    const cleanCode = code.startsWith("+") ? code : `+${code}`;
    setInternalCode(cleanCode);
    setIsOpen(false);
    setSearch("");

    if (onCountryCodeChange) {
      onCountryCodeChange(cleanCode);
    }
    if (onChange) {
      onChange(formatE164Phone(cleanCode, activeNumber), cleanCode, activeNumber);
    }
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    // Check if pasted value contains international dial code
    if (rawVal.trim().startsWith("+")) {
      const clean = rawVal.trim();
      const matched = countryList
        .filter(c => c.phoneCode && clean.startsWith(c.phoneCode))
        .sort((a, b) => (b.phoneCode?.length || 0) - (a.phoneCode?.length || 0))[0];

      if (matched && matched.phoneCode) {
        const remainingNum = clean.substring(matched.phoneCode.length).replace(/[^\d]/g, "");
        setInternalCode(matched.phoneCode);
        setInternalNumber(remainingNum);

        if (onCountryCodeChange) onCountryCodeChange(matched.phoneCode);
        if (onNumberChange) onNumberChange(remainingNum);
        if (onChange) onChange(formatE164Phone(matched.phoneCode, remainingNum), matched.phoneCode, remainingNum);
        return;
      }
    }

    const cleanNum = rawVal.replace(/[^\d\s\-]/g, "");
    setInternalNumber(cleanNum);

    if (onNumberChange) {
      onNumberChange(cleanNum);
    }
    if (onChange) {
      onChange(formatE164Phone(activeCode, cleanNum), activeCode, cleanNum);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative flex items-center w-full", className)}>
      {/* Country Dial Code Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
          className={cn(
            "flex items-center gap-1.5 h-10 px-2.5 rounded-l-md border border-r-0 border-input bg-muted/30 text-xs font-medium hover:bg-muted/60 transition-colors focus:outline-none focus:ring-1 focus:ring-ring shrink-0",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Select phone country code"
        >
          <span className="text-base leading-none">
            <CountryFlag countryCode={selectedCountry.code || "IND"} fallbackEmoji={selectedCountry.flag || "🌐"} />
          </span>
          <span className="font-mono text-xs text-foreground font-semibold">{activeCode}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 opacity-70" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-72 max-w-[calc(100vw-2.5rem)] max-h-64 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden flex flex-col">
            {/* Search header */}
            <div className="p-2 border-b border-border bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-md"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-52 divide-y divide-border/20 py-1">
              {filteredCountries.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No matching countries found
                </div>
              ) : (
                filteredCountries.map((c: Country) => {
                  const isSelected = c.phoneCode === activeCode;
                  return (
                    <button
                      key={`${c.code}-${c.phoneCode}`}
                      type="button"
                      onClick={() => handleSelectCountry(c.phoneCode || "+91")}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                        isSelected && "bg-accent/40 font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">
                          <CountryFlag countryCode={c.code} fallbackEmoji={c.flag} />
                        </span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-muted-foreground">{c.phoneCode}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <Input
        id={id}
        type="tel"
        value={activeNumber}
        onChange={handleNumberInput}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="rounded-l-none h-10 text-xs font-mono"
        autoComplete="tel-national"
      />
    </div>
  );
}
