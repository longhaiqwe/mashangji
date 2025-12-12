import React, { useEffect, useState, useRef } from 'react';
import { DAILY_QUOTES } from '../constants';
import { Dice5 } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  isReady?: boolean; // Prop to signal if app data/auth is ready
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isReady = true }) => {
  const [quote, setQuote] = useState('');
  // Use a ref to track the mount time. This persists across re-renders (e.g. when isReady changes).
  const startTimeRef = useRef(Date.now());
  // Track if we have already finished to prevent double calls
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    const randomQuote = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  useEffect(() => {
    const minDisplayTime = 2000; // Minimum splash screen time in ms

    const checkRedirect = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      
      // Only proceed if minimum time passed AND the parent app is ready (auth check done)
      if (elapsed >= minDisplayTime && isReady && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        clearInterval(checkRedirect);
        onFinish();
      }
    }, 100);

    return () => clearInterval(checkRedirect);
  }, [onFinish, isReady]);

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