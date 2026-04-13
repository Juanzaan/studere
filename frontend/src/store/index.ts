import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createSessionsSlice, SessionsSlice } from './slices/sessions-slice';
import { createUiSlice, UiSlice } from './slices/ui-slice';

export type StoreState = SessionsSlice & UiSlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createSessionsSlice(...a),
        ...createUiSlice(...a),
      }),
      {
        name: 'studere-store',
        partialize: (state) => ({
          // Only persist sessions, not UI state
          sessions: state.sessions,
        }),
      }
    ),
    { name: 'Studere Store' }
  )
);
