export const isProgramGeneral = (p: { 
  type?: string | null; 
  category?: { name?: string | null } | null; 
  categoryId?: string | null 
} | null | undefined): boolean => {
  if (!p) return false;
  if (p.type === "GENERAL") return true;
  if (!p.category && !p.categoryId) return true;
  if (p.category?.name?.toUpperCase() === "GENERAL") return true;
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

