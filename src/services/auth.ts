import axiosInstance from "~/libs/axiosInstance";

// Define types for signup and login payloads and responses
export interface SignupPayload {
  email: string;
  password: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    // Add other user fields as needed
  };
}

export const doSignup = async (data: SignupPayload): Promise<AuthResponse> => {
  try {
    const response = await axiosInstance.post<AuthResponse>("auth/signup", data);
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};

export const doLogin = async (data: LoginPayload): Promise<AuthResponse> => {
  try {
    const response = await axiosInstance.post<AuthResponse>("auth/login", data);
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};