"use client";

import React, { useState } from "react";

interface ChatPollProps {
  question?: string;
  initialYesVotes?: number;
  initialNoVotes?: number;
}

export const ChatPoll: React.FC<ChatPollProps> = ({
  question = "¿Habrá más de 2.5 goles en el Superclásico?",
  initialYesVotes = 68,
  initialNoVotes = 32,
}) => {
  const [yesVotes, setYesVotes] = useState(initialYesVotes);
  const [noVotes, setNoVotes] = useState(initialNoVotes);
  const [userVoted, setUserVoted] = useState<"yes" | "no" | null>(null);

  const total = yesVotes + noVotes;
  const yesPercent = Math.round((yesVotes / total) * 100);
  const noPercent = 100 - yesPercent;

  const handleVote = (option: "yes" | "no") => {
    if (userVoted === option) return;
    if (option === "yes") {
      setYesVotes((prev) => prev + 1);
      if (userVoted === "no") setNoVotes((prev) => prev - 1);
    } else {
      setNoVotes((prev) => prev + 1);
      if (userVoted === "yes") setYesVotes((prev) => prev - 1);
    }
    setUserVoted(option);
  };

  return (
    <div className="bg-[#201f1f] p-4 border border-[#454932] rounded-xl my-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[#d2f000] text-sm">
          poll
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-white">
          Encuesta en curso
        </span>
      </div>

      <p className="text-sm font-semibold mb-4 text-[#e5e2e1]">{question}</p>

      <div className="space-y-2">
        {/* YES option */}
        <div
          onClick={() => handleVote("yes")}
          className={`relative h-10 bg-[#1c1b1b] rounded-lg overflow-hidden cursor-pointer group border ${
            userVoted === "yes" ? "border-[#d2f000]" : "border-transparent"
          }`}
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#d2f000] transition-all duration-700"
            style={{ width: `${yesPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
            <span className="text-xs font-bold text-[#191e00]">SÍ, OBVIO</span>
            <span className="text-xs font-bold text-[#191e00]">
              {yesPercent}%
            </span>
          </div>
        </div>

        {/* NO option */}
        <div
          onClick={() => handleVote("no")}
          className={`relative h-10 bg-[#1c1b1b] rounded-lg overflow-hidden cursor-pointer group border ${
            userVoted === "no" ? "border-[#d2f000]" : "border-transparent"
          }`}
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#454932] transition-all duration-700"
            style={{ width: `${noPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
            <span className="text-xs font-bold text-[#e5e2e1]">
              NI DE CASUALIDAD
            </span>
            <span className="text-xs font-bold text-[#e5e2e1]">
              {noPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
