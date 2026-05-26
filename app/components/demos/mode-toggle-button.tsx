import { Moon, Sun } from 'lucide-react';
import { Button } from '~/components/ui/button.tsx';
import { useColorScheme } from '#hooks/color-scheme/color-scheme.tsx';

export function ModeToggleButton() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={() => void setColorScheme(isDark ? 'light' : 'dark')}
      className="relative"
    >
      <Sun className="rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
