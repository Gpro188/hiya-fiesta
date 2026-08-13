'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useSessionContext } from '@/components/admin/SessionProvider';

export default function SuperAdminDashboard() {
  const { activeSession, setActiveSession } = useSessionContext();

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">CSWC Hiya Fiesta 2026</h1>
        <p className="text-[#757575] mt-1">Super Admin Control Center</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Zone Fest Card */}
        <Card className={`relative overflow-hidden cursor-pointer transition-all ${activeSession === 'ZONE' ? 'ring-2 ring-[#800000] shadow-md' : 'hover:border-[#800000]/50'}`} onClick={() => setActiveSession('ZONE')}>
          <div className="absolute top-0 left-0 w-2 h-full bg-[#800000]"></div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-[#800000]">ZONE FEST</CardTitle>
                <div className="text-sm font-semibold text-emerald-600 mt-1 uppercase tracking-wider">Active</div>
              </div>
              {activeSession === 'ZONE' && (
                <span className="bg-[#800000]/10 text-[#800000] text-xs px-2 py-1 rounded-full font-bold">CURRENT</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">88</div>
                <div className="text-xs text-[#757575] uppercase">Programmes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">1,250</div>
                <div className="text-xs text-[#757575] uppercase">Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">71</div>
                <div className="text-xs text-[#757575] uppercase">Institutions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#800000]">84</div>
                <div className="text-xs text-[#757575] uppercase font-semibold">Qualified</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* State Fest Card */}
        <Card className={`relative overflow-hidden cursor-pointer transition-all ${activeSession === 'STATE' ? 'ring-2 ring-[#800000] shadow-md' : 'hover:border-[#800000]/50'}`} onClick={() => setActiveSession('STATE')}>
          <div className="absolute top-0 left-0 w-2 h-full bg-[#D4AF37]"></div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>STATE FEST</CardTitle>
                <div className="text-sm font-semibold text-amber-600 mt-1 uppercase tracking-wider">Upcoming</div>
              </div>
              {activeSession === 'STATE' && (
                <span className="bg-[#800000]/10 text-[#800000] text-xs px-2 py-1 rounded-full font-bold">CURRENT</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">84</div>
                <div className="text-xs text-[#757575] uppercase">Qualified</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">45</div>
                <div className="text-xs text-[#757575] uppercase">Programmes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">0</div>
                <div className="text-xs text-[#757575] uppercase">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Detailed Dashboard area could go here based on activeSession */}
      <div className="mt-8 pt-8 border-t border-[#E0E0E0]">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">
          {activeSession === 'ZONE' ? 'Zone Fest Overview' : 'State Fest Overview'}
        </h2>
        <p className="text-[#424242]">Select specific operations from the sidebar to manage {activeSession === 'ZONE' ? 'Zone' : 'State'} Fest data.</p>
      </div>
    </div>
  );
}
