"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportPrograms, syncMasterPrograms, pushMasterProgramsToAllZones } from "./actions";

export default function ProgramBulkActions({ events, programs, categories }: { events: any[], programs: any[], categories: any[] }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  const handleSyncMaster = async () => {
    if (!selectedEventId) {
      setError("Please select a target Event before syncing.");
      return;
    }
    
    setImporting(true);
    setError("");
    setSuccess("");
    
    const result = await syncMasterPrograms(selectedEventId);
    if (result.success) {
      if (result.count === 0) {
        setSuccess(result.message || "Programs already synced.");
      } else {
        setSuccess(`Successfully synced ${result.count} programs from Master Event into ${selectedEvent?.name}!`);
      }
    } else {
      setError(result.error || "Failed to sync programs.");
    }
    setImporting(false);
  };

  const handlePushToZones = async () => {
    if (!confirm("Are you sure? This will create or update all Master Programs in all 8 Zones immediately.")) return;
    
    setImporting(true);
    setError("");
    setSuccess("");
    
    const result = await pushMasterProgramsToAllZones();
    if (result.success) {
      setSuccess(`Successfully pushed Master Programs to all zones! (${result.count} new program records created across zones). Existing programs were updated.`);
    } else {
      setError(result.error || "Failed to push programs.");
    }
    setImporting(false);
  };

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  const handleExport = (exportCategory: string = selectedCategoryFilter, exportType: string = selectedTypeFilter) => {
    // Filter programs based on selected criteria
    let filtered = programs;
    
    // Filter by selected event
    if (selectedEventId) {
      filtered = filtered.filter(p => p.eventId === selectedEventId);
    }
    
    // Filter by category / general
    if (exportCategory === "GENERAL") {
      filtered = filtered.filter(p => p.type === "GENERAL" || !p.categoryId);
    } else if (exportCategory !== "ALL") {
      filtered = filtered.filter(p => p.categoryId === exportCategory);
    }

    // Filter by type (INDIVIDUAL / GROUP / GENERAL)
    if (exportType !== "ALL") {
      filtered = filtered.filter(p => p.type === exportType);
    }

    const exportData = filtered.map((p, index) => ({
      "Sl No": index + 1,
      "Program Code": p.programCode || "-",
      "Program Name": p.name,
      "Type": p.type,
      "Stage Type": p.stageType ? (p.stageType === "ON_STAGE" ? "On Stage" : "Off Stage") : "On Stage",
      "Category": p.type === "GENERAL" ? "General" : (p.category?.name || "General"),
      "Duration (Mins)": p.duration || 10,
      "Candidate Limit Per Team": p.candidateLimitPerTeam || 1,
      "Venue": p.venue || "Not Assigned",
      "Event": p.event?.name || selectedEvent?.name || "Fest",
      "Total Registered Candidates": p._count?.assignments || 0,
      "Assigned Judges": p.judges && p.judges.length > 0 ? p.judges.map((j: any) => j.username).join(", ") : "None",
      "Description / Guidelines": p.description || "-",
      "Evaluation Criteria": p.evaluationCriteria || "-"
    }));

    if (exportData.length === 0) {
      setError("No programs match the selected filter to export.");
      return;
    }

    const catNameLabel = exportCategory === "ALL" 
      ? "All_Categories" 
      : (exportCategory === "GENERAL" ? "General" : (categories.find(c => c.id === exportCategory)?.name || "Filtered"));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-fit column widths
    const colWidths = [
      { wch: 6 },  // Sl No
      { wch: 14 }, // Program Code
      { wch: 30 }, // Program Name
      { wch: 14 }, // Type
      { wch: 12 }, // Stage Type
      { wch: 16 }, // Category
      { wch: 16 }, // Duration
      { wch: 25 }, // Candidate Limit
      { wch: 18 }, // Venue
      { wch: 28 }, // Event
      { wch: 26 }, // Total Candidates
      { wch: 22 }, // Judges
      { wch: 35 }, // Description
      { wch: 35 }, // Criteria
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Programs_Full_Details");
    XLSX.writeFile(wb, `Programs_${selectedEvent?.name?.replace(/\s+/g, '_') || 'Event'}_${catNameLabel}_FullDetails.xlsx`);
    setSuccess(`Downloaded ${exportData.length} programs with full details (${catNameLabel})!`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedEventId) {
      setError("Please select a target Event before uploading.");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setError("The Excel file is empty.");
          setImporting(false);
          return;
        }

        const mappeCSWCgrams = data.map((row: any) => {
          const catName = row["Category"] || row["category"] || "";
          const category = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          
          return {
            programCode: row["Program Code"] || row["Code"] || row["code"] || null,
            name: row["Name"] || row["name"] || row["Program Name"] || "",
            type: (row["Type"] || row["type"] || "INDIVIDUAL").toUpperCase(),
            categoryId: category?.id || null,
            candidateLimitPerTeam: row["Candidate Limit"] || row["Limit"] || 1,
            duration: row["Duration"] || 10
          };
        });

        const invalid = mappeCSWCgrams.filter(p => !p.name);
        if (invalid.length > 0) {
          setError(`${invalid.length} programs are missing a name. Please check your file.`);
          setImporting(false);
          return;
        }

        const result = await bulkImportPrograms(selectedEventId, mappeCSWCgrams);
        if (result.success) {
          setSuccess(`Successfully imported ${result.count} programs into ${selectedEvent?.name}!`);
        } else {
          setError(result.error || "Failed to import programs.");
        }
      } catch (err) {
        console.error(err);
        setError("Error reading Excel file. Make sure it's a valid .xlsx file.");
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Target Event": selectedEvent?.name || "Main Festival",
        "Program Code": "P101",
        "Name": "Elocution English",
        "Type": "INDIVIDUAL",
        "Category": categories[0]?.name || "Senior",
        "Duration": 10,
        "Candidate Limit": 1
      },
      {
        "Target Event": selectedEvent?.name || "Main Festival",
        "Program Code": "G201",
        "Name": "Duff Muttu",
        "Type": "GROUP",
        "Category": categories[0]?.name || "Senior",
        "Duration": 15,
        "Candidate Limit": 10
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Programs_Template");
    XLSX.writeFile(wb, `Programs_Import_${selectedEvent?.name?.replace(/\s+/g, '_') || 'Template'}.xlsx`);
  };

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <h3 style={{ margin: 0 }}>Bulk Excel Upload & Template</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select target festival event, download template, and import all programs at once.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          {events.length === 1 && events[0].parentId === null ? (
            <button onClick={handlePushToZones} disabled={importing} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--success)' }}>
              🚀 Push Master Programs to All Zones
            </button>
          ) : (
            <button onClick={handleSyncMaster} disabled={importing} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔄 Sync Master Programs
            </button>
          )}
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📥 Download Template
          </button>
          <button onClick={() => handleExport("ALL", "ALL")} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#059669', color: '#fff', border: 'none' }}>
            📊 Export Excel
          </button>
          <a 
            href={`/print/programs?eventId=${selectedEventId}&categoryId=ALL`}
            target="_blank"
            className="btn btn-primary" 
            style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary)', color: '#fff', textDecoration: 'none' }}
          >
            📄 Print / PDF
          </a>
        </div>
      </div>

      {/* Target Event Selection and Category/General Filter Download Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontWeight: 700 }}>Target Event:</label>
          <select 
            className="form-input" 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ maxWidth: '280px', padding: '4px 8px', fontSize: '0.875rem' }}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        {/* Quick Filter & Download Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Quick Download by Category:</span>
          
          {/* All */}
          <div style={{ display: 'inline-flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => handleExport("ALL", "ALL")}
              style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--surface-color)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              title="Download all programs in Excel"
            >
              All (Excel)
            </button>
            <a
              href={`/print/programs?eventId=${selectedEventId}&categoryId=ALL`}
              target="_blank"
              style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#F3F4F6', color: '#111827', textDecoration: 'none', borderLeft: '1px solid var(--border-color)', fontWeight: 600 }}
              title="Print/PDF all programs"
            >
              PDF
            </a>
          </div>

          {/* General */}
          <div style={{ display: 'inline-flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #F59E0B' }}>
            <button
              onClick={() => handleExport("GENERAL", "ALL")}
              style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(232, 184, 75, 0.15)', color: '#B45309', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              title="Download General programs in Excel"
            >
              ⭐ General (Excel)
            </button>
            <a
              href={`/print/programs?eventId=${selectedEventId}&categoryId=GENERAL`}
              target="_blank"
              style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#FEF3C7', color: '#B45309', textDecoration: 'none', borderLeft: '1px solid #F59E0B', fontWeight: 700 }}
              title="Print/PDF General programs"
            >
              PDF
            </a>
          </div>

          {/* Category loops */}
          {categories
            .filter(cat => cat.name.trim().toUpperCase() !== "GENERAL")
            .map(cat => (
            <div key={cat.id} style={{ display: 'inline-flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(225, 29, 90, 0.3)' }}>
              <button
                onClick={() => handleExport(cat.id, "ALL")}
                style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(225, 29, 90, 0.08)', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                title={`Download ${cat.name} in Excel`}
              >
                🏷️ {cat.name} (Excel)
              </button>
              <a
                href={`/print/programs?eventId=${selectedEventId}&categoryId=${cat.id}`}
                target="_blank"
                style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#FFF0F4', color: 'var(--primary)', textDecoration: 'none', borderLeft: '1px solid rgba(225, 29, 90, 0.3)', fontWeight: 700 }}
                title={`Print/PDF ${cat.name}`}
              >
                PDF
              </a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', textAlign: 'center', backgroundColor: 'var(--surface-color)' }}>
        {importing ? (
          <div style={{ color: 'var(--primary)', fontWeight: 600 }}>⌛ Importing programs into {selectedEvent?.name}...</div>
        ) : (
          <>
            <input 
              type="file" 
              id="excel-upload" 
              hidden 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
            />
            <label htmlFor="excel-upload" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋📊</div>
              <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1rem' }}>
                Click to Upload Programs Excel for "{selectedEvent?.name}"
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Imports codes, names, types (INDIVIDUAL/GROUP), and category assignments.
              </div>
            </label>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}
