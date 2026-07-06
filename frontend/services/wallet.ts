import { apiFetch } from "@/lib/apiFetch";

export const walletApi = {
  /**
   * Obtiene el saldo (en puntos/monedas) del usuario autenticado
   * POST /wallet/my-balance
   */
  getMyBalance: async (): Promise<number> => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/my-balance`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      // 🔒 No mandamos body porque el backend extrae el id directo del JWT
    });

    if (!res.ok) {
      throw new Error('Error al cargar el saldo de la billetera');
    }

    // Tu NestJS devuelve directamente el número: wallet.balance
    return res.json();
  },
};