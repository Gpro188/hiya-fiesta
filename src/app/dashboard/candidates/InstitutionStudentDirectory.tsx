"use client";

import { useState, useMemo } from "react";

type MasterStudent = {
  id: string;
  uid: string;
  name: string;
  stream: string | null;
  institutionId: string | null;
};

type RegisteredCandidate = {
  id: string;
  uid?: string | null;
  name: string;
  chestNumber?: string | null;
  category?: { name: string } | null;
};

export default function InstitutionStudentDirectory({
  masterStudents,
  candidates,
}: {
  masterStudents: MasterStudent[];
  candidates: RegisteredCandidate[];
}) {
  const [filterMode, setFilterMode] = useState<"all" | "available" | "registered">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const registeredUidMap = useMemo(() => {
    const map = new Map<string, RegisteredCandidate>();
    candidates.forEach((c) => {
      if (c.uid) {
        map.set(c.uid.trim().toUpperCase(), c);
      }
    });
    return map;
  }, [candidates]);

  // Group master students by stream
  const streams = useMemo(() => {
    const set = new Set<string>();
    masterStudents.forEach((s) => set.add((s.stream || "Other").trim().toUpperCase()));
    return Array.from(set).sort();
  }, [masterStudents]);

  const handleSelectStudent = (uid: string) => {
    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(uid);
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid(null), 2500);
    }
    // Dispatch custom event for CandidateForm
    window.dispatchEvent(new CustomEvent("select-student-uid", { detail: { uid } }));

    // Scroll smoothly to the registration form
    const formElement = document.getElementById("candidate-registration-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const totalStudents = masterStudents.length;
  const totalRegistered = masterStudents.filter((s) => registeredUidMap.has(s.uid.trim().toUpperCase())).length;
  const totalAvailable = totalStudents - totalRegistered;

  if (masterStudents.length === 0) {
    return (
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "8px",
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          border: "1.5px solid rgba(245, 158, 11, 0.35)",
          color: "#92400e",
          fontSize: "0.88rem",
          lineHeight: 1.6,
        }}
      >
        <strong>⚠️ No students found in your institution directory:</strong> If your students are not appearing or you
        cannot find a student by UID, their <strong>admission or promotion procedure</strong> in the institution portal
        might not be completed. Please ensure all student admissions and promotions are processed, or contact the{" "}
        <strong>IT Cell of CSWC</strong>.
      </div>
    );
  }

  return (
    <div>
      {/* Top Controls & Statistics */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-md)",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", marginRight: "4px" }}>
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className="btn"
            style={{
              padding: "4px 12px",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: filterMode === "all" ? "var(--primary)" : "var(--surface-color)",
              color: filterMode === "all" ? "#fff" : "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            All Enrolled ({totalStudents})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("available")}
            className="btn"
            style={{
              padding: "4px 12px",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: filterMode === "available" ? "#2563eb" : "var(--surface-color)",
              color: filterMode === "available" ? "#fff" : "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            Available to Register ({totalAvailable})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("registered")}
            className="btn"
            style={{
              padding: "4px 12px",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: filterMode === "registered" ? "#059669" : "var(--surface-color)",
              color: filterMode === "registered" ? "#fff" : "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            Already Registered ({totalRegistered})
          </button>
        </div>

        <div style={{ flex: "1", minWidth: "200px", maxWidth: "320px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by student name or UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.85rem", padding: "6px 12px", width: "100%" }}
          />
        </div>
      </div>

      {copiedUid && (
        <div
          style={{
            marginBottom: "var(--spacing-sm)",
            padding: "6px 12px",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid #10b981",
            borderRadius: "6px",
            color: "#065f46",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          ✓ Copied UID <strong>{copiedUid}</strong> to clipboard & loaded in Add Student Form below!
        </div>
      )}

      {/* Grid of Streams */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        {streams.map((stream) => {
          const streamStudents = masterStudents.filter(
            (s) => (s.stream || "Other").trim().toUpperCase() === stream
          );

          const streamRegistered = streamStudents.filter((s) =>
            registeredUidMap.has(s.uid.trim().toUpperCase())
          ).length;
          const streamAvailable = streamStudents.length - streamRegistered;

          // Filter by mode and search
          const filteredStudents = streamStudents.filter((student) => {
            const isReg = registeredUidMap.has(student.uid.trim().toUpperCase());
            if (filterMode === "available" && isReg) return false;
            if (filterMode === "registered" && !isReg) return false;

            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const matchUid = student.uid.toLowerCase().includes(q);
              const matchName = student.name.toLowerCase().includes(q);
              return matchUid || matchName;
            }
            return true;
          });

          return (
            <div
              key={stream}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--surface-color)",
              }}
            >
              {/* Stream Header */}
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.92rem" }}>
                  {stream} Students
                </div>
                <div style={{ display: "flex", gap: "6px", fontSize: "0.75rem" }}>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid var(--border-color)",
                      fontWeight: 600,
                    }}
                  >
                    Total: {streamStudents.length}
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      fontWeight: 700,
                    }}
                  >
                    {streamRegistered} Registered
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(37, 99, 235, 0.12)",
                      color: "#2563eb",
                      fontWeight: 700,
                    }}
                  >
                    {streamAvailable} Available
                  </span>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto", maxHeight: "360px", flex: 1 }}>
                {filteredStudents.length === 0 ? (
                  <div
                    style={{
                      padding: "var(--spacing-md)",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    No students match current filter.
                  </div>
                ) : (
                  <table className="data-table" style={{ fontSize: "0.85rem", width: "100%", margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ position: "sticky", top: 0, backgroundColor: "var(--bg-color)", zIndex: 1 }}>
                          UID
                        </th>
                        <th style={{ position: "sticky", top: 0, backgroundColor: "var(--bg-color)", zIndex: 1 }}>
                          Student Name
                        </th>
                        <th
                          style={{
                            position: "sticky",
                            top: 0,
                            backgroundColor: "var(--bg-color)",
                            zIndex: 1,
                            textAlign: "center",
                          }}
                        >
                          Status / Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const candidate = registeredUidMap.get(student.uid.trim().toUpperCase());
                        const isRegistered = !!candidate;

                        return (
                          <tr
                            key={student.uid}
                            style={{
                              backgroundColor: isRegistered ? "rgba(16, 185, 129, 0.03)" : "transparent",
                            }}
                          >
                            <td
                              style={{
                                fontWeight: 700,
                                fontFamily: "monospace",
                                color: "var(--primary)",
                                width: "110px",
                              }}
                            >
                              {student.uid}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{student.name}</div>
                              {candidate && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                                  Category: {candidate.category?.name || "Enrolled"}
                                  {candidate.chestNumber ? ` • Chest: #${candidate.chestNumber}` : ""}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "center", width: "130px" }}>
                              {isRegistered ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                                    color: "#059669",
                                    border: "1px solid rgba(16, 185, 129, 0.25)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  ✓ Registered
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectStudent(student.uid)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "2px 8px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    color: "#2563eb",
                                    borderColor: "rgba(37, 99, 235, 0.4)",
                                    backgroundColor: "rgba(37, 99, 235, 0.05)",
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Fill student in registration form"
                                >
                                  + Register UID
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful notice about missing students */}
      <div
        style={{
          marginTop: "var(--spacing-md)",
          padding: "10px 14px",
          borderRadius: "8px",
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          fontSize: "0.82rem",
          color: "#1e40af",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>ℹ️</span>
        <div>
          <strong>Can&apos;t find a student?</strong> If any student is missing from your institution list or not found during
          UID search, ensure their <strong>admission or promotion procedure</strong> has been completed in the institution
          portal. If the issue persists, please contact the <strong>IT Cell of CSWC</strong>.
        </div>
      </div>
    </div>
  );
}
