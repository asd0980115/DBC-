import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface TrendSparklineProps {
  data: number[];
  color?: string;
}

export const TrendSparkline: React.FC<TrendSparklineProps> = ({ data, color = "#2563EB" }) => {
  // Transform array of numbers into object array for Recharts
  const chartData = data.map((val, idx) => ({ i: idx, val }));

  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
            <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};