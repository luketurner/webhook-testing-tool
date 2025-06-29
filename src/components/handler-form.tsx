import { handlerSchema, type Handler } from "@/handlers/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { CodeEditor } from "./code-editor";
import { FormCard } from "./form/form-card";
import { TextFormField } from "./form/form-fields";
import { HttpMethodSelect } from "./form/http-method-select";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";

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
        <TextFormField
          control={form.control}
          name="name"
          label="Name"
          placeholder="Handler name"
        />
        <HttpMethodSelect
          control={form.control}
          name="method"
          label="Method"
          includeWildcard={true}
        />
        <TextFormField
          control={form.control}
          name="path"
          label="Path"
          placeholder="/example/:id"
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FormCard
                  title="Handler script"
                  description={
                    <>
                      Run when the handler is called. Provided <code>req</code>{" "}
                      and <code>resp</code> variables.
                    </>
                  }
                  className="p-0 h-[fit-content]"
                >
                  <div className="-ml-6 mt-0">
                    <CodeEditor {...field} />
                  </div>
                </FormCard>
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
