import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Mic, X, Sparkles } from 'lucide-react';
import ProUpgradeModal from './ProUpgradeModal';
import { useSubscription } from '../context/SubscriptionContext';

interface TrialExhaustedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade?: () => void;
}

const TrialExhaustedModal: React.FC<TrialExhaustedModalProps> = ({
    isOpen,
    onClose,
    onUpgrade,
}) => {
    const [showProModal, setShowProModal] = useState(false);
    const { isPro } = useSubscription();

    // 使用 ref 存储 onClose，避免 useEffect 依赖项变化导致的问题
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 当用户成为 Pro 会员后，自动关闭所有弹窗
    useEffect(() => {
        if (isPro && isOpen) {
            setShowProModal(false);
            onCloseRef.current();
        }
    }, [isPro, isOpen]);

    const handleUpgrade = () => {
        setShowProModal(true);
        onUpgrade?.();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center px-6"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="relative w-full max-w-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl border border-amber-500/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-white/60" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                    <Mic className="w-9 h-9 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">0</span>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-white text-center mb-2">
                            试用次数已用完
                        </h2>

                        {/* Description */}
                        <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
                            您的 10 次免费 AI 语音记账试用已用完，升级到 Pro 即可无限使用
                        </p>

                        {/* Upgrade button */}
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-900 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow active:scale-[0.98]"
                        >
                            <Crown className="w-5 h-5" />
                            升级到 Pro
                            <Sparkles className="w-4 h-4" />
                        </button>

                        {/* Later button */}
                        <button
                            onClick={onClose}
                            className="w-full mt-3 py-3 rounded-xl text-white/50 hover:text-white/80 text-sm transition-colors"
                        >
                            稍后再说
                        </button>
                    </motion.div>
                </motion.div>
            )}

            {/* Pro Upgrade Page */}
            <ProUpgradeModal
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
            />
        </AnimatePresence>
    );
};

export default TrialExhaustedModal;
