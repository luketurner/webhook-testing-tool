import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/util/ui";
import type { ReactNode } from "react";

interface DataSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DataSection({
  title,
  children,
  className,
  contentClassName,
}: DataSectionProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}
