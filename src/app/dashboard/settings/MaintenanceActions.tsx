"use client";

import { useState } from "react";
import { 
  exportAllData, 
  resetSystem, 
  restoreStepWipe,
  restoreStepZonesAndInstitutions,
  restoreStepEventsAndCategories,
  restoreStepTeamsAndPrograms,
  restoreStepCandidates,
  restoreStepAssignmentsAndResults,
  restoreStepFinalize
} from "./actions";

export default function MaintenanceActions() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [currentStepText, setCurrentStepText] = useState("");

  const handleExport = async () => {
    setLoading(true);
    setStatus("Generating backup snapshot...");
    setProgress(null);
    try {
      const result = await exportAllData();
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ArtsFest_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus("✅ Full backup downloaded successfully!");
      } else {
        setStatus("❌ " + result.error);
      }
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Failed to generate backup"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const confirmed = confirm("⚠️ DANGER: This will delete ALL events, teams, programs, candidates, and results. This CANNOT be undone unless you have a backup. Are you sure you want to start a New Fest?");
    if (!confirmed) return;

    const secondConfirm = confirm("FINAL WARNING: Are you REALLY sure? All your festival data will be permanently wiped.");
    if (!secondConfirm) return;

    setLoading(true);
    setStatus("Wiping system data...");
    setProgress(null);
    try {
      const result = await resetSystem();
      if (result.success) {
        setStatus("✅ System wiped successfully! You can now start a fresh festival.");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus("❌ " + result.error);
      }
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = confirm("⚠️ This will overwrite all CURRENT data with the data from this backup file. Proceed?");
    if (!confirmed) {
      e.target.value = "";
      return;
    }

    setLoading(true);
    setStatus("");
    setProgress(5);
    setCurrentStepText("Reading backup file...");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawJson = JSON.parse(evt.target?.result as string);
        const data = rawJson.data || rawJson; // Handle wrapped or raw backup JSON

        // Step 1: Wipe (15%)
        setProgress(15);
        setCurrentStepText("Step 1/6: Preparing database and cleaning old records...");
        const res1 = await restoreStepWipe();
        if (!res1.success) throw new Error(res1.error || "Wipe step failed");

        // Step 2: Zones & Institutions & Students (35%)
        setProgress(35);
        setCurrentStepText("Step 2/6: Restoring Zones, Institutions & Master Students...");
        const res2 = await restoreStepZonesAndInstitutions(data.zones || [], data.institutions || [], data.students || []);
        if (!res2.success) throw new Error(res2.error || "Zones & Institutions step failed");

        // Step 3: Events & Categories (55%)
        setProgress(55);
        setCurrentStepText("Step 3/6: Restoring Festival Events & Category structures...");
        const res3 = await restoreStepEventsAndCategories(data.events || [], data.users || []);
        if (!res3.success) throw new Error(res3.error || "Events & Categories step failed");

        // Step 4: Teams & Programs (70%)
        setProgress(70);
        setCurrentStepText("Step 4/6: Restoring Teams & Competition Program schedules...");
        const res4 = await restoreStepTeamsAndPrograms(data.teams || [], data.programs || []);
        if (!res4.success) throw new Error(res4.error || "Teams & Programs step failed");

        // Step 5: Candidates (85%)
        setProgress(85);
        setCurrentStepText("Step 5/6: Restoring Candidates & Student Profiles...");
        const res5 = await restoreStepCandidates(data.candidates || []);
        if (!res5.success) throw new Error(res5.error || "Candidates step failed");

        // Step 6: Assignments & Results (95%)
        setProgress(95);
        setCurrentStepText("Step 6/6: Restoring Program Assignments, Scores & Tabulations...");
        const res6 = await restoreStepAssignmentsAndResults(data.programAssignments || [], data.results || []);
        if (!res6.success) throw new Error(res6.error || "Assignments & Results step failed");

        // Step 7: Finalize & Settings (100%)
        setProgress(100);
        setCurrentStepText("🎉 Finalizing restore and updating system settings...");
        await restoreStepFinalize(data.globalSettings || (data.settings ? [data.settings] : []), data.homepageSettings || []);

        setStatus("✅ Full Festival Data Restored Successfully (100%)!");
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (err: any) {
        console.error("Restore error:", err);
        setStatus("❌ Restore Failed: " + (err.message || "Invalid backup file format"));
        setProgress(null);
        setCurrentStepText("");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      setStatus("❌ Error reading backup file.");
      setLoading(false);
      setProgress(null);
      e.target.value = "";
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ marginTop: 'var(--spacing-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
        
        {/* Backup */}
        <div style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📥 Backup All Data
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Save the complete snapshot of all zones, fests, candidates, scores, and settings to a file.
          </p>
          <button onClick={handleExport} className="btn btn-secondary" style={{ width: '100%' }} disabled={loading}>
            Download Full Backup (.json)
          </button>
        </div>

        {/* Reset */}
        <div style={{ padding: 'var(--spacing-md)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧹 Clean System (New Fest)
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Delete all current data to start a new festival. Make sure you have a backup first!
          </p>
          <button onClick={handleReset} className="btn btn-secondary" style={{ width: '100%', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.5)' }} disabled={loading}>
            Wipe All Data & Start Fresh
          </button>
        </div>

        {/* Restore */}
        <div style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📤 Restore Backup
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Load data from a previously saved backup file. Shows live progress from 0% to 100%.
          </p>
          <input type="file" id="restore-file" hidden accept=".json" onChange={handleImport} disabled={loading} />
          <label htmlFor="restore-file" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', cursor: loading ? 'not-allowed' : 'pointer', padding: '0.75rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? "Restoring in Progress..." : "Select Backup File"}
          </label>
        </div>

      </div>

      {/* Progress Bar Component */}
      {progress !== null && (
        <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentStepText || "Restoring Data..."}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: progress === 100 ? '#10B981' : 'var(--primary)' }}>
              {progress}%
            </span>
          </div>

          <div style={{ width: '100%', height: '12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
            <div 
              style={{ 
                width: `${progress}%`, 
                height: '100%', 
                background: progress === 100 ? '#10B981' : 'linear-gradient(90deg, #A3005C, #3B82F6)', 
                borderRadius: '6px', 
                transition: 'width 0.4s ease-in-out' 
              }} 
            />
          </div>
        </div>
      )}

      {status && (
        <div style={{ 
          marginTop: 'var(--spacing-md)', 
          padding: 'var(--spacing-md)', 
          borderRadius: 'var(--radius-md)', 
          textAlign: 'center', 
          fontSize: '0.95rem', 
          backgroundColor: status.startsWith('✅') ? 'rgba(16, 185, 129, 0.12)' : (status.startsWith('❌') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.05)'), 
          color: status.startsWith('✅') ? '#10B981' : (status.startsWith('❌') ? '#EF4444' : 'var(--text-primary)'),
          fontWeight: 600,
          border: `1px solid ${status.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : (status.startsWith('❌') ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)')}`
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

