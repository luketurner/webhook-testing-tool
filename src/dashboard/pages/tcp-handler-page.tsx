import { useCallback, useMemo } from "react";
import { randomUUID } from "@/util/uuid";
import type { TcpHandler } from "@/tcp-handlers/schema";
import { TcpHandlerForm } from "@/components/tcp-handler-form";
import {
  useResourceList,
  useResourceCreator,
  useResourceUpdater,
  useResourceDeleter,
} from "../hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// AIDEV-NOTE: This page manages the single TCP handler (only one can exist at a time)
export const TcpHandlerPage = () => {
  const { data: handlers, isLoading } =
    useResourceList<TcpHandler>("tcp-handlers");
  const { mutate: createHandler } = useResourceCreator("tcp-handlers");
  const { mutate: updateHandler } = useResourceUpdater(
    "tcp-handlers",
    handlers?.[0]?.id || "",
  );
  const { mutate: deleteHandler } = useResourceDeleter(
    "tcp-handlers",
    handlers?.[0]?.id || "",
  );

  const existingHandler = handlers?.[0];
  const id = useMemo(() => randomUUID(), []);

  const handleSave = useCallback(
    (resource: TcpHandler) => {
      if (existingHandler) {
        updateHandler(resource);
      } else {
        createHandler(resource);
      }
    },
    [existingHandler, createHandler, updateHandler],
  );

  const handleDelete = () => {
    deleteHandler();
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <>
      <TcpHandlerForm
        key={existingHandler?.id || id}
        initialValues={
          existingHandler || {
            id,
            version_id: "1",
            name: "TCP Handler",
            code: '// Handle incoming TCP data\nconsole.log("Received:", data);\nsend("ack\\n");',
            enabled: true,
          }
        }
        onChange={handleSave}
        additionalButtons={
          existingHandler && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete TCP handler?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the TCP handler. This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {}}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
    </>
  );
};
