
import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';

export interface SwipeAction {
    label: string;
    icon: React.ReactNode;
    color: string; // Tailwinc bg color class, e.g. 'bg-red-500'
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
    threshold = 80
}) => {
    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Calculate the total width of actions to know how far to snap
    // We'll estimate each action button is approx 60px-80px wide
    // A better way is to measure, but hardcoded estimates work well for mobile UI consistency
    const actionButtonWidth = 70;
    const maxDrag = -1 * (actions.length * actionButtonWidth);

    // Background opacity or other effects based on drag
    // We can fade in the actions as we drag
    const opacity = useTransform(x, [0, -50], [0, 1]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Logic to determine if we should snap open or close
        if (offset < -threshold || velocity < -500) {
            // Swiped left enough
            setIsOpen(true);
        } else {
            // Snap back
            setIsOpen(false);
        }
    };

    return (
        <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
            {/* Actions Layer (Behind) */}
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

            {/* Foreground Content Layer */}
            <motion.div
                className="relative bg-white z-10 h-full"
                style={{ x }}
                drag="x"
                dragConstraints={{ left: maxDrag, right: 0 }}
                dragElastic={0.1} // Rubber band effect
                onDragEnd={handleDragEnd}
                animate={{ x: isOpen ? maxDrag : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                // Lock vertical scroll while dragging horizontally
                dragDirectionLock
            >
                {children}
            </motion.div>
        </div>
    );
};

export default SwipeableItem;
