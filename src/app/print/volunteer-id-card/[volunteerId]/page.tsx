import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import BackButton from "@/components/BackButton";
import VolunteerIdCard from "@/components/VolunteerIdCard";

export default async function VolunteerIdCardPage({
  params,
}: {
  params: Promise<{ volunteerId: string }>;
}) {
  const resolvedParams = await params;
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: resolvedParams.volunteerId },
    include: {
      zone: true,
      event: true,
    },
  });

  if (!volunteer) notFound();

  const settings = await getSettings(volunteer.eventId || undefined);

  return (
    <div
      style={{
        padding: "40px 20px",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Centered ID Card Container */}
      <div id="print-area">
        <VolunteerIdCard volunteer={volunteer as any} settings={settings} />
      </div>

      {/* Action Buttons */}
      <div className="no-print" style={{ marginTop: "30px", display: "flex", gap: "15px" }}>
        <PrintButton label="Print Volunteer ID Card" color="#8E0033" />
        <BackButton label="← Go Back" />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
            display: flex;
            justifyContent: center;
            align-items: center;
            min-height: 100vh;
          }
          .volunteer-id-card { 
            width: 5.6cm !important;
            height: 8.8cm !important;
            box-shadow: none !important; 
            border: 1px solid #e5e7eb !important;
            border-radius: 4mm !important;
            margin: 0 auto;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `,
        }}
      />
    </div>
  );
}
