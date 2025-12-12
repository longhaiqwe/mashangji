import React, { useState, useEffect } from 'react';
import { Circle, ViewState, Record } from '../types';
import { ChevronLeft, Calendar, Tag, FileText, Check, Users } from 'lucide-react';
import { generateId } from '../services/storageService';

interface AddRecordProps {
  circles: Circle[];
  onSave: (record: Record) => void;
  onCancel: () => void;
  initialCircleId?: string;
}

const AddRecord: React.FC<AddRecordProps> = ({ circles, onSave, onCancel, initialCircleId }) => {
  const [amount, setAmount] = useState<string>('');
  const [isWin, setIsWin] = useState<boolean>(true);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [circleId, setCircleId] = useState<string>(initialCircleId || (circles[0]?.id || ''));
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Auto-select circle if none selected and circles exist
  useEffect(() => {
      if(!circleId && circles.length > 0) {
          setCircleId(circles[0].id);
      }
  }, [circles, circleId]);

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

    const newRecord: Record = {
      id: generateId(),
      circleId,
      amount: finalAmount,
      date,
      note,
      timestamp: Date.now()
    };

    onSave(newRecord);
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
        <h2 className="flex-1 text-center font-bold text-lg text-gray-800">记一笔</h2>
        <div className="w-10"></div> {/* Spacer for balance */}
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
              autoFocus
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
          <Check className="w-5 h-5 mr-2" /> 保存
        </button>
      </form>
    </div>
  );
};

export default AddRecord;