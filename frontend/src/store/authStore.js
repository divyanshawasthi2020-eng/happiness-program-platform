import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:   null,
      teacher: null,

      login: async (name, code) => {
        const { data } = await api.post('/auth/login', { name, code });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ token: data.token, teacher: data.teacher });
        return data.teacher;
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        delete api.defaults.headers.common['Authorization'];
        set({ token: null, teacher: null });
      },

      updateTeacher: (updates) => set(s => ({ teacher: { ...s.teacher, ...updates } })),

      // Rehydrate axios header on app load
      init: () => {
        const token = get().token;
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
    }),
    {
      name: 'hp-auth',
      partialize: s => ({ token: s.token, teacher: s.teacher }),
    }
  )
);
