import React from 'react';

const WelcomePage = ({ onNavigate, t }) => {
  return (
    <div className="flex flex-col p-5 text-white min-h-screen">
      {/* Bot Chat Bubbles */}
      <div className="space-y-4 mb-8">
        <div className="bg-[#1A2333] rounded-2xl rounded-bl-none p-4 max-w-[90%] self-start shadow-md border border-gray-700/50">
          <p className="text-md font-medium leading-relaxed">
            {t.welcome}
          </p>
        </div>

        <div className="bg-[#1A2333] rounded-2xl rounded-bl-none p-4 max-w-[90%] self-start shadow-md border border-gray-700/50">
          <p className="text-sm leading-relaxed text-gray-200">
            {t.welcome_desc}
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-3 py-2 px-1">
          {t.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3 group">
              <span className="text-xl">{['✨', '🎯', '🚀'][index]}</span>
              <span className="text-sm font-medium text-gray-200">{feature}</span>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <p className="text-sm font-medium text-gray-300">{t.explore}</p>
        </div>
      </div>

      {/* Buttons Container */}
      <div className="flex flex-col space-y-3.5 mt-auto pb-6">
        <button 
          onClick={() => onNavigate('series')}
          className="w-full py-4.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-full transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          <span className="text-lg">🎬</span>
          <span className="text-md">{t.view_all}</span>
        </button>
        
        <button 
          onClick={() => onNavigate('my-subs')}
          className="w-full py-4.5 bg-transparent text-gray-200 font-bold rounded-full transition-all border border-gray-700/50 hover:bg-white/5 flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          <span className="text-lg">💳</span>
          <span className="text-md">{t.my_subs}</span>
        </button>
        
        <button 
          onClick={() => onNavigate('service')}
          className="w-full py-4.5 bg-transparent text-blue-500 font-bold rounded-full transition-all border border-gray-700/50 hover:bg-white/5 flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          <span className="text-lg">💬</span>
          <span className="text-md">{t.contact_support}</span>
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;
