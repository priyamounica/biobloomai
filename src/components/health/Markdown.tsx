import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-health text-[15px]">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
