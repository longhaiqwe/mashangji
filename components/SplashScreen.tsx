
import React, { useEffect, useState } from 'react';
import { DAILY_QUOTES } from '../constants';
import { Dice5 } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  isReady?: boolean; // Prop to signal if app data/auth is ready
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isReady = true }) => {
  const [quote, setQuote] = useState('');
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const randomQuote = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
    setQuote(randomQuote);

    // Ensure splash screen shows for at least 2 seconds
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Trigger finish when both time has passed and app is ready
  useEffect(() => {
    if (minTimePassed && isReady) {
      onFinish();
    }
  }, [minTimePassed, isReady, onFinish]);

  return (
    <div 
      className="flex flex-col items-center justify-center h-full bg-mahjong-800 text-white px-6 relative overflow-hidden"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-mahjong-600 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-emerald-400 rounded-full opacity-10 blur-3xl"></div>

      <div className="z-10 flex flex-col items-center animate-fade-in-up">
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-8 transform rotate-12">
           <Dice5 className="w-12 h-12 text-mahjong-800" />
        </div>
        
        <h1 className="text-4xl font-bold mb-2 tracking-widest text-shadow">麻上记</h1>
        <p className="text-emerald-200 mb-12 text-sm tracking-wider">极简 • 私密 • 随心</p>

        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 max-w-sm w-full text-center shadow-lg">
          <p className="text-xl font-serif leading-relaxed opacity-90">
            “{quote}”
          </p>
        </div>
        
        {/* Loading Indicator if waiting for Auth */}
        {!isReady && (
          <div className="mt-8">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
