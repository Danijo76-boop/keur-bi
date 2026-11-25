export type EvenementIcs = { id: string; titre: string; detail?: string; date: Date; dureeMinutes?: number };

function horodatage(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function echapper(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// La norme iCalendar limite une ligne à 75 octets : la suite passe à la ligne, précédée d'un espace.
function plier(ligne: string): string {
  const morceaux: string[] = [];
  for (let reste = ligne; reste.length > 0; reste = reste.slice(60)) morceaux.push(reste.slice(0, 60));
  return morceaux.join("\r\n ");
}

export function genererIcs(evenements: EvenementIcs[]): string {
  const maintenant = horodatage(new Date());
  const blocs = evenements.flatMap((e) => [
    "BEGIN:VEVENT",
    `UID:${e.id}@keurbi`,
    `DTSTAMP:${maintenant}`,
    `DTSTART:${horodatage(e.date)}`,
    `DTEND:${horodatage(new Date(e.date.getTime() + (e.dureeMinutes ?? 60) * 60_000))}`,
    `SUMMARY:${echapper(e.titre)}`,
    ...(e.detail ? [`DESCRIPTION:${echapper(e.detail)}`] : []),
    "END:VEVENT",
  ]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KEUR GUI//Calendrier//FR", ...blocs, "END:VCALENDAR"].map(plier).join("\r\n") + "\r\n";
}
