import { create } from 'zustand';

export const useBookingDraftStore = create((set) => ({
  selectedRooms: [],
  checkInDate: '',
  checkOutDate: '',
  numberOfGuests: 1,
  adults: 1,
  children: 0,
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  specialRequests: '',
  paymentMethod: 'cash',

  setDates: (checkInDate, checkOutDate) => set({ checkInDate, checkOutDate }),
  
  toggleRoom: (room) => set((state) => {
    const exists = state.selectedRooms.some((r) => r._id === room._id);
    if (exists) {
      return { selectedRooms: state.selectedRooms.filter((r) => r._id !== room._id) };
    }
    return { selectedRooms: [...state.selectedRooms, room] };
  }),

  setGuests: (numberOfGuests) => set({ numberOfGuests }),
  setGuestDetails: (details) => set((state) => ({ ...state, ...details })),
  setSpecialRequests: (specialRequests) => set({ specialRequests }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  clearDraft: () => set({
    selectedRooms: [],
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    adults: 1,
    children: 0,
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    specialRequests: '',
    paymentMethod: 'cash',
  }),
}));
