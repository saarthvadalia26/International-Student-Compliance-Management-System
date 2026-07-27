"use client";

import * as React from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { Country, searchCountries, getCountryByCode } from "@/utils/countries";
import { CountryFlag } from "./country-flag";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface NationalitySelectorProps {
  value: string; // ISO 3166-1 Alpha-3 Code (e.g., "IND")
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function NationalitySelector({
  value,
  onChange,
  className,
  placeholder = "Select nationality or country...",
  allowClear = false,
  disabled = false
}: NationalitySelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Selected country object lookup
  const selectedCountry = React.useMemo(() => {
    if (!value) return null;
    return getCountryByCode(value) || null;
  }, [value]);

  // Filter countries list
  const filteredCountries = React.useMemo(() => {
    const list = searchCountries(search);
    if (allowClear) {
      const clearOption: Country = {
        code: "",
        alpha2: "",
        numeric: "",
        name: "All Nationalities",
        officialName: "All Nationalities / Countries",
        nationality: "All",
        flag: "🌍",
        region: "Global",
        subregion: "Global"
      };
      return [clearOption, ...list];
    }
    return list;
  }, [search, allowClear]);

  // Reset highlighted index on search change
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(0);
  }, [search, filteredCountries.length]);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(Math.max(0, filteredCountries.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCountries[highlightedIndex]) {
          selectCountry(filteredCountries[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Auto-scroll highlighted option into view
  React.useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectCountry = (country: Country) => {
    onChange(country.code);
    setSearch("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Selector Trigger Input */}
      <div className="relative flex items-center">
        {selectedCountry && !isOpen && (
          <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none z-10">
            <CountryFlag countryCode={selectedCountry.alpha2 || selectedCountry.code} fallbackEmoji={selectedCountry.flag} size="md" />
          </div>
        )}
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="nationality-options-list"
          aria-activedescendant={isOpen && filteredCountries[highlightedIndex] ? `country-opt-${filteredCountries[highlightedIndex].code}` : undefined}
          value={isOpen ? search : selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : ""}
          onChange={(e) => {
            if (!isOpen) setIsOpen(true);
            setSearch(e.target.value);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : placeholder}
          className={cn(
            "pr-10 h-9 text-xs cursor-text font-sans transition-all",
            selectedCountry && !isOpen ? "pl-9" : "pl-3"
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1 pointer-events-none">
          {allowClear && value && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          ref={listRef}
          id="nationality-options-list"
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg text-popover-foreground focus:outline-none scrollbar-thin"
        >
          <div className="px-2 py-1.5 border-b border-border/40 mb-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Search className="h-3 w-3" /> ISO 3166-1 Registry
            </span>
            <span>{filteredCountries.length} countries</span>
          </div>

          {filteredCountries.length === 0 ? (
            <div className="py-3 px-3 text-xs text-muted-foreground font-sans text-center">
              No matching ISO country found
            </div>
          ) : (
            filteredCountries.map((country, idx) => {
              const isSelected = country.code === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={country.code || `opt-${idx}`}
                  id={`country-opt-${country.code}`}
                  role="option"
                  aria-selected={isSelected}
                  data-highlighted={isHighlighted}
                  onClick={() => selectCountry(country)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between py-1.5 px-2.5 rounded-sm text-xs cursor-pointer select-none font-sans transition-colors mb-0.5",
                    isHighlighted && "bg-accent text-accent-foreground",
                    isSelected && "font-semibold text-primary bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-2 max-w-[85%]">
                    {country.code ? (
                      <CountryFlag countryCode={country.alpha2 || country.code} fallbackEmoji={country.flag} size="md" />
                    ) : (
                      <span className="text-base leading-none">🌍</span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">
                        {country.name}
                      </span>
                      {country.nationality && country.nationality !== country.name && (
                        <span className="text-[10px] text-muted-foreground/80 truncate">
                          {country.nationality}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {country.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                        {country.code}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Export CountrySelector as an alias for NationalitySelector
export const CountrySelector = NationalitySelector;
