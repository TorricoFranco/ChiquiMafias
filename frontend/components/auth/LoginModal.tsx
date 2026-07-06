"use client";
import { useState } from "react";
import GoogleLoginButton from "./GoogleLoginButton";
import OnboardingForm from "./OnBoardingForm";

export default function LoginModal({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void;
}) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleGoogleSuccess = (user: any) => {
    if (user.isFirstLogin) {
      setShowOnboarding(true);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#181818] p-8 rounded-2xl border border-[#2b2b2b] w-full max-w-md shadow-2xl🎴">
        {!showOnboarding ? (
          <>
            <h2 className="text-white text-xl mb-4 font-semibold">Iniciá sesión</h2>
            <GoogleLoginButton onSuccess={handleGoogleSuccess} />
            <button onClick={onClose} className="mt-4 text-gray-400 text-sm hover:text-white transition block w-full text-center">
              Cancelar
            </button>
          </>
        ) : (
          <OnboardingForm onComplete={onSuccess} />
        )}
      </div>
    </div>
  );
}