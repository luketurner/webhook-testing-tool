import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tryParseJWTHeader, type ParsedAuthJWT } from "@/util/authorization";
import { verifyJWT, type JWTVerificationResult } from "@/util/jwt-verification";
import { Check, X, AlertCircle } from "lucide-react";

interface JWTInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JWTInspector({ open, onOpenChange }: JWTInspectorProps) {
  const [jwtInput, setJwtInput] = React.useState("");
  const [parsedJWT, setParsedJWT] = React.useState<ParsedAuthJWT | null>(null);
  const [verificationResult, setVerificationResult] =
    React.useState<JWTVerificationResult | null>(null);
  const [verificationConfig, setVerificationConfig] = React.useState({
    jku: "",
    jwks: "",
  });
  const [isVerifying, setIsVerifying] = React.useState(false);

  const handleJWTChange = (value: string) => {
    setJwtInput(value);
    setVerificationResult(null);

    if (!value.trim()) {
      setParsedJWT(null);
      return;
    }

    // Try to parse as Bearer token first, then as raw JWT
    let parsed = tryParseJWTHeader(`Bearer ${value.trim()}`);
    if (!parsed) {
      // Maybe it already has Bearer prefix
      parsed = tryParseJWTHeader(value.trim());
    }

    setParsedJWT(parsed);
  };

  const handleVerify = async () => {
    if (!parsedJWT || !parsedJWT.isValid) return;

    setIsVerifying(true);
    try {
      const result = await verifyJWT(parsedJWT, {
        jku: verificationConfig.jku || undefined,
        jwks: verificationConfig.jwks || undefined,
      });
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        isValid: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "Invalid JSON";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>JWT Inspector</DialogTitle>
          <DialogDescription>
            Paste a JWT to decode and optionally verify it against a JWKS or JKU
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jwt-input">JWT Token</Label>
            <Textarea
              id="jwt-input"
              placeholder="Paste your JWT here (with or without 'Bearer ' prefix)"
              value={jwtInput}
              onChange={(e) => handleJWTChange(e.target.value)}
              className="font-mono text-sm"
              rows={4}
            />
          </div>

          {parsedJWT && (
            <>
              <div className="space-y-4">
                {parsedJWT.isValid ? (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>JWT successfully parsed</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                      Invalid JWT format:{" "}
                      {parsedJWT.error?.message || "Unknown error"}
                    </AlertDescription>
                  </Alert>
                )}

                {parsedJWT.isValid && (
                  <Tabs defaultValue="header" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="header">Header</TabsTrigger>
                      <TabsTrigger value="payload">Payload</TabsTrigger>
                      <TabsTrigger value="signature">Signature</TabsTrigger>
                    </TabsList>
                    <TabsContent value="header" className="space-y-2">
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                        {formatJSON(parsedJWT.headers)}
                      </pre>
                      <div className="text-sm text-muted-foreground">
                        <strong>Raw:</strong> {parsedJWT.rawHeaders}
                      </div>
                    </TabsContent>
                    <TabsContent value="payload" className="space-y-2">
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                        {formatJSON(parsedJWT.payload)}
                      </pre>
                      <div className="text-sm text-muted-foreground">
                        <strong>Raw:</strong> {parsedJWT.rawPayload}
                      </div>
                    </TabsContent>
                    <TabsContent value="signature" className="space-y-2">
                      <div className="font-mono text-sm bg-muted p-4 rounded-md break-all">
                        {parsedJWT.rawSignature}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>

              {parsedJWT.isValid && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium">Verification</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="jku">JKU (JSON Web Key Set URL)</Label>
                      <Input
                        id="jku"
                        placeholder="https://example.com/.well-known/jwks.json"
                        value={verificationConfig.jku}
                        onChange={(e) =>
                          setVerificationConfig((prev) => ({
                            ...prev,
                            jku: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      OR
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jwks">JWKS (JSON Web Key Set)</Label>
                      <Textarea
                        id="jwks"
                        placeholder='{"keys": [...]}'
                        value={verificationConfig.jwks}
                        onChange={(e) =>
                          setVerificationConfig((prev) => ({
                            ...prev,
                            jwks: e.target.value,
                          }))
                        }
                        className="font-mono text-sm"
                        rows={6}
                      />
                    </div>

                    <Button
                      onClick={handleVerify}
                      disabled={
                        isVerifying ||
                        (!verificationConfig.jku && !verificationConfig.jwks)
                      }
                      className="w-full"
                    >
                      {isVerifying ? "Verifying..." : "Verify JWT"}
                    </Button>

                    {verificationResult && (
                      <Alert
                        variant={
                          verificationResult.isValid ? "default" : "destructive"
                        }
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {verificationResult.isValid ? (
                            <>
                              <strong>Signature verified successfully</strong>
                              {verificationResult.algorithm && (
                                <div>
                                  Algorithm: {verificationResult.algorithm}
                                </div>
                              )}
                              {verificationResult.keyId && (
                                <div>Key ID: {verificationResult.keyId}</div>
                              )}
                            </>
                          ) : (
                            <>
                              <strong>Verification failed</strong>
                              <div>{verificationResult.error}</div>
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
