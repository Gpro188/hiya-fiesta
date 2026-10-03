"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ZoneFilterSelector({
  allZones,
  activeZoneId,
}: {
  allZones: { id: string; name: string }[];
  activeZoneId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (targetZone: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (targetZone) {
      sp.set("zoneId", targetZone);
    } else {
      sp.delete("zoneId");
    }
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8" }}>ZONE:</span>
      <select
        defaultValue={activeZoneId || ""}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          padding: "5px 8px",
          backgroundColor: "#1e293b",
          color: "#ffffff",
          border: "1px solid #334155",
          borderRadius: "5px",
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        <option value="">All Zones</option>
        {allZones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>
    </div>
  );
}
