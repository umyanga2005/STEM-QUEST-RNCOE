import { create } from 'zustand'

const useUiStore = create((set) => ({
  toast: null,
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
}))

export default useUiStore