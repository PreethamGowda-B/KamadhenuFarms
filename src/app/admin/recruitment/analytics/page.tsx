'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { ArrowLeft, Users, TrendingUp, Award, MapPin, Filter } from 'lucide-react';
import { ApplicationRecord } from '@/lib/store';

export default function RecruitmentAnalyticsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);

  useEffect(() => {
    fetch('/api/admin/applications')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setApplications(json.data);
      });
  }, []);

  // Compute Metrics
  const total = applications.length;
  const hired = applications.filter((a) => a.status === 'SELECTED').length;
  const shortlisted = applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'REVIEWED').length;
  const rejected = applications.filter((a) => a.status === 'REJECTED').length;
  const applied = applications.filter((a) => a.status === 'APPLIED').length;

  // City Data Aggregation
  const cityCounts: Record<string, number> = {};
  applications.forEach((a) => {
    cityCounts[a.city] = (cityCounts[a.city] || 0) + 1;
  });
  const cityData = Object.keys(cityCounts).map((city) => ({
    name: city,
    applications: cityCounts[city],
  }));

  // Monthly Data Mock/Aggregate
  const monthlyData = [
    { month: 'Jan', count: 12 },
    { month: 'Feb', count: 19 },
    { month: 'Mar', count: 25 },
    { month: 'Apr', count: 32 },
    { month: 'May', count: 40 },
    { month: 'Jun', count: 48 },
    { month: 'Jul', count: applications.length || 55 },
  ];

  // Funnel Data
  const funnelData = [
    { stage: '1. Applied', count: total },
    { stage: '2. Reviewed', count: shortlisted + hired + rejected },
    { stage: '3. Interviewed', count: shortlisted + hired },
    { stage: '4. Hired', count: hired },
  ];

  const COLORS = ['#D8A64F', '#B6852F', '#8F6321', '#2E2E2E', '#10B981', '#F43F5E'];

  return (
    <div className="min-h-screen bg-cream-bg p-6 sm:p-10 space-y-8">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-4">
        <Link href="/admin/recruitment" className="text-xs font-semibold text-gold-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard Table
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-charcoal">Recruitment Analytics & Insights</h1>
            <p className="text-xs text-gray-600">Visual performance metrics, city demographics, and hiring conversion rates.</p>
          </div>
        </div>

        {/* Core Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-gold-300">
            <p className="text-xs text-gray-500 font-semibold">Total Applications</p>
            <p className="text-3xl font-bold text-charcoal mt-1">{total}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-gold-300">
            <p className="text-xs text-gray-500 font-semibold">Shortlisted Rate</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{total > 0 ? Math.round((shortlisted / total) * 100) : 0}%</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-gold-300">
            <p className="text-xs text-gray-500 font-semibold">Hired Agents</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{hired}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-gold-300">
            <p className="text-xs text-gray-500 font-semibold">Conversion Rate</p>
            <p className="text-3xl font-bold text-gold-600 mt-1">{total > 0 ? Math.round((hired / total) * 100) : 0}%</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          
          {/* Monthly Applications Chart */}
          <div className="glass-panel p-6 rounded-3xl border border-gold-300">
            <h3 className="text-lg font-serif font-bold text-charcoal mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-600" /> Monthly Application Growth
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#4A4A4A" fontSize={12} />
                  <YAxis stroke="#4A4A4A" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#F8F5EF', borderRadius: '12px', border: '1px solid #D8A64F' }} />
                  <Bar dataKey="count" fill="#D8A64F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Applications by City Chart */}
          <div className="glass-panel p-6 rounded-3xl border border-gold-300">
            <h3 className="text-lg font-serif font-bold text-charcoal mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold-600" /> Candidate Distribution by City
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cityData.length > 0 ? cityData : [{ name: 'Bangalore', applications: 1 }]}
                    dataKey="applications"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.name} (${entry.applications})`}
                  >
                    {cityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#F8F5EF', borderRadius: '12px', border: '1px solid #D8A64F' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hiring Funnel Stage breakdown */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-gold-300">
            <h3 className="text-lg font-serif font-bold text-charcoal mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-600" /> Hiring Funnel Progression
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {funnelData.map((stage, idx) => (
                <div key={stage.stage} className="bg-gold-50/70 p-5 rounded-2xl border border-gold-200 text-center relative">
                  <span className="text-[10px] uppercase font-bold text-gold-700 tracking-wider">Stage {idx + 1}</span>
                  <p className="text-sm font-semibold text-charcoal mt-1">{stage.stage}</p>
                  <p className="text-2xl font-bold text-gold-600 mt-2">{stage.count} <span className="text-xs text-gray-500 font-normal">candidates</span></p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
