import { type KVList } from "@/util/kv-list";
import { cn } from "@/util/ui";
import { Fragment } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PlusIcon, XIcon } from "lucide-react";
import { arrayReplace } from "@/util/array";

export interface KeyValuePairEditorProps<ValueType>
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  value: KVList<ValueType>;
  onChange: (e: KVList<ValueType>) => void;
  addButtonText?: string;
}

export function KeyValuePairEditor({
  className,
  value: valuesList,
  onChange,
  addButtonText,
  ...props
}: // TODO -- support value types other than string
KeyValuePairEditorProps<string>) {
  return (
    <div>
      <div
        className={cn(
          "grid grid-cols-[repeat(2,_minmax(0,_1fr))_3rem] gap-1 mb-1",
          className,
        )}
        {...props}
      >
        {valuesList.map(([name, value], ix) => (
          <Fragment key={ix}>
            <Input
              value={name}
              onChange={(e) =>
                onChange(arrayReplace(valuesList, ix, [e.target.value, value]))
              }
            />
            <Input
              value={value}
              onChange={(e) =>
                onChange(arrayReplace(valuesList, ix, [name, e.target.value]))
              }
            />
            <Button
              onClick={() => onChange(arrayReplace(valuesList, ix))}
              type="button"
              variant="destructive"
              size="icon"
            >
              <XIcon />
            </Button>
          </Fragment>
        ))}
      </div>
      <Button
        onClick={() => onChange([...valuesList, ["", ""]])}
        type="button"
        variant="secondary"
        size="sm"
      >
        <PlusIcon />
        {addButtonText ?? ""}
      </Button>
    </div>
  );
}
