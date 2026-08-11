"use client";

import { useState } from "react";
import { generateChestNumbers } from "./actions";

export default function GenerateChestNumbersButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!eventId) {
      alert("No active event selected.");
      return;
    }

    if (!confirm("Are you sure? This will generate chest numbers for all approved candidates in this event, grouped by category and institution. Existing numbers will be overwritten.")) {
      return;
    }

    setLoading(true);
    const result = await generateChestNumbers(eventId);
    if (result.success) {
      alert(`Successfully generated chest numbers for ${result.count} candidates.`);
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleGenerate} 
      disabled={loading} 
      className="btn btn-primary"
      style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
    >
      {loading ? "Generating..." : "Generate Chest Numbers"}
    </button>
  );
}
