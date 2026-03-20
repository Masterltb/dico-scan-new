// src/screens/FamilyProfilesScreen.tsx
// Hồ sơ gia đình - Premium GOLD only
// Form siêu cuộn dài: câu hỏi rẽ nhánh đầy đủ từng thành viên

import React, { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { useFamilyProfileStore } from "@/store/familyProfileStore";
import {
    CreateFamilyProfileRequest, FamilyProfileResponse, SafetyProfileRequest,
    FOOD_ALLERGY_OPTIONS, DIETARY_PREF_OPTIONS, TARGET_OPTIONS,
    CHILD_AGE_OPTIONS, SKIN_TYPE_OPTIONS, HEALTH_CONDITION_OPTIONS,
    COSMETIC_SENSITIVITY_OPTIONS, ALERT_LEVEL_OPTIONS, SEVERITY_OPTIONS, TRIMESTER_OPTIONS
} from "@/api/types";
import { COLORS } from "@/constants/colors";
import { useQuery } from "@tanstack/react-query";
import { getPreferences } from "@/api/users";

type Props = NativeStackScreenProps<RootStackParamList, "FamilyProfiles">;

// Helper: look up label from options array
const getLabel = (options: readonly { label: string; value: string }[], value: string): string =>
    options.find((o) => o.value === value)?.label ?? value;

// Empty safety profile state
const emptyProfile = (): Partial<SafetyProfileRequest> => ({
    targets: [],
    foodAllergies: [],
    customFoodAllergies: [],
    cosmeticSensitivities: [],
    customCosmeticSensitivities: [],
    skinType: null,
    healthConditions: [],
    dietaryPreferences: [],
    alertLevel: null,
    allergySeverity: null,
    childProfile: null,
    pregnancyProfile: null,
});

export default function FamilyProfilesScreen({ navigation }: Props) {
    const {
        profiles, isLoading: isStoreLoading,
        fetchProfiles, addProfile, editProfile, removeProfile
    } = useFamilyProfileStore();

    const { data: userPrefs } = useQuery({ queryKey: ["userPreferences"], queryFn: getPreferences });
    const tier = userPrefs?.subscriptionTier;
    const isGold = tier === "PREMIUM_GOLD";

    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [relationship, setRelationship] = useState("CON_CAI");
    const [sp, setSp] = useState<Partial<SafetyProfileRequest>>(emptyProfile());
    const [customFoodInput, setCustomFoodInput] = useState("");
    const [customCosmeticInput, setCustomCosmeticInput] = useState("");

    useEffect(() => {
        if (isGold) { fetchProfiles().catch(() => {}); }
    }, [isGold]);

    const updateSp = (patch: Partial<SafetyProfileRequest>) => setSp(prev => ({ ...prev, ...patch }));

    const toggleArr = (arr: string[], val: string): string[] =>
        arr.includes(val) ? arr.filter(a => a !== val) : [...arr, val];

    const openAdd = () => {
        setEditingId(null); setName(""); setRelationship("CON_CAI");
        setSp(emptyProfile()); setCustomFoodInput(""); setCustomCosmeticInput("");
        setModalVisible(true);
    };

    const openEdit = (item: FamilyProfileResponse) => {
        setEditingId(item.id); setName(item.name); setRelationship(item.relationship);
        setSp({ ...emptyProfile(), ...item.safetyProfile });
        setCustomFoodInput((item.safetyProfile?.customFoodAllergies || []).join(", "));
        setCustomCosmeticInput((item.safetyProfile?.customCosmeticSensitivities || []).join(", "));
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert("Lỗi", "Vui lòng nhập tên"); return; }
        const finalSp: Partial<SafetyProfileRequest> = {
            ...sp,
            customFoodAllergies: customFoodInput.split(",").map(s => s.trim()).filter(Boolean),
            customCosmeticSensitivities: customCosmeticInput.split(",").map(s => s.trim()).filter(Boolean),
        };
        const payload: CreateFamilyProfileRequest = { name: name.trim(), relationship, safetyProfile: finalSp };
        try {
            if (editingId) await editProfile(editingId, payload);
            else await addProfile(payload);
            setModalVisible(false);
        } catch (err: any) {
            Alert.alert("Lỗi", err?.message || "Không thể lưu hồ sơ");
        }
    };

    const confirmDelete = (id: string, n: string) => {
        Alert.alert("Xóa hồ sơ", `Bạn có chắc muốn xóa hồ sơ của ${n}?`, [
            { text: "Hủy", style: "cancel" },
            { text: "Xóa", style: "destructive", onPress: () => removeProfile(id).catch(() => Alert.alert("Lỗi", "Không thể xóa")) }
        ]);
    };

    // === NOT GOLD: Gate ===
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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ sơ gia đình</Text>
                <TouchableOpacity onPress={openAdd}>
                    <Text style={[styles.addText, profiles.length >= 3 && styles.addTextDisabled]}>Thêm</Text>
                </TouchableOpacity>
            </View>

            {/* Profile List */}
            {isStoreLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : profiles.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Bạn chưa có hồ sơ nào.</Text>
                    <TouchableOpacity style={styles.actionBtn} onPress={openAdd}>
                        <Text style={styles.actionBtnText}>+ Thêm hồ sơ đầu tiên</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={profiles}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20, gap: 16 }}
                    renderItem={({ item }) => {
                        const sp = item.safetyProfile || {};
                        const allergyLabels = (sp.foodAllergies || []).map(a => getLabel(FOOD_ALLERGY_OPTIONS, a));
                        const dietLabels = (sp.dietaryPreferences || []).map(d => getLabel(DIETARY_PREF_OPTIONS, d));
                        const targetLabels = (sp.targets || []).map(t => getLabel(TARGET_OPTIONS, t));
                        const skinLabel = sp.skinType ? getLabel(SKIN_TYPE_OPTIONS, sp.skinType) : null;
                        return (
                            <View style={styles.profileCard}>
                                <View style={styles.profileTop}>
                                    <View>
                                        <Text style={styles.profileName}>{item.name}</Text>
                                        <Text style={styles.profileRel}>
                                            {item.relationship === "CON_CAI" ? "Con cái" : item.relationship === "VO_CHONG" ? "Vợ/Chồng" : "Bố/Mẹ"}
                                        </Text>
                                    </View>
                                    <View style={styles.actions}>
                                        <TouchableOpacity onPress={() => openEdit(item)}><Text style={styles.editIcon}>✏️</Text></TouchableOpacity>
                                        <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}><Text style={styles.deleteIcon}>🗑️</Text></TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.tagRow}>
                                    {targetLabels.map((t, i) => <View key={i} style={[styles.tag, styles.tagBlue]}><Text style={styles.tagText}>{t}</Text></View>)}
                                    {skinLabel && <View style={[styles.tag, styles.tagGreen]}><Text style={styles.tagText}>{skinLabel}</Text></View>}
                                    {allergyLabels.map((a, i) => <View key={i} style={[styles.tag, styles.tagRed]}><Text style={styles.tagText}>{a}</Text></View>)}
                                    {dietLabels.map((d, i) => <View key={i} style={[styles.tag, styles.tagPurple]}><Text style={styles.tagText}>{d}</Text></View>)}
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* Full-form Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingId ? "Sửa hồ sơ" : "Thêm hồ sơ"}</Text>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>

                            {/* ── Tên & Quan hệ ── */}
                            <SectionTitle title="👤 Thông tin cơ bản" />
                            <Text style={styles.label}>Tên / Biệt danh</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Vd: Bé Tom" placeholderTextColor={COLORS.textMuted} />
                            <Text style={styles.label}>Mối quan hệ</Text>
                            <View style={styles.chipRow}>
                                {[{ v: "CON_CAI", l: "👶 Con cái" }, { v: "VO_CHONG", l: "💑 Vợ/Chồng" }, { v: "BO_ME", l: "👴 Bố/Mẹ" }].map(rel => (
                                    <TouchableOpacity key={rel.v} style={[styles.chip, relationship === rel.v && styles.chipActive]} onPress={() => setRelationship(rel.v)}>
                                        <Text style={[styles.chipText, relationship === rel.v && styles.chipActiveText]}>{rel.l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* ── Đối tượng áp dụng ── */}
                            <SectionTitle title="🎯 Đối tượng áp dụng" />
                            <View style={styles.chipRow}>
                                {TARGET_OPTIONS.map(opt => {
                                    const active = (sp.targets || []).includes(opt.value);
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => updateSp({ targets: toggleArr(sp.targets || [], opt.value) })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ── Trẻ em ── (conditional) */}
                            {(sp.targets || []).includes("CHILD") && (
                                <>
                                    <SectionTitle title="👶 Thông tin trẻ em" />
                                    <Text style={styles.label}>Nhóm tuổi</Text>
                                    <View style={styles.chipRow}>
                                        {CHILD_AGE_OPTIONS.map(opt => {
                                            const active = sp.childProfile?.ageGroup === opt.value;
                                            return (
                                                <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                                    onPress={() => updateSp({ childProfile: { ...(sp.childProfile || { allergies: [], customAllergies: [], severityLevel: null }), ageGroup: opt.value } })}>
                                                    <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            )}

                            {/* ── Thai kỳ ── (conditional) */}
                            {(sp.targets || []).includes("PREGNANT") && (
                                <>
                                    <SectionTitle title="🤰 Thai kỳ" />
                                    <Text style={styles.label}>Giai đoạn</Text>
                                    <View style={styles.chipRow}>
                                        {TRIMESTER_OPTIONS.map(opt => {
                                            const active = sp.pregnancyProfile?.trimester === opt.value;
                                            return (
                                                <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                                    onPress={() => updateSp({ pregnancyProfile: { ...(sp.pregnancyProfile || { alertLevel: null }), trimester: opt.value } })}>
                                                    <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            )}

                            {/* ── Dị ứng thực phẩm ── */}
                            <SectionTitle title="⚠️ Dị ứng thực phẩm" />
                            <View style={styles.chipRow}>
                                {FOOD_ALLERGY_OPTIONS.map(opt => {
                                    const active = (sp.foodAllergies || []).includes(opt.value);
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipDanger]}
                                            onPress={() => updateSp({ foodAllergies: toggleArr(sp.foodAllergies || [], opt.value) })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <TextInput style={[styles.input, { marginTop: 12 }]} value={customFoodInput} onChangeText={setCustomFoodInput} placeholder="Dị ứng khác (cách nhau bằng dấu phẩy)" placeholderTextColor={COLORS.textMuted} />

                            {/* ── Loại da ── */}
                            <SectionTitle title="🧴 Loại da" />
                            <View style={styles.chipRow}>
                                {SKIN_TYPE_OPTIONS.map(opt => {
                                    const active = sp.skinType === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => updateSp({ skinType: active ? null : opt.value })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ── Mỹ phẩm ── */}
                            <SectionTitle title="💄 Nhạy cảm mỹ phẩm" />
                            <View style={styles.chipRow}>
                                {COSMETIC_SENSITIVITY_OPTIONS.map(opt => {
                                    const active = (sp.cosmeticSensitivities || []).includes(opt.value);
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipDanger]}
                                            onPress={() => updateSp({ cosmeticSensitivities: toggleArr(sp.cosmeticSensitivities || [], opt.value) })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <TextInput style={[styles.input, { marginTop: 12 }]} value={customCosmeticInput} onChangeText={setCustomCosmeticInput} placeholder="Thành phần khác cần tránh" placeholderTextColor={COLORS.textMuted} />

                            {/* ── Bệnh lý ── */}
                            <SectionTitle title="🏥 Tình trạng sức khỏe" />
                            <View style={styles.chipRow}>
                                {HEALTH_CONDITION_OPTIONS.map(opt => {
                                    const active = (sp.healthConditions || []).includes(opt.value);
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => updateSp({ healthConditions: toggleArr(sp.healthConditions || [], opt.value) })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ── Chế độ ăn ── */}
                            <SectionTitle title="🥗 Chế độ ăn" />
                            <View style={styles.chipRow}>
                                {DIETARY_PREF_OPTIONS.map(opt => {
                                    const active = (sp.dietaryPreferences || []).includes(opt.value);
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => updateSp({ dietaryPreferences: toggleArr(sp.dietaryPreferences || [], opt.value) })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ── Cấu hình cảnh báo ── */}
                            <SectionTitle title="🔔 Mức độ cảnh báo" />
                            <View style={styles.chipRow}>
                                {ALERT_LEVEL_OPTIONS.map(opt => {
                                    const active = sp.alertLevel === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => updateSp({ alertLevel: active ? null : opt.value })}>
                                            <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                        </ScrollView>

                        {/* Footer Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                                <Text style={styles.modalSaveText}>💾 Lưu hồ sơ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function SectionTitle({ title }: { title: string }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Gate
    gate: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: COLORS.background },
    gateIcon: { fontSize: 56, marginBottom: 16 },
    gateTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
    gateSub: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
    gateBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
    gateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },

    // Header
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    backBtn: { padding: 8 },
    backBtnText: { color: COLORS.primary, fontWeight: "600" },
    headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
    addText: { color: COLORS.primary, fontWeight: "700", fontSize: 16 },
    addTextDisabled: { color: COLORS.textMuted },

    // Empty / Loading
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
    emptyText: { fontSize: 16, color: COLORS.textMuted },
    actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    actionBtnText: { color: COLORS.white, fontWeight: "700" },

    // Profile card
    profileCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    profileTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    profileName: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
    profileRel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
    actions: { flexDirection: "row", gap: 12 },
    editIcon: { fontSize: 20 },
    deleteIcon: { fontSize: 20 },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    tagBlue: { backgroundColor: "#EEF2FF" },
    tagGreen: { backgroundColor: "#F0FDF4" },
    tagRed: { backgroundColor: "#FFF1F2" },
    tagPurple: { backgroundColor: "#FAF5FF" },
    tagText: { fontSize: 11, fontWeight: "600", color: COLORS.text },

    // Modal
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "92%", flex: 1 },
    modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 20, textAlign: "center" },

    sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginTop: 20, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 10 },

    label: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, marginBottom: 8 },
    input: { backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text, marginBottom: 4 },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#F8FAFC" },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipDanger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
    chipActiveText: { color: COLORS.white, fontWeight: "700" },

    modalActions: { flexDirection: "row", gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
    modalCancel: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 14, backgroundColor: "#F1F5F9" },
    modalCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
    modalSave: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 14, backgroundColor: COLORS.primary },
    modalSaveText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
});
