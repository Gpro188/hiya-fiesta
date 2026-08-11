"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportStudents, addStudent, updateStudent, deleteStudent, bulkDeleteStudentsByZone, bulkDeleteStudentsByInstitution } from "./actions";

export default function StudentsClient({ initialStudents, institutions, zones }: { initialStudents: any[], institutions: any[], zones: any[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUploadInstitutionId, setSelectedUploadInstitutionId] = useState("");
  const [deleteZoneId, setDeleteZoneId] = useState("");
  const [deleteInstId, setDeleteInstId] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const downloadTemplate = () => {
    const sampleData = [
      {
        "Institution Name": "DARUL AMAN WOMEN'S COLLEGE",
        "Name": "AALIYA PARVIN P A",
        "District": "THRISSUR",
        "UID": "FL26CH12",
        "Phone": "8281642287",
        "Stream": "FADHILA"
      },
      {
        "Institution Name": "SAJIPA USTHAD WOMENS SHAREEATH AND +1 +2 COLLEGE",
        "Name": "AAYISHA RABIYA",
        "District": "DAKSHINA KANNADA",
        "UID": "FL26C0075",
        "Phone": "9740549256",
        "Stream": "FADHILA"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students_UID_Template");
    XLSX.writeFile(wb, "CSWC_Master_Students_UID_Template.xlsx");
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
          setError("Uploaded file is empty.");
          setImporting(false);
          return;
        }

        const mapped = data.map((row: any) => ({
          institutionName: (row["Institution Name"] || row["Institution"] || "").toString().trim(),
          name: (row["Name"] || row["name"] || "").toString().trim(),
          district: (row["District"] || row["district"] || "").toString().trim(),
          uid: (row["UID"] || row["uid"] || row["UID Number"] || "").toString().trim(),
          phone: (row["Phone"] || row["phone"] || "").toString().trim(),
          stream: (row["Stream"] || row["stream"] || "FADHILA").toString().trim(),
        }));

        const result = await bulkImportStudents(mapped);
        if (result.success) {
          setSuccess(`Successfully imported ${result.count} student UIDs!`);
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setError(result.error || "Failed to import students.");
        }
      } catch (err) {
        console.error(err);
        setError("Error parsing Excel file. Ensure valid .xlsx format.");
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      uid: formData.get("uid") as string,
      name: formData.get("name") as string,
      institutionId: formData.get("institutionId") as string,
      district: formData.get("district") as string,
      phone: formData.get("phone") as string,
      stream: formData.get("stream") as string,
    };

    const res = await addStudent(data);
    if (res.success) {
      setShowAddModal(false);
      window.location.reload();
    } else {
      alert("Failed to add student: " + res.error);
    }
    setActionLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      uid: formData.get("uid") as string,
      name: formData.get("name") as string,
      institutionId: formData.get("institutionId") as string,
      district: formData.get("district") as string,
      phone: formData.get("phone") as string,
      stream: formData.get("stream") as string,
    };

    const res = await updateStudent(editingStudent.id, data);
    if (res.success) {
      setEditingStudent(null);
      window.location.reload();
    } else {
      alert("Failed to update student: " + res.error);
    }
    setActionLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete student "${name}"?`)) {
      const res = await deleteStudent(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Failed to delete: " + res.error);
      }
    }
  };

  const handleBulkDeleteByZone = async () => {
    if (!deleteZoneId) return alert("Select a zone first");
    const zName = zones.find(z => z.id === deleteZoneId)?.name;
    if (confirm(`Are you SURE you want to delete ALL students from institutions in ${zName}?`)) {
      setActionLoading(true);
      const res = await bulkDeleteStudentsByZone(deleteZoneId);
      if (res.success) {
        setSuccess(`Successfully deleted students for ${zName}`);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert("Failed to bulk delete: " + res.error);
        setActionLoading(false);
      }
    }
  };

  const handleBulkDeleteByInst = async () => {
    if (!deleteInstId) return alert("Select an institution first");
    const iName = institutions.find(i => i.id === deleteInstId)?.name;
    if (confirm(`Are you SURE you want to delete ALL students from ${iName}?`)) {
      setActionLoading(true);
      const res = await bulkDeleteStudentsByInstitution(deleteInstId);
      if (res.success) {
        setSuccess(`Successfully deleted students for ${iName}`);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert("Failed to bulk delete: " + res.error);
        setActionLoading(false);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.uid.toLowerCase().includes(search.toLowerCase()) ||
    s.institution?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Upload Box & Manual Add Action */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Upload Master Student UID Excel</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload student roster with Name, District, UID Number, Phone, and Stream.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              ➕ Add Single Student
            </button>
            <button onClick={downloadTemplate} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              📥 Download Sample UID Excel Template
            </button>
          </div>
        </div>

        <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', textAlign: 'center', backgroundColor: 'var(--surface-color)' }}>
          {importing ? (
            <div style={{ color: 'var(--primary)', fontWeight: 600 }}>⌛ Registering student UIDs into master database...</div>
          ) : (
            <>
              <input 
                type="file" 
                id="students-upload" 
                hidden 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload}
              />
              <label htmlFor="students-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>👨‍🎓📊</div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.05rem' }}>
                  Click to Upload Student UIDs Excel
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Ensure your Excel has an <code>Institution Name</code> column to match automatically!
                </div>
              </label>
            </>
          )}
        </div>

        {error && <div style={{ marginTop: '10px', color: 'var(--error)' }}>❌ {error}</div>}
        {success && <div style={{ marginTop: '10px', color: 'var(--success)' }}>✅ {success}</div>}
      </div>

      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--error)' }}>Bulk Delete by Zone</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Delete all students belonging to institutions in a specific zone.</p>
          <select className="form-input" value={deleteZoneId} onChange={(e) => setDeleteZoneId(e.target.value)} style={{ marginBottom: '12px' }}>
            <option value="">Select Zone...</option>
            {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <button onClick={handleBulkDeleteByZone} disabled={!deleteZoneId || actionLoading} className="btn btn-secondary" style={{ width: '100%', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--error)' }}>
            🗑️ Delete Zone Students
          </button>
        </div>

        <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--error)' }}>Bulk Delete by Institution</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Delete all students belonging to a specific institution.</p>
          <select className="form-input" value={deleteInstId} onChange={(e) => setDeleteInstId(e.target.value)} style={{ marginBottom: '12px' }}>
            <option value="">Select Institution...</option>
            {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={handleBulkDeleteByInst} disabled={!deleteInstId || actionLoading} className="btn btn-secondary" style={{ width: '100%', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--error)' }}>
            🗑️ Delete Institution Students
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h3 style={{ margin: 0 }}>Enrolled Student UID Registry ({students.length})</h3>
          <input 
            type="text" 
            placeholder="Search by UID, Name, or College..." 
            className="form-input" 
            style={{ width: '300px' }} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {filteredStudents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No student UIDs found matching search.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '8px' }}>UID Number</th>
                  <th>Student Name</th>
                  <th>Institution</th>
                  <th>District</th>
                  <th>Phone</th>
                  <th>Stream</th>
                  <th style={{ textAlign: 'right', paddingRight: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{s.uid}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.institution?.name || '-'}</td>
                    <td>{s.district || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600, fontSize: '0.75rem' }}>{s.stream}</span></td>
                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setEditingStudent(s)} 
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id, s.name)} 
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Add New Master Student</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student UID Number</label>
                <input type="text" name="uid" placeholder="e.g. FL26CH12" required className="form-input" style={{ fontFamily: 'monospace' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student Full Name</label>
                <input type="text" name="name" placeholder="Full Name" required className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Institution / College</label>
                <select name="institutionId" required className="form-input">
                  <option value="">Select College...</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input type="text" name="district" placeholder="e.g. Malappuram" className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number</label>
                <input type="text" name="phone" placeholder="Phone Number" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Stream / Division</label>
                <input type="text" name="stream" defaultValue="FADHILA" required className="form-input" />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? "Adding..." : "Add Student"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Edit Student Details</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student UID Number</label>
                <input type="text" name="uid" defaultValue={editingStudent.uid} required className="form-input" style={{ fontFamily: 'monospace' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student Full Name</label>
                <input type="text" name="name" defaultValue={editingStudent.name} required className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Institution / College</label>
                <select name="institutionId" defaultValue={editingStudent.institutionId} required className="form-input">
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input type="text" name="district" defaultValue={editingStudent.district || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number</label>
                <input type="text" name="phone" defaultValue={editingStudent.phone || ""} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="form-label">Stream / Division</label>
                <input type="text" name="stream" defaultValue={editingStudent.stream || "FADHILA"} required className="form-input" />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
