
import React, { useMemo, useState } from 'react';
import { Record, Circle, ViewState } from '../types';
import { Trash2, Edit2, Wallet } from 'lucide-react';

interface DashboardProps {
  records: Record[];
  circles: Circle[];
  onDeleteRecord: (id: string) => void;
  onEditRecord: (record: Record) => void;
  onNavigate: (view: ViewState) => void;
  themeId?: string;
  selectedCircleId: string;
  onSelectCircle: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  records,
  circles,
  onDeleteRecord,
  onEditRecord,
  onNavigate,
  themeId = 'default',
  selectedCircleId,
  onSelectCircle
}) => {
  // Apply glass effect for any theme that isn't the default gray
  const isCustomTheme = themeId !== 'default';

  const filteredRecords = useMemo(() => {
    let sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
    if (selectedCircleId !== 'all') {
      sorted = sorted.filter(r => r.circleId === selectedCircleId);
    }
    return sorted;
  }, [records, selectedCircleId]);

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return filteredRecords.reduce((acc, curr) => {
      const d = new Date(curr.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return acc + curr.amount;
      }
      return acc;
    }, 0);
  }, [filteredRecords]);

  const getCircleName = (id: string) => circles.find(c => c.id === id)?.name || '未知圈子';

  const formatMoney = (amount: number) => {
    return amount > 0 ? `+${amount}` : `${amount}`;
  };

  // Header styles based on theme
  const headerClass = themeId === 'rich'
    ? 'bg-black/30 backdrop-blur-[2px] pt-10 shadow-sm' // Subtle overlay for contrast
    : isCustomTheme
      ? 'bg-black/20 backdrop-blur-xl border-b border-white/10 pt-10'
      : 'bg-mahjong-800/95 backdrop-blur-md shadow-lg pt-10';

  const headerTextLabelClass = isCustomTheme ? 'text-white/80' : 'text-emerald-100';
  const headerTextValueClass = isCustomTheme ? 'text-white' : (currentMonthStats >= 0 ? 'text-white' : 'text-emerald-200');

  // Compact margin for New Year theme to fit in the green area
  //const headerContentMB = themeId === 'new_year' ? 'mb-6' : 'mb-6';
  const headerContentMB = 'mb-6';

  const filterButtonClass = (isActive: boolean) => {
    if (isActive) {
      return 'bg-white text-mahjong-800 shadow-md';
    }
    return isCustomTheme
      ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
      : 'bg-mahjong-700 text-emerald-100 border border-mahjong-600';
  };

  return (
    <div className={`flex flex-col h-full ${isCustomTheme ? 'bg-transparent' : 'bg-white/30'}`}>
      {/* Header / Summary Card */}
      <div className={`${headerClass} p-6 rounded-b-[2.5rem] flex-shrink-0 z-10 relative transition-all duration-300`}>
        <div className={`flex justify-between items-center ${headerContentMB}`}>
          <div>
            <h2 className={`${headerTextLabelClass} text-sm font-medium mb-1`}>本月累计盈亏</h2>
            <div className={`text-4xl font-bold tracking-tight ${headerTextValueClass}`}>
              <span className="text-2xl mr-1">¥</span>
              {formatMoney(currentMonthStats)}
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <Wallet className="text-white w-6 h-6" />
          </div>
        </div>

        {/* Quick Filter Pill */}
        <div className="flex overflow-x-auto no-scrollbar space-x-3 pb-2">
          <button
            onClick={() => onSelectCircle('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filterButtonClass(selectedCircleId === 'all')}`}
          >
            全部
          </button>
          {circles.map(circle => (
            <button
              key={circle.id}
              onClick={() => onSelectCircle(circle.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filterButtonClass(selectedCircleId === circle.id)}`}
            >
              {circle.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className={`text-sm font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-sm inline-block ${isCustomTheme ? 'text-white/90 bg-black/20' : 'text-gray-500 bg-white/50'}`}>近期战绩</h3>
          <span className={`text-xs px-2 py-1 rounded-md backdrop-blur-sm ${isCustomTheme ? 'text-white/80 bg-black/20' : 'text-gray-500 bg-white/50'}`}>{filteredRecords.length} 笔记录</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-80">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isCustomTheme ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-400'}`}>
              <Edit2 className="w-8 h-8" />
            </div>
            <p className={`px-3 py-1 rounded-lg backdrop-blur-sm text-center ${isCustomTheme ? 'bg-black/20 text-white' : 'bg-white/50 text-gray-500'}`}>
              暂无记录<br />
              <span className="text-xs opacity-80">💡 提示：长按底部“+”号可快速语音记账</span>
            </p>
            <button
              onClick={() => onNavigate(ViewState.ADD_RECORD)}
              className="mt-4 text-mahjong-800 font-bold text-sm bg-white/90 px-4 py-2 rounded-full shadow-sm hover:scale-105 transition-transform"
            >
              + 记账
            </button>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div
              key={record.id}
              className={`group backdrop-blur-md rounded-xl p-4 shadow-sm relative overflow-hidden transition-all active:scale-[0.99] ${isCustomTheme
                ? 'bg-black/30 border border-white/10 hover:bg-black/40'
                : 'bg-white/90 border border-gray-100 hover:bg-white'
                }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${record.amount >= 0 ? 'bg-win' : 'bg-loss'}`}></div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${isCustomTheme ? 'text-white' : 'text-gray-800'}`}>{getCircleName(record.circleId)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isCustomTheme ? 'text-white/60 bg-white/10' : 'text-gray-400 bg-gray-100'}`}>{record.date}</span>
                    </div>
                    {record.note && (
                      <p className={`text-xs mt-1 line-clamp-1 ${isCustomTheme ? 'text-white/60' : 'text-gray-500'}`}>{record.note}</p>
                    )}
                  </div>
                </div>
                <div className={`font-mono font-bold text-lg ${record.amount >= 0 ? 'text-win' : 'text-loss'}`}>
                  {formatMoney(record.amount)}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-end space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditRecord(record)}
                  className="text-gray-400 hover:text-mahjong-600 flex items-center text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" /> 编辑
                </button>
                <button
                  onClick={() => onDeleteRecord(record.id)}
                  className="text-gray-400 hover:text-red-500 flex items-center text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> 删除
                </button>
              </div>
            </div>
          ))
        )}

        <div className="h-12"></div> {/* Spacer for bottom nav */}
      </div>
    </div>
  );
};

export default Dashboard;
