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
  // Estado para saber si mostrar Google o el Formulario
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleGoogleSuccess = (user: any) => {
    if (user.isFirstLogin) {
      setShowOnboarding(true); // Si es nuevo, mostramos el form
    } else {
      onSuccess()
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#181818] p-6 rounded-xl w-[400px]">
        
        {!showOnboarding ? (
          <>
            <h2 className="text-white text-xl mb-4">Iniciá sesión</h2>
            <GoogleLoginButton onSuccess={handleGoogleSuccess} />
            <button onClick={onClose} className="mt-4 text-gray-400 text-sm">
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
