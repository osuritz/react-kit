import { Monitor, Moon, Sun } from "lucide-react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "#components/ui/toggle-group.tsx";
import {
  useColorScheme,
  type UserSpecifiedColorScheme,
} from "#hooks/color-scheme/color-scheme.tsx";

export function ModeToggleSegmented() {
  const { userSpecifiedColorScheme, colorScheme, setColorScheme } =
    useColorScheme();

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup<UserSpecifiedColorScheme>
        value={[userSpecifiedColorScheme]}
        onValueChange={([next]) => next && void setColorScheme(next)}
      >
        <ToggleGroupItem value="light" aria-label="Light">
          <Sun />
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Dark">
          <Moon />
        </ToggleGroupItem>
        <ToggleGroupItem value="system" aria-label="System">
          <Monitor />
        </ToggleGroupItem>
      </ToggleGroup>
      {userSpecifiedColorScheme === "system" && (
        <p className="text-muted-foreground text-xs">
          System resolves to: {colorScheme}
        </p>
      )}
    </div>
  );
}
