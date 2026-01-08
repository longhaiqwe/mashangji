
import React, { useState, useRef, useEffect } from 'react';
import { Circle, ViewState } from '../types';
import { Trash2, Plus, Edit2, ChevronLeft, Users, Menu, CheckCircle2 } from 'lucide-react';
import { generateId } from '../services/storageService';
import SwipeableItem from './SwipeableItem';
import { Reorder, useDragControls } from 'framer-motion';

interface CircleManagerProps {
  circles: Circle[];
  onUpdateCircles: (circles: Circle[]) => void;
  onNavigate: (view: ViewState) => void;
  hasRecords: (circleId: string) => boolean;
  onBack?: () => void;
}

const CircleManager: React.FC<CircleManagerProps> = ({ circles, onUpdateCircles, onNavigate, hasRecords, onBack }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  // Updated state to hold menu position
  const [menuState, setMenuState] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleAdd = () => {
    if (!tempName.trim()) return;
    const newCircle: Circle = {
      id: generateId(),
      name: tempName.trim(),
      sortOrder: circles.length
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

  const handleSetDefault = (id: string) => {
    const targetCircle = circles.find(c => c.id === id);
    if (!targetCircle) return;

    // Remove target from list
    const otherCircles = circles.filter(c => c.id !== id);

    // Create updated target with isDefault true
    const updatedTarget = { ...targetCircle, isDefault: true };

    // Set all others to isDefault false
    const updatedOthers = otherCircles.map(c => ({ ...c, isDefault: false }));

    // Reassemble: Target at top, others follow
    const newOrder = [updatedTarget, ...updatedOthers];

    // Update sortOrder for all
    const finalists = newOrder.map((c, i) => ({ ...c, sortOrder: i }));

    onUpdateCircles(finalists);
    setMenuState(null); // Close menu
  };

  /* Separated Sort Logic */
  const defaultCircle = circles.find(c => c.isDefault);
  const otherCircles = circles.filter(c => !c.isDefault);

  const handleReorderOthers = (newOrderOthers: Circle[]) => {
    // Reconstruct full list: default first, then reordered others
    let newAllCircles: Circle[] = [];
    if (defaultCircle) {
      newAllCircles = [defaultCircle, ...newOrderOthers];
    } else {
      newAllCircles = newOrderOthers;
    }

    // Update sortOrder based on new index
    const updated = newAllCircles.map((c, i) => ({
      ...c,
      sortOrder: i
    }));
    onUpdateCircles(updated);
  };

  const openMenu = (id: string, x: number, y: number) => {
    setMenuState({ id, x, y });
  };

  return (
    <div className="flex flex-col h-full bg-white/50 relative">
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

      <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
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
        {/* List */}
        <div className="space-y-3">
          {defaultCircle && (
            <CircleItem
              key={defaultCircle.id}
              circle={defaultCircle}
              editingId={editingId}
              tempName={tempName}
              setTempName={setTempName}
              setEditingId={setEditingId}
              handleSaveEdit={handleSaveEdit}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              onOpenMenu={openMenu}
              isStatic={true}
            />
          )}

          <Reorder.Group axis="y" values={otherCircles} onReorder={handleReorderOthers} className="space-y-3">
            {otherCircles.map((circle) => (
              <CircleItem
                key={circle.id}
                circle={circle}
                editingId={editingId}
                tempName={tempName}
                setTempName={setTempName}
                setEditingId={setEditingId}
                handleSaveEdit={handleSaveEdit}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                onOpenMenu={openMenu}
              />
            ))}
          </Reorder.Group>
        </div>
      </div>

      {/* Menu - Responsive Logic */}
      {menuState && (
        <>
          {/* Mobile Bottom Sheet Backdrop */}
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-[1px] md:hidden"
            onClick={() => setMenuState(null)}
          >
            <div
              className="bg-white w-full max-w-md rounded-t-2xl p-6 animate-slide-up shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <CircleMenuContent
                circleName={circles.find(c => c.id === menuState.id)?.name}
                onSetDefault={() => handleSetDefault(menuState.id)}
                onCancel={() => setMenuState(null)}
              />
            </div>
          </div>

          {/* Desktop Context Menu Backdrop (Transparent) */}
          <div
            className="fixed inset-0 z-50 hidden md:block"
            onClick={() => setMenuState(null)}
            onContextMenu={(e) => { e.preventDefault(); setMenuState(null); }}
          >
            <div
              className="absolute bg-white rounded-lg shadow-xl border border-gray-100 p-2 min-w-[200px] animate-fade-in"
              style={{
                top: Math.min(menuState.y, window.innerHeight - 150),
                left: Math.min(menuState.x, window.innerWidth - 220)
              }}
              onClick={e => e.stopPropagation()}
            >
              <CircleMenuContent
                circleName={circles.find(c => c.id === menuState.id)?.name}
                onSetDefault={() => handleSetDefault(menuState.id)}
                onCancel={() => setMenuState(null)}
                isDesktop
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const CircleMenuContent = ({ circleName, onSetDefault, onCancel, isDesktop }: any) => (
  <>
    {!isDesktop && <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">{circleName}</h3>}
    <div className={`space-y-2 ${isDesktop ? 'text-sm' : ''}`}>
      <button
        onClick={onSetDefault}
        className={`w-full ${isDesktop ? 'py-2 px-3 text-left hover:bg-mahjong-50' : 'py-3.5 bg-mahjong-50 flex items-center justify-center space-x-2'} text-mahjong-700 font-bold rounded-lg transition-colors`}
      >
        {!isDesktop && <CheckCircle2 className="w-5 h-5" />}
        <span>设为默认 (置顶)</span>
      </button>

      {!isDesktop && (
        <button
          onClick={onCancel}
          className="w-full py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform"
        >
          取消
        </button>
      )}
    </div>
  </>
);


// Sub-component to manage individual item logic and hooks
const CircleItem = ({
  circle,
  editingId,
  tempName,
  setTempName,
  setEditingId,
  handleSaveEdit,
  handleEdit,
  handleDelete,
  onOpenMenu,
  isStatic // New prop to disable dragging/reordering UI
}: any) => {
  const dragControls = useDragControls();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Prevent default context menu on right click/long press
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenMenu(circle.id, e.clientX, e.clientY);
  };

  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;

    // Capture coordinates
    // For touch, use first touch point; for mouse, use clientX/Y
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50); // Simple haptic feedback
      }
      onOpenMenu(circle.id, clientX, clientY);
    }, 500);
  };

  const endPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const Wrapper = ({ children }: any) => (
    <CircleItemWrapper isStatic={isStatic} circle={circle} dragControls={dragControls}>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
    </CircleItemWrapper>
  );

  if (editingId === circle.id) {
    return (
      <Wrapper>
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
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
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <SwipeableItem
        className="bg-white rounded-xl shadow-sm"
        actions={[
          {
            label: '编辑',
            icon: <Edit2 size={18} />,
            color: 'bg-indigo-500',
            onClick: () => handleEdit(circle.id, circle.name)
          },
          ...(!circle.isDefault ? [{
            label: '删除',
            icon: <Trash2 size={18} />,
            color: 'bg-red-500',
            onClick: () => handleDelete(circle.id)
          }] : [])
        ]}
      >
        <div
          className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchMove={endPress} // Cancel on move
          onMouseDown={startPress} // Desktop support
          onMouseUp={endPress}
          onMouseLeave={endPress}
        >
          <div className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full ${circle.isDefault ? 'bg-mahjong-100 text-mahjong-700' : 'bg-gray-100 text-gray-500'} flex items-center justify-center mr-3 shrink-0`}>
              <Users className="w-5 h-5" />
            </div>

            <div className="flex-1 select-none">
              <span className={`font-bold block transition-colors ${circle.isDefault ? 'text-mahjong-700' : 'text-gray-800'}`}>
                {circle.name}
              </span>
              {circle.isDefault && (
                <div className="flex items-center mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-mahjong-600 mr-1" />
                  <span className="text-[10px] text-mahjong-600 font-medium">默认</span>
                </div>
              )}
            </div>
          </div>

          {/* Drag Handle - Only if not static */}
          {!isStatic && (
            <div
              className="p-3 -mr-3 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <Menu className="w-5 h-5" />
            </div>
          )}
        </div>
      </SwipeableItem>
    </Wrapper>
  );
};

// Wrapper Component to handle Conditional Reorder.Item vs div
const CircleItemWrapper = ({ isStatic, children, circle, dragControls }: any) => {
  if (isStatic) {
    return <div className="mb-3 relative touch-none">{children}</div>;
  }
  return (
    <Reorder.Item
      value={circle}
      dragListener={false}
      dragControls={dragControls}
      className="mb-3 relative touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </Reorder.Item>
  );
};

export default CircleManager;