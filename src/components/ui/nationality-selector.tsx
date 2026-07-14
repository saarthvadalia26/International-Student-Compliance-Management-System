"use client";

import * as React from "react";
import { Search, Globe, ChevronDown, Check } from "lucide-react";
import { countryList, Country } from "@/utils/countries";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface NationalitySelectorProps {
  value: string; // 3-letter ISO code
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
}

export function NationalitySelector({
  value,
  onChange,
  className,
  placeholder = "Search country...",
  allowClear = false
}: NationalitySelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Find the selected country based on the 3-letter code
  const selectedCountry = React.useMemo(() => {
    if (value === "") return { name: "All Nationalities", code: "", flag: "🌍" };
    return countryList.find(c => c.code.toUpperCase() === value.toUpperCase());
  }, [value]);

  // Filter countries matching search query
  const filteredCountries = React.useMemo(() => {
    const list = allowClear 
      ? [{ name: "All Nationalities", code: "", flag: "🌍" }, ...countryList] 
      : countryList;

    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(
      c => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s)
    );
  }, [search, allowClear]);

  // Sync highlighted index with filtered list length
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(0);
  }, [filteredCountries]);

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

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Selector Trigger Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="nationality-options-list"
          value={isOpen ? search : selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name} (${selectedCountry.code})` : ""}
          onChange={(e) => {
            if (!isOpen) setIsOpen(true);
            setSearch(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : placeholder}
          className="pr-10 h-9 text-xs cursor-text font-sans"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          ref={listRef}
          id="nationality-options-list"
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground focus:outline-none"
        >
          {filteredCountries.length === 0 ? (
            <div className="py-2 px-3 text-xs text-muted-foreground font-sans">
              No country found
            </div>
          ) : (
            filteredCountries.map((country, idx) => {
              const isSelected = country.code === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={country.code}
                  role="option"
                  aria-selected={isSelected}
                  data-highlighted={isHighlighted}
                  onClick={() => selectCountry(country)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between py-1.5 px-3 rounded-sm text-xs cursor-pointer select-none font-sans transition-colors",
                    isHighlighted && "bg-accent text-accent-foreground",
                    isSelected && "font-semibold text-primary"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none" aria-hidden="true">
                      {country.flag}
                    </span>
                    <span className="truncate">
                      {country.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {country.code}
                    </span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
