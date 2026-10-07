import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isCommandPaletteOpen: false,
  isConciergeOpen: false,

  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  openConcierge: () => set({ isConciergeOpen: true }),
  closeConcierge: () => set({ isConciergeOpen: false }),
  toggleConcierge: () => set((state) => ({ isConciergeOpen: !state.isConciergeOpen })),
}));
