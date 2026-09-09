import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import BackButton from "@/components/BackButton";
import CandidateIdCard from "@/components/CandidateIdCard";

export default async function CandidateIdCardPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const resolvedParams = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id: resolvedParams.candidateId },
    include: {
      team: {
        include: {
          event: {
            include: { parent: true },
          },
        },
      },
      institution: true,
      category: true,
      programs: {
        include: { program: true },
        orderBy: { program: { name: "asc" } },
      },
    },
  });

  if (!candidate) notFound();

  const settings = await getSettings(candidate.team?.eventId);
  const isSchedulePublished =
    candidate.team?.event?.statusOverride === "SCHEDULE_PUBLISHED" ||
    candidate.team?.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";

  return (
    <div style={{ padding: "40px 20px", backgroundColor: "#f3f4f6", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      
      {/* Centered ID Card Container */}
      <div id="print-area">
        <div className="id-card-print-item">
          <CandidateIdCard
            candidate={candidate as any}
            settings={settings}
            isSchedulePublished={isSchedulePublished}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print" style={{ marginTop: "30px", display: "flex", gap: "15px" }}>
        <PrintButton label="Print ID Card" color="#8E0033" />
        <BackButton label="← Go Back" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          #print-area {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            min-height: 100vh !important;
            padding: 0 !important;
          }
          .id-card-print-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 5.6cm !important;
            height: 8.8cm !important;
            overflow: hidden !important;
            position: relative !important;
            margin: 0 auto !important;
          }
          .id-card-print-item .candidate-id-card,
          .candidate-id-card { 
            width: 350px !important;
            height: 550px !important;
            transform: scale(0.604724) !important;
            transform-origin: top left !important;
            box-shadow: none !important; 
            border: 1px solid #e5e7eb !important;
            border-radius: 20px !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
