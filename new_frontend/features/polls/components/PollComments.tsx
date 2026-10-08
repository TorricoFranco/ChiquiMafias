import React, { useState } from "react";
import { Send, ThumbsUp, ThumbsDown, Crown } from "lucide-react"; 
import { usePollComments, useAddComment, useReactToComment } from "@/features/polls/hooks/usePolls";
import { formatTimeAgo } from "../utils/timeUtils";

export const PollComments = ({ pollId }: { pollId: string }) => {
    const [commentInput, setCommentInput] = useState("");

    const { data: commentsData } = usePollComments(pollId, 1, 20);
    const addCommentMutation = useAddComment(pollId);
    const { mutate: reactToComment } = useReactToComment(pollId);

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentInput.trim()) return;
        addCommentMutation.mutate({ text: commentInput }, {
            onSuccess: () => setCommentInput(""),
        });
    };

    const handleCommentReaction = (commentId: string, type: "LIKE" | "DISLIKE") => {
        reactToComment({ commentId, dto: { type } });
    };

    return (
        <div className="mt-3 pt-4 border-t border-[#353534]/40 flex flex-col gap-3">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#909378]">
                Comentarios de la tribuna ({commentsData?.meta.total || 0})
            </h4>

            {/* Contenedor de comentarios con Scrollbar personalizado */}
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-2 
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-[#353534] 
                [&::-webkit-scrollbar-thumb]:rounded-full 
                hover:[&::-webkit-scrollbar-thumb]:bg-[#454932] transition-colors"
            >
                {commentsData?.data?.length === 0 ? (
                    <p className="text-xs text-[#909378] italic text-center py-4">Sé el primero en opinar...</p>
                ) : (
                    commentsData?.data?.map((c) => (
                        <div
                            key={c.id}
                            className={`p-3 rounded-lg text-xs flex flex-col gap-1.5 transition-all ${c.isPremium
                                    ? 'bg-[#d2f000]/5 border border-[#d2f000]/20'
                                    : 'bg-[#1c1b1b]/50 border border-transparent hover:bg-[#1c1b1b]'
                                }`}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold ${c.isPremium ? 'text-[#d2f000]' : 'text-[#e5e2e1]'}`}>
                                        @{c.user.username}
                                    </span>
                                    {c.isPremium && (
                                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider bg-[#d2f000] text-[#191e00]">
                                            <Crown className="w-2.5 h-2.5" />
                                            PALCO VIP
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-[#767861] font-medium">{formatTimeAgo(c.createdAt)}</span>
                            </div>

                            <p className="text-[#c6c9ab] leading-relaxed mt-0.5">{c.text}</p>

                            <div className="flex justify-end gap-4 mt-1">
                                <button
                                    onClick={() => handleCommentReaction(c.id, "LIKE")}
                                    className={`flex items-center gap-1.5 transition-colors ${c.userReaction === 'LIKE' ? 'text-[#d2f000]' : 'text-[#767861] hover:text-[#d2f000]'}`}
                                >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-semibold">{c.likesCount || 0}</span>
                                </button>
                                <button
                                    onClick={() => handleCommentReaction(c.id, "DISLIKE")}
                                    className={`flex items-center gap-1.5 transition-colors ${c.userReaction === 'DISLIKE' ? 'text-red-400' : 'text-[#767861] hover:text-red-400'}`}
                                >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-semibold">{c.dislikesCount || 0}</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input de comentario */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-2">
                <input
                    type="text"
                    aria-label="Tu comentario"
                    placeholder="Dejá tu opinión..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    disabled={addCommentMutation.isPending}
                    className="flex-1 bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-4 py-2.5 rounded-xl outline-none disabled:opacity-50 transition-colors placeholder:text-[#767861]"
                />
                <button
                    type="submit"
                    aria-label="Enviar comentario"
                    disabled={!commentInput.trim() || addCommentMutation.isPending}
                    className="bg-[#d2f000] text-[#191e00] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#b8d300] disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};