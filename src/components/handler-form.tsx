import { handlerSchema, type Handler } from "@/handlers/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { CodeEditor } from "./code-editor";
import { FormCard } from "./form/form-card";
import { TextFormField, TextareaFormField } from "./form/form-fields";
import { HttpMethodSelect } from "./form/http-method-select";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { useSearchParams } from "react-router";
import { BookOpen } from "lucide-react";

export interface HandlerFormProps {
  initialValues?: Partial<Handler>;
  onChange: (v: Handler) => void;
}

export const HandlerForm = ({ initialValues, onChange }: HandlerFormProps) => {
  const form = useForm<Handler>({
    resolver: zodResolver(handlerSchema.omit({ order: true }) as any), // TODO
    defaultValues: initialValues,
  });
  const [searchParams, setSearchParams] = useSearchParams();

  function onSubmit(values: z.infer<typeof handlerSchema>) {
    onChange(values as Handler);
  }

  const handleOpenHandlerDocs = () => {
    searchParams.set("manual", "handlers");
    setSearchParams(searchParams);
  };

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
        <TextFormField
          control={form.control}
          name="jku"
          label="JKU (JSON Web Key Set URL)"
          placeholder="https://example.com/.well-known/jwks.json"
          type="url"
        />
        <TextareaFormField
          control={form.control}
          name="jwks"
          label="JWKS (JSON Web Key Set)"
          placeholder="Enter JWKS JSON content here..."
          description="Provide the JWKS JSON content for JWT verification"
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
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenHandlerDocs}
                  className="text-xs"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Handler Documentation
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save changes</Button>
      </form>
    </Form>
  );
};
