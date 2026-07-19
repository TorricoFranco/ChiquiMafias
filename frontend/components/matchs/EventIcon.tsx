"use client";
import React from 'react';
import { Clock, Trophy, Zap, ChevronRight } from 'lucide-react';

// AGREGA 'export' AQUÍ
export type EventType =
  | 'goal'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'var_check'
  | 'full_time'
  | 'half_time';

interface EventIconProps {
  type: EventType;
}
export const EventIcon = ({ type }: EventIconProps) => {
  // Usamos React.ReactNode en lugar de JSX.Element
  const iconMap: Record<EventType, React.ReactNode> = {
    goal: <Trophy className="w-4 h-4 text-green-500" />,
    yellow_card: <div className="w-3 h-4 bg-yellow-400 rounded-sm" />,
    red_card: <div className="w-3 h-4 bg-red-600 rounded-sm" />,
    substitution: <ChevronRight className="w-4 h-4 text-white" style={{ transform: 'rotate(90deg)' }} />,
    var_check: <Zap className="w-4 h-4 text-cyan-400" />,
    full_time: <Clock className="w-4 h-4 text-white" />,
    half_time: <Clock className="w-4 h-4 text-gray-500" />,
  };

  return iconMap[type] || <div className="w-4 h-4 bg-gray-500 rounded-full" />;
};