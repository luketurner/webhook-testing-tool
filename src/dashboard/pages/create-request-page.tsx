import { useSendRequest } from "@/dashboard/hooks";
import { requestSchema, type HandlerRequest } from "@/webhook-server/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
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
  const webookRequestUrl = `https://${window.location.hostname}`;
  const form = useForm<HandlerRequest>({
    resolver: zodResolver(requestSchema as any), // TODO
    defaultValues: {
      method: "GET",
      url: "/",
      body: null,
      headers: [],
    },
  });
  const { mutate: sendRequest } = useSendRequest();

  const handleSubmit = useCallback(
    (values: HandlerRequest) => {
      sendRequest({
        method: values.method ?? "GET",
        body: values.body,
        headers: values.headers,
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
              test requests to: <code>{webookRequestUrl}/</code>)
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
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request body</FormLabel>
                  <FormControl>
                    <CodeEditor {...field} defaultLanguage="json" />
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
