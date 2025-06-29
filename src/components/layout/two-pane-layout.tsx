import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

// AIDEV-NOTE: Two-pane layout component for request/response comparison views

interface TwoPaneLayoutProps {
  leftPane: {
    title: string;
    children: ReactNode;
  };
  rightPane: {
    title: string;
    children: ReactNode;
  };
  className?: string;
}

export function TwoPaneLayout({
  leftPane,
  rightPane,
  className,
}: TwoPaneLayoutProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className || ""}`}>
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">{leftPane.title}</h3>
        {leftPane.children}
      </Card>
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">{rightPane.title}</h3>
        {rightPane.children}
      </Card>
    </div>
  );
}
