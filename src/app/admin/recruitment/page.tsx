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
  ShieldCheck,
  Calendar,
  MessageSquare,
  MessageCircle,
  Award,
  Loader2,
  Download,
  X
} from 'lucide-react';
import { ApplicationRecord } from '@/lib/store';

export default function AdminRecruitmentPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [expFilter, setExpFilter] = useState<string>('ALL');
  const [bikeFilter, setBikeFilter] = useState<string>('ALL');
  const [loggingOut, setLoggingOut] = useState(false);

  // Metrics State (Calculated directly from Database)
  const [metrics, setMetrics] = useState({
    total: 0,
    today: 0,
    shortlisted: 0,
    hired: 0,
    rejected: 0,
    conversionRate: 0,
  });

  // Modal & Toast States
  const [activeCandidate, setActiveCandidate] = useState<ApplicationRecord | null>(null);
  const [interviewModalApp, setInterviewModalApp] = useState<ApplicationRecord | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('Google Meet / Phone Call');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/applications');
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
        if (json.metrics) setMetrics(json.metrics);
      }
    } catch (e) {
      showToast('Failed to load applications from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Status Change Handler with Optimistic Updates & Toast
  const handleStatusChange = async (
    id: string, 
    newStatus: ApplicationRecord['status'],
    interviewData?: { date: string; time: string; location: string }
  ) => {
    setActionInProgress(id);

    // Backup current state for rollback
    const previousApps = [...applications];
    const previousMetrics = { ...metrics };

    // Optimistic Update
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );

    try {
      const payload: any = { id, status: newStatus, author: 'admin@kamadhenuhoneyfarms.in' };
      if (interviewData) {
        payload.interviewDate = interviewData.date;
        payload.interviewTime = interviewData.time;
        payload.interviewLocation = interviewData.location;
      }

      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Operation failed');
      }

      // Update with server confirmed data & fresh metrics
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? json.data : app))
      );
      if (json.metrics) setMetrics(json.metrics);

      const statusLabels: Record<string, string> = {
        SELECTED: 'Hired & Selection Email/WhatsApp Sent',
        REJECTED: 'Rejected & Notification Sent',
        INTERVIEW_SCHEDULED: 'Interview Scheduled & Notification Dispatched',
        REVIEWED: 'Shortlisted for Review',
      };

      showToast(`Candidate ${statusLabels[newStatus] || newStatus}!`);
      setInterviewModalApp(null);
    } catch (e: any) {
      // Rollback on failure
      setApplications(previousApps);
      setMetrics(previousMetrics);
      showToast(e.message || 'Database update failed. Action rolled back.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      showToast('Logout failed', 'error');
    } finally {
      setLoggingOut(false);
    }
  };

  // Cities List for Filter Dropdown
  const cities = Array.from(new Set(applications.map((a) => a.city)));

  // Filtered Applications List
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.mobileNumber.includes(searchQuery) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesCity = cityFilter === 'ALL' || app.city === cityFilter;
    const matchesExp = expFilter === 'ALL' || app.salesExperience === expFilter;
    const matchesBike = bikeFilter === 'ALL' || (bikeFilter === 'YES' ? app.hasBike : !app.hasBike);

    return matchesSearch && matchesStatus && matchesCity && matchesExp && matchesBike;
  });

  const handleExportCSV = () => {
    if (filteredApps.length === 0) {
      showToast('No applications found matching your criteria to export.', 'error');
      return;
    }

    const headers = [
      'Application ID',
      'Full Name',
      'Mobile Number',
      'WhatsApp Number',
      'Email',
      'Gender',
      'Age',
      'City',
      'State',
      'Pin Code',
      'Has Bike',
      'Driving License',
      'Sales Experience',
      'Occupation',
      'Preferred Sales Area',
      'Status',
      'Applied Date',
    ];

    const csvRows = [
      headers.join(','),
      ...filteredApps.map((a) =>
        [
          a.applicationNo,
          `"${(a.fullName || '').replace(/"/g, '""')}"`,
          a.mobileNumber,
          a.whatsAppNumber || a.mobileNumber,
          a.email,
          a.gender,
          a.age,
          `"${(a.city || '').replace(/"/g, '""')}"`,
          `"${(a.state || '').replace(/"/g, '""')}"`,
          a.pinCode,
          a.hasBike ? 'Yes' : 'No',
          a.hasDrivingLicense ? 'Yes' : 'No',
          `"${(a.salesExperience || '').replace(/"/g, '""')}"`,
          `"${(a.currentOccupation || '').replace(/"/g, '""')}"`,
          `"${(a.preferredSalesArea || '').replace(/"/g, '""')}"`,
          a.status,
          new Date(a.createdAt).toLocaleString(),
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kamadhenu_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Successfully exported ${filteredApps.length} candidate record(s) to CSV!`);
  };

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'APPLIED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Applied</span>;
      case 'REVIEWED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Shortlisted</span>;
      case 'INTERVIEW_SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Interview Scheduled</span>;
      case 'SELECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Hired / Selected</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
    }
  };

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col lg:flex-row relative">
      
      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-500'
              : 'bg-rose-900 text-rose-100 border-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-charcoal text-cream-bg p-6 shrink-0 border-r border-gold-900 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center text-xl shadow-md">
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
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> All Applicants</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{metrics.total}</span>
            </button>

            <button
              onClick={() => setStatusFilter('INTERVIEW_SCHEDULED')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'INTERVIEW_SCHEDULED' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Interviews</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{metrics.shortlisted}</span>
            </button>

            <button
              onClick={() => setStatusFilter('SELECTED')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'SELECTED' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Hired Agents</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{metrics.hired}</span>
            </button>

            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'REJECTED' ? 'bg-gold-500 text-charcoal-dark font-bold' : 'hover:bg-charcoal-light text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-400" /> Rejected</span>
              <span className="bg-charcoal px-2 py-0.5 rounded-full text-[10px]">{metrics.rejected}</span>
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
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Database Live
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Real-time candidate tracking, WhatsApp notifications, and recruitment metrics.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export Applications (CSV)
            </button>

            <Link
              href="/admin/recruitment/analytics"
              className="inline-flex items-center px-4 py-2 bg-gold-500 text-white rounded-xl text-xs font-semibold shadow-md hover:bg-gold-600 transition-colors"
            >
              <TrendingUp className="w-4 h-4 mr-1.5" /> View Analytics Charts
            </Link>
          </div>
        </div>

        {/* Database-Driven Dynamic Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Total Applications</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{metrics.total}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Today's Applicants</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">+{metrics.today}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Interview Scheduled</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.shortlisted}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Hired Sales Agents</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.hired}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Rejected</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.rejected}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-medium">Conversion Rate</p>
            <p className="text-2xl font-bold text-gold-600 mt-1">{metrics.conversionRate}%</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-gold-300 flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, phone, email, city, ref no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
            />
          </div>

          {/* Multi-Field Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto text-xs text-gray-600">
            <div className="flex items-center gap-1">
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

            <div className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-gold-600" />
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gold-300 bg-white text-xs outline-none"
              >
                <option value="ALL">All Experience</option>
                <option value="Fresher">Fresher</option>
                <option value="1-2 Years">1-2 Years</option>
                <option value="2-5 Years">2-5 Years</option>
                <option value="5+ Years">5+ Years</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gold-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gold-300 bg-white text-xs outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPLIED">Applied</option>
                <option value="REVIEWED">Shortlisted</option>
                <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                <option value="SELECTED">Hired</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

        </div>

        {/* Database-Driven Applications Table */}
        <div className="glass-panel rounded-2xl border border-gold-300 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-gold-600" /> Querying database records...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-gold-400 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-charcoal">No Applications Found</p>
              <p className="text-xs text-gray-500">
                {applications.length === 0 
                  ? 'No candidates have submitted an application yet. New submissions via /careers/apply will appear here live.' 
                  : 'No records match your active search filters.'}
              </p>
            </div>
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
                  {filteredApps.map((app) => {
                    const isProcessing = actionInProgress === app.id;
                    return (
                      <tr key={app.id} className="hover:bg-gold-50/50 transition-colors">
                        
                        {/* Ref No & Name */}
                        <td className="p-4">
                          <div className="font-mono font-bold text-gold-700">{app.applicationNo}</div>
                          <div className="font-bold text-charcoal text-sm">{app.fullName}</div>
                          <div className="text-[10px] text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</div>
                        </td>

                        {/* Contact Info */}
                        <td className="p-4 space-y-0.5">
                          <div className="font-semibold text-charcoal">{app.mobileNumber}</div>
                          <div className="text-[11px] text-gray-500">{app.email}</div>
                        </td>

                        {/* Location */}
                        <td className="p-4">
                          <div className="font-medium text-charcoal">{app.city}, {app.state}</div>
                          <div className="text-[10px] text-gray-500">PIN: {app.pinCode}</div>
                        </td>

                        {/* Experience & Bike */}
                        <td className="p-4 space-y-1">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-semibold">
                            {app.salesExperience}
                          </span>
                          <div className="text-[10px] text-gray-500">
                            {app.hasBike ? '🛵 Bike Owned' : '❌ No Bike'}
                          </div>
                        </td>

                        {/* Status Badge & Interview Note */}
                        <td className="p-4 space-y-1">
                          {getStatusBadge(app.status)}
                          {app.interviewDate && (
                            <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {app.interviewDate} @ {app.interviewTime}
                            </p>
                          )}
                        </td>

                        {/* Functional Action Buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            
                            {/* View Complete Profile */}
                            <button
                              onClick={() => setActiveCandidate(app)}
                              className="p-1.5 bg-gold-100 text-gold-800 rounded-lg hover:bg-gold-200 transition-colors"
                              title="View Applicant Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Call Candidate */}
                            <a
                              href={`tel:${app.mobileNumber}`}
                              className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors"
                              title="Call Candidate"
                            >
                              <Phone className="w-4 h-4" />
                            </a>

                            {/* WhatsApp Direct Chat */}
                            <a
                              href={`https://wa.me/91${app.whatsAppNumber || app.mobileNumber}?text=${encodeURIComponent(`Hi ${app.fullName}, regarding your application ${app.applicationNo} with Kamadhenu Honey Farms...`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                              title="WhatsApp Chat"
                            >
                              <MessageCircle className="w-4 h-4 text-green-600" />
                            </a>

                            {/* Schedule Interview Modal Trigger */}
                            {app.status !== 'SELECTED' && app.status !== 'REJECTED' && (
                              <button
                                onClick={() => {
                                  setInterviewModalApp(app);
                                  setInterviewDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                                  setInterviewTime('11:00 AM');
                                }}
                                disabled={isProcessing}
                                className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[11px] font-semibold hover:bg-amber-600 transition-colors"
                              >
                                Interview
                              </button>
                            )}

                            {/* Hire Button */}
                            {app.status !== 'SELECTED' && (
                              <button
                                onClick={() => handleStatusChange(app.id, 'SELECTED')}
                                disabled={isProcessing}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700 transition-colors"
                              >
                                Hire
                              </button>
                            )}

                            {/* Reject Button */}
                            {app.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleStatusChange(app.id, 'REJECTED')}
                                disabled={isProcessing}
                                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-semibold hover:bg-rose-700 transition-colors"
                              >
                                Reject
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Schedule Interview Modal */}
      {interviewModalApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-amber-400 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gold-200 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-charcoal">Schedule Candidate Interview</h3>
                <p className="text-xs text-gray-500">{interviewModalApp.fullName} ({interviewModalApp.applicationNo})</p>
              </div>
              <button onClick={() => setInterviewModalApp(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Interview Date *</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gold-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Interview Time *</label>
                <input
                  type="text"
                  placeholder="e.g. 11:00 AM IST"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gold-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Location / Video Call Link *</label>
                <input
                  type="text"
                  placeholder="Google Meet Link or Phone Call"
                  value={interviewLocation}
                  onChange={(e) => setInterviewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gold-300 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setInterviewModalApp(null)}
                className="flex-1 py-2.5 border border-gold-300 text-charcoal text-xs font-semibold rounded-xl hover:bg-gold-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusChange(interviewModalApp.id, 'INTERVIEW_SCHEDULED', {
                    date: interviewDate,
                    time: interviewTime,
                    location: interviewLocation,
                  })
                }
                className="flex-1 py-2.5 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 shadow-md"
              >
                Confirm & Dispatch Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Profile Modal */}
      {activeCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-gold-300 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gold-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gold-700 bg-gold-100 px-2 py-0.5 rounded">{activeCandidate.applicationNo}</span>
                <h3 className="text-xl font-serif font-bold text-charcoal mt-1">{activeCandidate.fullName}</h3>
              </div>
              <button onClick={() => setActiveCandidate(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-gold-50/60 p-3.5 rounded-xl space-y-1">
                <p className="text-gray-500 font-medium">Mobile / WhatsApp:</p>
                <p className="font-bold text-charcoal">{activeCandidate.mobileNumber} / {activeCandidate.whatsAppNumber}</p>
              </div>

              <div className="bg-gold-50/60 p-3.5 rounded-xl space-y-1">
                <p className="text-gray-500 font-medium">Email Address:</p>
                <p className="font-bold text-charcoal">{activeCandidate.email}</p>
              </div>

              <div className="bg-gold-50/60 p-3.5 rounded-xl space-y-1">
                <p className="text-gray-500 font-medium">Location:</p>
                <p className="font-bold text-charcoal">{activeCandidate.city}, {activeCandidate.state} ({activeCandidate.pinCode})</p>
              </div>

              <div className="bg-gold-50/60 p-3.5 rounded-xl space-y-1">
                <p className="text-gray-500 font-medium">Capabilities:</p>
                <p className="font-bold text-charcoal">{activeCandidate.hasBike ? '🛵 Bike Owned' : 'No Bike'} | {activeCandidate.salesExperience}</p>
              </div>
            </div>

            <div className="bg-gold-50/60 p-4 rounded-xl space-y-1.5 text-xs">
              <p className="text-gray-500 font-medium">Why They Want To Join:</p>
              <p className="text-charcoal italic">"{activeCandidate.whyJoin}"</p>
            </div>

            {/* Uploaded Documents */}
            <div className="bg-gold-100/60 p-4 rounded-xl space-y-2 text-xs border border-gold-300">
              <p className="text-gold-900 font-bold uppercase tracking-wider text-[11px]">Uploaded Candidate Documents:</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeCandidate.resumeUrl ? (
                  <a
                    href={activeCandidate.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 transition-colors inline-flex items-center gap-1"
                  >
                    📄 View Resume PDF
                  </a>
                ) : (
                  <span className="text-[11px] text-gray-500 bg-white/80 px-2.5 py-1 rounded border">No Resume Uploaded</span>
                )}

                {activeCandidate.aadhaarUrl ? (
                  <a
                    href={activeCandidate.aadhaarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 transition-colors inline-flex items-center gap-1"
                  >
                    🆔 View Aadhaar ID
                  </a>
                ) : (
                  <span className="text-[11px] text-gray-500 bg-white/80 px-2.5 py-1 rounded border">No Aadhaar Uploaded</span>
                )}

                {activeCandidate.profilePhotoUrl && (
                  <a
                    href={activeCandidate.profilePhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 transition-colors inline-flex items-center gap-1"
                  >
                    🖼️ View Photo
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Link
                href={`/admin/recruitment/applications/${activeCandidate.id}`}
                className="text-xs font-semibold text-gold-600 hover:underline flex items-center gap-1"
              >
                Open Full Dedicated Profile Page →
              </Link>
              <button
                onClick={() => setActiveCandidate(null)}
                className="px-5 py-2 bg-charcoal text-white text-xs font-semibold rounded-xl hover:bg-charcoal-dark"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
