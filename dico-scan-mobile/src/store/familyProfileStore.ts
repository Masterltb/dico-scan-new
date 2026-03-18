// src/store/familyProfileStore.ts

import { create } from "zustand";
import { getFamilyProfiles, createFamilyProfile, updateFamilyProfile, deleteFamilyProfile } from "../api/familyProfile";
import { FamilyProfileResponse, CreateFamilyProfileRequest } from "../api/types";

interface FamilyProfileState {
    profiles: FamilyProfileResponse[];
    isLoading: boolean;
    error: string | null;
    
    fetchProfiles: () => Promise<void>;
    addProfile: (payload: CreateFamilyProfileRequest) => Promise<void>;
    editProfile: (id: string, payload: CreateFamilyProfileRequest) => Promise<void>;
    removeProfile: (id: string) => Promise<void>;
}

export const useFamilyProfileStore = create<FamilyProfileState>((set, get) => ({
    profiles: [],
    isLoading: false,
    error: null,

    fetchProfiles: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await getFamilyProfiles();
            set({ profiles: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || "Failed to fetch profiles", isLoading: false });
        }
    },

    addProfile: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const newProfile = await createFamilyProfile(payload);
            set((state) => ({ 
                profiles: [...state.profiles, newProfile],
                isLoading: false 
            }));
        } catch (err: any) {
            set({ error: err.message || "Failed to create profile", isLoading: false });
            throw err;
        }
    },

    editProfile: async (id, payload) => {
        set({ isLoading: true, error: null });
        try {
            const updatedProfile = await updateFamilyProfile(id, payload);
            set((state) => ({
                profiles: state.profiles.map(p => p.id === id ? updatedProfile : p),
                isLoading: false
            }));
        } catch (err: any) {
            set({ error: err.message || "Failed to update profile", isLoading: false });
            throw err;
        }
    },

    removeProfile: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteFamilyProfile(id);
            set((state) => ({
                profiles: state.profiles.filter(p => p.id !== id),
                isLoading: false
            }));
        } catch (err: any) {
            set({ error: err.message || "Failed to delete profile", isLoading: false });
            throw err;
        }
    }
}));
