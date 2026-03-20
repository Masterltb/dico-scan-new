// src/utils/localFavorites.ts
// Local favorites store — lưu vào AsyncStorage
// Hoạt động độc lập với API backend, hỗ trợ cả DEMO barcodes lẫn sản phẩm thật
// khi user chưa đăng nhập hoặc backend không nhận được mock barcode.

import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "@dico_local_favorites_v1";

export interface LocalFavoriteItem {
    id: string;              // "local_{barcode}" — để phân biệt với server favorites
    barcode: string;
    label: "SAFE" | "AVOID";
    note: string | null;
    addedAt: string;         // ISO string
    // Snapshot từ product data (để hiển thị đẹp trong list)
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    rating: "GREEN" | "YELLOW" | "RED" | null;
    score: number | null;
    category: string | null;
    isLocal: true;           // Flag để FavoritesScreen biết đây là local item
}

// ── Read ────────────────────────────────────────────────────────────────────
export async function getLocalFavorites(): Promise<LocalFavoriteItem[]> {
    try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export async function getLocalFavoriteStatus(barcode: string): Promise<{
    isFavorited: boolean;
    label: "SAFE" | "AVOID" | "";
}> {
    const all = await getLocalFavorites();
    const found = all.find((f) => f.barcode === barcode);
    if (!found) return { isFavorited: false, label: "" };
    return { isFavorited: true, label: found.label };
}

// ── Write ───────────────────────────────────────────────────────────────────
export async function upsertLocalFavorite(
    barcode: string,
    label: "SAFE" | "AVOID",
    snapshot?: {
        name?: string | null;
        brand?: string | null;
        imageUrl?: string | null;
        rating?: "GREEN" | "YELLOW" | "RED" | null;
        score?: number | null;
        category?: string | null;
    }
): Promise<LocalFavoriteItem> {
    const existing = await getLocalFavorites();
    const now = new Date().toISOString();

    const item: LocalFavoriteItem = {
        id: `local_${barcode}`,
        barcode,
        label,
        note: null,
        addedAt: now,
        name: snapshot?.name ?? null,
        brand: snapshot?.brand ?? null,
        imageUrl: snapshot?.imageUrl ?? null,
        rating: snapshot?.rating ?? null,
        score: snapshot?.score ?? null,
        category: snapshot?.category ?? null,
        isLocal: true,
    };

    // Upsert: xóa entry cũ nếu có, prepend entry mới
    const filtered = existing.filter((f) => f.barcode !== barcode);
    const updated = [item, ...filtered];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return item;
}

// ── Delete ──────────────────────────────────────────────────────────────────
export async function removeLocalFavorite(barcode: string): Promise<void> {
    try {
        const existing = await getLocalFavorites();
        const updated = existing.filter((f) => f.barcode !== barcode);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {
        // ignore
    }
}

export async function clearLocalFavorites(): Promise<void> {
    try {
        await AsyncStorage.removeItem(FAVORITES_KEY);
    } catch {
        // ignore
    }
}
