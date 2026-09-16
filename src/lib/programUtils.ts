export const isProgramGeneral = (p: { 
  type?: string | null; 
  category?: { name?: string | null } | null; 
  categoryId?: string | null;
  name?: string | null;
  candidateLimitPerTeam?: number | null;
} | null | undefined): boolean => {
  if (!p) return false;
  const type = (p.type || "").toUpperCase();
  if (type === "GENERAL" || type === "GROUP") return true;
  if (p.candidateLimitPerTeam && p.candidateLimitPerTeam > 1) return true;
  if (!p.category && !p.categoryId) return true;
  const catName = (p.category?.name || "").toUpperCase();
  if (catName.includes("GENERAL")) return true;
  return false;
};

export const isInstitutionProgram = (p: {
  name?: string | null;
  type?: string | null;
} | null | undefined): boolean => {
  if (!p) return false;
  if (p.type?.toUpperCase() === "INSTITUTION") return true;
  const name = p.name?.trim().toLowerCase() || "";
  if (name.includes("magazine")) return true;
  return false;
};

