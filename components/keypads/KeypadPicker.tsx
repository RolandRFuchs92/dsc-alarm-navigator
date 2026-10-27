import type { KeypadModelDef } from "@/lib/content/types";

type Props = { keypads: KeypadModelDef[]; currentSlug: string; action: (formData: FormData) => Promise<void> };

const DISPLAY_NOTES: Record<KeypadModelDef["displayType"], string> = {
  text: "Full message LCD screen",
  lights: "Numbered zone lights, no text screen",
  icons: "Icon LCD screen",
};

// "Which keypad is on your wall?" One submit button per keypad; works without JavaScript.
export function KeypadPicker({ keypads, currentSlug, action }: Props) {
  return (
    <form action={action} className="keypad-picker">
      {keypads.map((k) => {
        const isCurrent = k.slug === currentSlug;
        return (
          <button key={k.slug} type="submit" name="keypad" value={k.slug} className={isCurrent ? "is-current" : undefined} aria-pressed={isCurrent}>
            <span className="keypad-picker-name">{k.name}</span>
            <span className="keypad-picker-note">{k.lightCount ? `${k.lightCount} ${DISPLAY_NOTES[k.displayType].toLowerCase()}` : DISPLAY_NOTES[k.displayType]}</span>
          </button>
        );
      })}
    </form>
  );
}
