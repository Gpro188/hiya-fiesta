"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { bulkImportInstitutions, updateInstitution, deleteInstitution } from "./actions";
import { formatInstitutionDisplay } from "@/lib/formatUtils";
import {
  UploadCloud,
  Download,
  Plus,
  Building2,
  Search,
  X,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

export default function InstitutionsClient({ initialInstitutions, zones }: { initialInstitutions: any[], zones: any[] }) {
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUploadZoneId, setSelectedUploadZoneId] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editingInst, setEditingInst] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const downloadTemplate = () => {
    const sampleData = [
      {
        "Code": "SIG",
        "Password": "123",
        "Affiliation No": "CSWC /155/2026",
        "Institution Name": "SIDRA INSTITUTE FOR GIRLS",
        "Place": "ANCHACHAVIDI",
        "Zone": "KASARAGOD Zone",
        "District": "MALAPPURAM",
        "Stream": "FADHILA FADHEELA"
      },
      {
        "Code": "TWI",
        "Password": "123",
        "Affiliation No": "CSWC /157/2026",
        "Institution Name": "THARBIYYA WOMEN'S ISLAMIC AND ARTS COLLEGE",
        "Place": "MUNDAPPALAM",
        "Zone": "KASARAGOD Zone",
        "District": "MALAPPURAM",
        "Stream": "FADHILA"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Institutions_Template");
    XLSX.writeFile(wb, "CSWC_Master_Institutions_Template.xlsx");
  };

  const processFile = async (file: File) => {
    if (!file) return;

    setImporting(true);
    setImportProgress(20);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImportProgress(50);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setError("The uploaded file is empty.");
          setImporting(false);
          setImportProgress(0);
          return;
        }

        setImportProgress(70);

        const mapped = data.map((row: any) => ({
          code: (row["Code"] || row["code"] || "").toString().trim(),
          password: (row["Password"] || row["password"] || "123").toString().trim(),
          affiliationNo: (row["Affiliation No"] || row["affiliationNo"] || "").toString().trim(),
          name: (row["Institution Name"] || row["Name"] || "").toString().trim(),
          place: (row["Place"] || row["place"] || "").toString().trim(),
          district: (row["District"] || row["district"] || "").toString().trim(),
          stream: (row["Stream"] || row["stream"] || "").toString().trim(),
          zoneName: (row["Zone"] || row["zone"] || "").toString().trim(),
        }));

        const result = await bulkImportInstitutions(mapped);
        setImportProgress(100);
        if (result.success) {
          setSuccess(`${result.count} institutions imported. Login credentials provisioned.`);
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setError(result.error || "Import failed.");
        }
      } catch (err) {
        console.error(err);
        setError("Error parsing file. Ensure valid .xlsx format.");
      }
      setImporting(false);
      setImportProgress(0);
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      await processFile(file);
    } else {
      setError("Only .xlsx or .xls files are accepted.");
    }
  }, []);

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInst) return;
    setEditLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      affiliationNo: formData.get("affiliationNo") as string,
      place: formData.get("place") as string,
      zoneId: formData.get("zoneId") as string,
      district: formData.get("district") as string,
      stream: formData.get("stream") as string,
      password: formData.get("password") as string,
    };

    const res = await updateInstitution(editingInst.id, data);
    if (res.success) {
      setEditingInst(null);
      window.location.reload();
    } else {
      alert("Failed to update: " + res.error);
    }
    setEditLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      const res = await deleteInstitution(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Delete failed: " + res.error);
      }
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = [{
      code: formData.get("code") as string,
      password: (formData.get("password") as string) || "123",
      affiliationNo: formData.get("affiliationNo") as string,
      name: formData.get("name") as string,
      place: formData.get("place") as string,
      district: formData.get("district") as string,
      stream: formData.get("stream") as string,
      zoneName: zones.find(z => z.id === formData.get("zoneId"))?.name || ""
    }];

    const result = await bulkImportInstitutions(data);
    if (result.success) {
      setShowAddModal(false);
      window.location.reload();
    } else {
      alert("Failed to add institution: " + result.error);
    }
    setEditLoading(false);
  };

  // Search and Filters
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [selectedStream, setSelectedStream] = useState("ALL");

  const streamCounts = institutions.reduce((acc: Record<string, number>, inst) => {
    const s = (inst.stream || "FADHILA").trim().toUpperCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const zoneCounts = institutions.reduce((acc: Record<string, number>, inst) => {
    const zName = inst.zone?.name || "Unassigned";
    acc[zName] = (acc[zName] || 0) + 1;
    return acc;
  }, {});

  const filteredInstitutions = institutions.filter((inst) => {
    const { name: instName, place: instPlace } = formatInstitutionDisplay(inst);
    const q = search.toLowerCase();
    const matchesSearch =
      instName.toLowerCase().includes(q) ||
      (instPlace && instPlace.toLowerCase().includes(q)) ||
      inst.name?.toLowerCase().includes(q) ||
      inst.code?.toLowerCase().includes(q) ||
      inst.place?.toLowerCase().includes(q) ||
      inst.district?.toLowerCase().includes(q) ||
      (inst.affiliationNo && inst.affiliationNo.toLowerCase().includes(q));

    const matchesZone =
      selectedZone === "ALL" ||
      (selectedZone === "UNASSIGNED" ? !inst.zone : inst.zone?.id === selectedZone || inst.zone?.name === selectedZone);

    const matchesStream =
      selectedStream === "ALL" ||
      (inst.stream || "FADHILA").trim().toUpperCase() === selectedStream.toUpperCase();

    return matchesSearch && matchesZone && matchesStream;
  });

  const hasFilters = selectedZone !== "ALL" || selectedStream !== "ALL" || search;

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Institutions</h1>
          <p className="page-subtitle">
            {institutions.length} institutions across {zones.length} regional zones
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={16} strokeWidth={1.5} />
          Add institution
        </button>
      </div>

      {/* ── Upload Card ── */}
      <div
        className="glass-panel"
        style={{ padding: "var(--space-5)", marginBottom: "var(--space-5)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            flexWrap: "wrap",
            marginBottom: "var(--space-4)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)", marginBottom: "2px" }}>
              Upload institutions
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Excel (.xlsx) up to 10 MB. Columns: Code, Affiliation No, Institution Name, Place, Zone, District, Stream.
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "var(--text-sm)",
              color: "var(--brand)",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Download size={14} strokeWidth={1.5} />
            Download template
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`upload-zone${isDragOver ? " drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !importing && fileInputRef.current?.click()}
          style={{ cursor: importing ? "default" : "pointer" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="inst-upload"
            hidden
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
          />

          {importing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
              <Loader2
                size={24}
                strokeWidth={1.5}
                style={{ color: "var(--brand)", animation: "spin 1s linear infinite" }}
              />
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
                Importing institutions...
              </div>
              <div
                style={{
                  width: "200px",
                  height: "4px",
                  background: "var(--border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${importProgress}%`,
                    background: "var(--brand)",
                    borderRadius: "2px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="upload-icon-holder">
                <UploadCloud size={20} strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)", marginBottom: "4px" }}>
                Browse files
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                Drag and drop your .xlsx file, or click to browse
              </div>
            </>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div
            style={{
              marginTop: "var(--space-3)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "var(--text-sm)",
              color: "var(--danger)",
              padding: "8px 12px",
              background: "var(--danger-bg)",
              border: "1px solid var(--danger-border)",
              borderRadius: "var(--radius)",
            }}
          >
            <AlertCircle size={14} strokeWidth={1.5} />
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              marginTop: "var(--space-3)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "var(--text-sm)",
              color: "var(--success)",
              padding: "8px 12px",
              background: "var(--success-bg)",
              border: "1px solid var(--success-border)",
              borderRadius: "var(--radius)",
            }}
          >
            <CheckCircle2 size={14} strokeWidth={1.5} />
            {success}
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "var(--space-5)",
        }}
      >
        <button
          onClick={() => { setSelectedStream("ALL"); setSelectedZone("ALL"); }}
          className="glass-panel"
          style={{
            padding: "var(--space-4)",
            cursor: "pointer",
            border: selectedStream === "ALL" && selectedZone === "ALL"
              ? "1px solid var(--brand)"
              : "1px solid var(--border)",
            background: selectedStream === "ALL" && selectedZone === "ALL"
              ? "var(--brand-tint)"
              : "var(--surface)",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
            Total
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
            {institutions.length}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "2px" }}>
            across {zones.length} zones
          </div>
        </button>

        {Object.entries(streamCounts).map(([streamName, count]) => (
          <button
            key={streamName}
            onClick={() => setSelectedStream(selectedStream === streamName ? "ALL" : streamName)}
            className="glass-panel"
            style={{
              padding: "var(--space-4)",
              cursor: "pointer",
              border: selectedStream === streamName ? "1px solid var(--info)" : "1px solid var(--border)",
              background: selectedStream === streamName ? "var(--info-bg)" : "var(--surface)",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
              {streamName}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
              {count}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "2px" }}>
              {Math.round((count / (institutions.length || 1)) * 100)}% of total
            </div>
          </button>
        ))}
      </div>

      {/* ── Directory Table ── */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        {/* Table header / filters */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-4) var(--space-5)",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)" }}>
              Registered Institutions
              <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "6px" }}>
                ({filteredInstitutions.length}
                {filteredInstitutions.length !== institutions.length && ` of ${institutions.length}`})
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                strokeWidth={1.5}
                style={{
                  position: "absolute",
                  left: "9px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search institutions..."
                className="form-input"
                style={{ paddingLeft: "28px", width: "200px" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Zone Filter */}
            <select
              className="form-input"
              style={{ width: "auto", minWidth: "140px" }}
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="ALL">All zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({zoneCounts[z.name] || 0})
                </option>
              ))}
              {zoneCounts["Unassigned"] ? (
                <option value="UNASSIGNED">Unassigned ({zoneCounts["Unassigned"]})</option>
              ) : null}
            </select>

            {/* Stream Filter */}
            <select
              className="form-input"
              style={{ width: "auto", minWidth: "130px" }}
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
            >
              <option value="ALL">All streams</option>
              {Object.keys(streamCounts).map((s) => (
                <option key={s} value={s}>
                  {s} ({streamCounts[s]})
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={() => { setSelectedZone("ALL"); setSelectedStream("ALL"); setSearch(""); }}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <X size={14} strokeWidth={1.5} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {filteredInstitutions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Building2 size={32} strokeWidth={1} />
            </div>
            <div className="empty-state-title">No institutions found</div>
            <div className="empty-state-desc">
              {hasFilters
                ? "No institutions match the selected filters."
                : "Upload an Excel file to import institutions."}
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSelectedZone("ALL"); setSelectedStream("ALL"); setSearch(""); }}
                className="btn btn-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Affiliation No.</th>
                  <th>Institution</th>
                  <th>Zone</th>
                  <th>District</th>
                  <th>Stream</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstitutions.map((inst) => {
                  const { name: instName, place: instPlace } = formatInstitutionDisplay(inst);
                  return (
                    <tr key={inst.id}>
                      <td>
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: "var(--text-xs)",
                            fontFamily: "var(--font-mono)",
                            color: "var(--brand)",
                          }}
                        >
                          {inst.code}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                        {inst.affiliationNo || "—"}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: "var(--text-sm)" }}>{instName}</div>
                        {instPlace && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "1px" }}>
                            {instPlace}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-brand">
                          {inst.zone?.name || "Unassigned"}
                        </span>
                      </td>
                      <td style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                        {inst.district || "—"}
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {inst.stream || "FADHILA"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "var(--space-1)", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setEditingInst(inst)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                            title="Edit institution"
                          >
                            <Pencil size={12} strokeWidth={1.5} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(inst.id, inst.name)}
                            className="btn btn-sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "var(--surface)",
                              border: "1px solid var(--danger-border)",
                              color: "var(--danger)",
                            }}
                            title="Delete institution"
                          >
                            <Trash2 size={12} strokeWidth={1.5} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Institution Modal ── */}
      {editingInst && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "var(--space-4)",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "var(--surface)",
              padding: "var(--space-6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-5)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text)" }}>
                Edit Institution
              </div>
              <button
                onClick={() => setEditingInst(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">College Code</label>
                <input type="text" name="code" defaultValue={editingInst.code} required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Affiliation No.</label>
                <input type="text" name="affiliationNo" defaultValue={editingInst.affiliationNo || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                <label className="form-label">Institution Name</label>
                <input type="text" name="name" defaultValue={editingInst.name} required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Place</label>
                <input type="text" name="place" defaultValue={editingInst.place || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input type="text" name="district" defaultValue={editingInst.district || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regional Zone</label>
                <select name="zoneId" defaultValue={editingInst.zoneId} required className="form-input" style={{ height: "36px" }}>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stream</label>
                <input type="text" name="stream" defaultValue={editingInst.stream || "FADHILA FADHEELA"} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                <label className="form-label">Reset Login Password</label>
                <input type="text" name="password" placeholder="Leave blank to keep current password" className="form-input" />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", paddingTop: "var(--space-2)" }}>
                <button type="button" onClick={() => setEditingInst(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="btn btn-primary">
                  {editLoading ? (
                    <><Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                  ) : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Institution Modal ── */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "var(--space-4)",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "var(--surface)",
              padding: "var(--space-6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-5)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text)" }}>
                Add Institution
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">College Code</label>
                <input type="text" name="code" placeholder="e.g. SIG" required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Affiliation No.</label>
                <input type="text" name="affiliationNo" placeholder="CSWC /155/2026" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                <label className="form-label">Institution Name</label>
                <input type="text" name="name" placeholder="Full institution name" required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Place</label>
                <input type="text" name="place" placeholder="Location" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input type="text" name="district" placeholder="District" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regional Zone</label>
                <select name="zoneId" required className="form-input" style={{ height: "36px" }}>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stream</label>
                <input type="text" name="stream" defaultValue="FADHILA FADHEELA" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                <label className="form-label">Manager Password</label>
                <input type="text" name="password" defaultValue="123" required className="form-input" />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", paddingTop: "var(--space-2)" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="btn btn-primary">
                  {editLoading ? (
                    <><Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> Adding...</>
                  ) : "Add institution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline spinner keyframes */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
