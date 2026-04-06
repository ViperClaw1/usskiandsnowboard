import * as React from "react";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const LOCATIONS = [
  "Park City, UT",
  "Salt Lake City, UT",
  "Denver, CO",
  "Boulder, CO",
  "Vail, CO",
  "Aspen, CO",
  "Steamboat Springs, CO",
  "Lake Tahoe, CA",
  "Mammoth Lakes, CA",
  "San Francisco, CA",
  "Los Angeles, CA",
  "San Diego, CA",
  "Portland, OR",
  "Bend, OR",
  "Seattle, WA",
  "Sun Valley, ID",
  "Boise, ID",
  "Jackson, WY",
  "Big Sky, MT",
  "Whitefish, MT",
  "Stowe, VT",
  "Burlington, VT",
  "Killington, VT",
  "North Conway, NH",
  "Portland, ME",
  "Lake Placid, NY",
  "New York, NY",
  "Boston, MA",
  "Chicago, IL",
  "Minneapolis, MN",
  "Duluth, MN",
  "Detroit, MI",
  "Pittsburgh, PA",
  "Philadelphia, PA",
  "Washington, DC",
  "Atlanta, GA",
  "Miami, FL",
  "Nashville, TN",
  "Austin, TX",
  "Dallas, TX",
  "Houston, TX",
  "Phoenix, AZ",
  "Flagstaff, AZ",
  "Albuquerque, NM",
  "Taos, NM",
  "Reno, NV",
  "Anchorage, AK",
  "Honolulu, HI",
];

interface LocationSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationSearch({
  value,
  onValueChange,
  placeholder = "Search for a city or region...",
  className,
}: LocationSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value || "");

  // Sync external value changes
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleSelect = (selected: string) => {
    onValueChange(selected);
    setInputValue(selected);
    setOpen(false);
  };

  const handleInputChange = (search: string) => {
    setInputValue(search);
    onValueChange(search);
    if (!open) setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-14 w-full items-center justify-between rounded-md border-2 bg-background px-4 text-lg ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {value || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty className="py-3 px-4 text-sm">
              {inputValue.trim() ? (
                <span>
                  Press Enter or click away to use "<strong>{inputValue}</strong>"
                </span>
              ) : (
                "Type to search locations..."
              )}
            </CommandEmpty>
            <CommandGroup>
              {LOCATIONS.map((location) => (
                <CommandItem
                  key={location}
                  value={location}
                  onSelect={() => handleSelect(location)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === location ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {location}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
