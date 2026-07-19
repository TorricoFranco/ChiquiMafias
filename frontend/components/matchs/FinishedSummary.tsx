"use client";
import { Star, User } from 'lucide-react';

interface FinishedSummaryProps {
    finishedData: {
        summary: string;
        manOfTheMatch: string;
    };
    liveData: {
        score: {
            home: number | string;
            away: number | string;
        };
    };
}

export const FinishedSummary = ({ finishedData, liveData }: FinishedSummaryProps) => (
    <section className="bg-gray-800 p-5 rounded-lg mb-6 shadow-lg border-t-4 border-yellow-500">
        <h2 className="text-2xl font-black text-yellow-400 mb-4 flex items-center">
            <Star className="w-6 h-6 mr-2" /> Resumen Final
        </h2>

        <div className="mb-4 p-4 bg-gray-900 rounded-lg">
            <p className="text-lg font-semibold text-white mb-2">Marcador Final:</p>
            <span className="text-4xl font-extrabold text-red-500 mr-4">{liveData.score.home}</span>
            <span className="text-4xl font-extrabold text-white"> - </span>
            <span className="text-4xl font-extrabold text-blue-500 ml-4">{liveData.score.away}</span>
        </div>

        <p className="text-gray-300 italic mb-4">"{finishedData.summary}"</p>

        <div className="flex items-center text-lg font-bold text-white bg-gray-900 p-3 rounded-lg">
            <User className="w-5 h-5 mr-3 text-yellow-400" />
            Jugador del Partido:
            <span className="ml-2 text-yellow-400">{finishedData.manOfTheMatch}</span>
        </div>
    </section>
);