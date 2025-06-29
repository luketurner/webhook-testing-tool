import { HTTP_METHODS } from "@/util/http";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Control } from "react-hook-form";

// AIDEV-NOTE: Extracted HTTP method select to reduce duplication between
// create-request-page.tsx and handler-form.tsx

interface HttpMethodSelectProps {
  control: Control<any>;
  name: string;
  label?: string;
  includeWildcard?: boolean;
}

export function HttpMethodSelect({
  control,
  name,
  label = "Method",
  includeWildcard = false,
}: HttpMethodSelectProps) {
  const methods = includeWildcard ? ["*", ...HTTP_METHODS] : HTTP_METHODS;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {methods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
