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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="sm:max-w-[720px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manual</SheetTitle>
          <SheetDescription>
            Documentation for Webhook Testing Tool
          </SheetDescription>
        </SheetHeader>

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
              className="m-2 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
