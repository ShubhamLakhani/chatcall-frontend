import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ModalState {
  isAuthModalOpen: boolean;
  authView: 'login' | 'signup';
}

const initialState: ModalState = {
  isAuthModalOpen: false,
  authView: 'login',
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openAuthModal(state, action: PayloadAction<'login' | 'signup'>) {
      state.isAuthModalOpen = true;
      state.authView = action.payload;
    },
    closeAuthModal(state) {
      state.isAuthModalOpen = false;
    },
  },
});

export const { openAuthModal, closeAuthModal } = modalSlice.actions;
export default modalSlice.reducer;
