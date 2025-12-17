
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

    return { totalPnL, totalWins, totalLosses, totalGames, chartData };
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

  return (
    <div className={`flex flex-col h-full ${isCustomTheme ? '' : 'bg-white/50'}`}>
      {/* Top Bar with Title and Tabs */}
      <div className={`backdrop-blur-sm pt-4 px-4 pb-2 border-b flex flex-col sticky top-0 z-10 transition-colors ${isCustomTheme
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
                className={`px-3 py-1 rounded-md transition-all ${timeRange === range
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
        {timeRange === 'year' && (
          <div className={`rounded-2xl p-4 shadow-sm border transition-colors ${isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
            }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>数据洞察</h3>
              <span className={`text-xs ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>{insights.year} 年度</span>
            </div>
            {insights.totalGames === 0 ? (
              <div className={`h-20 flex items-center justify-center text-sm ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>
                暂无数据
              </div>
            ) : (
              <>
                <div className={`mt-3 grid grid-cols-2 gap-3`}>
                  <div className={`backdrop-blur-sm rounded-xl p-3 border ${isCustomTheme ? 'bg-black/10 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>总场次</div>
                    <div className={`text-xl font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>{insights.totalGames}</div>
                  </div>
                  <div className={`backdrop-blur-sm rounded-xl p-3 border ${isCustomTheme ? 'bg-black/10 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>获胜场次</div>
                    <div className={`text-xl font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>{insights.wins} <span className={`text-xs font-normal ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>胜率 {insights.winRate}%</span></div>
                  </div>
                  <div className={`backdrop-blur-sm rounded-xl p-3 border col-span-2 ${isCustomTheme ? 'bg-black/10 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>总盈利(Net)</div>
                    <div className={`text-2xl font-bold ${insights.net >= 0 ? 'text-red-500' : 'text-green-600'}`}>{insights.net > 0 ? `+${insights.net}` : `${insights.net}`}</div>
                  </div>
                  <div className={`backdrop-blur-sm rounded-xl p-3 border ${isCustomTheme ? 'bg-black/10 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>最大单笔赢</div>
                    <div className={`text-lg font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>{insights.maxWinAmount > 0 ? `+${insights.maxWinAmount}` : '—'}</div>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>{insights.maxWinDate || ''}</div>
                  </div>
                  <div className={`backdrop-blur-sm rounded-xl p-3 border ${isCustomTheme ? 'bg-black/10 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>最大单笔亏损</div>
                    <div className={`text-lg font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>{insights.maxLossAmount < 0 ? `${insights.maxLossAmount}` : '—'}</div>
                    <div className={`text-xs ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>{insights.maxLossDate || ''}</div>
                  </div>
                </div>
                <div className={`mt-4`}>
                  <div className={`font-bold text-sm mb-2 ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>月度表现复盘</div>
                  <ul className={`space-y-1 text-sm ${isCustomTheme ? 'text-white/80' : 'text-gray-700'}`}>
                    {insights.monthlyRecap.map((t, idx) => (
                      <li key={idx} className="leading-tight">• {t}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Fortune Card - Dynamic "Yun Shi" */}
        {timeRange === 'week' && (
          <div className={`rounded-xl p-4 shadow-sm border relative overflow-hidden transition-colors ${isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100 text-gray-800'
            }`}>
            <div className={`absolute top-0 right-0 p-3 opacity-10 pointer-events-none`}>
              <span className="text-6xl">
                {fortune.type === 'good' ? '🧧' : fortune.type === 'bad' ? '🌧️' : fortune.type === 'warning' ? '⚡️' : '🍵'}
              </span>
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className={`text-xs mb-1 font-medium ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>本周运势</div>
                <h3 className={`text-xl font-bold mb-1 ${fortune.type === 'good' ? 'text-red-500' :
                  fortune.type === 'bad' ? 'text-green-600' :
                    fortune.type === 'warning' ? 'text-orange-500' :
                      (isCustomTheme ? 'text-white' : 'text-gray-700')
                  }`}>
                  {fortune.title}
                </h3>
                <p className={`text-xs ${isCustomTheme ? 'text-white/70' : 'text-gray-500'}`}>
                  {fortune.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 text-white shadow-lg col-span-2 transition-all duration-300 ${isCustomTheme
            ? 'backdrop-blur-sm border border-white/20'
            : 'bg-mahjong-600 shadow-mahjong-500/20'
            }`}>
            <div className={`text-sm mb-1 ${isCustomTheme ? 'text-white/80' : 'text-emerald-100'}`}>
              {timeRange === 'all' ? '总盈亏' : '期间盈亏'}
            </div>
            <div className="text-3xl font-bold">{stats.totalPnL > 0 ? '+' : ''}{stats.totalPnL}</div>
          </div>

          <div className={`backdrop-blur-sm rounded-xl p-4 shadow-sm border transition-colors ${isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
            }`}>
            <div className={`text-xs mb-1 ${isCustomTheme ? 'text-white/60' : 'text-gray-400'}`}>场次</div>
            <div className={`text-xl font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>
              {stats.totalGames} <span className={`text-xs font-normal ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>场</span>
            </div>
          </div>
          <div className={`backdrop-blur-sm rounded-xl p-4 shadow-sm border transition-colors ${isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
            }`}>
            <div className={`text-xs mb-1 ${isCustomTheme ? 'text-white/60' : 'text-gray-400'}`}>胜率</div>
            <div className={`text-xl font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>
              {stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0}
              <span className={`text-xs font-normal ${isCustomTheme ? 'text-white/40' : 'text-gray-400'}`}>%</span>
            </div>
          </div>
        </div>

        {/* Trend Chart - Only show for week/month/year views */}
        {timeRange !== 'all' && trendData.length > 0 && (
          <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-sm border min-h-[300px] transition-colors ${isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
            }`}>
            <h3 className={`font-bold text-sm mb-4 ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>
              {timeRange === 'week' ? '每日战绩趋势' : timeRange === 'month' ? '每周战绩趋势' : '每月战绩趋势'}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isCustomTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: timeRange === 'year' ? 10 : 12, fill: isCustomTheme ? '#eee' : '#666' }}
                    stroke={isCustomTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                    interval={0}
                    angle={timeRange === 'year' ? -45 : 0}
                    textAnchor={timeRange === 'year' ? 'end' : 'middle'}
                    height={timeRange === 'year' ? 60 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: isCustomTheme ? '#eee' : '#666' }}
                    stroke={isCustomTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                  />
                  <Tooltip
                    formatter={(value: number) => [`¥${value}`, '盈亏']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#333'
                    }}
                  />
                  <ReferenceLine y={0} stroke={isCustomTheme ? "#888" : "#9ca3af"} strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke={isCustomTheme ? '#ef4444' : '#ef4444'}
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className={`backdrop-blur-sm rounded-2xl p-4 shadow-sm border min-h-[300px] transition-colors ${isCustomTheme ? 'bg-black/20 border-white/10' : 'bg-white/90 border-gray-100'
          }`}>
          <h3 className={`font-bold text-sm mb-4 ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>圈子盈亏分布</h3>
          {stats.chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: isCustomTheme ? '#eee' : '#666' }} />
                  <Tooltip
                    formatter={(value: number) => [`¥${value}`, '盈亏']}
                    cursor={{ fill: 'transparent' }}
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
