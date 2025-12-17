
import React, { useState, useEffect } from 'react';
import { Circle, Record } from '../types';
import { ChevronLeft, Calendar, FileText, Check, Users, Sparkles, X, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { generateId } from '../services/storageService';
import { analyzeText, ParsedRecord } from '../services/geminiService';

interface AddRecordProps {
  circles: Circle[];
  onSave: (record: Record | Record[]) => void;
  onCancel: () => void;
  initialCircleId?: string;
  initialRecord?: Record | null; // For editing
}

const AddRecord: React.FC<AddRecordProps> = ({ circles, onSave, onCancel, initialCircleId, initialRecord }) => {
  const [amount, setAmount] = useState<string>('');
  const [isWin, setIsWin] = useState<boolean>(true);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [circleId, setCircleId] = useState<string>(initialCircleId || (circles[0]?.id || ''));
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  // AI Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParsedRecord[]>([]);

  // Keep track of the original text for re-analysis
  const [lastImportText, setLastImportText] = useState('');

  // Auto-select circle if none selected and circles exist
  useEffect(() => {
      if(!circleId && circles.length > 0) {
          setCircleId(circles[0].id);
      }
  }, [circles, circleId]);

  // Load initial record data for editing
  useEffect(() => {
    if (initialRecord) {
      setAmount(Math.abs(initialRecord.amount).toString());
      setIsWin(initialRecord.amount >= 0);
      setDate(initialRecord.date);
      setCircleId(initialRecord.circleId);
      setNote(initialRecord.note || '');
    }
  }, [initialRecord]);

  const handleAnalyze = async () => {
    if (!importText.trim()) {
      alert('请输入要识别的文本');
      return;
    }

    setIsAnalyzing(true);
    setParsedResults([]);
    setLastImportText(importText);
    try {
      const results = await analyzeText(importText);
      if (results.length === 0) {
        alert('未能识别到有效记录，请检查文本格式');
        // Do NOT clear importText so user can edit it
      } else {
        setParsedResults(results);
        setImportText('');
      }
    } catch (err: any) {
      alert(err.message || '识别失败，请检查网络或稍后重试');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReAnalyze = async () => {
    if (!lastImportText.trim()) return;

    setIsAnalyzing(true);
    try {
      const results = await analyzeText(lastImportText);
      if (results.length === 0) {
        alert('未能识别到有效记录');
      } else {
        setParsedResults(results);
        alert('已重新识别');
      }
    } catch (err: any) {
      alert(err.message || '识别失败，请检查网络或稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchImport = () => {
    if (parsedResults.length === 0) return;

    // Use current circleId for all records
    // Or we could try to detect circle from text too, but for now stick to current selected circle
    const recordsToSave: Record[] = parsedResults.map(res => ({
        id: generateId(),
        circleId: circleId,
        amount: res.isWin ? Math.abs(res.amount) : -Math.abs(res.amount),
        date: res.date,
        note: res.note,
        timestamp: new Date(res.date).getTime()
    }));

    onSave(recordsToSave);
    setShowImportModal(false);
  };

  const removeParsedResult = (index: number) => {
    const newResults = [...parsedResults];
    newResults.splice(index, 1);
    setParsedResults(newResults);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      setError('请输入金额');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      setError('金额必须是数字');
      return;
    }

    const finalAmount = isWin ? Math.abs(numAmount) : -Math.abs(numAmount);

    const recordToSave: Record = {
      id: initialRecord ? initialRecord.id : generateId(), // Reuse ID if editing
      circleId,
      amount: finalAmount,
      date,
      note,
      timestamp: initialRecord ? initialRecord.timestamp : Date.now()
    };

    onSave(recordToSave);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and one decimal point
    if (/^\d*\.?\d*$/.test(val)) {
        setAmount(val);
        setError('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center px-4 h-14 border-b border-gray-100 flex-shrink-0">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center font-bold text-lg text-gray-800">
            {initialRecord ? '编辑记录' : '记一笔'}
        </h2>
        <button onClick={() => setShowImportModal(true)} className="p-2 -mr-2 text-indigo-600">
           <Sparkles className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        
        {/* Amount Input Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex w-full bg-gray-100 rounded-lg p-1">
             <button 
                type="button"
                onClick={() => setIsWin(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isWin ? 'bg-white text-win shadow-sm' : 'text-gray-400'}`}
             >
                赢了
             </button>
             <button 
                type="button"
                onClick={() => setIsWin(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isWin ? 'bg-white text-loss shadow-sm' : 'text-gray-400'}`}
             >
                输了
             </button>
          </div>

          <div className="relative w-full">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold ${isWin ? 'text-win' : 'text-loss'}`}>¥</span>
            <input 
              type="text" 
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              className={`w-full text-right pr-4 py-4 bg-gray-50 rounded-2xl text-4xl font-bold outline-none border-2 transition-colors ${error ? 'border-red-300' : 'border-transparent focus:border-mahjong-500'} ${isWin ? 'text-win' : 'text-loss'}`}
              autoFocus={!initialRecord} // Don't auto-focus on edit to avoid jarring jump on mobile
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Details Form */}
        <div className="space-y-4 pt-4">
          
          {/* Circle Selector */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-500">
              <Users className="w-4 h-4 mr-2" /> 圈子
            </label>
            <div className="flex flex-wrap gap-2">
              {circles.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCircleId(c.id)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${circleId === c.id ? 'bg-mahjong-50 border-mahjong-500 text-mahjong-700 font-bold' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  {c.name}
                </button>
              ))}
              {/* Fallback if no circles */}
              {circles.length === 0 && <span className="text-xs text-red-400">请先去圈子管理添加圈子</span>}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-500">
               <Calendar className="w-4 h-4 mr-2" /> 日期
            </label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 outline-none focus:ring-2 focus:ring-mahjong-500/20"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-500">
               <FileText className="w-4 h-4 mr-2" /> 备注 (选填)
            </label>
            <input 
              type="text" 
              placeholder="记录一下今天的手气..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={20}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 outline-none focus:ring-2 focus:ring-mahjong-500/20"
            />
          </div>

        </div>

        <div className="flex-1"></div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-mahjong-600 hover:bg-mahjong-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-mahjong-500/30 active:scale-[0.98] transition-all flex items-center justify-center"
        >
          <Check className="w-5 h-5 mr-2" /> {initialRecord ? '更新记录' : '保存'}
        </button>
      </form>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-indigo-500"/> 
                AI 智能识别
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReAnalyze}
                  disabled={isAnalyzing}
                  className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors ${isAnalyzing ? 'animate-spin' : ''}`}
                  title="重新识别"
                >
                  <RefreshCw size={20} />
                </button>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {parsedResults.length > 0 ? (
              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] space-y-3">
                 <p className="text-sm text-green-600 font-bold">成功识别 {parsedResults.length} 条记录：</p>
                 {parsedResults.map((res, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className={`font-bold ${res.isWin ? 'text-win' : 'text-loss'}`}>
                                        {res.isWin ? '+' : '-'}{res.amount}
                                    </span>
                                    <span className="text-xs text-gray-400">{res.date}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{res.note || '无备注'}</p>
                            </div>
                            <button 
                                onClick={() => removeParsedResult(idx)}
                                className="text-gray-400 hover:text-red-500 p-1"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                 ))}
              </div>
            ) : (
                <div className="space-y-2">
                <label className="text-sm text-gray-500 block">粘贴便签内容</label>
                <textarea
                    className="w-full h-32 p-3 bg-gray-50 rounded-xl border border-gray-200 resize-none text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="支持多条记录，例如：
'2023年5月1日 赢了200
5月3日 输了100
昨天打麻将赢了50'"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                />
                </div>
            )}

            <div className="flex gap-3">
                {parsedResults.length > 0 && (
                    <button
                        onClick={() => {
                            setParsedResults([]);
                            setImportText('');
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition-all"
                    >
                        重置
                    </button>
                )}
                
                <button
                onClick={parsedResults.length > 0 ? handleBatchImport : handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30"
                >
                {isAnalyzing ? (
                    <>
                    <Loader2 className="animate-spin mr-2 w-5 h-5"/>
                    正在分析...
                    </>
                ) : parsedResults.length > 0 ? (
                    <>
                    <Check className="mr-2 w-5 h-5"/>
                    全部导入
                    </>
                ) : (
                    <>
                    <Sparkles className="mr-2 w-5 h-5"/>
                    开始识别
                    </>
                )}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRecord;
