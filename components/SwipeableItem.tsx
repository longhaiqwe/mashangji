
import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';

export interface SwipeAction {
    label: string;
    icon: React.ReactNode;
    color: string; // Tailwind bg color class, e.g. 'bg-red-500'
    onClick: () => void;
}

interface SwipeableItemProps {
    children: React.ReactNode;
    actions: SwipeAction[];
    className?: string;
    threshold?: number; // How far to swipe to snap open
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
    children,
    actions,
    className = '',
    threshold = 50  // 降低阈值，让慢速滑动也能触发
}) => {
    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [xValue, setXValue] = useState(0);

    // 监听 x 值变化
    useEffect(() => {
        const unsubscribe = x.on('change', (latest) => {
            setXValue(latest);
        });
        return () => unsubscribe();
    }, [x]);

    // Calculate the total width of actions to know how far to snap
    const actionButtonWidth = 70;
    const maxDrag = -1 * (actions.length * actionButtonWidth);

    // Background opacity or other effects based on drag
    const opacity = useTransform(x, [0, -50], [0, 1]);

    const handleDragStart = () => {
        setIsDragging(true);
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Logic to determine if we should snap open or close
        // 降低速度阈值，让慢速滑动也能触发
        if (offset < -threshold || velocity < -300) {
            // Swiped left enough
            setIsOpen(true);
        } else {
            // Snap back
            setIsOpen(false);
        }
    };

    // 只要 x 位置偏移超过 10px，或者正在拖动，或者已打开，就显示按钮
    // 这样即使松手后动画回弹过程中，按钮也会保持显示
    const showActions = isDragging || isOpen || xValue < -10;

    return (
        <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
            {/* Actions Layer (Behind) - 只在需要时显示 */}
            {showActions && (
                <div
                    className="absolute inset-y-0 right-0 flex items-center h-full"
                    style={{ width: `${actions.length * actionButtonWidth}px` }}
                >
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Close swipe then trigger action
                                setIsOpen(false);
                                action.onClick();
                            }}
                            className={`h-full flex flex-col items-center justify-center text-white px-2 transition-active active:brightness-90 ${action.color}`}
                            style={{ width: `${actionButtonWidth}px` }}
                        >
                            <div className="mb-1">{action.icon}</div>
                            <span className="text-[10px] font-bold">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Foreground Content Layer */}
            <motion.div
                className="relative z-10 h-full"
                style={{ x }}
                drag="x"
                dragConstraints={{ left: maxDrag, right: 0 }}
                dragElastic={0.1}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                animate={{ x: isOpen ? maxDrag : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                dragDirectionLock
            >
                {children}
            </motion.div>
        </div>
    );
};

export default SwipeableItem;
