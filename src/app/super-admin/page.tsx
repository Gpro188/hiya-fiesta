import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSuperAdminData } from "../actions/superAdmin";
import SuperAdminDashboard from "./SuperAdminDashboard";
import VisitTracker from "../components/VisitTracker";
import Link from "next/link";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  // Access Guard: Only allow SUPER_ADMIN role
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login?callbackUrl=/super-admin");
  }

  const res = await getSuperAdminData();
  if (!res.success || !res.data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>{res.error || "You are not authorized to view this page."}</p>
          <Link href="/login" className="btn btn-primary">Return to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a)', padding: 'var(--spacing-xxl) 0' }}>
      <style>{`
        @media (max-width: 768px) {
          .sa-header { flex-direction: column !important; align-items: flex-start !important; }
          .sa-header h1 { font-size: 1.5rem !important; }
          .sa-header-actions { width: 100%; display: grid !important; grid-template-columns: 1fr 1fr; }
          .sa-header-actions a { text-align: center; justify-content: center; }
        }
      `}</style>
      <VisitTracker eventId={null} />

      <div className="container">
        
        {/* Header Navigation */}
        <div className="sa-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 'var(--spacing-xl)',
          flexWrap: 'wrap',
          gap: 'var(--spacing-md)'
        }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '2rem', fontWeight: 800 }}>CSWC_artsfest system Super Admin</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              System-wide metrics and tenant provisioning dashboard
            </p>
          </div>
          <div className="sa-header-actions" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Link href="/" className="btn btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
              🏠 Brand Home
            </Link>
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', backgroundColor: 'var(--primary)' }}>
              Live Dashboard
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <SuperAdminDashboard initialData={res.data} />

      </div>
    </div>
  );
}
