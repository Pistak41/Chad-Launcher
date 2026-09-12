import React from 'react';

interface ProgressBarProps {
    value: number;
    max?: number;
    label?: string;
    showPercentage?: boolean;
    className?: string;
    barColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    label,
    showPercentage = true,
    className = "",
    barColor = "bg-emerald-500"
}) => {
    const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

    return (
        <div className={`w-full flex flex-col gap-1 text-xs text-slate-200 ${className}`}>
            {(label || showPercentage) && (
                <div className="flex justify-between items-center text-xs font-semibold tracking-wide">
                    {label && <span>{label}</span>}
                    {showPercentage && <span className="font-mono">{percentage}%</span>}
                </div>
            )}
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

