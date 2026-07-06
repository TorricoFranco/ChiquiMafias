"use client";

import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function SubscriptionSuccessPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          ¡Ya sos Socio Oficial! 👑
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Tu pago fue procesado con éxito. Ya tenés habilitados tus beneficios en la tribuna en vivo.
        </p>

        <Link 
          href="/" 
          className="mt-8 w-full bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-wider py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
        >
          Volver a la Tribuna <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}