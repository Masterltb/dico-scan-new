// src/screens/FamilyProfileFormScreen.tsx
// Dedicated screen for creating/editing a Family Profile
// Separated from FamilyProfilesScreen to avoid Modal overhead causing keyboard lag

import React, { useRef, useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { useFamilyProfileStore } from "@/store/familyProfileStore";
import {
    CreateFamilyProfileRequest, SafetyProfileRequest,
    FOOD_ALLERGY_OPTIONS, DIETARY_PREF_OPTIONS, TARGET_OPTIONS,
    CHILD_AGE_OPTIONS, SKIN_TYPE_OPTIONS, HEALTH_CONDITION_OPTIONS,
    COSMETIC_SENSITIVITY_OPTIONS, ALERT_LEVEL_OPTIONS, TRIMESTER_OPTIONS
} from "@/api/types";

type Props = NativeStackScreenProps<RootStackParamList, "FamilyProfileForm">;

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

const toggleArr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(a => a !== val) : [...arr, val];

function Section({ title }: { title: string }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ChipRow({ options, selected, onToggle, dangerActive = false }: {
    options: readonly { label: string; value: string }[];
    selected: string[];
    onToggle: (v: string) => void;
    dangerActive?: boolean;
}) {
    return (
        <View style={styles.chipRow}>
            {options.map(opt => {
                const active = selected.includes(opt.value);
                return (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.chip, active && (dangerActive ? styles.chipDanger : styles.chipActive)]}
                        onPress={() => onToggle(opt.value)}
                    >
                        <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function SingleSelect({ options, value, onChange }: {
    options: readonly { label: string; value: string }[];
    value: string | null;
    onChange: (v: string | null) => void;
}) {
    return (
        <View style={styles.chipRow}>
            {options.map(opt => {
                const active = value === opt.value;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => onChange(active ? null : opt.value)}
                    >
                        <Text style={[styles.chipText, active && styles.chipActiveText]}>{opt.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export default function FamilyProfileFormScreen({ navigation, route }: Props) {
    const { addProfile, editProfile, profiles } = useFamilyProfileStore();
    const { editingProfile } = route.params ?? {};

    // String refs for text fields - zero re-render on typing
    const nameRef = useRef<string>(editingProfile?.name ?? "");
    const customFoodRef = useRef<string>((editingProfile?.safetyProfile?.customFoodAllergies ?? []).join(", "));
    const customCosmeticRef = useRef<string>((editingProfile?.safetyProfile?.customCosmeticSensitivities ?? []).join(", "));

    const [relationship, setRelationship] = useState(editingProfile?.relationship ?? "CON_CAI");
    const [sp, setSp] = useState<Partial<SafetyProfileRequest>>({
        ...emptyProfile(),
        ...(editingProfile?.safetyProfile ?? {})
    });
    const [isSaving, setIsSaving] = useState(false);

    const updateSp = (patch: Partial<SafetyProfileRequest>) => setSp(prev => ({ ...prev, ...patch }));

    const handleSave = async () => {
        const nameVal = nameRef.current.trim();
        if (!nameVal) {
            Alert.alert("Lỗi", "Vui lòng nhập tên");
            return;
        }
        // Guard: chỉ kiểm tra khi tạo mới, không áp dụng khi edit
        if (!editingProfile?.id && profiles.length >= 3) {
            Alert.alert(
                "Đã đủ hồ sơ",
                "Bạn chỉ có thể tạo tối đa 3 hồ sơ gia đình.",
                [{ text: "Đã hiểu", style: "cancel" }]
            );
            return;
        }
        const finalSp: Partial<SafetyProfileRequest> = {
            ...sp,
            customFoodAllergies: customFoodRef.current.split(",").map(s => s.trim()).filter(Boolean),
            customCosmeticSensitivities: customCosmeticRef.current.split(",").map(s => s.trim()).filter(Boolean),
        };
        const payload: CreateFamilyProfileRequest = { name: nameVal, relationship, safetyProfile: finalSp };

        setIsSaving(true);
        try {
            if (editingProfile?.id) await editProfile(editingProfile.id, payload);
            else await addProfile(payload);
            navigation.goBack();
        } catch (err: any) {
            Alert.alert("Lỗi", err?.message || "Không thể lưu hồ sơ");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>✕ Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{editingProfile ? "Sửa hồ sơ" : "Thêm người thân"}</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isSaving}>
                    {isSaving
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Text style={styles.saveText}>💾 Lưu</Text>
                    }
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
            >
                {/* Basic Info */}
                <Section title="👤 Thông tin cơ bản" />
                <Text style={styles.label}>Tên / Biệt danh</Text>
                <TextInput
                    style={styles.input}
                    defaultValue={nameRef.current}
                    onChangeText={t => { nameRef.current = t; }}
                    placeholder="Vd: Bé Tom, Mẹ, Ba..."
                    placeholderTextColor={COLORS.textMuted}
                    returnKeyType="done"
                />
                <Text style={styles.label}>Mối quan hệ</Text>
                <View style={styles.chipRow}>
                    {[{ v: "CON_CAI", l: "👶 Con cái" }, { v: "VO_CHONG", l: "💑 Vợ/Chồng" }, { v: "BO_ME", l: "👴 Bố/Mẹ" }].map(rel => (
                        <TouchableOpacity key={rel.v} style={[styles.chip, relationship === rel.v && styles.chipActive]} onPress={() => setRelationship(rel.v)}>
                            <Text style={[styles.chipText, relationship === rel.v && styles.chipActiveText]}>{rel.l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Targets */}
                <Section title="🎯 Đối tượng áp dụng" />
                <ChipRow
                    options={TARGET_OPTIONS}
                    selected={sp.targets ?? []}
                    onToggle={v => updateSp({ targets: toggleArr(sp.targets ?? [], v) })}
                />

                {/* Child section - conditional */}
                {(sp.targets ?? []).includes("CHILD") && (
                    <>
                        <Section title="👶 Nhóm tuổi trẻ em" />
                        <SingleSelect
                            options={CHILD_AGE_OPTIONS}
                            value={sp.childProfile?.ageGroup ?? null}
                            onChange={v => updateSp({ childProfile: { ...(sp.childProfile ?? { allergies: [], customAllergies: [], severityLevel: null }), ageGroup: v } })}
                        />
                    </>
                )}

                {/* Pregnancy section - conditional */}
                {(sp.targets ?? []).includes("PREGNANT") && (
                    <>
                        <Section title="🤰 Giai đoạn thai kỳ" />
                        <SingleSelect
                            options={TRIMESTER_OPTIONS}
                            value={sp.pregnancyProfile?.trimester ?? null}
                            onChange={v => updateSp({ pregnancyProfile: { ...(sp.pregnancyProfile ?? { alertLevel: null }), trimester: v } })}
                        />
                    </>
                )}

                {/* Food allergies */}
                <Section title="⚠️ Dị ứng thực phẩm" />
                <ChipRow
                    options={FOOD_ALLERGY_OPTIONS}
                    selected={sp.foodAllergies ?? []}
                    onToggle={v => updateSp({ foodAllergies: toggleArr(sp.foodAllergies ?? [], v) })}
                    dangerActive
                />
                <TextInput
                    style={[styles.input, { marginTop: 12 }]}
                    defaultValue={customFoodRef.current}
                    onChangeText={t => { customFoodRef.current = t; }}
                    placeholder="Dị ứng khác (cách bằng dấu phẩy)"
                    placeholderTextColor={COLORS.textMuted}
                />

                {/* Skin type */}
                <Section title="🧴 Loại da" />
                <SingleSelect
                    options={SKIN_TYPE_OPTIONS}
                    value={sp.skinType ?? null}
                    onChange={v => updateSp({ skinType: v })}
                />

                {/* Cosmetic sensitivities */}
                <Section title="💄 Nhạy cảm mỹ phẩm" />
                <ChipRow
                    options={COSMETIC_SENSITIVITY_OPTIONS}
                    selected={sp.cosmeticSensitivities ?? []}
                    onToggle={v => updateSp({ cosmeticSensitivities: toggleArr(sp.cosmeticSensitivities ?? [], v) })}
                    dangerActive
                />
                <TextInput
                    style={[styles.input, { marginTop: 12 }]}
                    defaultValue={customCosmeticRef.current}
                    onChangeText={t => { customCosmeticRef.current = t; }}
                    placeholder="Thành phần khác cần tránh"
                    placeholderTextColor={COLORS.textMuted}
                />

                {/* Health conditions */}
                <Section title="🏥 Tình trạng sức khỏe" />
                <ChipRow
                    options={HEALTH_CONDITION_OPTIONS}
                    selected={sp.healthConditions ?? []}
                    onToggle={v => updateSp({ healthConditions: toggleArr(sp.healthConditions ?? [], v) })}
                />

                {/* Diet */}
                <Section title="🥗 Chế độ ăn" />
                <ChipRow
                    options={DIETARY_PREF_OPTIONS}
                    selected={sp.dietaryPreferences ?? []}
                    onToggle={v => updateSp({ dietaryPreferences: toggleArr(sp.dietaryPreferences ?? [], v) })}
                />

                {/* Alert level */}
                <Section title="🔔 Mức độ cảnh báo" />
                <SingleSelect
                    options={ALERT_LEVEL_OPTIONS}
                    value={sp.alertLevel ?? null}
                    onChange={v => updateSp({ alertLevel: v })}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border
    },
    backBtn: { padding: 6 },
    backText: { color: COLORS.danger, fontWeight: "600", fontSize: 14 },
    headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, minWidth: 70, alignItems: "center" },
    saveText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },

    content: { padding: 20, paddingBottom: 48 },

    sectionTitle: {
        fontSize: 15, fontWeight: "700", color: COLORS.text,
        marginTop: 24, marginBottom: 12,
        borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 10
    },
    label: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, marginBottom: 8 },
    input: {
        backgroundColor: "#F1F5F9", borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: COLORS.text, marginBottom: 4
    },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#F8FAFC"
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipDanger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
    chipActiveText: { color: COLORS.white, fontWeight: "700" },
});
