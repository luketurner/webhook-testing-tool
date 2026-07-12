import { useSendRequest } from "@/dashboard/hooks";
import { requestSchema, type HandlerRequest } from "@/webhook-server/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { CodeEditor } from "@/components/code-editor";
import { KeyValuePairEditor } from "@/components/key-value-pair-editor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormCard } from "@/components/form/form-card";
import { HttpMethodSelect } from "@/components/form/http-method-select";
import { TextFormField } from "@/components/form/form-fields";
import { HttpResponseView } from "@/components/http-response-view";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CardFooter } from "@/components/ui/card";

export const CreateRequestPage = () => {
  const [searchParams] = useSearchParams();

  const form = useForm<HandlerRequest>({
    resolver: zodResolver(requestSchema as any), // TODO
    defaultValues: {
      method: (searchParams.get("method") as any) || "GET",
      url: searchParams.get("path") || "/",
      external: false,
      body: null,
      headers: [],
      query: [],
    },
  });
  const sendRequestMutation = useSendRequest();

  const selectedMethod = form.watch("method");
  const external = form.watch("external");
  const methodsWithoutBody = ["GET", "HEAD", "OPTIONS"];
  const bodyDisabled = methodsWithoutBody.includes(selectedMethod);

  useEffect(() => {
    if (bodyDisabled) {
      form.setValue("body", null);
    }
  }, [bodyDisabled, form]);

  const handleSubmit = useCallback(
    (values: HandlerRequest) => {
      sendRequestMutation.mutate({
        method: values.method ?? "GET",
        body: values.body,
        headers: values.headers,
        query: values.query,
        url: values.url ?? "/",
        external: values.external ?? false,
      });
    },
    [sendRequestMutation],
  );

  const sendResult = sendRequestMutation.data;
  const externalResponse =
    sendResult?.external === true ? sendResult.response : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormCard
          className="mt-4"
          title="Test Request"
          description={<>Sends a test request from your browser.</>}
        >
          <div className="space-y-4">
            <HttpMethodSelect
              control={form.control}
              name="method"
              label="Method"
            />
            <FormField
              control={form.control}
              name="external"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Send to an external URL</FormLabel>
                    <FormDescription>
                      When on, enter a fully-qualified URL. External requests
                      are sent anywhere the server can reach and are not
                      captured in the request log.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <TextFormField
              control={form.control}
              name="url"
              label={external ? "URL" : "Path"}
              placeholder={external ? "https://example.com/hook" : "/"}
              type={external ? "url" : "text"}
            />
            <FormField
              control={form.control}
              name="headers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headers</FormLabel>
                  <FormControl>
                    <KeyValuePairEditor {...field} addButtonText="Add header" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Parameters</FormLabel>
                  <FormControl>
                    <KeyValuePairEditor
                      {...field}
                      addButtonText="Add query parameter"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request body</FormLabel>
                  <FormControl>
                    {bodyDisabled ? (
                      <div className="text-sm text-muted-foreground p-3">
                        The {selectedMethod} method does not support including a
                        request body.
                      </div>
                    ) : (
                      <CodeEditor {...field} defaultLanguage="json" />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <CardFooter className="mt-6">
            <Button type="submit">Send</Button>
          </CardFooter>
        </FormCard>
        {externalResponse && (
          <HttpResponseView
            className="mt-4"
            status={externalResponse.status}
            statusText={externalResponse.statusText}
            headers={externalResponse.headers}
            body={externalResponse.body}
          />
        )}
      </form>
    </Form>
  );
};
