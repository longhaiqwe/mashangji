import React, { useState, useEffect } from 'react';
import { X, Save, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUsername: string;
    onSave: (newUsername: string) => Promise<void>;
    themeId?: string;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen,
    onClose,
    currentUsername,
    onSave,
    themeId = 'default'
}) => {
    const [username, setUsername] = useState(currentUsername);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync state when modal opens
    useEffect(() => {
        if (isOpen) {
            setUsername(currentUsername || '');
            setError(null);
        }
    }, [isOpen, currentUsername]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = username.trim();

        if (!trimmedName) {
            setError('用户名不能为空');
            return;
        }

        if (trimmedName.length > 20) {
            setError('用户名不能超过20个字符');
            return;
        }

        try {
            setIsSaving(true);
            setError(null);
            await onSave(trimmedName);
            onClose();
        } catch (err: any) {
            setError(err.message || '保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    // Theme Logic
    const isDarkTheme = themeId === 'black' || themeId === 'rich';

    // Dynamic Styles
    const overlayBg = isDarkTheme ? 'bg-black/80' : 'bg-slate-900/40';
    const modalBg = isDarkTheme
        ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-luxury-gold-500/20'
        : 'bg-white border-white/40';
    const textColor = isDarkTheme ? 'text-white' : 'text-slate-800';
    const inputBg = isDarkTheme ? 'bg-white/5 border-white/10 text-white focus:border-luxury-gold-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500/50';
    const closeBtnHover = isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-inset-bottom">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isSaving ? onClose : undefined}
                        className={`absolute inset-0 backdrop-blur-sm ${overlayBg}`}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border ${modalBg} p-6`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-xl font-bold ${textColor}`}>修改昵称</h3>
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className={`p-2 rounded-full transition-colors ${closeBtnHover} disabled:opacity-50`}
                            >
                                <X className={`w-5 h-5 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className={`block text-xs font-medium uppercase tracking-wider ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                                    新昵称
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className={`w-5 h-5 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        disabled={isSaving}
                                        placeholder="请输入新的昵称"
                                        className={`block w-full pl-10 pr-3 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all ${inputBg} ${isDarkTheme ? 'focus:ring-luxury-gold-500' : 'focus:ring-blue-500'}`}
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="text-red-500 text-sm mt-1 ml-1"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                                <p className={`text-xs ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'} px-1`}>
                                    支持中英文、数字，建议使用真实称呼以便朋友辨认。
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="flex-1"
                                >
                                    取消
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !username.trim() || username === currentUsername}
                                    className={`flex-1 ${isDarkTheme ? '!bg-luxury-gold-500 hover:!bg-luxury-gold-600 !text-slate-900' : ''}`}
                                    icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                >
                                    {isSaving ? '保存中...' : '保存修改'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;
