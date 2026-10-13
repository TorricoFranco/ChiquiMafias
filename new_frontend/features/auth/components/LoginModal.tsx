"use client";
import { useState } from "react";
import { Coins, Flame, MessageCircle, Vote, X } from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton";
import OnboardingForm from "./OnboardingForm";

const BENEFITS = [
    { icon: MessageCircle, text: "Chateá con la hinchada mientras se juega" },
    { icon: Coins, text: "Apostá tus Chiqui Coins en los mercados abiertos" },
    { icon: Vote, text: "Votá las encuestas de la comunidad" },
    { icon: Flame, text: "Racha diaria: juntá Chiqui Coins entrando todos los días" },
];

export default function LoginModal({
    onClose,
    onSuccess
}: {
    onClose: () => void
    onSuccess: () => void;
}) {
    const [showOnboarding, setShowOnboarding] = useState(false);

    const handleGoogleSuccess = (user: { isFirstLogin?: boolean }) => {
        if (user.isFirstLogin) {
            setShowOnboarding(true);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={showOnboarding ? "Completá tu perfil" : "Iniciá sesión o registrate"}
                className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-[#353534] bg-[#131313] p-6 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-8"
            >
                {!showOnboarding ? (
                    <>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="absolute right-4 top-4 rounded-full p-2 text-[#909378] transition-colors hover:bg-[#2A2A2A] hover:text-[#E5E2E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>

                        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D2F000]">
                            <span className="live-pulse h-2 w-2 rounded-full bg-[#D2F000]" aria-hidden="true" />
                            La tribuna está abierta
                        </p>

                        <h2 className="mt-3 font-headline text-4xl font-black uppercase leading-[0.95] tracking-tight text-[#E5E2E1]">
                            No te quedes <span className="text-[#D2F000]">afuera</span>
                        </h2>
                        <p className="mt-3 text-sm text-[#C6C9AB]">
                            Entrá con Google y sumate a la conversación de la fecha.
                        </p>

                        <ul className="mt-6 space-y-3 border-l-2 border-[#D2F000]/40 pl-4">
                            {BENEFITS.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-start gap-3 text-sm text-[#E5E2E1]">
                                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D2F000]" aria-hidden="true" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6">
                            <GoogleLoginButton onSuccess={handleGoogleSuccess} />
                        </div>

                        <p className="mt-4 text-center text-xs text-[#909378]">
                            Si es tu primera vez, después elegís tu usuario y tu cuadro.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 block w-full rounded-lg py-2.5 text-sm font-semibold text-[#C6C9AB] transition-colors hover:text-[#E5E2E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
                        >
                            Ahora no
                        </button>
                    </>
                ) : (
                    <OnboardingForm onComplete={onSuccess} />
                )}
            </div>
        </div>
    );
}
