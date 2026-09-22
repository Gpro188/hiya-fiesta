import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getZonesWithEvents } from "./actions";
import ReplacementClient from "./ReplacementClient";
import Link from "next/link";

export const metadata = {
  title: "Zonal Replacement Management — Super Admin",
};

export default async function ZonalReplacementPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login?callbackUrl=/dashboard/super/replacement");
  }

  const res = await getZonesWithEvents();
  const zones = res.zones || [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top right, #400010, #0f172a)",
      padding: "24px 0"
    }}>
      {/* Back nav */}
      <div style={{ padding: "0 24px", marginBottom: 8 }}>
        <Link
          href="/super-admin"
          style={{
            color: "rgba(241,245,249,0.6)",
            fontSize: "0.82rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}
        >
          ← Back to Super Admin
        </Link>
      </div>

      <ReplacementClient zones={zones} />
    </div>
  );
}
