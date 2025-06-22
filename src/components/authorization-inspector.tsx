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
  parseAuthorizationHeader,
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
} from "@/util/authorization";

export const AuthorizationInspector = ({ value }: { value: string }) => {
  const parsed = parseAuthorizationHeader(value);
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
            {isBasicAuth(parsed)
              ? "Basic"
              : isDigestAuth(parsed)
                ? "Digest"
                : isGenericBearerAuth(parsed)
                  ? "Bearer"
                  : isJWTAuth(parsed)
                    ? "JWT"
                    : "Unrecognized"}{" "}
            Authorization
          </DialogTitle>
          <DialogDescription>
            Details about the Authorization header
          </DialogDescription>
        </DialogHeader>
        {isBasicAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>{parsed.username}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Password</TableCell>
                <TableCell>{parsed.password}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : isDigestAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : isGenericBearerAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>{parsed.token}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : isJWTAuth(parsed) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Headers</TableCell>
                <TableCell>
                  {parsed.headers
                    ? JSON.stringify(parsed.headers)
                    : parsed.decodedHeaders || parsed.rawHeaders}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Payload</TableCell>
                <TableCell>
                  {parsed.payload
                    ? JSON.stringify(parsed.payload)
                    : parsed.decodedPayload || parsed.rawPayload}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Signature</TableCell>
                <TableCell>{parsed.rawSignature}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsed.rawHeader}</TableCell>
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
