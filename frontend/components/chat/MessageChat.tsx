"use client";

import React from "react";

interface ChatMessageProps {
  avatar: string;
  user: string;
  time: string;
  message: string;
}

export default function ChatMessage({ avatar, user, time, message }: ChatMessageProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-base border-2 border-sky-400/50">
        {avatar}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <span className="text-sm font-semibold text-white">{user}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>

        <div className="mt-0.5 text-sm text-gray-300 bg-[#2b2b2b] p-3 rounded-2xl rounded-tl-none inline-block max-w-full break-words shadow-md">
          {message}
        </div>
      </div>
    </div>
  );
}
