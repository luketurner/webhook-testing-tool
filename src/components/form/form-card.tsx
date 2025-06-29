import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";

// AIDEV-NOTE: Standardized card wrapper for forms to reduce duplication

interface FormCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormCard({
  title,
  description,
  children,
  className,
}: FormCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
