import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Check, X, TrendingUp, Mic, Star, RotateCcw, Loader2 } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

interface ProUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LANTERN_FESTIVAL_END_UTC = Date.UTC(2026, 2, 3, 15, 59, 59); // 2026-03-03 23:59:59 (GMT+8)

const getCountdown = (nowMs: number, endMs: number) => {
    const remainingMs = Math.max(0, endMs - nowMs);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        remainingMs,
        days,
        hours,
        minutes,
        seconds
    };
};

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
    const { purchase, restore, loading, priceString, isPro } = useSubscription();
    const [countdown, setCountdown] = React.useState(() =>
        getCountdown(Date.now(), LANTERN_FESTIVAL_END_UTC)
    );
    const [showDeadline, setShowDeadline] = React.useState(false);
    const [showCelebration, setShowCelebration] = React.useState(false);
    const celebrationTimerRef = React.useRef<number | null>(null);
    const confettiPieces = React.useMemo(
        () =>
            Array.from({ length: 18 }, (_, index) => ({
                id: index,
                left: `${(index * 7 + 12) % 100}%`,
                delay: index * 0.06,
                size: 6 + (index % 4) * 3,
                duration: 1.3 + (index % 3) * 0.25,
                rotate: (index * 37) % 360
            })),
        []
    );

    React.useEffect(() => {
        if (!isOpen) return;
        const tick = () => setCountdown(getCountdown(Date.now(), LANTERN_FESTIVAL_END_UTC));
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [isOpen]);

    React.useEffect(() => {
        if (isOpen) return;
        setShowCelebration(false);
        if (celebrationTimerRef.current) {
            window.clearTimeout(celebrationTimerRef.current);
            celebrationTimerRef.current = null;
        }
    }, [isOpen]);

    const handlePurchase = async () => {
        if (loading) return;
        try {
            const success = await purchase();
            if (!success) return;
            if (celebrationTimerRef.current) {
                window.clearTimeout(celebrationTimerRef.current);
            }
            setShowCelebration(true);
            celebrationTimerRef.current = window.setTimeout(() => {
                setShowCelebration(false);
                onClose();
            }, 2200);
        } catch (e) {
            // Error handling is inside context
        }
    };

    const handleRestore = async () => {
        if (loading) return;
        try {
            await restore();
        } catch (e) {
            // Error handling is inside context
        }
    };

    const handleCelebrationDone = () => {
        if (celebrationTimerRef.current) {
            window.clearTimeout(celebrationTimerRef.current);
            celebrationTimerRef.current = null;
        }
        setShowCelebration(false);
        onClose();
    };

    const benefits = [
        {
            icon: Mic,
            title: '无限语音记账',
            desc: '告别次数限制，随时随地想记就记',
            color: 'from-amber-400 to-orange-500'
        },
        {
            icon: TrendingUp,
            title: '财运深度复盘',
            desc: '独家胜率趋势图，看清谁是你的财神爷 (开发中)',
            color: 'from-emerald-400 to-teal-500'
        },
        {
            icon: Crown,
            title: '尊贵会员标识',
            desc: '专属黑金主题，彰显不凡牌品 (开发中)',
            color: 'from-purple-400 to-indigo-500'
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.5 }}
                    onDragEnd={(_, info) => {
                        if (info.offset.y > 100) {
                            onClose();
                        }
                    }}
                    className="fixed inset-0 z-[100] bg-slate-900 overflow-y-auto"
                >
                    {/* Close Button */}
                    {!showCelebration && (
                        <button
                            onClick={onClose}
                            className="absolute top-12 right-6 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}

                    {/* Background Effects */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-amber-600/20 to-transparent" />
                        <div className="absolute -top-[200px] -right-[200px] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
                        <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <div className="absolute top-[40%] right-[20%] w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse delay-700" />
                        <div className="absolute top-[15%] right-[30%] w-1 h-1 rounded-full bg-white animate-pulse delay-300" />
                    </div>

                    <AnimatePresence>
                        {showCelebration && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[120] flex items-center justify-center"
                            >
                                <div className="absolute inset-0 bg-slate-950/90" />
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_rgba(15,23,42,0.9)_55%)]"
                                />
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.6 }}
                                        className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-amber-300/20 blur-[1px]"
                                    />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                                        className="absolute -top-28 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full border border-amber-400/10 border-dashed"
                                    />
                                    {confettiPieces.map((piece) => (
                                        <motion.span
                                            key={piece.id}
                                            initial={{ y: -40, opacity: 0, rotate: 0 }}
                                            animate={{ y: 240, opacity: [0, 1, 0], rotate: piece.rotate }}
                                            transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeOut' }}
                                            className="absolute top-6 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                                            style={{
                                                left: piece.left,
                                                width: `${piece.size}px`,
                                                height: `${piece.size * 1.6}px`
                                            }}
                                        />
                                    ))}
                                </div>

                                <motion.div
                                    initial={{ scale: 0.85, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                                    className="relative z-10 w-full max-w-[360px] px-6 text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
                                        className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gold-gradient shadow-gold-glow"
                                    >
                                        <Crown className="h-11 w-11 text-slate-900 drop-shadow" strokeWidth={1.6} />
                                    </motion.div>
                                    <motion.h2
                                        initial={{ y: 12, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100 bg-[length:200%_100%] animate-gold-shimmer"
                                    >
                                        恭喜升级 Pro 会员
                                    </motion.h2>
                                    <motion.p
                                        initial={{ y: 12, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="mt-2 text-sm text-amber-100/70"
                                    >
                                        尊贵权益已解锁，尽享奢华金体验
                                    </motion.p>
                                    <motion.button
                                        initial={{ y: 12, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        onClick={handleCelebrationDone}
                                        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 py-3 text-sm font-bold text-slate-900 shadow-[0_0_30px_rgba(251,191,36,0.35)]"
                                    >
                                        立即体验
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative z-10 flex flex-col min-h-full pb-safe">
                        <div className="w-full max-w-[420px] mx-auto px-6">
                            {/* Hero Section */}
                            <div className="pt-14 pb-6 flex flex-col items-center text-center">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                className="relative mb-6"
                            >
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                                    <Crown className="w-12 h-12 text-white drop-shadow-lg" strokeWidth={1.5} />
                                </div>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                    className="absolute inset-0 rounded-full border border-amber-400/30 border-dashed"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
                                >
                                    {isPro ? '已开通' : 'PRO'}
                                </motion.div>
                            </motion.div>

                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 mb-2"
                            >
                                解锁无限潜能
                            </motion.h1>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-amber-100/60 text-sm max-w-[260px]"
                            >
                                升级到 Pro 会员，体验 AI 智能记账的极致效率与数据洞察
                            </motion.p>
                            </div>

                            {/* Benefits List */}
                            <div className="space-y-2">
                                {benefits.map((benefit, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ x: -50, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-3 flex items-center gap-3 group hover:bg-white/10 transition-colors"
                                    >
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${benefit.color} p-0.5 shadow-lg`}>
                                            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                                                <benefit.icon className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-sm mb-0.5">{benefit.title}</h3>
                                            <p className="text-white/50 text-[11px] leading-snug">{benefit.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Pricing & CTA */}
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="mt-3 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent"
                        >
                            <div className="w-full max-w-[420px] mx-auto px-6 pt-3 pb-16">
                                <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-amber-500/20 text-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        推荐
                                    </div>
                                    <div className="mb-1 flex items-center justify-center gap-2 text-[11px]">
                                        <span className="text-amber-200/60">年度会员</span>
                                        <span className="text-amber-400/80">🎊 早鸟 · 新春特惠价</span>
                                    </div>
                                    <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">{priceString}</span>
                                            <span className="text-white/40 text-sm">/年</span>
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80 line-through decoration-white/70">
                                            原价 ¥18/年
                                        </span>
                                    </div>

                                {countdown.remainingMs > 0 ? (
                                    <div className="mt-2 cursor-pointer select-none" onClick={() => setShowDeadline((prev) => !prev)}>
                                        <div className="flex items-center justify-center">
                                            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100/90">
                                                <Sparkles className="h-3 w-3 text-amber-300" />
                                                早鸟价倒计时
                                                <span className="text-white/50 font-normal">点击查看截止</span>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-center gap-2 text-white/90">
                                            {[
                                                { value: countdown.days, label: '天' },
                                                { value: countdown.hours, label: '时' },
                                                { value: countdown.minutes, label: '分' },
                                                { value: countdown.seconds, label: '秒' }
                                            ].map((item) => (
                                                <div key={item.label} className="flex items-end gap-1">
                                                    <div className="min-w-[28px] rounded-lg bg-white/10 px-2 py-1 text-xs font-bold tabular-nums text-white shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                                                        {String(item.value).padStart(2, '0')}
                                                    </div>
                                                    <span className="text-[10px] text-white/50">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {showDeadline && (
                                            <p className="mt-1 text-[10px] text-white/35">
                                                截止 2026-03-03 23:59 (GMT+8)
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-[11px] font-semibold text-amber-200/80">
                                        早鸟优惠已结束
                                    </p>
                                )}
                            </div>

                                <button
                                    onClick={handlePurchase}
                                    disabled={loading || isPro}
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-slate-900 font-bold text-lg shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] transition-shadow active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5 fill-slate-900" />}
                                        {isPro ? '您已是尊贵会员' : '立即升级 Pro'}
                                    </span>

                                    {/* Shine Effect */}
                                    {!isPro && <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent z-0" />}
                                </button>

                                {/* Restore Button */}
                                <button
                                    onClick={handleRestore}
                                    disabled={loading}
                                    className="w-full mt-2 py-2 text-white/40 text-xs hover:text-white/60 transition-colors flex items-center justify-center gap-1"
                                >
                                    <RotateCcw size={12} />
                                    恢复购买
                                </button>

                                <p className="text-white/20 text-[10px] text-center mt-4">
                                    点击上方按钮即表示同意《用户协议》及《隐私政策》
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ProUpgradeModal;
