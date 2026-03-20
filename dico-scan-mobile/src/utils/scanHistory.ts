// src/utils/scanHistory.ts
// Local scan history — lưu vào AsyncStorage sau mỗi lần quét thành công
// Hoạt động độc lập với API backend, đảm bảo cả mock và sản phẩm thật đều được lưu
// Format: LIFO (newest first), max 100 entries, deduplicated by barcode

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProductEvaluationResponse } from "@/api/types";

const HISTORY_KEY = "@dico_scan_history_v2";
const MAX_ENTRIES = 100;

export interface LocalScanRecord {
    barcode: string;
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    rating: "GREEN" | "YELLOW" | "RED";
    score: number | null;
    category: string | null;
    scannedAt: string; // ISO string
}

// ── Read ────────────────────────────────────────────────────────────────────
export async function getLocalHistory(): Promise<LocalScanRecord[]> {
    try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// ── Write ───────────────────────────────────────────────────────────────────
/**
 * Ghi một lần quét thành công vào history.
 * Tự dedup theo barcode (xóa entry cũ hơn nếu trùng), giữ newest first.
 */
export async function recordScan(product: ProductEvaluationResponse): Promise<void> {
    try {
        const existing = await getLocalHistory();

        const record: LocalScanRecord = {
            barcode: product.barcode,
            name: product.name ?? null,
            brand: product.brand ?? null,
            imageUrl: product.imageUrl ?? null,
            rating: (["GREEN", "YELLOW", "RED"].includes(product.rating)
                ? product.rating
                : "YELLOW") as "GREEN" | "YELLOW" | "RED",
            score: product.score ?? null,
            category: product.category ?? null,
            scannedAt: new Date().toISOString(),
        };

        // Remove existing entry with same barcode (dedup), then prepend
        const filtered = existing.filter((r) => r.barcode !== product.barcode);
        const updated = [record, ...filtered].slice(0, MAX_ENTRIES);

        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
        // Non-fatal — silently ignore
    }
}

// ── Search ──────────────────────────────────────────────────────────────────
export async function searchLocalHistory(keyword: string): Promise<LocalScanRecord[]> {
    const history = await getLocalHistory();
    const lower = keyword.toLowerCase().trim();
    if (!lower) return history;
    return history.filter(
        (r) =>
            r.name?.toLowerCase().includes(lower) ||
            r.brand?.toLowerCase().includes(lower) ||
            r.barcode.toLowerCase().includes(lower)
    );
}

// ── Delete ──────────────────────────────────────────────────────────────────
export async function clearLocalHistory(): Promise<void> {
    try {
        await AsyncStorage.removeItem(HISTORY_KEY);
    } catch {
        // ignore
    }
}

export async function removeFromHistory(barcode: string): Promise<void> {
    try {
        const history = await getLocalHistory();
        const updated = history.filter((r) => r.barcode !== barcode);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
        // ignore
    }
}
