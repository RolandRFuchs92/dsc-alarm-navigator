/* Map copy that depends on the panel family. The DSC strings are the legacy app's, word for word; the IDS strings
   quote the X-Series Installer Manual 700-398-02O §8 (Programming Quick Reference Guide). */
import type { ReactNode } from "react";

export type MapCopy = {
  legend: Array<{ dot?: string; text: string }>; // under "You are here": what the status lights mean
  commandsSummary: string; // the tree's group of keypad commands
  installerHeading: string; // the tree's heading over the installer sections
  overviewBadge: string | null;
  overviewDesc: ReactNode;
  commandsHeading: string;
  hasInstallerHelp: boolean; // the DSC "How installer programming works" pane at Enter Section
  toggleHint: string; // above the options table
  sectionLink: (ref: number) => string; // a guide step's link into the map
};

const padded = (n: number): string => String(n).padStart(3, "0");

const DSC_COPY: MapCopy = {
  legend: [
    { dot: "armed", text: "Armed light on = waiting for a section number" },
    { dot: "ready", text: "Ready light on = waiting for data (flashing = HEX)" },
  ],
  commandsSummary: "[*] commands",
  installerHeading: "Installer programming [*][8]",
  overviewBadge: "[*] menu",
  overviewDesc: <>Every menu starts with the <strong>[*]</strong> key. Pick a command to see where it leads, or press the keys on the keypad.</>,
  commandsHeading: "Commands",
  hasInstallerHelp: true,
  toggleHint: "Click a row, or press its number on the keypad, to flip it. The keypad screen shows the number when ON and a dash when OFF.",
  sectionLink: (ref) => `View this section [${padded(ref)}]`,
};

const IDS_COPY: MapCopy = {
  legend: [
    { dot: "ready", text: "READY flashing = program mode, waiting for a location number" },
    { text: "READY on + AWAY flashing = inside a location, waiting for data" },
    { text: "READY on + ARM + AWAY flashing = extended location" },
  ],
  commandsSummary: "User program options",
  installerHeading: "Installer programming (# code *)",
  overviewBadge: null,
  overviewDesc: (
    <>
      User program mode starts by holding <strong>[*]</strong> until the beep, then the master code and <strong>[*]</strong> (user
      manual §9). Installer programming starts with <strong>[#]</strong>, the installer code, then <strong>[*]</strong> (installer
      manual §8). Pick an option or a location to see it, or press the keys on the keypad.
    </>
  ),
  commandsHeading: "User program options",
  hasInstallerHelp: false,
  // §8 Programming a Bitmapped Location; the engine flips light N with [N] [*] (§7).
  toggleHint: "Type a light number then [*] on the keypad to switch it. A lit zone light is ON.",
  sectionLink: (ref) => `View this location [${ref}]`,
};

const MAP_COPY: Record<string, MapCopy> = { "dsc-powerseries": DSC_COPY, "ids-xseries": IDS_COPY };

export function readMapCopy(engineKey: string): MapCopy {
  const copy = MAP_COPY[engineKey];
  if (!copy) throw new Error(`No map copy for engine key "${engineKey}"`);
  const result = copy;
  return result;
}
