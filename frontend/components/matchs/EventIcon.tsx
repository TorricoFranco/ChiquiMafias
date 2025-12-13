"use client";
import { Clock, Trophy, Zap, ChevronRight } from 'lucide-react';


export const EventIcon = ({ type }) => {
    const iconMap = {
        goal: <Trophy className="w-4 h-4 text-green-500" />,
        yellow_card: <div className="w-3 h-4 bg-yellow-400 rounded-sm" />,
        red_card: <div className="w-3 h-4 bg-red-600 rounded-sm" />,
        substitution: <ChevronRight className="w-4 h-4 text-white" style={{ transform: 'rotate(90deg)' }} />,
        var_check: <Zap className="w-4 h-4 text-cyan-400" />,
        full_time: <Clock className="w-4 h-4 text-white" />,
        half_time: <Clock className="w-4 h-4 text-gray-500" />,
        // Puedes agregar más tipos de eventos aquí
    };
    return iconMap[type] || <div className="w-4 h-4 bg-gray-500 rounded-full" />;
};