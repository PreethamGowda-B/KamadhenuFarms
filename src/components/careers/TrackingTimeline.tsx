'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Calendar, Award, XCircle, FileCheck } from 'lucide-react';

export interface TimelineProps {
  status: 'APPLIED' | 'REVIEWED' | 'INTERVIEW_SCHEDULED' | 'SELECTED' | 'REJECTED';
}

const STAGES = [
  { key: 'APPLIED', title: 'Application Submitted', desc: 'Received & Queued' },
  { key: 'REVIEWED', title: 'Under Review', desc: 'HR Initial Screening' },
  { key: 'SHORTLISTED', title: 'Shortlisted', desc: 'Profile Approved' },
  { key: 'INTERVIEW_SCHEDULED', title: 'Interview Scheduled', desc: 'Screening Call' },
  { key: 'SELECTED', title: 'Offer Released', desc: 'Hired & Onboarded' },
];

export default function TrackingTimeline({ status }: TimelineProps) {
  if (status === 'REJECTED') {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-2">
        <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h4 className="text-lg font-serif font-bold text-rose-800">Application Closed</h4>
        <p className="text-xs text-rose-700 max-w-md mx-auto">
          Thank you for your interest in Kamadhenu Honey Farms. Although you were not selected for this position, we encourage you to apply again for future openings.
        </p>
      </div>
    );
  }

  // Calculate current stage index (0-based)
  let activeIndex = 0;
  if (status === 'APPLIED') activeIndex = 0;
  else if (status === 'REVIEWED') activeIndex = 1;
  else if (status === 'INTERVIEW_SCHEDULED') activeIndex = 3;
  else if (status === 'SELECTED') activeIndex = 4;

  return (
    <div className="py-4 space-y-6">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-gold-700">Recruitment Timeline</span>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
          Live Status Sync
        </span>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-5 gap-3">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 ${
                isCurrent
                  ? 'bg-gold-500 text-white border-gold-600 shadow-luxury ring-4 ring-gold-200 scale-105'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-white text-gray-400 border-gold-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Step {idx + 1}</span>
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isCurrent && <Clock className="w-4 h-4 text-white animate-spin" />}
              </div>

              <div>
                <p className={`text-xs font-bold ${isCurrent ? 'text-white' : isCompleted ? 'text-emerald-950' : 'text-gray-600'}`}>
                  {stage.title}
                </p>
                <p className={`text-[10px] mt-0.5 ${isCurrent ? 'text-gold-100' : 'text-gray-500'}`}>
                  {stage.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
