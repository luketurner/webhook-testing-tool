import { useSendRequest } from "@/dashboard/hooks";
import { requestSchema, type HandlerRequest } from "@/webhook-server/schema";
import { useWebhookUrl } from "@/util/hooks/use-webhook-url";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CodeEditor } from "@/components/code-editor";
import { KeyValuePairEditor } from "@/components/key-value-pair-editor";
import { Button } from "@/components/ui/button";
import { FormCard } from "@/components/form/form-card";
import { HttpMethodSelect } from "@/components/form/http-method-select";
import { TextFormField } from "@/components/form/form-fields";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CardFooter } from "@/components/ui/card";

export const CreateRequestPage = () => {
  const { baseUrl } = useWebhookUrl();
  const form = useForm<HandlerRequest>({
    resolver: zodResolver(requestSchema as any), // TODO
    defaultValues: {
      method: "GET",
      url: "/",
      body: null,
      headers: [],
      query: [],
    },
  });
  const { mutate: sendRequest } = useSendRequest();

  const selectedMethod = form.watch("method");
  const methodsWithoutBody = ["GET", "HEAD", "OPTIONS"];
  const bodyDisabled = methodsWithoutBody.includes(selectedMethod);

  useEffect(() => {
    if (bodyDisabled) {
      form.setValue("body", null);
    }
  }, [bodyDisabled, form]);

  const handleSubmit = useCallback(
    (values: HandlerRequest) => {
      sendRequest({
        method: values.method ?? "GET",
        body: values.body,
        headers: values.headers,
        query: values.query,
        url: values.url ?? "/",
      });
    },
    [sendRequest],
  );
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormCard
          className="mt-4"
          title="Test Request"
          description={
            <>
              Sends a test request from your browser. (Or you can send your own
              test requests to: <code>{baseUrl}/</code>)
            </>
          }
        >
          <div className="space-y-4">
            <HttpMethodSelect
              control={form.control}
              name="method"
              label="Method"
            />
            <TextFormField
              control={form.control}
              name="url"
              label="Path"
              placeholder="/"
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
      </form>
    </Form>
  );
};
