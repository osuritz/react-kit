import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export interface CodeBlockProps {
  raw: string;
  html: string;
  className?: string;
}

export function CodeBlock({ raw, html, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={cn(
        "group relative",
        "[&_pre]:max-h-80 [&_pre]:overflow-auto",
        "[&_pre]:rounded-md [&_pre]:p-4",
        "[&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed",
        // Shiki writes inline style="background-color:...; color:..." on
        // the <pre>; force our CSS-vars to win.
        "[&_pre]:![background-color:var(--shiki-background)]",
        "[&_pre]:![color:var(--shiki-foreground)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={async () => {
          await navigator.clipboard.writeText(raw);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="bg-background/80 text-muted-foreground hover:text-foreground border-border absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded border opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      {/* HTML is build-time output of Shiki over file-owned source — not user input. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
