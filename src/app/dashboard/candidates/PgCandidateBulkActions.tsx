"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportPgCandidates } from "./actions";

interface TeamOption {
  id: string;
  name: string;
  prefixCode?: string;
}

interface ParsedCandidate {
  uid: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  teamIdentifier?: string;
  isValid: boolean;
  error?: string;
}

export default function PgCandidateBulkActions({ 
  teams, 
  userRole,
  defaultTeamId 
}: { 
  teams: TeamOption[]; 
  userRole?: string;
  defaultTeamId?: string;
}) {
  const isTeamManager = ["MANAGER", "INSTITUTION_MANAGER"].includes(userRole || "");
  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeamId || teams[0]?.id || "");
  const [fileData, setFileData] = useState<ParsedCandidate[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const downloadTemplate = () => {
    const templateRows = [
      {
        "UID NUMBER": "PG26001",
        "NAME": "Aisha Mariyam",
        "DEPARTMENT": "MA Islamic Studies",
        "EMAIL": "aisha@example.com",
        "PHONE NUMBER": "9876543210",
        "TEAM": teams[0]?.name || "PG Team 1"
      },
      {
        "UID NUMBER": "PG26002",
        "NAME": "Fathima Noor",
        "DEPARTMENT": "MSc Psychology",
        "EMAIL": "",
        "PHONE NUMBER": "9845612340",
        "TEAM": teams[1]?.name || "PG Team 2"
      },
      {
        "UID NUMBER": "PG26003",
        "NAME": "Hafsa K",
        "DEPARTMENT": "MA English",
        "EMAIL": "hafsa@example.com",
        "PHONE NUMBER": "",
        "TEAM": teams[0]?.name || "PG Team 1"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PG_Candidates_Template");
    XLSX.writeFile(wb, "Fadheela_PG_Candidates_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          setStatusMessage({ type: 'error', text: "The uploaded Excel file contains no data." });
          setFileData([]);
          return;
        }

        const parsed: ParsedCandidate[] = rawJson.map((row) => {
          // Normalize column names
          const uid = (
            row["UID NUMBER"] || 
            row["UID"] || 
            row["Uid"] || 
            row["uid"] || 
            row["REGISTER NUMBER"] || 
            row["REG NO"] || 
            ""
          ).toString().trim();

          const name = (
            row["NAME"] || 
            row["Name"] || 
            row["STUDENT NAME"] || 
            row["Candidate Name"] || 
            ""
          ).toString().trim();

          const department = (
            row["DEPARTMENT"] || 
            row["Department"] || 
            row["DIPARTMENT"] || 
            row["DEPT"] || 
            row["Dept"] || 
            row["STREAM"] || 
            ""
          ).toString().trim();

          const email = (
            row["EMAIL"] || 
            row["Email"] || 
            row["E-MAIL"] || 
            ""
          ).toString().trim();

          const phone = (
            row["PHONE NUMBER"] || 
            row["Phone Number"] || 
            row["PHONE"] || 
            row["Phone"] || 
            row["MOBILE"] || 
            ""
          ).toString().trim();

          const teamIdentifier = (
            row["TEAM"] || 
            row["Team"] || 
            row["TEAM NAME"] || 
            row["Team Name"] || 
            ""
          ).toString().trim();

          let isValid = true;
          let error = "";

          if (!uid) {
            isValid = false;
            error = "Missing UID";
          } else if (!name) {
            isValid = false;
            error = "Missing Name";
          } else if (!department) {
            isValid = false;
            error = "Missing Department";
          }

          return {
            uid,
            name,
            department,
            email: email || undefined,
            phone: phone || undefined,
            teamIdentifier: teamIdentifier || undefined,
            isValid,
            error
          };
        });

        setFileData(parsed);
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: "Failed to parse file: " + (err.message || "Invalid Excel format") });
        setFileData([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    const validRows = fileData.filter(f => f.isValid);
    if (validRows.length === 0) {
      setStatusMessage({ type: 'error', text: "No valid candidate rows to import." });
      return;
    }

    setImporting(true);
    setStatusMessage(null);

    try {
      const payload = validRows.map(r => ({
        uid: r.uid,
        name: r.name,
        department: r.department,
        email: r.email,
        phone: r.phone,
        teamIdentifier: r.teamIdentifier,
        teamId: selectedTeamId
      }));

      const res = await bulkImportPgCandidates(payload);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully imported/updated ${res.totalProcessed || 0} PG candidates (${res.createdCount || 0} created, ${res.updatedCount || 0} updated).`
        });
        setFileData([]);
        setFileName("");
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || "Import failed. Please check your data."
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || "Unexpected error during import."
      });
    } finally {
      setImporting(false);
    }
  };

  const validCount = fileData.filter(r => r.isValid).length;
  const invalidCount = fileData.length - validCount;

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: 'var(--spacing-lg)',
      borderRadius: '14px',
      border: '1.5px solid rgba(99, 102, 241, 0.3)',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.5rem' }}>📑</span>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 800 }}>
              Fadheela PG Candidates Excel Import
            </h3>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#6366f1',
              color: 'white',
              letterSpacing: '0.5px'
            }}>
              2-TEAM BATTLE
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '750px' }}>
            Import candidate list for <strong>PG Team 1</strong> and <strong>PG Team 2</strong>.
            Required fields: <code>UID NUMBER</code>, <code>NAME</code>, <code>DEPARTMENT</code>. 
            Optional: <code>EMAIL</code>, <code>PHONE NUMBER</code>.
          </p>
        </div>

        <button
          onClick={downloadTemplate}
          className="btn btn-secondary"
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.86rem',
            padding: '8px 16px',
            borderColor: '#6366f1',
            color: '#6366f1',
            borderRadius: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.08)'
          }}
        >
          <span>📥</span> Download Excel Template
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {statusMessage.type === 'success' ? '✅ ' : '⚠️ '}
          {statusMessage.text}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: !isTeamManager && teams.length > 1 ? '1fr 2fr' : '1fr',
        gap: '16px',
        alignItems: 'center'
      }}>
        {!isTeamManager && teams.length > 1 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Default Team (if not specified in sheet)
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)'
              }}
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.prefixCode ? `(${t.prefixCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
            Choose Excel / CSV File (.xlsx, .xls, .csv)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={importing}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--background)',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>

      {fileData.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Preview: {fileData.length} records detected
              </span>
              <span style={{
                fontSize: '0.78rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
                fontWeight: 700
              }}>
                ✓ {validCount} Valid
              </span>
              {invalidCount > 0 && (
                <span style={{
                  fontSize: '0.78rem',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#dc2626',
                  fontWeight: 700
                }}>
                  ✗ {invalidCount} Invalid
                </span>
              )}
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing || validCount === 0}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                fontWeight: 800,
                fontSize: '0.92rem',
                backgroundColor: '#4f46e5',
                borderColor: '#4f46e5',
                color: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                cursor: importing || validCount === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {importing ? (
                <><span>⏳</span> Importing Candidates...</>
              ) : (
                <><span>🚀</span> Confirm & Import {validCount} Candidates</>
              )}
            </button>
          </div>

          <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>#</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>UID</th>
                  <th style={{ padding: '8px 12px' }}>Name</th>
                  <th style={{ padding: '8px 12px' }}>Department</th>
                  <th style={{ padding: '8px 12px' }}>Email</th>
                  <th style={{ padding: '8px 12px' }}>Phone</th>
                  <th style={{ padding: '8px 12px' }}>Team</th>
                </tr>
              </thead>
              <tbody>
                {fileData.map((row, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: row.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                  }}>
                    <td style={{ padding: '7px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '7px 12px' }}>
                      {row.isValid ? (
                        <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Ready</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ {row.error}</span>
                      )}
                    </td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{row.uid || "—"}</td>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>{row.name || "—"}</td>
                    <td style={{ padding: '7px 12px', color: '#6366f1', fontWeight: 600 }}>{row.department || "—"}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>{row.email || "—"}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>{row.phone || "—"}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>
                      {row.teamIdentifier || "Auto-assign"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
