import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { CodeEditor } from "./code-editor";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { HttpMethodSelector } from "./forms/http-method-selector";
import { handlerSchema, type Handler } from "@/handlers/schema";

export interface HandlerFormProps {
  initialValues?: Partial<Handler>;
  onChange: (v: Handler) => void;
}

export const HandlerForm = ({ initialValues, onChange }: HandlerFormProps) => {
  const form = useForm<Handler>({
    resolver: zodResolver(handlerSchema.omit({ order: true }) as any), // TODO
    defaultValues: initialValues,
  });

  function onSubmit(values: z.infer<typeof handlerSchema>) {
    onChange(values as Handler);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 min-w-xl max-w-3xl m-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Handler name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Method</FormLabel>
              <HttpMethodSelector
                value={field.value}
                onValueChange={field.onChange}
                defaultValue={field.value}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="path"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Path</FormLabel>
              <FormControl>
                <Input placeholder="/example/:id" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Card>
                  <CardHeader>
                    <CardTitle>Handler script</CardTitle>
                    <CardDescription>
                      Run when the handler is called. Provided <code>req</code>{" "}
                      and <code>resp</code> variables.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0">
                    <CodeEditor {...field} />
                  </CardContent>
                </Card>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save changes</Button>
      </form>
    </Form>
  );
};
