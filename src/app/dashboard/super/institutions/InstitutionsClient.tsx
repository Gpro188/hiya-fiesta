"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportInstitutions } from "./actions";

export default function InstitutionsClient({ initialInstitutions, zones }: { initialInstitutions: any[], zones: any[] }) {
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadTemplate = () => {
    const sampleData = [
      {
        "Code": "SIG",
        "Password": "123",
        "Affiliation No": "CSWC /155/2026",
        "Institution Name": "SIDRA INSTITUTE FOR GIRLS",
        "Place": "ANCHACHAVIDI",
        "Zone": "MALAPPURAM EAST",
        "District": "MALAPPURAM",
        "Stream": "FADHILA FADHEELA"
      },
      {
        "Code": "TWI",
        "Password": "123",
        "Affiliation No": "CSWC /157/2026",
        "Institution Name": "THARBIYYA WOMEN'S ISLAMIC AND ARTS COLLEGE",
        "Place": "MUNDAPPALAM",
        "Zone": "MALAPPURAM EAST",
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
          zoneName: (row["Zone"] || row["zone"] || "").toString().trim(),
          district: (row["District"] || row["district"] || "").toString().trim(),
          stream: (row["Stream"] || row["stream"] || "").toString().trim(),
        }));

        const result = await bulkImportInstitutions(mapped);
        if (result.success) {
          setSuccess(`Successfully imported ${result.count} institutions! Login accounts created.`);
          setTimeout(() => window.location.reload(), 1500);
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

  return (
    <div>
      {/* Upload Box */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h3 style={{ margin: 0 }}>Upload Master Institution Excel</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload CSV/Excel containing Code, Affiliation No, College Name, Zone, District, and Stream.</p>
          </div>
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            📥 Download Sample Excel Template
          </button>
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
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.05rem' }}>Click to Upload Institutions Excel</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Auto-generates college logins (e.g. username: <code>SIG</code>, password: <code>123</code>).
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
        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Registered Institutions ({institutions.length})</h3>
        {institutions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No institutions registered yet. Upload the Excel file above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '8px' }}>Code</th>
                  <th>Affiliation No</th>
                  <th>Institution Name</th>
                  <th>Place</th>
                  <th>Zone</th>
                  <th>District</th>
                  <th>Stream</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--primary)' }}>{inst.code}</td>
                    <td>{inst.affiliationNo || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{inst.name}</td>
                    <td>{inst.place || '-'}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(236,72,153,0.15)', color: '#ec4899', fontWeight: 600, fontSize: '0.75rem' }}>{inst.zone.name}</span></td>
                    <td>{inst.district || '-'}</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inst.stream || 'FADHILA'}</span></td>
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
