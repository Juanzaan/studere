import { StateCreator } from 'zustand';

export interface UiSlice {
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void; // For tests
  hideToast: () => void; // For tests
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  sidebarOpen: true,
  activeModal: null,
  toasts: [],
  toast: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  openModal: (modalId) => set({ activeModal: modalId }),
  
  closeModal: () => set({ activeModal: null }),
  
  addToast: (message, type) =>
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now().toString(), message, type }],
    })),
  
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showToast: (message, type) => set({ toast: { message, type } }),
  
  hideToast: () => set({ toast: null }),
});
