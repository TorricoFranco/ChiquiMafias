"use client";

import GoogleLoginButton from "./GoogleLoginButton";

export default function LoginModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#181818] p-6 rounded-xl w-[400px]">
        <h2 className="text-white text-xl mb-4">Iniciá sesión</h2>

        <GoogleLoginButton onSuccess={onClose} />

        <button
          onClick={onClose}
          className="mt-4 text-gray-400 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
