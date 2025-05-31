import { useParams } from "react-router";
import { type RequestEventClient } from "../models/request";
import {
  headerNameDisplay,
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
  parseAuthorizationHeader,
} from "../lib/utils";
import { Layout } from "./Layout";
import { useResource } from "@/hooks";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody } from "./ui/table";
import SyntaxHighlighter from "react-syntax-highlighter";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ExpandIcon } from "lucide-react";
import { Button } from "./ui/button";

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
          {/* <DialogDescription>
            Details about the Authorization header
          </DialogDescription> */}
        </DialogHeader>
        {isBasicAuth(parsed) ? (
          <div>
            {parsed.username}:{parsed.password}
          </div>
        ) : isDigestAuth(parsed) ? (
          <div>{parsed.rawHeader}</div>
        ) : isGenericBearerAuth(parsed) ? (
          <div>{parsed.token}</div>
        ) : isJWTAuth(parsed) ? (
          <>
            <div>
              {parsed.headers
                ? JSON.stringify(parsed.headers)
                : parsed.decodedHeaders || parsed.rawHeaders}
            </div>
            <div>
              {parsed.payload
                ? JSON.stringify(parsed.payload)
                : parsed.decodedPayload || parsed.rawPayload}
            </div>
            <div>{parsed.rawSignature}</div>
          </>
        ) : (
          <div>{parsed.rawHeader}</div>
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
  const { data: request, isLoading } = useResource<RequestEventClient>(
    "requests",
    id
  );
  const requestBody = atob(request?.request?.body ?? "");
  const responseBody = atob(request?.response?.body ?? "");
  let prettyRequestBody: string | null = null;
  let prettyResponseBody: string | null = null;
  try {
    prettyRequestBody = JSON.stringify(JSON.parse(requestBody), null, 2);
  } catch (e) {}
  try {
    prettyResponseBody = JSON.stringify(JSON.parse(responseBody), null, 2);
  } catch (e) {}

  return (
    <Layout openRequest={id}>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="m-4 grid grid-cols-[50%_50%] grid-rows-[fit-content_fit-content_fit-content] max-w-5xl gap-4">
          <div>
            {request?.request?.method} {request?.request?.url}
          </div>
          <div>{request?.request?.timestamp?.toLocaleString()}</div>
          <div>
            <Table>
              <TableBody>
                {Object.entries(request?.request?.headers ?? {}).map(
                  // TODO -- handle multiple header values
                  ([k, v]) => (
                    <tr key={k}>
                      <td>{headerNameDisplay(k)}</td>
                      <td>
                        {v}{" "}
                        {k === "authorization" ? (
                          <AuthorizationInspector value={v as string} />
                        ) : null}
                      </td>
                    </tr>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          <div>
            <Table>
              <TableBody>
                {Object.entries(request?.response?.headers ?? {}).map(
                  ([k, v]) => (
                    <tr key={k}>
                      <td>{headerNameDisplay(k)}</td>
                      <td>{v}</td>
                    </tr>
                  )
                )}
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
            ) : null}
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
            ) : null}
          </div>
        </div>
      )}
    </Layout>
  );
};
