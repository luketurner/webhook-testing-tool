import { ExpandIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  parseSignatureHeader,
  isHMACSignature,
  getSignatureHeaderInfo,
} from "@/util/hmac-signature";

export const SignatureInspector = ({
  value,
  headerName,
}: {
  value: string;
  headerName: string;
}) => {
  const parsed = parseSignatureHeader(value);
  const headerInfo = getSignatureHeaderInfo(headerName);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-8">
          <ExpandIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {headerInfo?.service || "Unknown"} Signature Inspector
          </DialogTitle>
          <DialogDescription>
            {headerInfo?.description || "Details about the signature header"}
          </DialogDescription>
        </DialogHeader>
        {isHMACSignature(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Header Name</TableCell>
                <TableCell className="font-mono text-xs">
                  {headerName}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Raw Value</TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {parsed.rawHeader}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Algorithm</TableCell>
                <TableCell className="font-mono text-xs">
                  {parsed.algorithm}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Signature</TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {parsed.signature}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Signature Length</TableCell>
                <TableCell className="font-mono text-xs">
                  {parsed.signature.length / 2} bytes ({parsed.signature.length}{" "}
                  hex chars)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Header Name</TableCell>
                <TableCell className="font-mono text-xs">
                  {headerName}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Raw Value</TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {parsed.rawHeader}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>
                  Unable to parse as a known signature format
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
