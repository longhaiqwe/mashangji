import React, { useMemo } from 'react';
import { Record, Circle, ViewState } from '../types';
import { Trash2, Edit2, Wallet, TrendingUp } from 'lucide-react';
import SwipeableItem from './SwipeableItem';
import { Card, WealthCard } from './ui/Card';
import { Amount } from './ui/Amount';
import { PillButton } from './ui/Button';
import { motion } from 'framer-motion';

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
  // 判断是否为深色主题
  const isDarkTheme = themeId === 'black' || themeId === 'rich';

  // 过滤和排序记录
  const filteredRecords = useMemo(() => {
    let sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
    if (selectedCircleId !== 'all') {
      sorted = sorted.filter(r => r.circleId === selectedCircleId);
    }
    return sorted;
  }, [records, selectedCircleId]);

  // 计算本月统计数据
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

  // 计算上月数据（用于显示涨跌幅）
  const lastMonthStats = useMemo(() => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    return filteredRecords.reduce((acc, curr) => {
      const d = new Date(curr.date);
      if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        return acc + curr.amount;
      }
      return acc;
    }, 0);
  }, [filteredRecords]);

  // 计算涨跌幅
  const trend = lastMonthStats !== 0
    ? ((currentMonthStats - lastMonthStats) / Math.abs(lastMonthStats)) * 100
    : 0;

  const getCircleName = (id: string) => circles.find(c => c.id === id)?.name || '未知圈子';

  const textPrimary = isDarkTheme ? 'text-white' : 'text-dark-bg-primary';
  const textSecondary = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const bgClass = isDarkTheme ? 'bg-dark-bg-primary' : 'bg-light-bg-primary';

  return (
    <div className={`flex flex-col h-full ${bgClass}`}>
      {/* ============ 顶部区域 ============ */}
      <motion.div
        className="safe-top px-6 pb-4 flex-shrink-0 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 财富卡片 */}
        <WealthCard
          amount={currentMonthStats}
          subtitle="本月累计盈亏"
          trend={Math.round(trend)}
          className="mb-6"
          delay={100}
        />

        {/* 圈子筛选 - Pill 按钮组 */}
        <div className="flex overflow-x-auto no-scrollbar space-x-2 pb-2 -mx-6 px-6">
          <PillButton
            active={selectedCircleId === 'all'}
            onClick={() => onSelectCircle('all')}
            className={selectedCircleId === 'all' ? 'bg-win-crimson' : ''}
          >
            全部
          </PillButton>
          {circles.map((circle, index) => (
            <PillButton
              key={circle.id}
              active={selectedCircleId === circle.id}
              onClick={() => onSelectCircle(circle.id)}
              className={selectedCircleId === circle.id ? 'bg-win-crimson' : ''}
            >
              {circle.name}
            </PillButton>
          ))}
        </div>
      </motion.div>

      {/* ============ 近期战绩列表 ============ */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 safe-bottom">
        {/* 列表头部 */}
        <motion.div
          className="flex items-center justify-between px-1 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
            近期战绩
          </h3>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-slate-200/60 text-slate-500'
            }`}>
            {filteredRecords.length} 笔
          </span>
        </motion.div>

        {/* 空状态 */}
        {filteredRecords.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center h-64 opacity-60"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
              <Edit2 className="w-8 h-8 opacity-50" />
            </div>
            <p className={`text-sm font-medium ${textSecondary}`}>
              暂无记录
            </p>
            <p className="text-xs text-slate-400 mt-1">点击下方按钮开始记账</p>
            <motion.button
              onClick={() => onNavigate(ViewState.ADD_RECORD)}
              className="mt-6 font-bold text-sm bg-win-crimson text-white px-6 py-2.5 rounded-full shadow-win-glow hover:scale-105 transition-transform"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              + 记账
            </motion.button>
          </motion.div>
        ) : (
          /* 记录列表 */
          <div className="space-y-3">
            {filteredRecords.map((record, index) => (
              <SwipeableItem
                key={record.id}
                className="rounded-2xl shadow-sm outline-none"
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
                    color: 'bg-rose-500',
                    onClick: () => onDeleteRecord(record.id)
                  }
                ]}
              >
                <motion.div
                  className={`p-4 rounded-2xl transition-all active:scale-[0.98] ${isDarkTheme
                    ? 'bg-dark-bg-secondary border border-dark-border/20'
                    : 'bg-white border border-slate-100'
                    }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1 * index,
                    duration: 0.3,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex justify-between items-center">
                    {/* 左侧：圈子图标和信息 */}
                    <div className="flex items-center space-x-3.5">
                      {/* 状态图标 */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${record.amount >= 0 ? 'bg-win-crimson/20 text-win-crimson' : 'bg-loss-emerald/20 text-loss-emerald'
                          }`}
                      >
                        <Wallet className="w-5 h-5" />
                      </div>

                      <div>
                        <div className={`font-bold text-base ${textPrimary}`}>
                          {getCircleName(record.circleId)}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className={`text-xs ${textSecondary}`}>{record.date}</span>
                          {record.note && (
                            <>
                              <span className="text-slate-300 text-[9px] mx-0.5">•</span>
                              <span className={`text-xs line-clamp-1 max-w-[120px] ${textSecondary}`}>
                                {record.note}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：金额 */}
                    <Amount
                      amount={record.amount}
                      size="lg"
                      showSign
                      className="font-mono font-bold tracking-tight"
                    />
                  </div>
                </motion.div>
              </SwipeableItem>
            ))}
          </div>
        )}

        {/* 底部留白 */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default Dashboard;
