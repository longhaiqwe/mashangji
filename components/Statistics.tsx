
import React, { useMemo, useState } from 'react';
import { Record, Circle } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface StatisticsProps {
  records: Record[];
  circles: Circle[];
  themeId?: 'default' | 'green' | 'red' | 'custom';
}

type TimeRange = 'week' | 'month' | 'year' | 'all';

const Statistics: React.FC<StatisticsProps> = ({ records, circles, themeId = 'default' }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper: Get start and end of the week (Monday based)
  const getWeekRange = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    
    const start = new Date(date);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  // Helper: Navigate Time
  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (timeRange === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (timeRange === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (timeRange === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  // Helper: Format Date Label
  const getDateLabel = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    
    if (timeRange === 'week') {
      const { start, end } = getWeekRange(currentDate);
      const startStr = `${start.getMonth() + 1}.${start.getDate()}`;
      const endStr = `${end.getMonth() + 1}.${end.getDate()}`;
      return `${y}年 第${getWeekNumber(currentDate)}周 (${startStr} - ${endStr})`;
    }
    if (timeRange === 'month') return `${y}年 ${m}月`;
    if (timeRange === 'year') return `${y}年`;
    return '全部记录';
  };

  // Helper: Get Week Number
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const stats = useMemo(() => {
    let filtered = [...records];
    const rangeDate = new Date(currentDate);

    if (timeRange === 'week') {
      const { start, end } = getWeekRange(rangeDate);
      // Convert comparison to start of day for accurate string comparison or timestamp
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      filtered = filtered.filter(r => {
        const rDate = new Date(r.date).getTime();
        return rDate >= startTime && rDate <= endTime;
      });
    } else if (timeRange === 'month') {
      const targetMonth = rangeDate.getMonth();
      const targetYear = rangeDate.getFullYear();
      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      });
    } else if (timeRange === 'year') {
      const targetYear = rangeDate.getFullYear();
      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === targetYear;
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
  }, [records, circles, timeRange, currentDate]);

  // Apply glass effect for any theme that isn't the default gray
  const isCustomTheme = themeId !== 'default';

  return (
    <div className={`flex flex-col h-full ${isCustomTheme ? '' : 'bg-white/50'}`}>
       {/* Top Bar with Title and Tabs */}
       <div className={`backdrop-blur-sm pt-4 px-4 pb-2 border-b flex flex-col sticky top-0 z-10 transition-colors ${
           isCustomTheme 
             ? 'bg-black/10 border-white/10 text-white' 
             : 'bg-white/80 border-gray-100 text-gray-800'
       }`}>
         <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg">统计分析</h2>
            <div className={`p-1 rounded-lg flex text-xs font-medium ${isCustomTheme ? 'bg-black/20' : 'bg-gray-100'}`}>
                {(['week', 'month', 'year', 'all'] as const).map(range => (
                    <button 
                        key={range}
                        onClick={() => {
                          setTimeRange(range);
                          setCurrentDate(new Date()); // Reset date when switching tabs
                        }}
                        className={`px-3 py-1 rounded-md transition-all ${
                            timeRange === range 
                                ? (isCustomTheme ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-mahjong-600 shadow-sm')
                                : (isCustomTheme ? 'text-white/60 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200')
                        }`}
                    >
                        {range === 'week' ? '周' : range === 'month' ? '月' : range === 'year' ? '年' : '全部'}
                    </button>
                ))}
            </div>
         </div>

         {/* Date Navigator (Hidden for 'all') */}
         {timeRange !== 'all' && (
            <div className="flex items-center justify-between pb-1 animate-fade-in-down">
                <button 
                  onClick={() => handleNavigate('prev')}
                  className={`p-1 rounded-full ${isCustomTheme ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                >
                   <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center font-bold text-sm">
                   <Calendar className="w-4 h-4 mr-2 opacity-70" />
                   {getDateLabel()}
                </div>
                <button 
                  onClick={() => handleNavigate('next')}
                  className={`p-1 rounded-full ${isCustomTheme ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                >
                   <ChevronRight className="w-5 h-5" />
                </button>
            </div>
         )}
       </div>

       <div className="p-4 space-y-4 overflow-y-auto">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl p-4 text-white shadow-lg col-span-2 transition-all duration-300 ${
                    isCustomTheme 
                        ? 'backdrop-blur-sm border border-white/20' 
                        : 'bg-mahjong-600 shadow-mahjong-500/20'
                }`}>
                    <div className={`text-sm mb-1 ${isCustomTheme ? 'text-white/80' : 'text-emerald-100'}`}>
                        {timeRange === 'all' ? '总盈亏' : '期间盈亏'}
                    </div>
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
                        该时段暂无数据
                    </div>
                )}
            </div>
            
            <div className={`text-center text-xs pt-4 rounded-lg py-2 ${isCustomTheme ? 'text-white/40 bg-black/10' : 'text-gray-400 bg-white/40'}`}>
                红为赢，绿为输
            </div>
       </div>
    </div>
  );
};

export default Statistics;
