"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportInstitutions, updateInstitution, deleteInstitution } from "./actions";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

export default function InstitutionsClient({ initialInstitutions, zones }: { initialInstitutions: any[], zones: any[] }) {
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUploadZoneId, setSelectedUploadZoneId] = useState("");

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          setError("The uploaded file is empty.");
          setImporting(false);
          return;
        }

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
        if (result.success) {
          setSuccess(`Successfully imported ${result.count} institutions! Login accounts created.`);
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setError(result.error || "Failed to import institutions.");
        }
      } catch (err) {
        console.error(err);
        setError("Error parsing Excel file. Ensure valid .xlsx format.");
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  };

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
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
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

  // Calculate stream & category counts
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

  // Filtered institutions
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

  return (
    <div>
      {/* Upload Box */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Upload Master Institution Excel</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload CSV/Excel containing Code, Affiliation No, College Name, District, and Stream.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              ➕ Add Single Institution
            </button>
            <button onClick={downloadTemplate} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              📥 Download Sample Excel Template
            </button>
          </div>
        </div>

        <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', textAlign: 'center', backgroundColor: 'var(--surface-color)' }}>
          {importing ? (
            <div style={{ color: 'var(--primary)', fontWeight: 600 }}>⌛ Importing institutions and provisioning login credentials...</div>
          ) : (
            <>
              <input 
                type="file" 
                id="inst-upload" 
                hidden 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload}
              />
              <label htmlFor="inst-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🏫📊</div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.05rem' }}>
                  Click to Upload Institutions Excel
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Ensure your Excel file has a <code>Zone</code> column. Auto-generates college logins.
                </div>
              </label>
            </>
          )}
        </div>

        {error && <div style={{ marginTop: '10px', color: 'var(--error)' }}>❌ {error}</div>}
        {success && <div style={{ marginTop: '10px', color: 'var(--success)' }}>✅ {success}</div>}
      </div>

      {/* Stream & Category Breakdown Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-lg)' }}>
        <div 
          onClick={() => { setSelectedStream("ALL"); setSelectedZone("ALL"); }}
          className="glass-panel" 
          style={{ 
            padding: '16px 20px', 
            borderRadius: '14px', 
            cursor: 'pointer',
            border: selectedStream === "ALL" && selectedZone === "ALL" ? '2px solid #8E0033' : '1px solid var(--border-color)',
            backgroundColor: selectedStream === "ALL" && selectedZone === "ALL" ? 'rgba(142, 0, 51, 0.05)' : 'var(--surface-color)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            Total Colleges
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8E0033', marginTop: '4px' }}>
            {institutions.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across {zones.length} Regional Zones
          </div>
        </div>

        {Object.entries(streamCounts).map(([streamName, count]) => (
          <div 
            key={streamName}
            onClick={() => setSelectedStream(selectedStream === streamName ? "ALL" : streamName)}
            className="glass-panel" 
            style={{ 
              padding: '16px 20px', 
              borderRadius: '14px', 
              cursor: 'pointer',
              border: selectedStream === streamName ? '2px solid #0284c7' : '1px solid var(--border-color)',
              backgroundColor: selectedStream === streamName ? 'rgba(2, 132, 199, 0.08)' : 'var(--surface-color)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              📚 {streamName}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
              {count} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>colleges</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {Math.round((count / (institutions.length || 1)) * 100)}% of total network
            </div>
          </div>
        ))}
      </div>

      {/* Directory Table with Zone and Stream Filters */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏛️</span> Registered Institutions ({filteredInstitutions.length}
              {filteredInstitutions.length !== institutions.length && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  filtered from {institutions.length}
                </span>
              )})
            </h3>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Zone Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Zone:</span>
              <select 
                className="form-input" 
                style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: '160px' }}
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="ALL">All Zones ({institutions.length})</option>
                {zones.map((z) => {
                  const zCount = zoneCounts[z.name] || 0;
                  return (
                    <option key={z.id} value={z.id}>
                      {z.name} ({zCount})
                    </option>
                  );
                })}
                {zoneCounts["Unassigned"] ? (
                  <option value="UNASSIGNED">Unassigned ({zoneCounts["Unassigned"]})</option>
                ) : null}
              </select>
            </div>

            {/* Stream Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Stream:</span>
              <select 
                className="form-input" 
                style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: '150px' }}
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
              >
                <option value="ALL">All Streams</option>
                {Object.keys(streamCounts).map((s) => (
                  <option key={s} value={s}>
                    {s} ({streamCounts[s]})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <input 
              type="text" 
              placeholder="Search code, name, place, district..." 
              className="form-input" 
              style={{ width: '240px', padding: '6px 12px', fontSize: '0.85rem' }} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />

            {(selectedZone !== "ALL" || selectedStream !== "ALL" || search) && (
              <button 
                onClick={() => { setSelectedZone("ALL"); setSelectedStream("ALL"); setSearch(""); }}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                title="Reset Filters"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {filteredInstitutions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
            <p style={{ margin: 0, fontWeight: 600 }}>No institutions match the selected filter criteria.</p>
            <button 
              onClick={() => { setSelectedZone("ALL"); setSelectedStream("ALL"); setSearch(""); }}
              className="btn btn-secondary"
              style={{ marginTop: '12px', fontSize: '0.82rem' }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px 8px' }}>Code</th>
                  <th>Affiliation No</th>
                  <th>Institution Name</th>
                  <th>Place</th>
                  <th>Zone</th>
                  <th>District</th>
                  <th>Stream / Category</th>
                  <th style={{ textAlign: 'right', paddingRight: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstitutions.map((inst) => {
                  const { name: instName, place: instPlace } = formatInstitutionDisplay(inst);
                  return (
                  <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--primary)' }}>{inst.code}</td>
                    <td>{inst.affiliationNo || '-'}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{instName}</div>
                      {instPlace && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                          📍 {instPlace}
                        </div>
                      )}
                    </td>
                    <td>{inst.place || instPlace || '-'}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(236,72,153,0.15)', color: '#ec4899', fontWeight: 600, fontSize: '0.75rem' }}>
                        {inst.zone?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>{inst.district || '-'}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', fontWeight: 600, fontSize: '0.75rem' }}>
                        {inst.stream || 'FADHILA'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setEditingInst(inst)} 
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(inst.id, inst.name)} 
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          🗑️ Delete
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

      {/* Edit Institution Modal */}
      {editingInst && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Edit Institution</h3>
            <form onSubmit={handleSaveEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">College Code</label>
                <input type="text" name="code" defaultValue={editingInst.code} required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Affiliation No</label>
                <input type="text" name="affiliationNo" defaultValue={editingInst.affiliationNo || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Institution Name</label>
                <input type="text" name="name" defaultValue={editingInst.name} required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Place / Location</label>
                <input type="text" name="place" defaultValue={editingInst.place || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input type="text" name="district" defaultValue={editingInst.district || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regional Zone</label>
                <select name="zoneId" defaultValue={editingInst.zoneId} required className="form-input">
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stream</label>
                <input type="text" name="stream" defaultValue={editingInst.stream || "FADHILA FADHEELA"} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Reset Login Password (Optional)</label>
                <input type="text" name="password" placeholder="Leave blank to keep existing password" className="form-input" />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingInst(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={editLoading} className="btn btn-primary">
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add Institution Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Add New Institution</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">College Code</label>
                <input type="text" name="code" placeholder="e.g. SIG" required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Affiliation No</label>
                <input type="text" name="affiliationNo" placeholder="CSWC /155/2026" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Institution Name</label>
                <input type="text" name="name" placeholder="Full College Name" required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Place / Location</label>
                <input type="text" name="place" placeholder="Location" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input type="text" name="district" placeholder="District" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regional Zone</label>
                <select name="zoneId" required className="form-input">
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stream</label>
                <input type="text" name="stream" defaultValue="FADHILA FADHEELA" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Manager Password</label>
                <input type="text" name="password" defaultValue="123" required className="form-input" />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={editLoading} className="btn btn-primary">
                  {editLoading ? "Adding..." : "Add Institution"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
