"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportStudents } from "./actions";

export default function StudentsClient({ initialStudents }: { initialStudents: any[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

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
        "Institution Name": "DARUSSALAM WOMEN'S SHAREE-ATH COLLEGE",
        "Name": "AAYISHA SUZANA",
        "District": "DAKSHINA KANNADA",
        "UID": "FL26C0046",
        "Phone": "9880842882",
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
          institutionName: (row["Institution Name"] || row["institutionName"] || "").toString().trim(),
          name: (row["Name"] || row["name"] || "").toString().trim(),
          district: (row["District"] || row["district"] || "").toString().trim(),
          uid: (row["UID"] || row["uid"] || row["UID Number"] || "").toString().trim(),
          phone: (row["Phone"] || row["phone"] || "").toString().trim(),
          stream: (row["Stream"] || row["stream"] || "FADHILA").toString().trim(),
        }));

        const result = await bulkImportStudents(mapped);
        if (result.success) {
          setSuccess(`Successfully imported ${result.count} student UIDs!`);
          setTimeout(() => window.location.reload(), 1500);
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

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.uid.toLowerCase().includes(search.toLowerCase()) ||
    s.institution?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Upload Box */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Upload Master Student UID Excel</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload student roster with Institution Name, Name, District, UID Number, Phone, and Stream.</p>
          </div>
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            📥 Download Sample UID Excel Template
          </button>
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
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.05rem' }}>Click to Upload Student UIDs Excel</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports <code>FL26CH12</code> UID format for instant lookup in candidate registration.
                </div>
              </label>
            </>
          )}
        </div>

        {error && <div style={{ marginTop: '10px', color: 'var(--error)' }}>❌ {error}</div>}
        {success && <div style={{ marginTop: '10px', color: 'var(--success)' }}>✅ {success}</div>}
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
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{s.uid}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.institution?.name}</td>
                    <td>{s.district || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600, fontSize: '0.75rem' }}>{s.stream}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
