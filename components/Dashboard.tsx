
import React, { useMemo, useState } from 'react';

import { Record, Circle, ViewState } from '../types';
import { Trash2, Edit2, Wallet } from 'lucide-react';
import SwipeableItem from './SwipeableItem';

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
  // Most themes are now "Light" (soft gradients). Only 'black' or 'rich' might be dark.
  const isDarkTheme = themeId === 'black' || themeId === 'rich';

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

  // Header styles: Cleaner, less glass, more solid typography
  // For dark themes, keep white text. For light themes (default/green/red/blue), use dark text.
  const headerTextLabelClass = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const headerTextValueClass = isDarkTheme ? 'text-white' : 'text-slate-900';

  const filterButtonClass = (isActive: boolean) => {
    if (isActive) {
      // Active: Solid Primary Color or Dark Slate
      return 'bg-slate-900 text-white shadow-md scale-105';
    }
    // Inactive
    return isDarkTheme
      ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
  };

  return (
    <div className={`flex flex-col h-full ${isDarkTheme ? '' : 'bg-transparent'}`}>
      {/* Header / Summary Card */}
      <div className={`pt-safe-top px-6 pb-4 flex-shrink-0 z-10 relative transition-all duration-300`}>
        <div className="flex justify-between items-center mb-6 mt-4">
          <div>
            <h2 className={`${headerTextLabelClass} text-sm font-medium mb-1 tracking-wide`}>本月累计盈亏</h2>
            <div className={`text-4xl font-bold tracking-tight ${headerTextValueClass} font-mono`}>
              <span className="text-2xl mr-1 opacity-60">¥</span>
              {formatMoney(currentMonthStats)}
            </div>
          </div>
          <div className={`p-3 rounded-2xl backdrop-blur-sm shadow-sm ${isDarkTheme ? 'bg-white/10' : 'bg-white/60'}`}>
            <Wallet className={`${isDarkTheme ? 'text-white' : 'text-slate-700'} w-6 h-6`} />
          </div>
        </div>

        {/* Quick Filter Pill - Modern Clean Look */}
        <div className="flex overflow-x-auto no-scrollbar space-x-2 pb-2 -mx-6 px-6">
          <button
            onClick={() => onSelectCircle('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${filterButtonClass(selectedCircleId === 'all')}`}
          >
            全部
          </button>
          {circles.map(circle => (
            <button
              key={circle.id}
              onClick={() => onSelectCircle(circle.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${filterButtonClass(selectedCircleId === circle.id)}`}
            >
              {circle.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-safe-bottom">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider px-2 py-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>近期战绩</h3>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-slate-200/60 text-slate-500'}`}>{filteredRecords.length} 笔</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-60">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Edit2 className="w-8 h-8 opacity-50" />
            </div>
            <p className={`text-sm font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              暂无记录
            </p>
            <p className="text-xs text-slate-400 mt-1">点击下方按钮开始记账</p>
            <button
              onClick={() => onNavigate(ViewState.ADD_RECORD)}
              className="mt-6 font-bold text-sm bg-primary-500 text-white px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
            >
              + 记账
            </button>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <SwipeableItem
              key={record.id}
              className="mb-3 rounded-2xl shadow-sm outline-none"
              actions={[
                {
                  label: '编辑',
                  icon: <Edit2 size={18} />,
                  color: 'bg-indigo-500',
                  onClick: () => onEditRecord(record)
                },
                {
                  label: '删除',
                  icon: <Trash2 size={18} />,
                  color: 'bg-rose-500', // Updated to rose
                  onClick: () => onDeleteRecord(record.id)
                }
              ]}
            >
              <div
                className={`p-4 transition-all active:scale-[0.98] ${isDarkTheme
                  ? 'bg-slate-800/90 border border-slate-700/50'
                  : 'bg-white border border-slate-100' // Clean white card
                  }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3.5">
                    {/* Status Dot / Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${record.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                      }`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${record.amount >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-base ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>{getCircleName(record.circleId)}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>{record.date}</span>
                        {record.note && (
                          <>
                            <span className="text-slate-300 text-[9px] mx-0.5">•</span>
                            <span className={`text-xs line-clamp-1 max-w-[120px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{record.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`font-mono font-bold text-lg tracking-tight ${record.amount >= 0 ? 'text-income' : 'text-expense'
                    }`}>
                    {formatMoney(record.amount)}
                  </div>
                </div>
              </div>
            </SwipeableItem>
          ))
        )}

        <div className="h-20"></div> {/* Spacer for bottom nav */}
      </div>
    </div>
  );
};

export default Dashboard;


