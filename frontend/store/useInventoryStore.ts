// src/store/useInventoryStore.ts
"use client";

import { create } from "zustand";
import { inventoryApi, InventoryItem, EquipableType } from "@/services/inventory";
import { storeApi } from "@/services/store";
import { pollsApi, ProposePollDto } from "@/services/polls"; 
import { useUserStore } from "./useUserStore";

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  fetchInventory: () => Promise<void>;
  buyStoreItem: (itemId: string, price: number) => Promise<void>;
  equipCosmetic: (itemId: string) => Promise<void>;
  unequipCosmetic: (type: EquipableType) => Promise<void>;
  consumeMegaphone: () => Promise<void>;
  proposeUserPoll: (dto: ProposePollDto) => Promise<void>; 
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,

  fetchInventory: async () => {
    set({ loading: true });
    try {
      const items = await inventoryApi.getUserInventory();
      set({ items });
    } catch (err) {
      console.error("Error al cargar inventario en Zustand", err);
    } finally {
      set({ loading: false });
    }
  },

  buyStoreItem: async (itemId: string, price: number) => {
    await storeApi.buyItem(itemId);
    const currentBalance = useUserStore.getState().balance;
    useUserStore.getState().setBalance(currentBalance - price);
    await get().fetchInventory();
  },

  equipCosmetic: async (itemId: string) => {
    await inventoryApi.equipItem(itemId);
    await get().fetchInventory();
  },

  unequipCosmetic: async (type: EquipableType) => {
    await inventoryApi.unequipItem(type);
    await get().fetchInventory();
  },

  consumeMegaphone: async () => {
    await inventoryApi.consumeItem('MEGAPHONE');
    await get().fetchInventory();
  },

  // Accionadora de la propuesta: Envía DTO y resincroniza inventario
  proposeUserPoll: async (dto: ProposePollDto) => {
    // 1. Le pega al servicio que centraliza la lógica y consume el backend
    await pollsApi.proposePoll(dto);

    // 2. Transacción de Backend exitosa -> Sincronizamos las unidades reales restantes localmente
    await get().fetchInventory();
  }
}));