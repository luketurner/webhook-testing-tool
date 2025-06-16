import { useResource } from "@/dashboard/hooks";
import { ExpandIcon } from "lucide-react";
import { useParams } from "react-router";
import SyntaxHighlighter from "react-syntax-highlighter";
import { Layout } from "@/components/Layout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  parseAuthorizationHeader,
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
} from "@/util/authorization";
import { headerNameDisplay } from "@/util/http";
import type { RequestEvent } from "@/request-events/schema";

const AuthorizationInspector = ({ value }: { value: string }) => {
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

export const RequestPage = () => {
  const { id } = useParams();
  const { data: request, isLoading } = useResource<RequestEvent>(
    "requests",
    id,
  );
  const requestBody = atob(request?.request_body ?? "");
  const responseBody = atob(request?.response_body ?? "");
  let prettyRequestBody: string | null = null;
  let prettyResponseBody: string | null = null;
  try {
    prettyRequestBody = JSON.stringify(JSON.parse(requestBody), null, 2);
  } catch (e) {}
  try {
    prettyResponseBody = JSON.stringify(JSON.parse(responseBody), null, 2);
  } catch (e) {}

  return (
    <Layout>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="m-4 grid grid-cols-[50%_50%] grid-rows-[fit-content_fit-content_fit-content] gap-4">
          <div>
            {request?.request_method} {request?.request_url}
          </div>
          <div>{request?.request_timestamp?.toLocaleString()}</div>
          <div>
            <Table>
              <TableBody>
                {(request?.request_headers ?? []).map(([k, v]) => (
                  <tr key={k}>
                    <td>{headerNameDisplay(k)}</td>
                    <td>
                      {v}{" "}
                      {k === "authorization" ? (
                        <AuthorizationInspector value={v as string} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <Table>
              <TableBody>
                {(request?.response_headers ?? []).map(([k, v]) => (
                  <tr key={k}>
                    <td>{headerNameDisplay(k)}</td>
                    <td>{v}</td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            {requestBody ? (
              <>
                <pre className="overflow-x-auto">
                  <code>{requestBody}</code>
                </pre>
                {prettyRequestBody ? (
                  <div className="mt-4">
                    <SyntaxHighlighter language="json">
                      {prettyRequestBody}
                    </SyntaxHighlighter>
                  </div>
                ) : null}
              </>
            ) : (
              <em>No request body.</em>
            )}
          </div>
          <div>
            {responseBody ? (
              <>
                <pre className="overflow-x-auto">
                  <code>{responseBody}</code>
                </pre>
                {prettyResponseBody ? (
                  <div className="mt-4">
                    <SyntaxHighlighter language="json">
                      {prettyResponseBody}
                    </SyntaxHighlighter>
                  </div>
                ) : null}
              </>
            ) : (
              <em>No response body.</em>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
