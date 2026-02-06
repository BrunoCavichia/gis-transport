"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GeocodingResult } from "@/lib/types";
import { GeocodingService } from "@/lib/services/geocoding-service";

interface AddressSearchProps {
  onSelectLocation: (coords: [number, number], name: string) => void;
  placeholder?: string;
  className?: string;
}

export function AddressSearch({
  onSelectLocation,
  placeholder = "Search address...",
  className,
}: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const mapped = await GeocodingService.search(searchQuery);
      setResults(mapped);
      setIsOpen(mapped.length > 0);
    } catch (error) {
      console.error("Geocoding failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  const handleSelect = (result: GeocodingResult) => {
    const displayName = result.street
      ? `${result.street}${result.housenumber ? ` ${result.housenumber}` : ""}${result.city || result.state ? `, ${result.city || result.state}` : ""}`
      : result.city || result.name;

    setQuery(displayName);
    setIsOpen(false);
    onSelectLocation([result.point.lat, result.point.lng], displayName);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-16"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {results.map((result, index) => (
              <li key={`${result.osm_id}-${index}`}>
                <button
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelect(result)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {result.street
                        ? `${result.street}${
                            result.housenumber ? ` ${result.housenumber}` : ""
                          }`
                        : result.name?.split(",")[0]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.city || result.state}, {result.country || "Spain"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
