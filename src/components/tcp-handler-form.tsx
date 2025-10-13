import { tcpHandlerSchema, type TcpHandler } from "@/tcp-handlers/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { TcpCodeEditor } from "./tcp-code-editor";
import { FormCard } from "./form/form-card";
import { TextFormField } from "./form/form-fields";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { useSearchParams } from "react-router";
import { BookOpen } from "lucide-react";
import { Switch } from "./ui/switch";

export interface TcpHandlerFormProps {
  initialValues?: Partial<TcpHandler>;
  onChange: (v: TcpHandler) => void;
  additionalButtons?: React.ReactNode;
}

export const TcpHandlerForm = ({
  initialValues,
  onChange,
  additionalButtons,
}: TcpHandlerFormProps) => {
  const form = useForm<TcpHandler>({
    resolver: zodResolver(tcpHandlerSchema as any),
    defaultValues: initialValues,
  });
  const [searchParams, setSearchParams] = useSearchParams();

  function onSubmit(values: z.infer<typeof tcpHandlerSchema>) {
    onChange(values as TcpHandler);
  }

  const handleOpenTcpHandlerDocs = () => {
    searchParams.set("manual", "tcp-handlers");
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
          placeholder="TCP handler name"
        />
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enabled</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable or disable this TCP handler
                </div>
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
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FormCard
                  title="Handler script"
                  description={<>Run when TCP data is received.</>}
                  className="p-0 h-[fit-content]"
                >
                  <div className="-ml-6 mt-0 mb-2">
                    <TcpCodeEditor {...field} />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenTcpHandlerDocs}
                    className="text-xs float-right"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    TCP Handler Documentation
                  </Button>
                </FormCard>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit">Save changes</Button>
          {additionalButtons}
        </div>
      </form>
    </Form>
  );
};
