// src/screens/FamilyProfilesScreen.tsx
// Hồ sơ gia đình - Premium GOLD only
// Layout: Profile Switcher (card ngang) + Detail panel bên dưới

import React, { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView, Platform, StatusBar
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { useFamilyProfileStore } from "@/store/familyProfileStore";
import {
    FamilyProfileResponse,
    FOOD_ALLERGY_OPTIONS, DIETARY_PREF_OPTIONS, TARGET_OPTIONS,
    CHILD_AGE_OPTIONS, SKIN_TYPE_OPTIONS, HEALTH_CONDITION_OPTIONS,
    COSMETIC_SENSITIVITY_OPTIONS, ALERT_LEVEL_OPTIONS, TRIMESTER_OPTIONS
} from "@/api/types";
import { COLORS } from "@/constants/colors";
import { useQuery } from "@tanstack/react-query";
import { getPreferences } from "@/api/users";

type Props = NativeStackScreenProps<RootStackParamList, "FamilyProfiles">;

// ─── Helpers ───────────────────────────────────────────────────────────────
const getLabel = (options: readonly { label: string; value: string }[], value: string): string =>
    options.find((o) => o.value === value)?.label ?? value;

const MAX_PROFILES = 3;

const RELATIONSHIP_MAP: Record<string, { label: string; emoji: string }> = {
    CON_CAI: { label: "Con cái", emoji: "👶" },
    VO_CHONG: { label: "Vợ/Chồng", emoji: "💑" },
    BO_ME: { label: "Bố/Mẹ", emoji: "👴" },
    SELF: { label: "Bản thân", emoji: "🧑" },
};

const PROFILE_AVATARS = ["🧑", "👶", "💑", "👴", "🌟", "🎯"];

// ─── Profile Switcher Card ─────────────────────────────────────────────────
function ProfileCard({
    profile,
    index,
    isSelected,
    onPress,
}: {
    profile: FamilyProfileResponse;
    index: number;
    isSelected: boolean;
    onPress: () => void;
}) {
    const rel = RELATIONSHIP_MAP[profile.relationship] ?? { label: profile.relationship, emoji: "🧑" };
    const avatar = PROFILE_AVATARS[index % PROFILE_AVATARS.length];
    const targets = profile.safetyProfile?.targets ?? [];
    const focusLabel = targets.length > 0
        ? getLabel(TARGET_OPTIONS, targets[0]).replace(/^[^\s]+ /, "").toUpperCase()
        : "CHUNG";

    return (
        <TouchableOpacity
            style={[styles.profileCard, isSelected && styles.profileCardActive]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            {isSelected && <View style={styles.profileCardGlow} />}
            <View style={[styles.avatarCircle, isSelected && styles.avatarCircleActive]}>
                <Text style={styles.avatarEmoji}>{avatar}</Text>
                {isSelected && <View style={styles.activeCheckDot}><Text style={styles.activeCheckText}>✓</Text></View>}
            </View>
            <Text style={[styles.profileCardName, isSelected && styles.profileCardNameActive]} numberOfLines={1}>
                {profile.name}
            </Text>
            <Text style={[styles.profileCardSub, isSelected && styles.profileCardSubActive]}>
                {rel.emoji} {rel.label}
            </Text>
            {targets.length > 0 && (
                <View style={[styles.focusBadge, isSelected && styles.focusBadgeActive]}>
                    <Text style={[styles.focusBadgeText, isSelected && styles.focusBadgeTextActive]}>
                        {focusLabel}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Empty Slot Card ───────────────────────────────────────────────────────
function EmptySlot({ onPress }: { onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.emptySlot} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.emptySlotPlus}>＋</Text>
            <Text style={styles.emptySlotLabel}>Trống</Text>
        </TouchableOpacity>
    );
}

// ─── Detail Section Row ────────────────────────────────────────────────────
function DetailRow({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailRowTitle}>{icon} {title}</Text>
            <View style={styles.detailRowContent}>{children}</View>
        </View>
    );
}

function TagChip({ label, color }: { label: string; color?: string }) {
    return (
        <View style={[styles.chip, { backgroundColor: color ?? COLORS.primaryLight }]}>
            <Text style={[styles.chipText, { color: color ? "#fff" : COLORS.primary }]}>{label}</Text>
        </View>
    );
}

function EmptyDetail({ text }: { text: string }) {
    return <Text style={styles.detailEmpty}>{text}</Text>;
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function FamilyProfilesScreen({ navigation }: Props) {
    const {
        profiles, isLoading: isStoreLoading,
        fetchProfiles, removeProfile
    } = useFamilyProfileStore();

    const { data: userPrefs } = useQuery({ queryKey: ["userPreferences"], queryFn: getPreferences });
    const tier = userPrefs?.subscriptionTier;
    const isGold = tier === "PREMIUM_GOLD";

    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (isGold) { fetchProfiles().catch(() => {}); }
    }, [isGold]);

    // Auto-select first profile when profiles load
    useEffect(() => {
        if (profiles.length > 0 && !selectedId) {
            setSelectedId(profiles[0].id);
        }
        // Clear selection if selected profile was deleted
        if (selectedId && !profiles.find(p => p.id === selectedId)) {
            setSelectedId(profiles[0]?.id ?? null);
        }
    }, [profiles]);

    const isAtLimit = profiles.length >= MAX_PROFILES;

    const openAdd = () => {
        if (isAtLimit) {
            Alert.alert(
                "Đã đủ hồ sơ",
                `Bạn chỉ có thể tạo tối đa ${MAX_PROFILES} hồ sơ gia đình. Hãy xóa một hồ sơ để thêm mới.`,
                [{ text: "Đã hiểu", style: "cancel" }]
            );
            return;
        }
        navigation.navigate("FamilyProfileForm");
    };

    const openEdit = (item: FamilyProfileResponse) => {
        navigation.navigate("FamilyProfileForm", { editingProfile: item });
    };

    const confirmDelete = (id: string, name: string) => {
        Alert.alert("Xóa hồ sơ", `Bạn có chắc muốn xóa hồ sơ của ${name}?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa", style: "destructive",
                onPress: () => removeProfile(id).catch(() => Alert.alert("Lỗi", "Không thể xóa"))
            }
        ]);
    };

    // Selected profile data
    const selectedProfile = profiles.find(p => p.id === selectedId) ?? null;
    const sp = selectedProfile?.safetyProfile ?? {};

    // ── Gate: not gold ───────────────────────────────────────────────────
    if (!isGold) {
        return (
            <View style={styles.gate}>
                <Text style={styles.gateIcon}>👑</Text>
                <Text style={styles.gateTitle}>Premium GOLD Required</Text>
                <Text style={styles.gateSub}>Tính năng Hồ sơ Gia đình chỉ dành cho thành viên Premium GOLD.</Text>
                <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate("Upgrade")}>
                    <Text style={styles.gateBtnText}>Nâng cấp ngay</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────
    if (isStoreLoading && profiles.length === 0) {
        return (
            <View style={styles.gate}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={[styles.gateSub, { marginTop: 12 }]}>Đang tải hồ sơ...</Text>
            </View>
        );
    }

    // ── Render slots: profiles + empty slots up to MAX ───────────────────
    const emptySlots = Math.max(0, MAX_PROFILES - profiles.length);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
                <TouchableOpacity style={styles.bellBtn}>
                    <Text style={styles.bellIcon}>🔔</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                stickyHeaderIndices={[0]}
            >
                {/* ── Profile Switcher Section (sticky) ── */}
                <View style={styles.switcherSection}>
                    <View style={styles.switcherHeader}>
                        <Text style={styles.switcherTitle}>Danh sách hồ sơ</Text>
                        <View style={styles.goldBadge}>
                            <Text style={styles.goldBadgeText}>✨ Premium Gold</Text>
                        </View>
                    </View>

                    {/* Profile cards row */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsRow}
                    >
                        {profiles.map((p, i) => (
                            <ProfileCard
                                key={p.id}
                                profile={p}
                                index={i}
                                isSelected={p.id === selectedId}
                                onPress={() => setSelectedId(p.id)}
                            />
                        ))}
                        {Array.from({ length: emptySlots }).map((_, i) => (
                            <EmptySlot key={`empty-${i}`} onPress={openAdd} />
                        ))}
                    </ScrollView>

                    {/* Add / Manage button */}
                    <TouchableOpacity
                        style={[styles.addBanner, isAtLimit && styles.addBannerFull]}
                        onPress={openAdd}
                        activeOpacity={0.8}
                    >
                        <View style={styles.addBannerLeft}>
                            <View style={styles.addBannerIcon}>
                                <Text style={styles.addBannerIconText}>
                                    {isAtLimit ? "👪" : "🧑‍🤝‍🧑"}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.addBannerTitle}>
                                    {isAtLimit ? "Quản lý hồ sơ" : "Thêm hồ sơ mới"}
                                </Text>
                                <Text style={styles.addBannerSub}>
                                    {isAtLimit
                                        ? `Đã đủ ${MAX_PROFILES}/${MAX_PROFILES} hồ sơ`
                                        : `Quản lý tối đa ${MAX_PROFILES} hồ sơ gia đình`}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.addBannerArrow}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Detail Panel ── */}
                {selectedProfile ? (
                    <View style={styles.detailSection}>
                        {/* Detail header */}
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailHeaderLabel}>
                                Cài đặt chi tiết:{" "}
                                <Text style={styles.detailHeaderName}>{selectedProfile.name}</Text>
                            </Text>
                            <View style={styles.detailActions}>
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => openEdit(selectedProfile)}
                                >
                                    <Text style={styles.editBtnText}>✏️ Sửa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => confirmDelete(selectedProfile.id, selectedProfile.name)}
                                >
                                    <Text style={styles.deleteBtnText}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Targets */}
                        <DetailRow icon="🎯" title="Đối tượng áp dụng">
                            {(sp.targets ?? []).length > 0 ? (
                                <View style={styles.chipRow}>
                                    {(sp.targets ?? []).map((t, i) => (
                                        <TagChip key={i} label={getLabel(TARGET_OPTIONS, t)} />
                                    ))}
                                </View>
                            ) : <EmptyDetail text="Chưa thiết lập" />}
                        </DetailRow>

                        {/* Child profile */}
                        {sp.childProfile && (
                            <DetailRow icon="👶" title="Hồ sơ Trẻ em">
                                <View style={styles.chipRow}>
                                    {sp.childProfile.ageGroup && (
                                        <TagChip
                                            label={`Nhóm tuổi: ${getLabel(CHILD_AGE_OPTIONS, sp.childProfile.ageGroup)}`}
                                            color={COLORS.primary}
                                        />
                                    )}
                                    {(sp.childProfile.allergies ?? []).map((a, i) => (
                                        <TagChip key={i} label={getLabel(FOOD_ALLERGY_OPTIONS, a)} color={COLORS.danger} />
                                    ))}
                                </View>
                            </DetailRow>
                        )}

                        {/* Pregnancy profile */}
                        {sp.pregnancyProfile?.trimester && (
                            <DetailRow icon="🤰" title="Thai kỳ">
                                <View style={styles.chipRow}>
                                    <TagChip label={getLabel(TRIMESTER_OPTIONS, sp.pregnancyProfile.trimester)} color="#E879F9" />
                                </View>
                            </DetailRow>
                        )}

                        {/* Food allergies */}
                        <DetailRow icon="⚠️" title="Dị ứng thực phẩm">
                            {(sp.foodAllergies ?? []).length > 0 || (sp.customFoodAllergies ?? []).length > 0 ? (
                                <View style={styles.chipRow}>
                                    {(sp.foodAllergies ?? []).map((a, i) => (
                                        <TagChip key={i} label={getLabel(FOOD_ALLERGY_OPTIONS, a)} color={COLORS.danger} />
                                    ))}
                                    {(sp.customFoodAllergies ?? []).map((a, i) => (
                                        <TagChip key={`c${i}`} label={a} color={COLORS.warning} />
                                    ))}
                                </View>
                            ) : <EmptyDetail text="Không có dị ứng" />}
                        </DetailRow>

                        {/* Cosmetic sensitivities */}
                        <DetailRow icon="💄" title="Nhạy cảm mỹ phẩm">
                            {(sp.cosmeticSensitivities ?? []).length > 0 ? (
                                <View style={styles.chipRow}>
                                    {(sp.cosmeticSensitivities ?? []).map((c, i) => (
                                        <TagChip key={i} label={getLabel(COSMETIC_SENSITIVITY_OPTIONS, c)} color="#A855F7" />
                                    ))}
                                </View>
                            ) : <EmptyDetail text="Không có" />}
                        </DetailRow>

                        {/* Skin type */}
                        {sp.skinType && (
                            <DetailRow icon="🧴" title="Loại da">
                                <View style={styles.chipRow}>
                                    <TagChip label={getLabel(SKIN_TYPE_OPTIONS, sp.skinType)} color="#0EA5E9" />
                                </View>
                            </DetailRow>
                        )}

                        {/* Health conditions */}
                        <DetailRow icon="🏥" title="Tình trạng sức khỏe">
                            {(sp.healthConditions ?? []).length > 0 ? (
                                <View style={styles.chipRow}>
                                    {(sp.healthConditions ?? []).map((h, i) => (
                                        <TagChip key={i} label={getLabel(HEALTH_CONDITION_OPTIONS, h)} color="#F97316" />
                                    ))}
                                </View>
                            ) : <EmptyDetail text="Không có vấn đề" />}
                        </DetailRow>

                        {/* Diet preferences */}
                        <DetailRow icon="🥗" title="Chế độ ăn">
                            {(sp.dietaryPreferences ?? []).length > 0 ? (
                                <View style={styles.chipRow}>
                                    {(sp.dietaryPreferences ?? []).map((d, i) => (
                                        <TagChip key={i} label={getLabel(DIETARY_PREF_OPTIONS, d)} color={COLORS.success} />
                                    ))}
                                </View>
                            ) : <EmptyDetail text="Không giới hạn" />}
                        </DetailRow>

                        {/* Alert level */}
                        {sp.alertLevel && (
                            <DetailRow icon="🔔" title="Mức cảnh báo">
                                <View style={styles.chipRow}>
                                    <TagChip label={getLabel(ALERT_LEVEL_OPTIONS, sp.alertLevel)} color={COLORS.warning} />
                                </View>
                            </DetailRow>
                        )}

                        <View style={styles.bottomPad} />
                    </View>
                ) : (
                    /* Empty state */
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>🧑‍👩‍👧</Text>
                        <Text style={styles.emptyStateTitle}>Chưa có hồ sơ nào</Text>
                        <Text style={styles.emptyStateSub}>Thêm hồ sơ đầu tiên để quản lý sức khỏe gia đình bạn.</Text>
                        <TouchableOpacity style={styles.emptyStateBtn} onPress={openAdd}>
                            <Text style={styles.emptyStateBtnText}>+ Thêm hồ sơ đầu tiên</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundAlt },

    // ── Gate ──
    gate: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: COLORS.background },
    gateIcon: { fontSize: 56, marginBottom: 16 },
    gateTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
    gateSub: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
    gateBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
    gateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },

    // ── Header ──
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 54 : 44, paddingBottom: 14,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundAlt, alignItems: "center", justifyContent: "center" },
    backIcon: { fontSize: 22, color: COLORS.text, fontWeight: "600", marginTop: -1 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
    bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundAlt, alignItems: "center", justifyContent: "center" },
    bellIcon: { fontSize: 17 },

    scroll: { flexGrow: 1 },

    // ── Switcher Section ──
    switcherSection: {
        backgroundColor: COLORS.white,
        paddingTop: 20, paddingBottom: 0,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
        zIndex: 10,
    },
    switcherHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, marginBottom: 16,
    },
    switcherTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    goldBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    goldBadgeText: { fontSize: 11, fontWeight: "700", color: "#92400E" },

    // ── Profile Cards Row ──
    cardsRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },

    profileCard: {
        width: 110, alignItems: "center", padding: 14,
        borderRadius: 20, borderWidth: 2, borderColor: COLORS.border,
        backgroundColor: COLORS.backgroundAlt,
    },
    profileCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
    profileCardGlow: {
        ...StyleSheet.absoluteFillObject, borderRadius: 18,
        backgroundColor: COLORS.primary, opacity: 0.05,
    },

    avatarCircle: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center",
        marginBottom: 8, position: "relative",
    },
    avatarCircleActive: { backgroundColor: COLORS.primary },
    avatarEmoji: { fontSize: 26 },
    activeCheckDot: {
        position: "absolute", bottom: -2, right: -2,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: COLORS.success,
        alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderColor: COLORS.white,
    },
    activeCheckText: { fontSize: 9, color: COLORS.white, fontWeight: "800" },

    profileCardName: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, textAlign: "center", marginBottom: 2 },
    profileCardNameActive: { color: COLORS.primary },
    profileCardSub: { fontSize: 10, color: COLORS.textMuted, textAlign: "center", marginBottom: 6 },
    profileCardSubActive: { color: COLORS.primaryDark },
    focusBadge: {
        backgroundColor: COLORS.border, paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 8, marginTop: 2,
    },
    focusBadgeActive: { backgroundColor: COLORS.primary },
    focusBadgeText: { fontSize: 9, fontWeight: "700", color: COLORS.textMuted },
    focusBadgeTextActive: { color: COLORS.white },

    // ── Empty Slot ──
    emptySlot: {
        width: 110, height: 118, alignItems: "center", justifyContent: "center",
        borderRadius: 20, borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed",
        backgroundColor: COLORS.backgroundAlt,
    },
    emptySlotPlus: { fontSize: 28, color: COLORS.textMuted, fontWeight: "300", marginBottom: 4 },
    emptySlotLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },

    // ── Add Banner ──
    addBanner: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        marginHorizontal: 16, marginTop: 16, marginBottom: 16,
        backgroundColor: COLORS.primary, borderRadius: 16, padding: 14,
    },
    addBannerFull: { backgroundColor: COLORS.textSecondary },
    addBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    addBannerIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
    },
    addBannerIconText: { fontSize: 20 },
    addBannerTitle: { fontSize: 14, fontWeight: "700", color: COLORS.white },
    addBannerSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 },
    addBannerArrow: { fontSize: 22, color: COLORS.white, fontWeight: "300" },

    // ── Detail Section ──
    detailSection: { paddingTop: 20, paddingHorizontal: 16 },
    detailHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
    },
    detailHeaderLabel: { fontSize: 15, fontWeight: "600", color: COLORS.textSecondary },
    detailHeaderName: { fontWeight: "800", color: COLORS.primary, fontStyle: "italic" },
    detailActions: { flexDirection: "row", gap: 8 },
    editBtn: {
        backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 10,
    },
    editBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
    deleteBtn: {
        backgroundColor: COLORS.dangerLight, paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 10,
    },
    deleteBtnText: { fontSize: 14 },

    // ── Detail Row ──
    detailRow: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
        marginBottom: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    detailRowTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
    detailRowContent: {},
    detailEmpty: { fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" },

    // ── Chips ──
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    chipText: { fontSize: 12, fontWeight: "600" },

    // ── Empty State ──
    emptyState: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingTop: 60, paddingHorizontal: 40,
    },
    emptyStateIcon: { fontSize: 56, marginBottom: 16 },
    emptyStateTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 8, textAlign: "center" },
    emptyStateSub: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
    emptyStateBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
    emptyStateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },

    bottomPad: { height: 40 },
});
