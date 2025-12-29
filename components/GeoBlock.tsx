
import React from 'react';

interface GeoBlockProps {
    region?: string;
}

export const GeoBlock: React.FC<GeoBlockProps> = ({ region }) => {
    return (
        <div className="fixed inset-0 z-[999] bg-[#020617] flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-slate-900 border-2 border-red-900/50 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                
                <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-3xl font-black text-white font-display mb-2">ACCESS RESTRICTED</h1>
                <p className="text-slate-400 mb-6">
                    We've detected you are accessing GGSlots from <span className="text-white font-bold">{region || 'a restricted region'}</span>.
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-500 text-left space-y-2 mb-6">
                    <p>Due to local regulations, real-money sweepstakes gaming is not available in the following states:</p>
                    <div className="flex flex-wrap gap-2">
                        {['Washington', 'Michigan', 'Montana', 'California', 'New York', 'Connecticut', 'Nevada', 'Louisiana', 'New Jersey'].map(state => (
                            <span key={state} className="bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">{state}</span>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={() => window.location.href = 'https://google.com'}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                    Leave Site
                </button>
            </div>
        </div>
    );
};
