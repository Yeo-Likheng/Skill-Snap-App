import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isCheckingAuth: true,
    
    checkAuth: async () => {
        try{
            const response = await axiosInstance.get("/auth/check");

            set({authUser: response.data});
        }catch(error){
            console.error("Error in checkAuth:", error);
            set({authUser: null});
        }finally{
            set({isCheckingAuth: false});
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try{
            const response = await axiosInstance.post("/auth/signup", data, {withCredentials: true});
            set({authUser: response.data});
            toast.success("Account created successfully");
        }catch(error){
            console.error("Error in signup:", error);
            toast.error(error.response.data.message);
        }finally{
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try{
            const response = await axiosInstance.post("/auth/login", data);
            set({authUser: response.data});
            toast.success("Logged in successfully");
        }catch(error){
            toast.error(error.response.data.message);
            set({ isLoggingIn: false });
        }finally{
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
       try{
            const response = await axiosInstance.post("/auth/logout");
            set({authUser: null});
            toast.success("Logged out successfully");
       }catch(error){
            toast.error(error.response.data.message);
       }
    }
    

}));