"use client";

import { useMyTickets } from "@/hook/react-query/useSupport";
import Link from "next/link";
import { PlusCircle, MessageSquare } from "lucide-react";

export default function UserSupportPage() {
  const { data: tickets, isLoading } = useMyTickets();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Tickets de Soporte</h1>
          <p className="text-sm text-gray-400">Acá podés ver el estado de tus reclamos y apelaciones.</p>
        </div>
        
        {/* Link para abrir un ticket nuevo (te lo dejo como ruta, podés hacer un modal también) */}
        <Link 
          href="/support/new" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Nuevo Ticket
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400">Cargando tus tickets...</div>
      ) : (
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
          {tickets?.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No tenés ningún ticket abierto.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tickets?.map((ticket: any) => (
                <Link 
                  href={`/support/${ticket.id}`} 
                  key={ticket.id}
                  className="flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
                >
                  <div>
                    <h3 className="text-gray-200 font-semibold">{ticket.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Creado el {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2.5 py-1 rounded-md">
                      {ticket.category}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      ticket.status === 'OPEN' ? 'bg-green-500/10 text-green-400' :
                      ticket.status === 'RESOLVED' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}