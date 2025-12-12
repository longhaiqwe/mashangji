import React, { useState } from 'react';
import { Circle, ViewState } from '../types';
import { Trash2, Plus, Edit2, ChevronLeft, Users } from 'lucide-react';
import { generateId } from '../services/storageService';

interface CircleManagerProps {
  circles: Circle[];
  onUpdateCircles: (circles: Circle[]) => void;
  onNavigate: (view: ViewState) => void;
  hasRecords: (circleId: string) => boolean;
  onBack?: () => void; // Added onBack prop
}

const CircleManager: React.FC<CircleManagerProps> = ({ circles, onUpdateCircles, onNavigate, hasRecords, onBack }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const handleAdd = () => {
    if (!tempName.trim()) return;
    const newCircle: Circle = {
      id: generateId(),
      name: tempName.trim()
    };
    onUpdateCircles([...circles, newCircle]);
    setTempName('');
    setIsAdding(false);
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setTempName(name);
  };

  const handleSaveEdit = () => {
    if (!tempName.trim()) return;
    const updated = circles.map(c => c.id === editingId ? { ...c, name: tempName.trim() } : c);
    onUpdateCircles(updated);
    setEditingId(null);
    setTempName('');
  };

  const handleDelete = (id: string) => {
    if (hasRecords(id)) {
      alert('该圈子下有记账记录，请先删除相关记录后再删除圈子。');
      return;
    }
    if (confirm('确定删除这个圈子吗？')) {
      onUpdateCircles(circles.filter(c => c.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-4 h-14 flex items-center justify-between border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
            {onBack && (
                <button onClick={onBack} className="p-2 -ml-2 mr-2 text-gray-600">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            <h2 className="text-lg font-bold text-gray-800">圈子管理</h2>
        </div>
        {!isAdding && !editingId && (
            <button 
                onClick={() => setIsAdding(true)}
                className="text-mahjong-600 p-2 hover:bg-mahjong-50 rounded-full"
            >
                <Plus className="w-6 h-6" />
            </button>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Add New Form */}
        {isAdding && (
          <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-mahjong-200 animate-fade-in-down">
            <h3 className="text-sm font-bold text-gray-500 mb-2">新建圈子</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="例如：老同学"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-mahjong-500"
                autoFocus
              />
              <button onClick={handleAdd} className="bg-mahjong-600 text-white px-4 py-2 rounded-lg text-sm font-bold">确定</button>
              <button onClick={() => { setIsAdding(false); setTempName(''); }} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {circles.map(circle => (
            <div key={circle.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between group">
              {editingId === circle.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="bg-mahjong-600 text-white px-3 py-2 rounded-lg text-xs">保存</button>
                  <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs">取消</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-mahjong-100 flex items-center justify-center text-mahjong-700 mr-3">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-bold text-gray-800 block">{circle.name}</span>
                        {circle.isDefault && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">默认</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => handleEdit(circle.id, circle.name)}
                        className="p-2 text-gray-400 hover:text-mahjong-600"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {!circle.isDefault && (
                        <button 
                            onClick={() => handleDelete(circle.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CircleManager;