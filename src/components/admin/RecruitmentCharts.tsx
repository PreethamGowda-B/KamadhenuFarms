'use client';

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
import { TrendingUp, MapPin } from 'lucide-react';

interface RecruitmentChartsProps {
  monthlyData: { month: string; count: number }[];
  cityData: { name: string; applications: number }[];
  colors: string[];
}

export default function RecruitmentCharts({ monthlyData, cityData, colors }: RecruitmentChartsProps) {
  return (
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
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#F8F5EF', borderRadius: '12px', border: '1px solid #D8A64F' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
