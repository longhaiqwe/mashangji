import React, { useRef } from 'react';
import { ViewState, User, Record, Circle } from '../types';
import { Users, ChevronRight, Info, LogOut, UserCircle, Trash2, FileDown, FileUp, MessageSquare, Shield, AlertTriangle, Loader2, Crown } from 'lucide-react';
import { authService } from '../services/authService';
import ProUpgradeModal from './ProUpgradeModal';
import { fetchRecords, fetchCircles, addRecordsBatch, syncCircles, generateId } from '../services/storageService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SettingsProps {
  onNavigate: (view: ViewState) => void;
  user?: User | null;
  onLogout: () => void;
  onClearData?: () => void;
  onDataRefresh?: (silent?: boolean) => void;
  themeId?: string;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate, user, onLogout, onClearData, onDataRefresh, themeId = 'default' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isExporting, setIsExporting] = React.useState(false);
  const [showProModal, setShowProModal] = React.useState(false);


  // Theme Logic
  const isDarkTheme = themeId === 'black' || themeId === 'rich';

  // Dynamic Styles
  const bgClass = isDarkTheme ? 'bg-dark-bg' : 'bg-slate-50';
  const textPrimary = isDarkTheme ? 'text-white' : 'text-slate-800';
  const textSecondary = isDarkTheme ? 'text-gray-400' : 'text-slate-500';
  const headerBg = isDarkTheme ? 'bg-dark-bg-secondary/70 border-luxury-gold-500/10' : 'bg-white/80 border-slate-200';
  const cardVariant = isDarkTheme ? 'glass' : 'light';
  const menuCardVariant = isDarkTheme ? 'default' : 'light';
  const sectionTitle = isDarkTheme ? 'text-luxury-gold-500/70' : 'text-slate-400';

  // Icon Containers
  const userIconBg = isDarkTheme ? 'bg-luxury-gold-500/10 border-luxury-gold-500/30' : 'bg-orange-100 border-orange-200';
  const userIconColor = isDarkTheme ? 'text-luxury-gold-500' : 'text-orange-500';

  const menuItemHover = isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-slate-50';
  const menuItemIconBg = isDarkTheme ? 'bg-luxury-gold-500/10 text-luxury-gold-500' : 'bg-slate-100 text-slate-600';
  const backupItemIconBg = isDarkTheme ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600';

  const handleLogout = () => {
    // Delegate to parent - App.tsx handles auth logout
    onLogout();
  };

  const handleExport = async () => {
    if (!user || isExporting) return;

    setIsExporting(true);
    // Give UI a moment to update before starting heavy work
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const circles = await fetchCircles(user.id);
      const records = await fetchRecords(user.id);

      // Construct TXT content
      const lines: string[] = [];
      lines.push('[麻上记账本数据导出]');
      lines.push(`导出时间: ${new Date().toLocaleString()}`);
      lines.push(`用户ID: ${user.id}`);
      lines.push('----------------------------------------');
      lines.push('');

      lines.push('[圈子列表]');
      circles.forEach(c => {
        lines.push(`ID:${c.id} | 名称:${c.name} | 默认:${c.isDefault ? '是' : '否'}`);
      });
      lines.push('');

      lines.push('[记账记录]');
      // Format: Date | Amount | CircleName | Note
      // ID is removed from export as per user request to be cleaner / note-friendly
      records.forEach(r => {
        const circle = circles.find(c => c.id === r.circleId);
        const circleName = circle ? circle.name : '未知圈子';
        // Replace newlines in note with space to keep one line per record
        const safeNote = (r.note || '').replace(/\n/g, ' ');
        // Add explicit + sign for positive numbers for better readability
        const amountStr = r.amount > 0 ? `+${r.amount}` : `${r.amount}`;
        // Output format: Date | Amount | CircleName | Note
        lines.push(`${r.date} | ${amountStr} | ${circleName} | 备注:${safeNote}`);
      });

      const txtContent = lines.join('\n');
      const fileName = `mashangji_backup_${new Date().toISOString().split('T')[0]}.txt`;

      if (Capacitor.isNativePlatform()) {
        try {
          // Native Export Logic using Filesystem and Share
          await Filesystem.writeFile({
            path: fileName,
            data: txtContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });

          const fileResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: fileName
          });

          await Share.share({
            title: '麻上记数据备份',
            // text field is removed because it overrides the file content in some contexts or confuses the share sheet
            files: [fileResult.uri],
            dialogTitle: '导出备份数据'
          });
        } catch (nativeError) {
          console.error('Native export failed:', nativeError);
          alert('导出失败，请检查文件权限');
        }
      } else {
        // Web Export Logic
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n');

        const parsedCircles: Circle[] = [];
        const parsedRecords: any[] = [];

        let currentSection = '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            if (trimmedLine.includes('圈子列表')) currentSection = 'circles';
            else if (trimmedLine.includes('记账记录')) currentSection = 'records';
            else currentSection = ''; // header or other sections
            continue;
          }

          if (currentSection === 'circles') {
            // Parse Circle: ID:xxx | 名称:xxx | 默认:xxx
            const match = trimmedLine.match(/^ID:(.+?)\s*\|\s*名称:(.+?)\s*\|\s*默认:(.+?)$/);
            if (match) {
              parsedCircles.push({
                id: match[1].trim(),
                name: match[2].trim(),
                isDefault: match[3].trim() === '是'
              });
            }
          } else if (currentSection === 'records') {
            // Parse Record: Date | Amount | CircleName | 备注:xxx
            // ID support removed as per request (legacy cleanup).
            const match = trimmedLine.match(/^(.+?)\s*\|\s*([+-]?\d+)\s*\|\s*(.+?)\s*\|\s*备注:(.*?)$/);

            if (match) {
              parsedRecords.push({
                date: match[1].trim(),
                amount: parseInt(match[2].trim(), 10),
                circleName: match[3].trim(),
                note: match[4].trim(),
                // id: undefined 
              });
            }
          }
        }

        if (parsedCircles.length === 0 && parsedRecords.length === 0) {
          throw new Error('No valid data found');
        }

        // Proceed directly without confirmation dialog
        // 1. Sync Circles
        const currentCircles = await fetchCircles(user.id);
        const circlesToSync = [...currentCircles];
        let newCirclesCount = 0;

        // NEW LOGIC: Prevent using IDs from the file for insertion.
        // Reason: IDs from other accounts (or old backups) will conflict with existing rows in DB,
        // causing RLS "new row violates..." error because we can't UPDATE someone else's row.

        parsedCircles.forEach(pc => {
          // 1. Check if we already have this circle by ID (exact match)
          const existingById = circlesToSync.find(c => c.id === pc.id);
          if (existingById) {
            // We already have this circle, nothing to do.
            return;
          }

          // 2. Check if we have a circle by NAME (fuzzy match)
          // Ideally we don't want duplicate "Mahjong" circles
          const existingByName = circlesToSync.find(c => c.name === pc.name);
          if (existingByName) {
            // We have a circle with same name.
            // We will map records to this circle later (by name matching).
            // No need to create a new circle.
            return;
          }

          // 3. If neither, it's a completely new circle to us.
          // CRITICAL: Generate a NEW ID. Do NOT use pc.id.
          const newCircle: Circle = {
            id: generateId(), // New ID to avoid collision
            name: pc.name,
            isDefault: pc.isDefault // Respect default preference or logic? Maybe irrelevant for import
          };
          circlesToSync.push(newCircle);
          newCirclesCount++;
        });

        if (newCirclesCount > 0) {
          await syncCircles(circlesToSync, user.id);
        }

        // Refetch to ensure we have latest list including newly added ones
        const updatedCircles = await fetchCircles(user.id);

        // 2. Sync Records
        const currentRecords = await fetchRecords(user.id);
        const newRecords: Record[] = [];

        for (const pr of parsedRecords) {
          // Logic: Check against CONTENT to avoid duplicates
          // We consider it a duplicate if: timestamp(date), amount, circleName(via ID), and note match.

          // First resolve circle ID to compare accurately
          let targetCircleId = '';
          const matchedCircle = updatedCircles.find(c => c.name === pr.circleName);
          if (matchedCircle) targetCircleId = matchedCircle.id;

          // Check for existence
          const duplicate = currentRecords.find(r =>
            r.date === pr.date &&
            r.amount === pr.amount &&
            r.note === pr.note &&
            ((!targetCircleId && !r.circleId) || (r.circleId === targetCircleId))
          );

          if (duplicate) continue;

          // If we are here, it's a new record to be added.

          // Resolve Circle ID
          let circleId = '';
          const matchedCircleForAdd = updatedCircles.find(c => c.name === pr.circleName);

          if (matchedCircleForAdd) {
            circleId = matchedCircleForAdd.id;
          } else {
            // Create new circle on the fly if needed
            const newCircleId = generateId();
            const newCircle: Circle = {
              id: newCircleId,
              name: pr.circleName,
              isDefault: false
            };
            await syncCircles([...updatedCircles, newCircle], user.id);
            updatedCircles.push(newCircle); // Update local cache
            circleId = newCircleId;
            newCirclesCount++;
          }

          const newId = generateId();

          // Internal Deduplication in batch
          if (newRecords.some(r => r.id === newId)) {
            // Extremely unlikely with generateId, but good practice
            continue;
          }

          newRecords.push({
            id: newId,
            circleId: circleId,
            amount: pr.amount,
            date: pr.date,
            note: pr.note,
            timestamp: new Date(pr.date).getTime()
          });
        }

        if (newRecords.length > 0) {
          await addRecordsBatch(newRecords, user.id);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Refresh data in parent
        if (onDataRefresh) {
          onDataRefresh(true);
        }

        alert(`导入成功！\n新增圈子: ${newCirclesCount} 个\n新增记录: ${newRecords.length} 条`);
      } catch (error: any) {
        console.error('Import failed:', error);

        // Handle 403 Forbidden / RLS Policy Violations (Auth issue)
        // Code 42501 is PostgreSQL insufficient_privilege
        if (
          error.status === 403 ||
          error.code === '42501' ||
          (error.message && (
            error.message.includes('403') ||
            error.message.includes('row-level security policy') ||
            error.message.includes('violates row-level security')
          ))
        ) {
          alert('导入失败：权限不足。\n\n这通常是因为登录已过期，请尝试退出登录后重新登录。');
        } else {
          alert(`导入失败: ${error.message || '请检查文件格式是否正确'}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = confirm(
      '⚠️ 永久注销账号\n\n您确定要注销当前账号吗？\n\n1. 所有记账记录将被永久删除\n2. 所有圈子数据将被永久删除\n3. 账号将无法恢复'
    );

    if (confirmed) {
      const doubleCheck = confirm('最后确认：真的要删除所有数据并注销吗？此操作不可撤销！');
      if (doubleCheck) {
        try {
          await authService.deleteAccount(user.id);
          onLogout();
        } catch (e: any) {
          alert(e.message || '注销失败');
        }
      }
    }
  };

  const openPrivacyPolicy = () => {
    // TODO: Replace with your actual hosted Privacy Policy URL
    window.open('https://github.com/longhaiqwe/mashangji/blob/main/AppStoreAssets/privacy-policy.md', '_blank');
  };

  const menuItems = [
    {
      id: 'circles',
      label: '圈子管理',
      icon: Users,
      onClick: () => onNavigate(ViewState.SETTINGS_CIRCLES),
      desc: '添加或删除打牌圈子'
    },
    {
      id: 'feedback',
      label: '意见反馈',
      icon: MessageSquare,
      onClick: () => onNavigate(ViewState.SETTINGS_FEEDBACK),
      desc: '提交建议或遇到的问题'
    }
  ];

  const backupItems = [
    {
      id: 'export',
      label: isExporting ? '正在导出...' : '导出数据',
      icon: isExporting ? Loader2 : FileDown,
      onClick: handleExport,
      desc: isExporting ? '数据打包中，请稍候...' : '导出为文本文件 (TXT)',
      disabled: isExporting
    },
    {
      id: 'import',
      label: '导入数据',
      icon: FileUp,
      onClick: triggerImport,
      desc: '支持从文本文件恢复'
    }
  ];

  const handleClearAllRecords = () => {
    if (confirm('⚠️ 账户重置警告\n\n确定要清空所有数据吗？\n\n1. 所有记账记录将被永久删除\n2. 所有自定义圈子将被删除并恢复默认\n\n此操作不可恢复！')) {
      if (onClearData) {
        onClearData();
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${bgClass} ${textPrimary} relative overflow-hidden`}>
      {/* Ambient background glow */}
      <div className={`absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl ${isDarkTheme ? 'bg-luxury-gold-500/10' : 'bg-amber-200/40'}`} />
      <div className={`absolute -bottom-28 -left-16 w-72 h-72 rounded-full blur-3xl ${isDarkTheme ? 'bg-win-crimson/10' : 'bg-rose-200/40'}`} />

      <div className="relative z-10 flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".txt"
        className="hidden"
      />

      <div className="px-4 py-5 space-y-5 overflow-y-auto safe-top safe-bottom">
        {/* User Profile Card */}
        <Card variant={cardVariant} className="p-4 flex items-center">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${userIconBg}`}>
              <UserCircle className={`w-7 h-7 ${userIconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className={`font-bold text-lg tracking-wide ${textPrimary}`}>
                  {user?.username || '用户'}
                </h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleLogout}
                  icon={<LogOut className="w-3 h-3" />}
                  className="!rounded-lg !px-3 !py-0.5 text-[10px] h-6"
                >
                  退出
                </Button>
              </div>
              <p className={`text-xs ${textSecondary}`}>已登录</p>
            </div>
          </div>
        </Card>

        {/* Pro Upgrade Banner */}
        <button
          onClick={() => setShowProModal(true)}
          className="w-full relative overflow-hidden group rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 opacity-90 transition-opacity group-hover:opacity-100" />
          <div className="relative p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Crown className="w-6 h-6 text-white text-shadow-sm" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-base flex items-center gap-1">
                  开通 Pro 会员
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-normal backdrop-blur-sm">SALE</span>
                </h3>
                <p className="text-amber-100 text-xs">解锁无限语音记账 & 专属标识</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
        </button>

        {/* Menu Items */}
        <div className="space-y-2">
          <h3 className={`text-xs font-bold uppercase tracking-widest px-1 ${sectionTitle}`}>
            通用设置
          </h3>
          <Card variant={menuCardVariant} className={`!p-0 overflow-hidden divide-y ${isDarkTheme ? 'divide-white/5' : 'divide-slate-100'}`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between p-4 ${menuItemHover} transition-colors group`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${menuItemIconBg}`}>
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-bold ${textPrimary}`}>{item.label}</div>
                      <div className={`text-xs ${textSecondary} mt-0.5`}>{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDarkTheme ? 'text-gray-600 group-hover:text-luxury-gold-500/50' : 'text-slate-300 group-hover:text-slate-500'} transition-colors`} />
                </button>
              );
            })}
          </Card>
        </div>

        {/* Backup Section */}
        <div className="space-y-2">
          <h3 className={`text-xs font-bold uppercase tracking-widest px-1 ${sectionTitle}`}>
            数据管理
          </h3>
          <Card variant={menuCardVariant} className={`!p-0 overflow-hidden divide-y ${isDarkTheme ? 'divide-white/5' : 'divide-slate-100'}`}>
            {backupItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`w-full flex items-center justify-between p-4 ${menuItemHover} transition-colors group ${item.disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${backupItemIconBg}`}>
                      <Icon className={`w-5 h-5 ${item.id === 'export' && isExporting ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-bold ${textPrimary}`}>{item.label}</div>
                      <div className={`text-xs ${textSecondary} mt-0.5`}>{item.desc}</div>
                    </div>
                  </div>
                  {!item.disabled && (
                    <ChevronRight className={`w-5 h-5 ${isDarkTheme ? 'text-gray-600 group-hover:text-luxury-gold-500/50' : 'text-slate-300 group-hover:text-slate-500'} transition-colors`} />
                  )}
                </button>
              );
            })}
          </Card>
        </div>

        {/* About Section */}
        <Card variant={isDarkTheme ? "glass" : "light"} className={`p-4 flex items-start space-x-3 ${isDarkTheme ? 'bg-white/5' : ''}`}>
          <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkTheme ? 'text-luxury-gold-500' : 'text-slate-400'}`} />
          <div>
            <h3 className={`text-sm font-bold mb-1 ${textPrimary}`}>关于麻上记</h3>
            <p className={`text-xs leading-relaxed ${textSecondary}`}>
              一款极简的个人麻将记账工具。数据存储于云端并按账号隔离，保障隐私。
              <br />
              <span className={`font-mono mt-1 inline-block ${isDarkTheme ? 'text-luxury-gold-500/50' : 'text-slate-400/70'}`}>Version 1.1.1</span>
            </p>
          </div>
        </Card>

        {/* Danger Zone */}
        <div className="pt-4 pb-8 space-y-3">
          <div className="flex gap-3">
            <Button
              onClick={handleClearAllRecords}
              variant="secondary"
              icon={<Trash2 className="w-4 h-4" />}
              className={`flex-1 !text-sm whitespace-nowrap !px-2 ${isDarkTheme ? '!bg-orange-500/10 !text-orange-500 !border-orange-500/20 hover:!bg-orange-500/20' : '!bg-orange-50 !text-orange-600 !border-orange-200 hover:!bg-orange-100'}`}
            >
              清空记录
            </Button>

            <Button
              onClick={handleDeleteAccount}
              variant="secondary"
              icon={<AlertTriangle className="w-4 h-4" />}
              className={`flex-1 !text-sm whitespace-nowrap !px-2 ${isDarkTheme ? '!bg-red-500/10 !text-red-500 !border-red-500/20 hover:!bg-red-500/20' : '!bg-red-50 !text-red-600 !border-red-200 hover:!bg-red-100'}`}
            >
              注销账号
            </Button>
          </div>
          <div className={`${isDarkTheme ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50 border-red-100'} rounded-xl p-3 border`}>
            <p className={`text-[10px] text-center ${isDarkTheme ? 'text-red-400/80' : 'text-slate-500'}`}>
              注销账号将永久删除所有数据，且不可恢复。
            </p>
          </div>
        </div>
      </div>

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
      />
      </div>
    </div>
  );
};

export default Settings;
