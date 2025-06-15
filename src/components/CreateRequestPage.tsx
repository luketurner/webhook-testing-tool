import { useSendRequest } from "@/hooks";
import { type KVList } from "@/util/kv-list";
import { requestSchema } from "@/webhook-server/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { CodeEditor } from "./CodeEditor";
import { KeyValuePairEditor } from "./KeyValuePairEditor";
import { Layout } from "./Layout";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { HTTP_METHODS } from "@/util/http";

export const CreateRequestPage = () => {
  const webookRequestUrl = `https://${window.location.hostname}`;
  const form = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      method: "GET",
      url: "/",
      body: null,
      headers: [],
    },
  });
  const { trigger: sendRequest } = useSendRequest();

  const handleSubmit = useCallback(
    async (values: z.infer<typeof requestSchema>) => {
      await sendRequest({
        method: values.method ?? "GET",
        body: values.body,
        headers: values.headers as KVList<string>, // TODO
        url: values.url ?? "/",
      });
    },
    [sendRequest]
  );
  return (
    <Layout>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Test Request</CardTitle>
              <CardDescription>
                Sends a test request from your browser. (Or you can send your
                own test requests to: <code>{webookRequestUrl}/</code>)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger style={{ width: "10em" }}>
                          <SelectValue placeholder="HTTP method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HTTP_METHODS.map((item) => (
                          <SelectItem value={item} key={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="headers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headers</FormLabel>
                    <FormControl>
                      <KeyValuePairEditor
                        {...field}
                        addButtonText="Add header"
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
                      <CodeEditor {...field} defaultLanguage="json" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit">Send</Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </Layout>
  );
};
