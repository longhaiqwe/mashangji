
import React, { useState, useRef, useEffect } from 'react';
import { Circle, ViewState } from '../types';
import { Trash2, Plus, Edit2, ChevronLeft, Users, CheckCircle2, GripVertical, MoreHorizontal } from 'lucide-react';
import { generateId } from '../services/storageService';
import SwipeableItem from './SwipeableItem';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CircleManagerProps {
  circles: Circle[];
  onUpdateCircles: (circles: Circle[]) => void;
  onNavigate: (view: ViewState) => void;
  hasRecords: (circleId: string) => boolean;
  onBack?: () => void;
  themeId?: string;
}

const CircleManager: React.FC<CircleManagerProps> = ({
  circles,
  onUpdateCircles,
  onNavigate,
  hasRecords,
  onBack,
  themeId = 'default'
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [menuState, setMenuState] = useState<{ id: string; x: number; y: number; source: 'touch' | 'mouse' } | null>(null);

  // Theme Styles
  const isDarkTheme = themeId === 'black' || themeId === 'rich';
  const bgClass = isDarkTheme ? 'bg-dark-bg-primary' : 'bg-light-bg-primary';
  const headerBg = isDarkTheme ? 'bg-dark-bg-secondary/70 border-luxury-gold-500/10' : 'bg-white/80 border-slate-200';
  const textPrimary = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const cardVariant = isDarkTheme ? 'glass' : 'light';
  const itemBase = isDarkTheme ? 'bg-dark-bg-secondary/70 border-luxury-gold-500/10' : 'bg-white border-slate-100';
  const itemHover = isDarkTheme ? 'hover:border-luxury-gold-500/30' : 'hover:border-amber-200';
  const inputClass = isDarkTheme
    ? 'bg-dark-bg-tertiary/80 border-luxury-gold-500/20 text-white placeholder:text-slate-500 focus:border-luxury-gold-500/50'
    : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-luxury-gold-500/60';

  const itemStyles = {
    textPrimary,
    textSecondary,
    base: itemBase,
    hover: itemHover,
    iconDefault: isDarkTheme ? 'bg-luxury-gold-500/20 text-luxury-gold-400' : 'bg-amber-100 text-amber-700',
    iconNormal: isDarkTheme ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-500',
    badgeDefault: isDarkTheme ? 'bg-luxury-gold-500/15 text-luxury-gold-400 border-luxury-gold-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
    handle: isDarkTheme ? 'text-luxury-gold-500/60 hover:text-luxury-gold-400' : 'text-amber-500/70 hover:text-amber-600',
    menu: isDarkTheme ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
    input: inputClass,
    highlight: isDarkTheme ? 'from-luxury-gold-500/20 via-transparent to-transparent' : 'from-amber-100/70 via-transparent to-transparent',
  };

  // Local state for drag and drop to avoid premature DB syncs
  // We sync with props.circles whenever props.circles changes (external update),
  // but during drag we only update this local state, and sync back on dragEnd.
  // Actually, for dnd-kit in React, we usually update state immediately on drop.
  // We can just use the parent's onUpdateCircles directly if we only call it on drag end.
  // However, `circles` prop comes from parent state.
  // The plan is: drag moves items visually (dnd-kit handles this via transform usually, OR we update local list).
  // dnd-kit's official examples usually update the list on dragEnd.
  // So we don't need intermediate local state if we only update on drop.

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px movement to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // short delay to distinguish from tap
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const otherCircles = circles.filter(c => c.id !== id);
    const updatedTarget = { ...targetCircle, isDefault: true };
    const updatedOthers = otherCircles.map(c => ({ ...c, isDefault: false }));
    const newOrder = [updatedTarget, ...updatedOthers];
    const finalists = newOrder.map((c, i) => ({ ...c, sortOrder: i }));
    onUpdateCircles(finalists);
    setMenuState(null);
  };

  /* Separated Sort Logic */
  const defaultCircle = circles.find(c => c.isDefault);
  // Ensure we sort otherCircles by sortOrder before rendering to keep consistency
  const otherCircles = circles
    .filter(c => !c.isDefault)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = otherCircles.findIndex((c) => c.id === active.id);
      const newIndex = otherCircles.findIndex((c) => c.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Calculate the new order for 'otherCircles'
        const newOtherCircles = arrayMove<Circle>(otherCircles, oldIndex, newIndex);

        // Reconstruct full list: default first (if exists), then others
        let newAllCircles: Circle[] = [];
        if (defaultCircle) {
          newAllCircles = [defaultCircle, ...newOtherCircles];
        } else {
          newAllCircles = newOtherCircles;
        }

        // Update sortOrder for all to persist the new order
        const updated = newAllCircles.map((c, i) => ({
          ...c,
          sortOrder: i
        }));

        onUpdateCircles(updated);
      }
    }
  };

  const openMenu = (id: string, x: number, y: number, source: 'touch' | 'mouse') => {
    setMenuState({ id, x, y, source });
  };

  return (
    <div className={`flex flex-col h-full ${bgClass} relative overflow-hidden`}>
      {/* Ambient background glow */}
      <div className={`absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl ${isDarkTheme ? 'bg-luxury-gold-500/10' : 'bg-amber-200/40'}`} />
      <div className={`absolute -bottom-28 -left-16 w-72 h-72 rounded-full blur-3xl ${isDarkTheme ? 'bg-win-crimson/10' : 'bg-rose-200/40'}`} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className={`safe-top px-6 pb-4 flex-shrink-0 sticky top-0 z-20 backdrop-blur-xl border-b ${headerBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className={`p-2 -ml-2 mr-2 rounded-full transition-all ${isDarkTheme ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <div>
                <h2 className={`text-xl font-display tracking-tight ${textPrimary}`}>圈子管理</h2>
                <p className={`text-xs mt-0.5 ${textSecondary}`}>管理圈子、排序与默认设置</p>
              </div>
            </div>
            {!isAdding && !editingId && (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold-gradient text-dark-bg-primary text-xs font-bold shadow-gold-glow-sm hover:shadow-gold-glow transition-all"
              >
                <Plus className="w-4 h-4" />
                新建
              </button>
            )}
          </div>

        </div>

        <div className="flex-1 px-4 py-4 overflow-y-auto overflow-x-hidden safe-bottom">
          {/* Add New Form */}
          {isAdding && (
            <Card
              variant={cardVariant}
              size="sm"
              hover={false}
              className="mb-4 border-luxury-gold-500/20 animate-reveal-down"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold ${textSecondary}`}>新建圈子</h3>
                <span className="text-[10px] text-luxury-gold-500/80 font-semibold">输入后确认</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="例如：老同学"
                  className={`flex-1 border rounded-2xl px-4 py-2.5 text-sm outline-none transition-colors ${inputClass}`}
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleAdd}>
                  确定
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setTempName('');
                  }}
                >
                  取消
                </Button>
              </div>
            </Card>
          )}

          {/* List */}
          <div className="space-y-3">
            {defaultCircle && (
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>默认圈子</span>
                  <span className={`text-[10px] ${textSecondary}`}>置顶固定</span>
                </div>
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
                  ui={itemStyles}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>其他圈子</span>
                <span className={`text-[10px] ${textSecondary}`}>拖拽排序</span>
              </div>

              {otherCircles.length === 0 ? (
                <div className={`p-6 rounded-3xl border border-dashed ${itemBase} text-center`}>
                  <div className={`text-sm font-semibold ${textPrimary}`}>还没有更多圈子</div>
                  <div className={`text-xs mt-1 ${textSecondary}`}>点击右上角新建，或长按卡片设默认</div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={otherCircles.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2">
                      {otherCircles.map((circle) => (
                        <SortableCircleItem
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
                          ui={itemStyles}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        {/* Menu - Responsive Logic */}
        {menuState && (
          <>
            {menuState.source === 'touch' ? (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
                onClick={() => setMenuState(null)}
              >
                <div
                  className={`w-full max-w-md rounded-t-3xl p-6 shadow-2xl border ${isDarkTheme ? 'bg-dark-bg-secondary border-luxury-gold-500/20' : 'bg-white border-slate-100'
                    } animate-slide-up`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className={`mx-auto mb-4 h-1.5 w-12 rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'
                    }`} />
                  <CircleMenuContent
                    circleName={circles.find(c => c.id === menuState.id)?.name}
                    onSetDefault={() => handleSetDefault(menuState.id)}
                    onCancel={() => setMenuState(null)}
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            ) : (
              <div
                className="fixed inset-0 z-50 block"
                onClick={() => setMenuState(null)}
                onContextMenu={(e) => { e.preventDefault(); setMenuState(null); }}
              >
                <div
                  className={`absolute rounded-2xl shadow-xl border p-2 min-w-[200px] animate-fade-in ${isDarkTheme ? 'bg-dark-bg-secondary border-luxury-gold-500/20' : 'bg-white border-slate-100'
                    }`}
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
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const CircleMenuContent = ({ circleName, onSetDefault, onCancel, isDesktop, isDarkTheme }: any) => {
  const textPrimary = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkTheme ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      {!isDesktop && (
        <div className="text-center mb-5">
          <div className="text-[10px] uppercase tracking-wider text-luxury-gold-500/70 mb-1">圈子</div>
          <h3 className={`text-lg font-bold ${textPrimary}`}>{circleName}</h3>
        </div>
      )}
      <div className={`space-y-2 ${isDesktop ? 'text-sm' : ''}`}>
        <button
          onClick={onSetDefault}
          className={`w-full ${isDesktop
            ? `${isDarkTheme ? 'hover:bg-white/10 text-luxury-gold-400' : 'hover:bg-amber-50 text-amber-700'} py-2.5 px-3 text-left rounded-xl`
            : 'py-3.5 bg-gold-gradient text-dark-bg-primary shadow-gold-glow-sm flex items-center justify-center space-x-2 rounded-2xl'
            } font-bold transition-all`}
        >
          {!isDesktop && <CheckCircle2 className="w-5 h-5" />}
          <span>设为默认 (置顶)</span>
        </button>

        {!isDesktop && (
          <button
            onClick={onCancel}
            className={`w-full py-3.5 rounded-2xl font-bold active:scale-95 transition-transform ${isDarkTheme ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
          >
            取消
          </button>
        )}
      </div>
      {isDesktop && (
        <p className={`mt-2 text-[10px] ${textSecondary}`}>默认圈子会置顶显示</p>
      )}
    </>
  );
};

// Wrapper Component for Sortable Logic
const SortableCircleItem = (props: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.circle.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1, // Elevate when dragging
    opacity: isDragging ? 0.5 : 1 // Visual feedback for original item
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none select-none">
      {/* Pass drag handle props down to CircleItem */}
      <CircleItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

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
  isStatic,
  dragHandleProps, // Received from Sortable parent
  ui
}: any) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Prevent default context menu on right click/long press
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenMenu(circle.id, e.clientX, e.clientY, 'mouse');
  };

  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    // If dragging via handle, don't trigger long press logic
    // Actually we kept handle logic separate, so this is just for the "Long press to Open Menu" logic if we still want it?
    // User plan said: "点击右侧“更多”按钮 -> 触发 onOpenMenu", but user also said "目前长按出发置顶，我认为是 OK 的".
    // So let's KEEP long press logic for menu as it doesn't conflict with handle dragging.

    isLongPress.current = false;
    let clientX = 0;
    let clientY = 0;
    let source: 'touch' | 'mouse' = 'mouse';

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      source = 'touch';
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
      source = 'mouse';
    }

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      onOpenMenu(circle.id, clientX, clientY, source);
    }, 500);
  };

  const endPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    endPress();
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const source: 'touch' | 'mouse' = isTouchDevice ? 'touch' : 'mouse';
    onOpenMenu(circle.id, e.clientX, e.clientY, source);
  };

  const Wrapper = ({ children }: any) => (
    <div className="relative">
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
    </div>
  );

  if (editingId === circle.id) {
    return (
      <Wrapper>
        <div className={`p-3 rounded-3xl border ${ui?.base} ${ui?.hover}`}>
          <div className="text-xs font-semibold text-luxury-gold-500/80 mb-2">编辑圈子</div>
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className={`flex-1 border rounded-2xl px-4 py-2 text-sm outline-none transition-colors ${ui?.input}`}
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              保存
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
              取消
            </Button>
          </div>
        </div>
      </Wrapper>
    );
  }

  // Wrap dnd-kit listeners to stop propagation
  const safeHandleProps = React.useMemo(() => {
    if (!dragHandleProps) return {};
    const props: any = {};
    Object.keys(dragHandleProps).forEach((key) => {
      const value = dragHandleProps[key];
      if (typeof value === 'function' && key.startsWith('on')) {
        props[key] = (e: any) => {
          if (e && e.stopPropagation) e.stopPropagation();
          value(e);
        };
      } else {
        props[key] = value;
      }
    });
    return props;
  }, [dragHandleProps]);

  return (
    <Wrapper>
      <SwipeableItem
        className="rounded-2xl shadow-card-3d"
        actions={[
          {
            label: '编辑',
            icon: <Edit2 size={18} />,
            color: 'bg-luxury-gold-500',
            onClick: () => handleEdit(circle.id, circle.name)
          },
          ...(!circle.isDefault ? [{
            label: '删除',
            icon: <Trash2 size={18} />,
            color: 'bg-win-crimson',
            onClick: () => handleDelete(circle.id)
          }] : [])
        ]}
      >
        <div
          className={`relative flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] ${ui?.base} ${ui?.hover} ${circle.isDefault ? 'shadow-gold-glow-sm' : ''}`}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchMove={endPress}
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={endPress}
        >
          {circle.isDefault && (
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${ui?.highlight} pointer-events-none`} />
          )}
          <div className="flex items-center flex-1">
            <div className={`w-9 h-9 rounded-2xl ${circle.isDefault ? ui?.iconDefault : ui?.iconNormal} flex items-center justify-center mr-3 shrink-0`}>
              <Users className="w-4 h-4" />
            </div>

            <div className="flex-1 select-none min-w-0">
              <span className={`font-bold block transition-colors truncate ${ui?.textPrimary}`}>
                {circle.name}
              </span>
              {circle.isDefault && (
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ui?.badgeDefault}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    默认
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              className={`p-1.5 rounded-full transition-colors ${ui?.menu}`}
              onMouseDown={(e) => { e.stopPropagation(); endPress(); }}
              onTouchStart={(e) => { e.stopPropagation(); endPress(); }}
              onClick={openMenuFromButton}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* Drag Handle - Only if not static */}
            {!isStatic && (
              <div
                className={`p-1.5 rounded-full cursor-grab active:cursor-grabbing touch-none transition-colors ${ui?.handle}`}
                {...safeHandleProps}
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>
      </SwipeableItem>
    </Wrapper>
  );
};

export default CircleManager;
