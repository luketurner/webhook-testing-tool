import { ExpandIcon, ShieldCheck, ShieldX } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  parseAuthorizationHeader,
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
  isHMACAuth,
  verifyHMACAuthorization,
} from "@/util/authorization";
import { useState } from "react";
import {
  getSignatureHeaderInfo,
  isHMACSignature,
  parseSignatureHeader,
  verifyHMACSignature,
} from "@/util/hmac";

export const AuthorizationInspector = ({
  value,
  requestBody,
  headerName,
  isSignatureHeader = false,
}: {
  value: string;
  requestBody?: string;
  headerName?: string;
  isSignatureHeader?: boolean;
}) => {
  const parsedAuth = !isSignatureHeader
    ? parseAuthorizationHeader(value)
    : null;
  const parsedSignature = isSignatureHeader
    ? parseSignatureHeader(value)
    : null;
  const headerInfo =
    isSignatureHeader && headerName ? getSignatureHeaderInfo(headerName) : null;

  const [secret, setSecret] = useState("");
  const [verificationResult, setVerificationResult] = useState<Awaited<
    ReturnType<typeof verifyHMACSignature>
  > | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!secret || !requestBody) return;

    setIsVerifying(true);
    try {
      if (isSignatureHeader && parsedSignature) {
        const result = await verifyHMACSignature(
          parsedSignature,
          requestBody,
          secret,
        );
        setVerificationResult(result);
      } else if (isHMACAuth(parsedAuth)) {
        const result = await verifyHMACAuthorization(
          parsedAuth,
          requestBody,
          secret,
        );
        setVerificationResult(result);
      }
    } catch (error) {
      setVerificationResult({
        isValid: false,
        expectedSignature: "",
        actualSignature: "",
        algorithm: "UNKNOWN",
        error: error instanceof Error ? error.message : "Verification failed",
      });
    } finally {
      setIsVerifying(false);
    }
  };
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
            {isSignatureHeader
              ? `${headerInfo?.service || "Unknown"} Signature Inspector`
              : `${
                  parsedAuth && isBasicAuth(parsedAuth)
                    ? "Basic"
                    : parsedAuth && isDigestAuth(parsedAuth)
                      ? "Digest"
                      : parsedAuth && isGenericBearerAuth(parsedAuth)
                        ? "Bearer"
                        : parsedAuth && isJWTAuth(parsedAuth)
                          ? "JWT"
                          : parsedAuth && isHMACAuth(parsedAuth)
                            ? "HMAC"
                            : "Unrecognized"
                } Authorization`}
          </DialogTitle>
          <DialogDescription>
            {isSignatureHeader
              ? headerInfo?.description || "Details about the signature header"
              : "Details about the Authorization header"}
          </DialogDescription>
        </DialogHeader>
        {isSignatureHeader ? (
          // Handle signature headers
          isHMACSignature(parsedSignature!) ? (
            <>
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
                      {parsedSignature!.rawHeader}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Algorithm</TableCell>
                    <TableCell className="font-mono text-xs">
                      {parsedSignature!.algorithm}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Signature</TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {parsedSignature!.signature}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Signature Length</TableCell>
                    <TableCell className="font-mono text-xs">
                      {parsedSignature!.signature.length / 2} bytes (
                      {parsedSignature!.signature.length} hex chars)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {requestBody && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="secret">Secret Key</Label>
                    <Input
                      id="secret"
                      type="password"
                      placeholder="Enter secret key for verification"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !isVerifying && handleVerify()
                      }
                    />
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={!secret || isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? "Verifying..." : "Verify Signature"}
                  </Button>

                  {verificationResult && (
                    <Alert
                      variant={
                        verificationResult.isValid ? "default" : "destructive"
                      }
                    >
                      <div className="flex items-center gap-2">
                        {verificationResult.isValid ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <ShieldX className="h-4 w-4" />
                        )}
                        <AlertDescription>
                          {verificationResult.isValid ? (
                            "Signature is valid!"
                          ) : (
                            <div className="space-y-2">
                              <div>Signature verification failed</div>
                              {verificationResult.error && (
                                <div className="text-xs">
                                  {verificationResult.error}
                                </div>
                              )}
                              <div className="font-mono text-xs space-y-1">
                                <div>
                                  Expected:{" "}
                                  {verificationResult.expectedSignature}
                                </div>
                                <div>
                                  Actual: {verificationResult.actualSignature}
                                </div>
                              </div>
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </div>
              )}
            </>
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
                    {parsedSignature!.rawHeader}
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
          )
        ) : // Handle authorization headers
        parsedAuth && isBasicAuth(parsedAuth) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsedAuth.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>{parsedAuth.username}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Password</TableCell>
                <TableCell>{parsedAuth.password}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : parsedAuth && isDigestAuth(parsedAuth) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsedAuth.rawHeader}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : parsedAuth && isGenericBearerAuth(parsedAuth) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsedAuth.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>{parsedAuth.token}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : parsedAuth && isJWTAuth(parsedAuth) ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsedAuth.rawHeader}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Headers</TableCell>
                <TableCell>
                  {parsedAuth.headers
                    ? JSON.stringify(parsedAuth.headers)
                    : parsedAuth.decodedHeaders || parsedAuth.rawHeaders}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Payload</TableCell>
                <TableCell>
                  {parsedAuth.payload
                    ? JSON.stringify(parsedAuth.payload)
                    : parsedAuth.decodedPayload || parsedAuth.rawPayload}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Signature</TableCell>
                <TableCell>{parsedAuth.rawSignature}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : parsedAuth && isHMACAuth(parsedAuth) ? (
          <>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Raw Header</TableCell>
                  <TableCell>{parsedAuth.rawHeader}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Algorithm</TableCell>
                  <TableCell>{parsedAuth.algorithm}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Signature</TableCell>
                  <TableCell className="font-mono text-xs break-all">
                    {parsedAuth.signature}
                  </TableCell>
                </TableRow>
                {parsedAuth.signature && (
                  <TableRow>
                    <TableCell>Signature Length</TableCell>
                    <TableCell>
                      {parsedAuth.signature.length / 2} bytes (
                      {parsedAuth.signature.length} hex chars)
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {requestBody && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hmac-secret">Secret Key</Label>
                  <Input
                    id="hmac-secret"
                    type="password"
                    placeholder="Enter secret key for verification"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={!secret || isVerifying}
                  className="w-full"
                >
                  {isVerifying ? "Verifying..." : "Verify HMAC Signature"}
                </Button>

                {verificationResult && (
                  <Alert
                    variant={
                      verificationResult.isValid ? "default" : "destructive"
                    }
                  >
                    <div className="flex items-center gap-2">
                      {verificationResult.isValid ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <ShieldX className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {verificationResult.isValid ? (
                          "HMAC signature is valid!"
                        ) : (
                          <div className="space-y-2">
                            <div>HMAC verification failed</div>
                            {verificationResult.error && (
                              <div className="text-xs">
                                {verificationResult.error}
                              </div>
                            )}
                            <div className="font-mono text-xs space-y-1">
                              <div>
                                Expected: {verificationResult.expectedSignature}
                              </div>
                              <div>
                                Actual: {verificationResult.actualSignature}
                              </div>
                            </div>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>
            )}
          </>
        ) : (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Raw Header</TableCell>
                <TableCell>{parsedAuth?.rawHeader || value}</TableCell>
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
