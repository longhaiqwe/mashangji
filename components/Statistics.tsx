import React, { useMemo, useState } from 'react';
import { Record, Circle } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface StatisticsProps {
  records: Record[];
  circles: Circle[];
  themeId?: 'default' | 'green' | 'red' | 'custom';
}

const Statistics: React.FC<StatisticsProps> = ({ records, circles, themeId = 'default' }) => {
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'all'>('month');

  const stats = useMemo(() => {
    let filtered = [...records];
    const now = new Date();
    
    if (timeRange === 'month') {
        filtered = filtered.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (timeRange === 'year') {
        filtered = filtered.filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === now.getFullYear();
        });
    }

    const totalPnL = filtered.reduce((acc, r) => acc + r.amount, 0);
    const totalWins = filtered.filter(r => r.amount > 0).length;
    const totalLosses = filtered.filter(r => r.amount < 0).length;
    const totalGames = filtered.length;
    
    // Group by Circle for Chart
    const circleStats: { [key: string]: number } = {};
    circles.forEach(c => circleStats[c.name] = 0);
    
    filtered.forEach(r => {
        const cName = circles.find(c => c.id === r.circleId)?.name || '未知';
        if (circleStats[cName] !== undefined) {
            circleStats[cName] += r.amount;
        } else {
            circleStats[cName] = r.amount;
        }
    });

    const chartData = Object.entries(circleStats)
        .map(([name, amount]) => ({ name, amount }))
        .filter(item => item.amount !== 0);

    return { totalPnL, totalWins, totalLosses, totalGames, chartData };
  }, [records, circles, timeRange]);

  // Apply glass effect for any theme that isn't the default gray
  const isCustomTheme = themeId !== 'default';

  return (
    <div className={`flex flex-col h-full ${isCustomTheme ? '' : 'bg-white/50'}`}>
       <div className={`backdrop-blur-sm px-4 py-3 border-b flex justify-between items-center sticky top-0 z-10 transition-colors ${
           isCustomTheme 
             ? 'bg-black/10 border-white/10 text-white' 
             : 'bg-white/80 border-gray-100 text-gray-800'
       }`}>
         <h2 className="font-bold text-lg">统计分析</h2>
         <div className={`p-1 rounded-lg flex text-xs font-medium ${isCustomTheme ? 'bg-black/20' : 'bg-gray-100'}`}>
            {(['month', 'year', 'all'] as const).map(range => (
                <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md transition-all ${
                        timeRange === range 
                            ? (isCustomTheme ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-mahjong-600 shadow-sm')
                            : (isCustomTheme ? 'text-white/60 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200')
                    }`}
                >
                    {range === 'month' ? '本月' : range === 'year' ? '本年' : '全部'}
                </button>
            ))}
         </div>
       </div>

       <div className="p-4 space-y-4 overflow-y-auto">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl p-4 text-white shadow-lg col-span-2 transition-all duration-300 ${
                    isCustomTheme 
                        ? 'backdrop-blur-sm border border-white/20' 
                        : 'bg-mahjong-600 shadow-mahjong-500/20'
                }`}>
                    <div className={`text-sm mb-1 ${isCustomTheme ? 'text-white/80' : 'text-emerald-100'}`}>总盈亏</div>
                    <div className="text-3xl font-bold">{stats.totalPnL > 0 ? '+' : ''}{stats.totalPnL}</div>
                </div>
                
                <div className={`backdrop-blur-sm rounded-xl p-4 shadow-sm border transition-colors ${
                    isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
                }`}>
                    <div className={`text-xs mb-1 ${isCustomTheme ? 'text-white/60' : 'text-gray-400'}`}>场次</div>
                    <div className={`text-xl font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>
                        {stats.totalGames} <span className={`text-xs font-normal ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>场</span>
                    </div>
                </div>
                <div className={`backdrop-blur-sm rounded-xl p-4 shadow-sm border transition-colors ${
                    isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
                }`}>
                    <div className={`text-xs mb-1 ${isCustomTheme ? 'text-white/60' : 'text-gray-400'}`}>胜率</div>
                    <div className={`text-xl font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>
                        {stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0}
                        <span className={`text-xs font-normal ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>%</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-sm border min-h-[300px] transition-colors ${
                 isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
            }`}>
                <h3 className={`font-bold text-sm mb-4 ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>圈子盈亏分布</h3>
                {stats.chartData.length > 0 ? (
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fill: isCustomTheme ? '#eee' : '#666'}} />
                                <Tooltip 
                                    formatter={(value: number) => [`¥${value}`, '盈亏']}
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        color: '#333'
                                    }}
                                />
                                <ReferenceLine x={0} stroke={isCustomTheme ? "#666" : "#9ca3af"} />
                                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                                    {stats.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.amount >= 0 ? '#ef4444' : '#16a34a'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className={`h-40 flex items-center justify-center text-sm ${isCustomTheme ? 'text-white/40' : 'text-gray-300'}`}>
                        暂无数据
                    </div>
                )}
            </div>
            
            <div className={`text-center text-xs pt-4 rounded-lg py-2 ${isCustomTheme ? 'text-white/40 bg-black/10' : 'text-gray-400 bg-white/40'}`}>
                Red is Win, Green is Loss
            </div>
       </div>
    </div>
  );
};

export default Statistics;