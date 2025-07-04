import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { loadManualPage } from "./loader";
import { Loader2 } from "lucide-react";

// AIDEV-NOTE: ManualSheet displays manual pages in a slide-out panel
// It reads the 'manual' query parameter to determine which page to show

export function ManualSheet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const manualPage = searchParams.get("manual");
  const isOpen = !!manualPage;

  useEffect(() => {
    if (!manualPage) {
      setContent(null);
      return;
    }

    setLoading(true);
    loadManualPage(manualPage)
      .then((html) => {
        setContent(html);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [manualPage]);

  const handleClose = () => {
    searchParams.delete("manual");
    setSearchParams(searchParams);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="left"
        className="w-[400px] sm:w-[540px] overflow-y-auto"
      >
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
          ) : content ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Manual page not found
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
