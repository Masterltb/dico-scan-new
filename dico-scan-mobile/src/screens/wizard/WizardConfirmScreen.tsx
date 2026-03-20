// src/screens/wizard/WizardConfirmScreen.tsx

import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS } from "@/constants/colors";
import { useSafetyProfileStore } from "@/store/safetyProfileStore";
import { saveSafetyProfile } from "@/api/safetyProfile";
import { WizardStackParamList } from "@/navigation/RootNavigator";
import {
    TARGET_OPTIONS,
    CHILD_AGE_OPTIONS,
    FOOD_ALLERGY_OPTIONS,
    COSMETIC_SENSITIVITY_OPTIONS,
    SKIN_TYPE_OPTIONS,
    HEALTH_CONDITION_OPTIONS,
    DIETARY_PREF_OPTIONS,
    ALERT_LEVEL_OPTIONS,
    SEVERITY_OPTIONS,
    TRIMESTER_OPTIONS,
} from "@/api/types";

type Props = NativeStackScreenProps<WizardStackParamList, "WizardConfirm">;

import { useQueryClient } from "@tanstack/react-query";

// Helper: look up label from options array
const getLabel = (options: readonly { label: string; value: string }[], value: string): string =>
    options.find((o) => o.value === value)?.label ?? value;

export default function WizardConfirmScreen({ navigation }: Props) {
    const store = useSafetyProfileStore();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = store.toRequest();
            await saveSafetyProfile(payload);
            
            // Xóa cache để màn Preferences tải lại dữ liệu mới nhất
            queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
            
            Alert.alert(
                "✅ Hoàn tất!",
                "Hồ sơ an toàn đã được lưu. AI sẽ sử dụng hồ sơ này khi phân tích sản phẩm cho bạn.",
                [
                    {
                        text: "Tuyệt vời!",
                        onPress: () => {
                            store.reset();
                            navigation.getParent()?.goBack();
                        },
                    },
                ]
            );
        } catch (err: unknown) {
            const message = (err as { message?: string })?.message ?? "Không thể lưu hồ sơ. Vui lòng thử lại.";
            Alert.alert("❌ Lỗi", message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <Text style={styles.title}>📋 Xác nhận hồ sơ</Text>
            <Text style={styles.subtitle}>Kiểm tra lại trước khi lưu</Text>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {/* Targets */}
                <SummarySection title="👤 Đối tượng">
                    {store.targets.map((t) => getLabel(TARGET_OPTIONS, t)).join(", ") || "Chưa chọn"}
                </SummarySection>

                {/* Child Profile */}
                {store.targets.includes("CHILD") && store.childProfile.ageGroup && (
                    <SummarySection title="👶 Trẻ em">
                        {`Nhóm tuổi: ${getLabel(CHILD_AGE_OPTIONS, store.childProfile.ageGroup)}`}
                        {store.childProfile.allergies.length > 0 &&
                            `\nDị ứng: ${store.childProfile.allergies.map((a) => getLabel(FOOD_ALLERGY_OPTIONS, a)).join(", ")}`}
                        {store.childProfile.customAllergies.length > 0 &&
                            `\nDị ứng khác: ${store.childProfile.customAllergies.join(", ")}`}
                        {store.childProfile.severityLevel &&
                            `\nMức độ: ${getLabel(SEVERITY_OPTIONS, store.childProfile.severityLevel)}`}
                    </SummarySection>
                )}

                {/* Pregnancy */}
                {store.targets.includes("PREGNANT") && store.pregnancyProfile.trimester && (
                    <SummarySection title="🤰 Thai kỳ">
                        {`Giai đoạn: ${getLabel(TRIMESTER_OPTIONS, store.pregnancyProfile.trimester)}`}
                        {store.pregnancyProfile.alertLevel &&
                            `\nMức báo: ${getLabel(ALERT_LEVEL_OPTIONS, store.pregnancyProfile.alertLevel)}`}
                    </SummarySection>
                )}

                {/* Food Allergies */}
                {(store.foodAllergies.length > 0 || store.customFoodAllergies.length > 0) && (
                    <SummarySection title="⚠️ Dị ứng thực phẩm">
                        {[
                            ...store.foodAllergies.map((a) => getLabel(FOOD_ALLERGY_OPTIONS, a)),
                            ...store.customFoodAllergies,
                        ].join(", ")}
                    </SummarySection>
                )}

                {/* Cosmetic */}
                {(store.cosmeticSensitivities.length > 0 || store.customCosmeticSensitivities.length > 0) && (
                    <SummarySection title="💄 Nhạy cảm mỹ phẩm">
                        {[
                            ...store.cosmeticSensitivities.map((c) => getLabel(COSMETIC_SENSITIVITY_OPTIONS, c)),
                            ...store.customCosmeticSensitivities,
                        ].join(", ")}
                    </SummarySection>
                )}

                {/* Skin Type */}
                {store.skinType && (
                    <SummarySection title="🧴 Loại da">
                        {getLabel(SKIN_TYPE_OPTIONS, store.skinType)}
                    </SummarySection>
                )}

                {/* Health */}
                {store.healthConditions.length > 0 && (
                    <SummarySection title="🏥 Sức khỏe">
                        {store.healthConditions.map((h) => getLabel(HEALTH_CONDITION_OPTIONS, h)).join(", ")}
                    </SummarySection>
                )}

                {/* Diet */}
                {store.dietaryPreferences.length > 0 && (
                    <SummarySection title="🥗 Chế độ ăn">
                        {store.dietaryPreferences.map((d) => getLabel(DIETARY_PREF_OPTIONS, d)).join(", ")}
                    </SummarySection>
                )}

                {/* Alert & Severity */}
                {(store.alertLevel || store.allergySeverity) && (
                    <SummarySection title="🔔 Cảnh báo">
                        {store.alertLevel && `Mức cảnh báo: ${getLabel(ALERT_LEVEL_OPTIONS, store.alertLevel)}`}
                        {store.allergySeverity && `\nMức dị ứng: ${getLabel(SEVERITY_OPTIONS, store.allergySeverity)}`}
                    </SummarySection>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.popToTop()}>
                    <Text style={styles.editBtnText}>✏️ Chỉnh sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>🛡️ Lưu hồ sơ</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={sectionStyles.card}>
            <Text style={sectionStyles.title}>{title}</Text>
            <Text style={sectionStyles.content}>{children}</Text>
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 10 },
    title: { color: COLORS.primary, fontSize: 14, fontWeight: "700", marginBottom: 6 },
    content: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
    title: { color: COLORS.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
    subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16 },
    scrollArea: { flex: 1 },
    footer: { flexDirection: "row", gap: 12, paddingTop: 12 },
    editBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: "center" },
    editBtnText: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600" },
    saveBtn: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: COLORS.success, alignItems: "center" },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
