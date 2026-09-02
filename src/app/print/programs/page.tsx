import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintProgramsReportPage(props: {
  searchParams: Promise<{ eventId?: string; categoryId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const categoryId = searchParams.categoryId;

  let event: any = null;
  if (eventId) {
    event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { categories: true }
    });
  } else {
    event = await prisma.event.findFirst({
      where: { type: "STATE" },
      include: { categories: true }
    });
  }

  const targetEventId = event?.id;
  const settings = await getSettings(targetEventId);

  const allCategories = await prisma.category.findMany({
    where: { eventId: targetEventId },
    orderBy: { name: 'asc' }
  });

  let whereClause: any = { eventId: targetEventId };
  let categoryName = "All Categories & General Programs";

  if (categoryId === "GENERAL") {
    whereClause = {
      eventId: targetEventId,
      OR: [
        { type: "GENERAL" },
        { categoryId: null }
      ]
    };
    categoryName = "General Programs (Open to All Categories)";
  } else if (categoryId && categoryId !== "ALL") {
    // Check if categoryId is a UUID or a category name (e.g. FADHILA or FADHEELA)
    const matchedCategory = allCategories.find(c => 
      c.id === categoryId || c.name.trim().toUpperCase() === categoryId.trim().toUpperCase()
    );

    if (matchedCategory) {
      whereClause = {
        eventId: targetEventId,
        categoryId: matchedCategory.id
      };
      categoryName = `${matchedCategory.name} Category Programs`;
    } else {
      whereClause = {
        eventId: targetEventId,
        categoryId: categoryId
      };
    }
  }

  const programs = await prisma.program.findMany({
    where: whereClause,
    orderBy: [
      { type: 'asc' },
      { programCode: 'asc' },
      { name: 'asc' }
    ],
    include: {
      category: true,
      judges: { select: { username: true } },
      _count: { select: { assignments: true } }
    }
  });

  return (
    <div style={{ padding: '30px', backgroundColor: 'white', color: '#111827', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Category Switching Filter Bar (Hidden when printing via @media print in PrintButton) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '12px 16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Filter Category:</span>
          
          <a
            href={`/print/programs?eventId=${targetEventId}&categoryId=ALL`}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              backgroundColor: (!categoryId || categoryId === 'ALL') ? '#8E0033' : '#E2E8F0',
              color: (!categoryId || categoryId === 'ALL') ? '#FFFFFF' : '#334155'
            }}
          >
            📋 All Programs
          </a>

          {allCategories.map(cat => {
            const isSelected = categoryId === cat.id || categoryId?.toUpperCase() === cat.name.toUpperCase();
            return (
              <a
                key={cat.id}
                href={`/print/programs?eventId=${targetEventId}&categoryId=${cat.id}`}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  backgroundColor: isSelected ? '#8E0033' : '#E2E8F0',
                  color: isSelected ? '#FFFFFF' : '#334155'
                }}
              >
                🏷️ {cat.name} Only
              </a>
            );
          })}

          <a
            href={`/print/programs?eventId=${targetEventId}&categoryId=GENERAL`}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              backgroundColor: categoryId === 'GENERAL' ? '#D97706' : '#FEF3C7',
              color: categoryId === 'GENERAL' ? '#FFFFFF' : '#92400E'
            }}
          >
            ⭐ General Only
          </a>
        </div>

        <div>
          <PrintButton />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #E11D5A', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.6rem', color: '#0F172A', textTransform: 'uppercase', fontWeight: 800 }}>
            {event?.name || settings.festName}
          </h1>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#E11D5A', fontWeight: 700 }}>
            Competition Programs List & Guidelines
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#4B5563', fontWeight: 600 }}>
            Filter: <span style={{ color: '#8E0033', fontWeight: 800 }}>{categoryName}</span> • Total Programs: {programs.length}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '6px' }}>
            Generated on: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#FFF0F4', borderBottom: '2px solid #E11D5A' }}>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '40px' }}>#</th>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '70px' }}>Code</th>
            <th style={{ padding: '10px 10px', border: '1px solid #E5E7EB', textAlign: 'left' }}>Program Name</th>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '90px' }}>Type</th>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '80px' }}>Stage</th>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '90px' }}>Category</th>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '70px' }}>Time</th>
            <th style={{ padding: '10px 8px', border: '1px solid #E5E7EB', textAlign: 'center', width: '70px' }}>Limit</th>
            <th style={{ padding: '10px 10px', border: '1px solid #E5E7EB', textAlign: 'left' }}>Guidelines / Evaluation</th>
          </tr>
        </thead>
        <tbody>
          {programs.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                No programs found for this selection.
              </td>
            </tr>
          ) : (
            programs.map((p, idx) => (
              <tr key={p.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 700, color: '#E11D5A' }}>
                  {p.programCode || '-'}
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #E5E7EB', fontWeight: 600 }}>
                  {p.name}
                </td>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    backgroundColor: p.type === 'GROUP' ? '#FEF3C7' : (p.type === 'GENERAL' ? '#E0E7FF' : '#F3F4F6'),
                    color: p.type === 'GROUP' ? '#92400E' : (p.type === 'GENERAL' ? '#3730A3' : '#1F2937')
                  }}>
                    {p.type}
                  </span>
                </td>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center', fontSize: '0.78rem' }}>
                  {p.stageType === 'OFF_STAGE' ? 'Off Stage' : 'On Stage'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 600, color: p.category ? '#059669' : '#D97706' }}>
                  {p.type === 'GENERAL' ? 'General' : (p.category?.name || 'General')}
                </td>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  {p.duration} min
                </td>
                <td style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  {p.candidateLimitPerTeam}
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #E5E7EB', fontSize: '0.75rem', color: '#4B5563' }}>
                  {p.description && <div><strong>Desc:</strong> {p.description}</div>}
                  {p.evaluationCriteria && <div><strong>Criteria:</strong> {p.evaluationCriteria}</div>}
                  {!p.description && !p.evaluationCriteria && '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: '10px' }}>
        <div>CSWC Hiya Fiesta 2026 • Official Competition Management System</div>
        <div>Authorized by Festival Controller</div>
      </div>
    </div>
  );
}
