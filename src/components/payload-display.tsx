import SyntaxHighlighter from "react-syntax-highlighter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PayloadDisplay = ({
  content,
  title,
}: {
  content: string;
  title: string;
}) => {
  let prettyContent: string | null = null;
  try {
    prettyContent = JSON.stringify(JSON.parse(content), null, 2);
  } catch (e) {}

  if (!content) {
    return <em>No {title.toLowerCase()}.</em>;
  }

  return (
    <Tabs defaultValue="raw" className="w-full">
      <TabsList>
        <TabsTrigger value="raw">Raw</TabsTrigger>
        {prettyContent && <TabsTrigger value="pretty">Pretty</TabsTrigger>}
      </TabsList>
      <TabsContent value="raw">
        <pre className="overflow-x-auto p-2 bg-muted rounded text-sm">
          <code>{content}</code>
        </pre>
      </TabsContent>
      {prettyContent && (
        <TabsContent value="pretty">
          <div className="overflow-x-auto">
            <SyntaxHighlighter language="json" className="text-sm">
              {prettyContent}
            </SyntaxHighlighter>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
};
