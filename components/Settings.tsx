import React, { useRef } from 'react';
import { ViewState, User, Record, Circle } from '../types';
import { Users, Palette, ChevronRight, Info, LogOut, UserCircle, Trash2, FileDown, FileUp, MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import { authService } from '../services/authService';
import { fetchRecords, fetchCircles, addRecordsBatch, syncCircles, generateId } from '../services/storageService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface SettingsProps {
  onNavigate: (view: ViewState) => void;
  user?: User | null;
  onLogout: () => void;
  onClearData?: () => void;
  onDataRefresh?: (silent?: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate, user, onLogout, onClearData, onDataRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    // Simply clear storage and trigger UI update
    authService.logout();
    onLogout();
  };

  const handleExport = async () => {
    if (!user) return;
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
      id: 'theme',
      label: '背景设置',
      icon: Palette,
      onClick: () => onNavigate(ViewState.SETTINGS_THEME),
      desc: '更换应用背景壁纸'
    },
    {
      id: 'feedback',
      label: '意见反馈',
      icon: MessageSquare,
      onClick: () => onNavigate(ViewState.SETTINGS_FEEDBACK),
      desc: '提交建议或遇到的问题'
    },
    {
      id: 'privacy',
      label: '隐私政策',
      icon: Shield,
      onClick: openPrivacyPolicy,
      desc: '查看数据隐私保护条款'
    }
  ];

  const backupItems = [
    {
      id: 'export',
      label: '导出数据',
      icon: FileDown,
      onClick: handleExport,
      desc: '导出为文本文件 (TXT)'
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
    <div className="flex flex-col h-full bg-white/50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".txt"
        className="hidden"
      />

      <div className="bg-white/80 backdrop-blur-sm px-4 h-14 flex items-center justify-center border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-800">设置</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* User Profile Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-mahjong-100 rounded-full flex items-center justify-center text-mahjong-600">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{user?.username || '用户'}</h3>
              <p className="text-xs text-gray-500">已登录</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500 text-xs font-bold rounded-lg transition-colors flex items-center cursor-pointer active:scale-95 border border-gray-200"
          >
            <LogOut className="w-3 h-3 mr-1" /> 退出
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-sm border border-gray-100">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <button
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-mahjong-50 flex items-center justify-center text-mahjong-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                {index < menuItems.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
              </div>
            );
          })}
        </div>

        {/* Backup Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-sm border border-gray-100">
          {backupItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <button
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                {index < backupItems.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
              </div>
            );
          })}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-gray-100 flex items-start space-x-3">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-gray-600 mb-1">关于麻上记</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              一款极简的个人麻将记账工具。数据存储于云端并按账号隔离，保障隐私。
              <br />
              Version 1.1.0
            </p>
          </div>
        </div>

        {/* Clear Data Button */}
        <div className="pt-4 pb-8 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleClearAllRecords}
              className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold py-3 rounded-xl border border-orange-200 transition-colors flex items-center justify-center text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清空记录
            </button>

            <button
              onClick={handleDeleteAccount}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl border border-red-200 transition-colors flex items-center justify-center text-sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              注销账号
            </button>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-red-100">
            <p className="text-[10px] text-center text-gray-500">
              注销账号将永久删除所有数据，且不可恢复。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
