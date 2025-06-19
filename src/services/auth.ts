import axiosInstance from "~/libs/axiosInstance";

export const doSignup = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post("auth/signup", data);
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error; // Rethrow the error so the component can handle it
  }
};

export const doLogin = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post("auth/login", data);
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error; // Rethrow the error so the component can handle it
  }
};
