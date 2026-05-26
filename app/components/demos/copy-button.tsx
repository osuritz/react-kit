import { Check, Copy } from 'lucide-react';
import { Button } from '~/components/ui/button.tsx';
import { useClipboard } from '#hooks/use-clipboard/use-clipboard.ts';

const VALUE = 'npm install @osuritz/react-kit';

export function CopyButton() {
  const { copy, copied, error } = useClipboard({ text: VALUE, timeout: 2000 });
  return (
    <div className="flex flex-col items-center gap-3">
      <code className="bg-muted rounded px-3 py-1.5 text-sm">{VALUE}</code>
      <Button
        variant="outline"
        aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          Couldn't copy ({error.reason}).
        </p>
      )}
    </div>
  );
}
