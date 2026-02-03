import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Check, X, TrendingUp, Mic, Star } from 'lucide-react';

interface ProUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
    const handlePurchase = () => {
        alert('Pro 订阅功能开发中，敬请期待！');
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
            desc: '专属黑金主题，彰显不凡牌品',
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
                    <button
                        onClick={onClose}
                        className="absolute top-12 right-6 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Background Effects */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-amber-600/20 to-transparent" />
                        <div className="absolute -top-[200px] -right-[200px] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
                        <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <div className="absolute top-[40%] right-[20%] w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse delay-700" />
                        <div className="absolute top-[15%] right-[30%] w-1 h-1 rounded-full bg-white animate-pulse delay-300" />
                    </div>

                    <div className="relative z-10 flex flex-col min-h-full pb-safe">
                        {/* Hero Section */}
                        <div className="pt-20 pb-10 px-6 flex flex-col items-center text-center">
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
                                    PRO
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
                        <div className="flex-1 px-4 space-y-4">
                            {benefits.map((benefit, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 + index * 0.1 }}
                                    className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors"
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.color} p-0.5 shadow-lg`}>
                                        <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                                            <benefit.icon className={`w-6 h-6 text-transparent bg-clip-text bg-gradient-to-br ${benefit.color} stroke-[url(#gradient-${index})]`} />
                                            {/* Note: SVG gradient for stroke needs defs, but Lucide icons use stroke color. For simplicity we use text color or separate SVG. Using text-white for now */}
                                            <benefit.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-base mb-1">{benefit.title}</h3>
                                        <p className="text-white/50 text-xs leading-relaxed">{benefit.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pricing & CTA */}
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="mt-8 p-6 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent"
                        >
                            <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-amber-500/20 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                    推荐
                                </div>
                                <p className="text-amber-200/60 text-xs mb-1">年度会员</p>
                                <div className="flex justify-center items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">¥98</span>
                                    <span className="text-white/40 text-sm">/年</span>
                                </div>
                                <p className="text-white/30 text-[10px] mt-2 line-through">原价 ¥198/年</p>
                            </div>

                            <button
                                onClick={handlePurchase}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-slate-900 font-bold text-lg shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] transition-shadow active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <Crown className="w-5 h-5 fill-slate-900" />
                                    立即升级 Pro
                                </span>

                                {/* Shine Effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent z-0" />
                            </button>

                            <p className="text-white/20 text-[10px] text-center mt-4">
                                点击上方按钮即表示同意《用户协议》及《隐私政策》
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ProUpgradeModal;
