// src/api/familyProfile.ts

import { apiClient } from "./client";
import { CreateFamilyProfileRequest, FamilyProfileResponse } from "./types";

export const getFamilyProfiles = async (): Promise<FamilyProfileResponse[]> => {
    const { data } = await apiClient.get<FamilyProfileResponse[]>("/v1/users/me/family-profiles");
    return data;
};

export const createFamilyProfile = async (payload: CreateFamilyProfileRequest): Promise<FamilyProfileResponse> => {
    const { data } = await apiClient.post<FamilyProfileResponse>("/v1/users/me/family-profiles", payload);
    return data;
};

export const updateFamilyProfile = async (id: string, payload: CreateFamilyProfileRequest): Promise<FamilyProfileResponse> => {
    const { data } = await apiClient.put<FamilyProfileResponse>(`/v1/users/me/family-profiles/${id}`, payload);
    return data;
};

export const deleteFamilyProfile = async (id: string): Promise<void> => {
    await apiClient.delete(`/v1/users/me/family-profiles/${id}`);
};
