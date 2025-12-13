"use client";

export const StatBar = ({ label, homeValue, awayValue, format = 'number' }) => {
    const total = homeValue + awayValue;
    const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
    const awayPercent = total > 0 ? (awayValue / total) * 100 : 50;

    const renderValue = (value) => {
        if (format === 'percent') return `${value}%`;
        if (format === 'decimal') return value.toFixed(2);
        return value;
    };

    return (
        <div className="my-4">
            <div className="flex justify-between text-sm font-semibold mb-1">
                <span className="text-red-500">{renderValue(homeValue)}</span>
                <span className="text-gray-400">{label}</span>
                <span className="text-blue-500">{renderValue(awayValue)}</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-700">
                <div 
                    className="bg-red-600 h-full transition-all duration-500" 
                    style={{ width: `${homePercent}%` }}
                />
                <div 
                    className="bg-blue-600 h-full transition-all duration-500" 
                    style={{ width: `${awayPercent}%` }}
                />
            </div>
        </div>
    );
};
