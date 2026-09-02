"use client";

import { useState } from "react";
import InstitutionOnboardingModal from "./InstitutionOnboardingModal";

export default function InstitutionProfileButton({
  institutionName,
  institutionCode,
  logoUrl,
}: {
  institutionName: string;
  institutionCode: string;
  logoUrl?: string | null;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-secondary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "10px",
          fontSize: "0.85rem",
          fontWeight: 700,
          backgroundColor: "#ffffff",
          color: "#8E0033",
          border: "1px solid rgba(142,0,51,0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          cursor: "pointer",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <span>🏛️</span>
        )}
        <span>Institution Profile & Logo</span>
      </button>

      {showModal && (
        <InstitutionOnboardingModal
          institutionName={institutionName}
          institutionCode={institutionCode}
          initialLogoUrl={logoUrl}
          isOpenExternal={showModal}
          onCloseExternal={() => setShowModal(false)}
        />
      )}
    </>
  );
}
