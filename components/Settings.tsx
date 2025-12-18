import React, { useRef } from 'react';
import { ViewState, User, Record, Circle } from '../types';
import { Users, Palette, ChevronRight, Info, LogOut, UserCircle, Trash2, FileDown, FileUp } from 'lucide-react';
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
      // Format: Date | Amount | CircleName | Note | ID
      records.forEach(r => {
        const circle = circles.find(c => c.id === r.circleId);
        const circleName = circle ? circle.name : '未知圈子';
        // Replace newlines in note with space to keep one line per record
        const safeNote = (r.note || '').replace(/\n/g, ' ');
        // Add explicit + sign for positive numbers for better readability
        const amountStr = r.amount > 0 ? `+${r.amount}` : `${r.amount}`;
        lines.push(`${r.date} | ${amountStr} | ${circleName} | 备注:${safeNote} | ID:${r.id}`);
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
            // Parse Record: Date | Amount | CircleName | 备注:xxx | ID:xxx
            const match = trimmedLine.match(/^(.+?)\s*\|\s*([+-]?\d+)\s*\|\s*(.+?)\s*\|\s*备注:(.*?)\s*\|\s*ID:(.+?)$/);
            if (match) {
               parsedRecords.push({
                 date: match[1].trim(),
                 amount: parseInt(match[2].trim(), 10),
                 circleName: match[3].trim(),
                 note: match[4].trim(),
                 id: match[5].trim()
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

        // Merge logic: Add if ID doesn't exist
        parsedCircles.forEach(pc => {
          if (!circlesToSync.some(c => c.id === pc.id)) {
            circlesToSync.push(pc);
            newCirclesCount++;
          }
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
          // Skip if ID already exists
          if (currentRecords.some(r => r.id === pr.id)) continue;

          // Resolve Circle ID
          let circleId = '';
          // First try to find by ID if the record implicitly belongs to a circle we just imported/have
          // But text record only has circleName.
          // Strategy: Find circle by Name in updatedCircles
          const matchedCircle = updatedCircles.find(c => c.name === pr.circleName);
          
          if (matchedCircle) {
              circleId = matchedCircle.id;
          } else {
              // If circle name not found (e.g. user manually added record with new circle name),
              // Create a new circle on the fly?
              // For safety, let's create it if it doesn't exist.
              const newCircleId = generateId();
              const newCircle: Circle = {
                  id: newCircleId,
                  name: pr.circleName,
                  isDefault: false
              };
              await syncCircles([...updatedCircles, newCircle], user.id);
              updatedCircles.push(newCircle); // Update local cache
              circleId = newCircleId;
              newCirclesCount++; // Count this implicitly created circle
          }

          newRecords.push({
              id: pr.id,
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
      } catch (error) {
        console.error('Import failed:', error);
        // User requested to remove alert content, so we just log it.
        // But maybe a toast would be better in future.
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
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
    if (confirm('⚠️ 危险操作\n\n确定要清空该账号下的所有记账记录吗？\n此操作不可恢复！')) {
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
              <br/>
              Version 1.1.2
            </p>
          </div>
        </div>

        {/* Clear Data Button */}
        <div className="pt-4 pb-8">
            <button
                onClick={handleClearAllRecords}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl border border-red-200 transition-colors flex items-center justify-center text-sm"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                清空所有记录
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
