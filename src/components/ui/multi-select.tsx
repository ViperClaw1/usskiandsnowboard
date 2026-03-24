import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command as CommandPrimitive } from "cmdk";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options?: Option[];
  groups?: { group: string; options: Option[] }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  groups,
  selected,
  onChange,
  placeholder = "Type to search...",
  className,
}: MultiSelectProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Flatten all options for selection logic
  const allOptions: Option[] = React.useMemo(() => {
    if (groups) return groups.flatMap((g) => g.options);
    return options ?? [];
  }, [groups, options]);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((s) => s !== item));
  };

  const handleSelect = (item: string) => {
    if (!selected.includes(item)) {
      onChange([...selected, item]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          handleUnselect(selected[selected.length - 1]);
        }
      }
      if (e.key === "Escape") {
        input.blur();
        setOpen(false);
      }
    }
  };

  const filterOption = (opt: Option) =>
    !selected.includes(opt.value) &&
    (!inputValue || opt.label.toLowerCase().includes(inputValue.toLowerCase()));

  const hasResults = allOptions.some(filterOption);

  return (
    <Command onKeyDown={handleKeyDown} className={cn("overflow-visible bg-transparent w-full", className)}>
      {/* <div className="group w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1 w-full">
          {selected.map((item) => {
            const option = allOptions.find((opt) => opt.value === item);
            return (
              <Badge key={item} variant="secondary" className="rounded-sm px-2 py-1 font-normal">
                {option?.label || item}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUnselect(item);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(item)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : undefined}
            className="ml-0 flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground border-0 px-0 py-0 h-auto min-h-[24px]"
          />
        </div> */}
      </div>
      <div className="relative mt-2">
        {open && hasResults ? (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <ScrollArea className="max-h-64">
              <CommandList>
                {groups
                  ? groups.map((grp) => {
                      const filteredOpts = grp.options.filter(filterOption);
                      if (filteredOpts.length === 0) return null;
                      return (
                        <CommandGroup key={grp.group} heading={grp.group}>
                          {filteredOpts.map((option) => (
                            <CommandItem
                              key={option.value}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onSelect={() => {
                                handleSelect(option.value);
                                inputRef.current?.focus();
                              }}
                              className="cursor-pointer"
                            >
                              {option.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })
                  : (options ?? []).filter(filterOption).length > 0 && (
                      <CommandGroup>
                        {(options ?? []).filter(filterOption).map((option) => (
                          <CommandItem
                            key={option.value}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onSelect={() => {
                              handleSelect(option.value);
                              inputRef.current?.focus();
                            }}
                            className="cursor-pointer"
                          >
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
              </CommandList>
            </ScrollArea>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
