import { MessageCircle } from "lucide-react";

export const ChatDisabledMessage = ({ isFinished }: { isFinished: boolean }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-4 opacity-20" />
        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">
            {isFinished ? "El chat ha finalizado" : "El chat se habilitará con las formaciones"}
        </p>
    </div>
);