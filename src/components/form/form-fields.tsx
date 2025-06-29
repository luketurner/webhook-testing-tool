import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Control } from "react-hook-form";

// AIDEV-NOTE: Higher-level form field components to reduce repetitive form field patterns

interface BaseFormFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
}

interface TextFormFieldProps extends BaseFormFieldProps {
  type?: "text" | "email" | "password" | "url" | "number";
}

export function TextFormField({
  control,
  name,
  label,
  description,
  placeholder,
  type = "text",
}: TextFormFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaFormField({
  control,
  name,
  label,
  description,
  placeholder,
}: BaseFormFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea placeholder={placeholder} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
