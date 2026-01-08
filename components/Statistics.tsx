
import React, { useMemo, useState } from 'react';
import { Record, Circle } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid } from 'recharts';
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

    const maxAbs = Math.max(...chartData.map(d => Math.abs(d.amount)), 100); // Default 100 to avoid 0 domain if empty (though checked later)

    return { totalPnL, totalWins, totalLosses, totalGames, chartData, maxAbs };
  }, [records, circles, timeRange, currentDate]);

  // Trend Data Calculation for Line Charts
  const trendData = useMemo(() => {
    const rangeDate = new Date(currentDate);

    if (timeRange === 'week') {
      // Daily trend for the week (7 days)
      const { start } = getWeekRange(rangeDate);
      const dailyData: { date: string; amount: number; label: string }[] = [];

      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const dayStr = day.toISOString().split('T')[0];

        const dayRecords = records.filter(r => r.date === dayStr);
        const dayAmount = dayRecords.reduce((acc, r) => acc + r.amount, 0);

        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const label = weekdays[day.getDay()];

        dailyData.push({ date: dayStr, amount: dayAmount, label });
      }

      return dailyData;
    } else if (timeRange === 'month') {
      // Weekly trend for the month (4-5 weeks)
      const targetMonth = rangeDate.getMonth();
      const targetYear = rangeDate.getFullYear();

      // Get first day of month
      const firstDay = new Date(targetYear, targetMonth, 1);
      // Get last day of month
      const lastDay = new Date(targetYear, targetMonth + 1, 0);

      // Find the Monday of the week containing first day
      const firstMonday = new Date(firstDay);
      const firstDayOfWeek = firstDay.getDay();
      const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
      firstMonday.setDate(firstDay.getDate() + daysToMonday);

      const weeklyData: { weekStart: string; amount: number; label: string }[] = [];
      let currentWeekStart = new Date(firstMonday);
      let weekIndex = 1;

      while (currentWeekStart <= lastDay) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekRecords = records.filter(r => {
          const rDate = new Date(r.date);
          return rDate >= currentWeekStart && rDate <= weekEnd &&
            rDate.getMonth() === targetMonth && rDate.getFullYear() === targetYear;
        });

        const weekAmount = weekRecords.reduce((acc, r) => acc + r.amount, 0);

        // Only include if this week has days in the target month
        if (weekRecords.length > 0 || (currentWeekStart.getMonth() === targetMonth || weekEnd.getMonth() === targetMonth)) {
          weeklyData.push({
            weekStart: currentWeekStart.toISOString().split('T')[0],
            amount: weekAmount,
            label: `第${weekIndex}周`
          });
          weekIndex++;
        }

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      return weeklyData;
    } else if (timeRange === 'year') {
      // Monthly trend for the year (12 months)
      const targetYear = rangeDate.getFullYear();
      const monthlyData: { month: number; amount: number; label: string }[] = [];

      for (let m = 0; m < 12; m++) {
        const monthRecords = records.filter(r => {
          const d = new Date(r.date);
          return d.getFullYear() === targetYear && d.getMonth() === m;
        });

        const monthAmount = monthRecords.reduce((acc, r) => acc + r.amount, 0);

        monthlyData.push({
          month: m + 1,
          amount: monthAmount,
          label: `${m + 1}月`
        });
      }

      return monthlyData;
    }

    return [];
  }, [records, timeRange, currentDate]);

  // ... (previous code)

  // Helper: Get Last Week Range
  const getLastWeekRange = (d: Date) => {
    const { start } = getWeekRange(d);
    const lastWeekStart = new Date(start);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);
    return { start: lastWeekStart, end: lastWeekEnd };
  };

  const insights = useMemo(() => {
    const targetYear = currentDate.getFullYear();
    const yearRecords = records.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === targetYear;
    });
    const totalGames = yearRecords.length;
    const wins = yearRecords.filter(r => r.amount > 0).length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const net = yearRecords.reduce((acc, r) => acc + r.amount, 0);
    let maxWinAmount = 0;
    let maxWinDate = '';
    let maxLossAmount = 0;
    let maxLossDate = '';
    yearRecords.forEach(r => {
      if (r.amount > maxWinAmount) {
        maxWinAmount = r.amount;
        maxWinDate = r.date;
      }
      if (r.amount < maxLossAmount) {
        maxLossAmount = r.amount;
        maxLossDate = r.date;
      }
    });
    const monthlyTotals = Array.from({ length: 12 }, () => 0);
    yearRecords.forEach(r => {
      const m = new Date(r.date).getMonth();
      monthlyTotals[m] += r.amount;
    });
    const bestMonthIndex = monthlyTotals.reduce((best, val, idx) => (val > monthlyTotals[best] ? idx : best), 0);
    const worstMonthIndex = monthlyTotals.reduce((worst, val, idx) => (val < monthlyTotals[worst] ? idx : worst), 0);
    const january = monthlyTotals[0];
    const december = monthlyTotals[11];
    const positives = monthlyTotals
      .map((v, i) => ({ v, i }))
      .filter(x => x.v > 0 && x.i !== bestMonthIndex)
      .map(x => `${x.i + 1}月`);
    const monthlyRecap: string[] = [];
    if (january < 0) {
      monthlyRecap.push(`开局不利（1月）：亏损 ${Math.abs(january)}`);
    }
    if (monthlyTotals[bestMonthIndex] > 0) {
      monthlyRecap.push(`强劲反弹（${bestMonthIndex + 1}月）：单月盈利 ${monthlyTotals[bestMonthIndex]}`);
    }
    if (positives.length > 0) {
      monthlyRecap.push(`稳定输出：${positives.join('、')}为正收益月`);
    }
    if (december < 0) {
      monthlyRecap.push(`年末震荡：12月亏损 ${Math.abs(december)}`);
    }
    return {
      year: targetYear,
      totalGames,
      wins,
      winRate,
      net,
      maxWinAmount,
      maxWinDate,
      maxLossAmount,
      maxLossDate,
      worstMonthIndex,
      bestMonthIndex,
      monthlyRecap
    };
  }, [records, currentDate]);

  const fortune = useMemo(() => {
    // Only calculate fortune if we are in 'month' or 'week' view, or broadly available
    // Let's make it available based on "This Week" vs "Last Week" relative to *today* (real time), 
    // rather than the selected view date, to keep "Fortune" as a "current status" indicator.

    // However, if the user navigates back in time, maybe they want to see the fortune *then*?
    // The prompt implies a "prediction" or "current state" so using real-time "Today" makes more sense for "Fortune".

    const now = new Date(); // Use real now for "current fortune"

    const { start: thisWeekStart, end: thisWeekEnd } = getWeekRange(now);
    const { start: lastWeekStart, end: lastWeekEnd } = getLastWeekRange(now);

    const thisWeekPnL = records
      .filter(r => {
        const t = new Date(r.date).getTime();
        return t >= thisWeekStart.getTime() && t <= thisWeekEnd.getTime();
      })
      .reduce((acc, r) => acc + r.amount, 0);

    const lastWeekPnL = records
      .filter(r => {
        const t = new Date(r.date).getTime();
        return t >= lastWeekStart.getTime() && t <= lastWeekEnd.getTime();
      })
      .reduce((acc, r) => acc + r.amount, 0);

    // Heuristics
    // 1. Last Win, This Win -> Rising
    // 2. Last Loss, This Win -> Turning
    // 3. Last Win, This Loss -> Caution
    // 4. Last Loss, This Loss -> Bad

    let title = '';
    let description = '';
    let type: 'good' | 'bad' | 'neutral' | 'warning' = 'neutral';

    const hasLastWeekData = records.some(r => {
      const t = new Date(r.date).getTime();
      return t >= lastWeekStart.getTime() && t <= lastWeekEnd.getTime();
    });

    if (!hasLastWeekData) {
      if (thisWeekPnL > 0) {
        title = '初露锋芒';
        description = '本周开局不错，保持这个势头！';
        type = 'good';
      } else if (thisWeekPnL < 0) {
        title = '厉兵秣马';
        description = '胜败乃兵家常事，调整心态再战。';
        type = 'warning';
      } else {
        title = '蓄势待发';
        description = '暂无上周数据，本周尚未开战。';
        type = 'neutral';
      }
    } else {
      if (lastWeekPnL > 0 && thisWeekPnL > 0) {
        title = '气势如虹';
        description = '连战连捷，运势正旺，宜乘胜追击！';
        type = 'good';
      } else if (lastWeekPnL <= 0 && thisWeekPnL > 0) {
        title = '扭转乾坤';
        description = '否极泰来，运势回升，是个好兆头。';
        type = 'good';
      } else if (lastWeekPnL > 0 && thisWeekPnL <= 0) { // treating 0 as "not winning" effectively
        title = '暂避锋芒';
        description = '运势稍有回落，建议稳扎稳打，切勿上头。';
        type = 'warning';
      } else {
        title = '诸事不宜';
        description = '近期运势低迷，建议休养生息，改日再战。';
        type = 'bad';
      }
    }

    return { title, description, type, thisWeekPnL, lastWeekPnL };
  }, [records]); // Re-calc when records change

  // Apply glass effect for any theme that isn't the default gray
  const isCustomTheme = themeId !== 'default';

  // Theme logic: Mostly light/clean now.
  const isDarkTheme = themeId === 'black' || themeId === 'rich';

  // Constants for Chart Colors (using new Design System)
  const COLOR_WIN = '#f43f5e'; // Rose 500 (Win)
  const COLOR_LOSS = '#10b981'; // Emerald 500 (Loss)
  const COLOR_AXIS = '#cbd5e1'; // Slate 300
  const COLOR_TEXT = '#64748b'; // Slate 500

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
      {/* Top Bar with Title and Tabs */}
      <div className={`pt-safe-top px-6 pb-4 flex-shrink-0 z-10 transition-colors`}>
        <div className="flex justify-between items-center mb-6 mt-4">
          <h2 className={`font-bold text-xl tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>统计分析</h2>

          <div className={`p-1 rounded-full flex text-xs font-bold ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
            {(['week', 'month', 'year', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setCurrentDate(new Date());
                }}
                className={`px-4 py-1.5 rounded-full transition-all duration-300 ${timeRange === range
                  ? (isDarkTheme ? 'bg-white text-black shadow-md' : 'bg-white text-primary-600 shadow-sm ring-1 ring-black/5')
                  : (isDarkTheme ? 'text-white/60 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-200/50')
                  }`}
              >
                {range === 'week' ? '周' : range === 'month' ? '月' : range === 'year' ? '年' : '全部'}
              </button>
            ))}
          </div>
        </div>

        {/* Date Navigator */}
        {timeRange !== 'all' && (
          <div className="flex items-center justify-between pb-2">
            <button
              onClick={() => handleNavigate('prev')}
              className={`p-2 rounded-full transition-colors ${isDarkTheme ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className={`flex items-center font-bold text-base ${isDarkTheme ? 'text-white' : 'text-slate-700'}`}>
              <Calendar className="w-4 h-4 mr-2 opacity-60" />
              {getDateLabel()}
            </div>
            <button
              onClick={() => handleNavigate('next')}
              className={`p-2 rounded-full transition-colors ${isDarkTheme ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 px-5 space-y-5 overflow-y-auto pb-safe-bottom scrollbar-hide">

        {/* Fortune Card - New Design */}
        {timeRange === 'week' && (
          <div className={`rounded-3xl p-5 shadow-sm relative overflow-hidden ${isDarkTheme ? 'bg-slate-800' : 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-50'}`}>
            <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none transform rotate-12">
              <span style={{ fontSize: '100px' }}>
                {fortune.type === 'good' ? '🧧' : fortune.type === 'bad' ? '🌧️' : fortune.type === 'warning' ? '⚡️' : '🍵'}
              </span>
            </div>

            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkTheme ? 'bg-white/10 text-white/70' : 'bg-white/60 text-indigo-400'
                  }`}>本周运势</span>
              </div>
              <h3 className={`text-2xl font-black mb-1.5 ${fortune.type === 'good' ? 'text-rose-500' :
                fortune.type === 'bad' ? 'text-emerald-500' :
                  fortune.type === 'warning' ? 'text-orange-500' :
                    'text-slate-700'
                }`}>
                {fortune.title}
              </h3>
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                {fortune.description}
              </p>
            </div>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-3xl p-5 col-span-2 shadow-sm border transition-all ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
            }`}>
            <div className={`text-sm font-bold uppercase tracking-wider mb-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>
              {timeRange === 'all' ? '总亏盈 (Total)' : '期间盈亏 (Net)'}
            </div>
            <div className={`text-5xl font-black font-mono tracking-tight my-2 ${stats.totalPnL >= 0 ? 'text-win' : 'text-loss'}`}>
              {stats.totalPnL > 0 ? '+' : ''}{stats.totalPnL}
            </div>
          </div>

          <div className={`rounded-2xl p-4 shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>场次</div>
            <div className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
              {stats.totalGames} <span className="text-xs font-normal text-slate-400">场</span>
            </div>
          </div>

          <div className={`rounded-2xl p-4 shadow-sm border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>胜率</div>
            <div className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
              {stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0}
              <span className="text-xs font-normal text-slate-400">%</span>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {timeRange !== 'all' && trendData.length > 0 && (
          <div className={`rounded-3xl p-5 shadow-sm border min-h-[320px] pb-8 ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-bold text-sm mb-6 ${isDarkTheme ? 'text-slate-300' : 'text-slate-800'}`}>
              {timeRange === 'week' ? '每日走势' : timeRange === 'month' ? '周度走势' : '月度走势'}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDarkTheme ? '#334155' : '#f1f5f9'}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: COLOR_TEXT }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    interval={timeRange === 'week' ? 0 : 'preserveStartEnd'}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: COLOR_TEXT }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: COLOR_AXIS, strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-xs text-slate-600">
                            <div className="font-bold text-slate-800 mb-1">{payload[0].payload.label}</div>
                            <div className={`font-mono text-sm font-bold ${val >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {val > 0 ? '+' : ''}{val}
                            </div>
                          </div>
                        )
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke={isDarkTheme ? "#475569" : "#cbd5e1"} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke={COLOR_WIN} // We generally use the primary color for the line
                    strokeWidth={3}
                    dot={{ fill: 'white', stroke: COLOR_WIN, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: COLOR_WIN, stroke: 'white', strokeWidth: 2 }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Distribution Chart */}
        <div className={`rounded-3xl p-5 shadow-sm border min-h-[300px] ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className={`font-bold text-sm mb-4 ${isDarkTheme ? 'text-slate-300' : 'text-slate-800'}`}>圈子盈亏分布</h3>
          {stats.chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                  <XAxis type="number" hide domain={[-stats.maxAbs, stats.maxAbs]} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 12, fill: isDarkTheme ? '#cbd5e1' : '#475569', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-xs text-slate-600">
                            <div className="font-bold text-slate-800 mb-1">{payload[0].payload.name}</div>
                            <div className={`font-mono text-sm font-bold ${val >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {val > 0 ? '+' : ''}{val}
                            </div>
                          </div>
                        )
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={0} stroke={isDarkTheme ? "#475569" : "#e2e8f0"} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount >= 0 ? COLOR_WIN : COLOR_LOSS} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-40 flex items-center justify-center text-sm ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="text-center">
                <div className="text-2xl mb-2 opacity-50">📊</div>
                该时段暂无数据
              </div>
            </div>
          )}
        </div>

        {/* Year Insights (Only show in Year view) */}
        {timeRange === 'year' && (
          <div className={`rounded-3xl p-5 shadow-sm border mb-8 ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-bold text-base mb-4 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{insights.year} 年度复盘</h3>

            {insights.totalGames > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-2xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className="text-xs text-slate-500 mb-1">最大单笔盈利</div>
                    <div className="text-rose-600 font-bold font-mono text-lg">{insights.maxWinAmount > 0 ? '+' + insights.maxWinAmount : '-'}</div>
                    <div className="text-[10px] text-slate-400">{insights.maxWinDate}</div>
                  </div>
                  <div className={`p-3 rounded-2xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className="text-xs text-slate-500 mb-1">最大单笔亏损</div>
                    <div className="text-emerald-500 font-bold font-mono text-lg">{insights.maxLossAmount < 0 ? insights.maxLossAmount : '-'}</div>
                    <div className="text-[10px] text-slate-400">{insights.maxLossDate}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {insights.monthlyRecap.map((t, i) => (
                    <div key={i} className={`text-xs px-3 py-2 rounded-lg flex items-start ${isDarkTheme ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      <span className="mr-2 mt-0.5 text-rose-500 font-bold">•</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-4 text-sm">暂无年度数据</div>
            )}
          </div>
        )}

        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default Statistics;
