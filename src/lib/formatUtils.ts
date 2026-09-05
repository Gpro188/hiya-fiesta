/**
 * Format institution name and place for scoreboards and result lists
 * Ensures place is neatly extracted and displayed on a second line in small font
 */
export function formatInstitutionDisplay(team: {
  name?: string | null;
  place?: string | null;
  institution?: { name?: string | null; place?: string | null } | null;
} | null | undefined): { name: string; place: string } {
  if (!team) return { name: "Unknown", place: "" };

  let rawName = (team.institution?.name || team.name || "").trim();
  let rawPlace = (team.place || team.institution?.place || "").trim();

  // If place is not explicitly provided, check if rawName ends with ", PLACE"
  if (!rawPlace && rawName.includes(",")) {
    const parts = rawName.split(",");
    rawName = parts[0].trim();
    rawPlace = parts.slice(1).join(",").trim();
  } else if (rawPlace) {
    // If rawName contains ", PLACE" at the end, strip it from name so it isn't repeated
    const escapedPlace = rawPlace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rawName = rawName.replace(new RegExp(`,\\s*${escapedPlace}$`, 'i'), '').trim();

    // Also check if rawName still contains a trailing comma-separated place that differs from rawPlace
    if (rawName.includes(",")) {
      const parts = rawName.split(",");
      const trailingPart = parts.slice(1).join(",").trim();
      rawName = parts[0].trim();
      if (!rawPlace.toLowerCase().includes(trailingPart.toLowerCase())) {
        rawPlace = `${trailingPart}, ${rawPlace}`;
      }
    }
  }

  return {
    name: rawName || "Unknown Institution",
    place: rawPlace,
  };
}
