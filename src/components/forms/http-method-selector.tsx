import { HTTP_METHODS } from "@/util/http";
import { FormControl } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface HttpMethodSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const HttpMethodSelector = ({
  value,
  onValueChange,
  defaultValue,
  placeholder = "HTTP method",
  disabled,
}: HttpMethodSelectorProps) => {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
    >
      <FormControl>
        <SelectTrigger style={{ width: "10em" }}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {HTTP_METHODS.map((method) => (
          <SelectItem value={method} key={method}>
            {method}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
