import { DateTime } from "luxon";
import { useState } from "react";
import { Calendar, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Timestamp } from "@/util/datetime";

interface DateDisplayProps {
  timestamp: Timestamp | number | null | undefined;
  fallback?: string;
  className?: string;
  interactive?: boolean;
}

const COMMON_TIMEZONES = [
  { label: "UTC", zone: "UTC" },
  { label: "US Eastern", zone: "America/New_York" },
  { label: "US Pacific", zone: "America/Los_Angeles" },
  { label: "Europe/London", zone: "Europe/London" },
  { label: "Europe/Berlin", zone: "Europe/Berlin" },
  { label: "Asia/Tokyo", zone: "Asia/Tokyo" },
  { label: "Australia/Sydney", zone: "Australia/Sydney" },
];

export function DateDisplay({
  timestamp,
  fallback = "N/A",
  className,
  interactive = true,
}: DateDisplayProps) {
  const [selectedZone, setSelectedZone] = useState<string>("local");

  if (!timestamp) {
    return <span className={className}>{fallback}</span>;
  }

  const dt = DateTime.fromMillis(timestamp);
  if (!dt.isValid) {
    return <span className={className}>{fallback}</span>;
  }

  const localZone = DateTime.local().zoneName;
  const displayDt = selectedZone === "local" ? dt : dt.setZone(selectedZone);
  const displayFormatted = displayDt.toLocaleString(DateTime.DATETIME_SHORT);

  if (!interactive) {
    return <span className={className}>{displayFormatted}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          className={`h-auto p-0 font-normal hover:underline ${className}`}
        >
          {displayFormatted}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Timezone Selection
            </h4>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local ({localZone})</SelectItem>
                {COMMON_TIMEZONES.map(({ label, zone }) => (
                  <SelectItem key={zone} value={zone}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Information
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Time:</span>
                <span className="font-mono">{displayFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Selected Timezone:
                </span>
                <span className="font-mono">
                  {selectedZone === "local" ? localZone : selectedZone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local Time:</span>
                <span className="font-mono">
                  {dt.toLocaleString(DateTime.DATETIME_SHORT)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ISO Format:</span>
                <span className="font-mono text-xs">{dt.toISO()}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Raw Values
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Unix Timestamp (ms):
                </span>
                <span className="font-mono">{timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Unix Timestamp (s):
                </span>
                <span className="font-mono">
                  {Math.floor(timestamp / 1000)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Other Timezones
            </h4>
            <div className="space-y-1 text-sm">
              {COMMON_TIMEZONES.map(({ label, zone }) => {
                const zonedDt = dt.setZone(zone);
                return (
                  <div key={zone} className="flex justify-between">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-mono">
                      {zonedDt.toLocaleString(DateTime.DATETIME_SHORT)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Additional Formats</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Full Date:</span>
                <span className="font-mono">
                  {dt.toLocaleString(DateTime.DATE_FULL)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Relative:</span>
                <span className="font-mono">{dt.toRelative()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HTTP Date:</span>
                <span className="font-mono text-xs">{dt.toHTTP()}</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
