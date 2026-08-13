import { GetResult } from '@fingerprintjs/fingerprintjs';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    coins?: number;
    streakCount?: number;
    friends?: string[];
    friendRequests?: string[];
  } | null;
  deviceInfo: GetResult | null; // Storing the fingerprint in the state
}

const initialState: AuthState = {
  token: null,
  user: null,
  deviceInfo: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ token: string; user: AuthState['user'] }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout(state) {
      state.token = null;
      state.user = null;
    },
    setDevice(state, action: PayloadAction<GetResult | null>) {
      state.deviceInfo = action.payload;
    },
    updateRewards(state, action: PayloadAction<{ coins: number; streakCount: number }>) {
      if (state.user) {
        state.user.coins = action.payload.coins;
        state.user.streakCount = action.payload.streakCount;
      }
    },
  },
});

export const { loginSuccess, logout, setDevice, updateRewards } = authSlice.actions;
export default authSlice.reducer;
