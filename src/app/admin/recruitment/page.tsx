'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  Filter, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Phone, 
  Eye, 
  MapPin,
  TrendingUp,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { ApplicationRecord } from '@/lib/store';

export default function AdminRecruitmentPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/applications');
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
      }
    } catch (e) {
      console.error('Failed to load applications', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ApplicationRecord['status']) => {
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
        );
      }
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (e) {
      alert('Logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  // Metrics Calculation
  const totalCount = applications.length;
  const todayCount = applications.filter(
    (a) => new Date(a.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const shortlistedCount = applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'REVIEWED').length;
  const hiredCount = applications.filter((a) => a.status === 'SELECTED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;
  const conversionRate = totalCount > 0 ? Math.round((hiredCount / totalCount) * 100) : 0;

  // Cities List for Filter Dropdown
  const cities = Array.from(new Set(applications.map((a) => a.city)));

  // Filtered List
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.mobileNumber.includes(searchQuery) ||
      app.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || app.status === statusFilter;

    const matchesCity =
      cityFilter === 'ALL' || app.city === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'APPLIED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Applied</span>;
      case 'REVIEWED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Reviewed</span>;
      case 'INTERVIEW_SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Interview Scheduled</span>;
      case 'SELECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Hired / Selected</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
    }
  };

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col lg:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-charcoal text-cream-bg p-6 shrink-0 border-r border-gold-900 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-gold-400 leading-tight">Admin Portal</h2>
              <p className="text-[11px] text-gray-400">admin@kamadhenuhoneyfarms.in</p>
            </div>
          </div>

          <nav className="space-y-1.5 pt-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'ALL' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> All Applications</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{totalCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('INTERVIEW_SCHEDULED')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'INTERVIEW_SCHEDULED' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Interviews</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{shortlistedCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('SELECTED')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'SELECTED' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Hired / Selected</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{hiredCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'REJECTED' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-400" /> Rejected</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{rejectedCount}</span>
            </button>

            <div className="pt-4 border-t border-gray-800">
              <Link
                href="/admin/recruitment/analytics"
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-gold-400 hover:bg-charcoal-light transition-colors"
              >
                <BarChart3 className="w-4 h-4" /> Recruitment Analytics
              </Link>
            </div>
          </nav>
        </div>

        {/* Logout Action Button */}
        <div className="pt-6 border-t border-gray-800">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-950/60 border border-rose-600/40 text-rose-300 hover:bg-rose-900 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> {loggingOut ? 'Signing Out...' : 'Sign Out Admin'}
          </button>
        </div>
      </aside>

      {/* Main Dashboard Body */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-x-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">Recruitment Dashboard</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Session Active
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Review candidate submissions, schedule interviews, and track sales partner hiring.</p>
          </div>

          <Link
            href="/admin/recruitment/analytics"
            className="inline-flex items-center px-4 py-2 bg-gold-500 text-white rounded-xl text-xs font-semibold shadow-md hover:bg-gold-600 transition-colors shrink-0"
          >
            <TrendingUp className="w-4 h-4 mr-1.5" /> View Analytics Charts
          </Link>
        </div>

        {/* Analytics Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Total Applications</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{totalCount}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Today's Applicants</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">+{todayCount}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Shortlisted</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{shortlistedCount}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Hired Sales Agents</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{hiredCount}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Rejected</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{rejectedCount}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Conversion Rate</p>
            <p className="text-2xl font-bold text-gold-600 mt-1">{conversionRate}%</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-gold-300 flex flex-col sm:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* City Dropdown */}
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gold-600" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gold-300 bg-white text-xs outline-none"
              >
                <option value="ALL">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Filter className="w-3.5 h-3.5 text-gold-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gold-300 bg-white text-xs outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPLIED">Applied</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

        </div>

        {/* Applications Table */}
        <div className="glass-panel rounded-2xl border border-gold-300 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading candidate records...</div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">No applications match your search filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gold-100/60 border-b border-gold-200 text-[11px] font-bold text-gold-900 uppercase tracking-wider">
                    <th className="p-4">Ref No & Candidate</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Experience & Bike</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-200/50 text-xs">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-gold-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono font-bold text-gold-700">{app.applicationNo}</div>
                        <div className="font-bold text-charcoal text-sm">{app.fullName}</div>
                        <div className="text-[10px] text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</div>
                      </td>

                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-charcoal">{app.mobileNumber}</div>
                        <div className="text-[11px] text-gray-500">{app.email}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-charcoal">{app.city}, {app.state}</div>
                        <div className="text-[10px] text-gray-500">PIN: {app.pinCode}</div>
                      </td>

                      <td className="p-4 space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-semibold">
                          {app.salesExperience}
                        </span>
                        <div className="text-[10px] text-gray-500">
                          {app.hasBike ? '🛵 Bike Owned' : '❌ No Bike'}
                        </div>
                      </td>

                      <td className="p-4">
                        {getStatusBadge(app.status)}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/recruitment/applications/${app.id}`}
                            className="p-1.5 bg-gold-100 text-gold-800 rounded-lg hover:bg-gold-200 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <a
                            href={`tel:${app.mobileNumber}`}
                            className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Call Candidate"
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          {app.status !== 'SELECTED' && (
                            <button
                              onClick={() => handleStatusChange(app.id, 'SELECTED')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              Hire
                            </button>
                          )}

                          {app.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleStatusChange(app.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-semibold hover:bg-rose-700 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
