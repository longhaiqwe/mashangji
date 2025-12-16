import React from 'react';

interface LoadingScreenProps {
    isVisible: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-50 bg-white flex items-center justify-center transition-opacity duration-500">
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="writing-vertical-rl text-3xl font-serif tracking-[0.5em] text-gray-800 animate-pulse">
                    小麻怡情
                </div>
            </div>
            <style>{`
        .writing-vertical-rl {
          writing-mode: vertical-rl;
          text-orientation: upright;
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
