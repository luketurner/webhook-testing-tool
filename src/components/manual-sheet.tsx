import type { MouseEvent } from "react";
import { useSearchParams } from "react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useManualPage } from "@/dashboard/hooks";
import { Loader2 } from "lucide-react";

// AIDEV-NOTE: ManualSheet displays manual pages in a slide-out panel
// It reads the 'manual' query parameter to determine which page to show

export function ManualSheet() {
  const [searchParams, setSearchParams] = useSearchParams();

  const manualPage = searchParams.get("manual");
  const isOpen = !!manualPage;

  const {
    data: content,
    isLoading: loading,
    error,
  } = useManualPage(manualPage);

  const handleClose = () => {
    searchParams.delete("manual");
    setSearchParams(searchParams);
  };

  // Links between manual pages are written as relative markdown links so they
  // also resolve on GitHub. The renderer tags them with data-manual-page; the
  // href itself would navigate away from the HashRouter route.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-manual-page]",
    );
    if (!link) return;
    event.preventDefault();
    searchParams.set("manual", link.dataset.manualPage!);
    setSearchParams(searchParams);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="left" className="sm:max-w-[1024px] overflow-y-auto">
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              {error.message || "Manual page not found"}
            </div>
          ) : content ? (
            <div
              className="prose dark:prose-invert max-w-none px-8 pb-8 pl-24 prose-code:before:content-none prose-code:after:content-none"
              onClick={handleClick}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
