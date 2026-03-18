// src/screens/FamilyProfilesScreen.tsx

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { useFamilyProfileStore } from "@/store/familyProfileStore";
import { CreateFamilyProfileRequest } from "@/api/types";
import { COLORS } from "@/constants/colors";
import { useQuery } from "@tanstack/react-query";
import { getPreferences } from "@/api/users";

type Props = NativeStackScreenProps<RootStackParamList, "FamilyProfiles">;

export default function FamilyProfilesScreen({ navigation }: Props) {
    const { 
        profiles, isLoading: isStoreLoading, error, 
        fetchProfiles, addProfile, editProfile, removeProfile 
    } = useFamilyProfileStore();
    
    // Sử dụng chung cache userPreferences với PreferencesScreen để đảm bảo đồng bộ gói
    const { data: userPrefs, isLoading: isQueryLoading } = useQuery({
        queryKey: ["userPreferences"],
        queryFn: getPreferences,
    });
    const tier = userPrefs?.subscriptionTier;
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateFamilyProfileRequest>({
        name: "",
        relationship: "CON_CAI",
        allergies: [],
        diet: "NONE",
    });

    useEffect(() => {
        if (tier === "PREMIUM_GOLD") {
            fetchProfiles().catch(() => {});
        }
    }, [tier, fetchProfiles]);

    if (isQueryLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (tier !== "PREMIUM_GOLD") {
        return (
            <View style={styles.center}>
                <Text style={styles.emoji}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.title}>Hồ sợ gia đình (Gói Gold)</Text>
                <Text style={styles.description}>
                    Tính năng này chỉ dành cho tài khoản Premium Gold. Cho phép bạn phân tích sản phẩm dựa trên dị ứng, hồ sơ bệnh lý của từng thành viên trong gia đình.
                </Text>
                <TouchableOpacity 
                    style={styles.upgradeBtn}
                    onPress={() => navigation.navigate("Upgrade")}
                >
                    <Text style={styles.upgradeBtnText}>Nâng cấp Premium Gold</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập tên");
            return;
        }
        
        try {
            if (editingId) {
                await editProfile(editingId, formData);
            } else {
                await addProfile(formData);
            }
            setModalVisible(false);
            setEditingId(null);
            setFormData({ name: "", relationship: "CON_CAI", allergies: [], diet: "NONE" });
        } catch (err: any) {
            Alert.alert("Lỗi", err?.message || "Không thể lưu hồ sơ");
        }
    };

    const confirmDelete = (id: string, name: string) => {
        Alert.alert(
            "Xóa hồ sơ", 
            `Bạn có chắc muốn xóa hồ sơ của ${name}?`,
            [
                { text: "Hủy", style: "cancel" },
                { 
                    text: "Xóa", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await removeProfile(id);
                        } catch (e: any) {
                            Alert.alert("Lỗi", "Không thể xóa hồ sơ");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Quay lại</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ sơ gia đình</Text>
                <TouchableOpacity onPress={() => {
                    setEditingId(null);
                    setFormData({ name: "", relationship: "CON_CAI", allergies: [], diet: "NONE" });
                    setModalVisible(true);
                }}>
                    <Text style={styles.addText}>Thêm</Text>
                </TouchableOpacity>
            </View>

            {isStoreLoading && !isModalVisible ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : profiles.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Bạn chưa có hồ sơ nào.</Text>
                    <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.actionBtnText}>+ Thêm hồ sơ</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={profiles}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={({ item }) => (
                        <View style={styles.profileCard}>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{item.name}</Text>
                                <Text style={styles.profileRel}>{item.relationship}</Text>
                                {item.allergies && item.allergies.length > 0 && (
                                    <View style={styles.allergyChips}>
                                        {item.allergies.map(a => (
                                            <View key={a} style={styles.chip}>
                                                <Text style={styles.chipText}>{a}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => {
                                    setEditingId(item.id);
                                    setFormData({
                                        name: item.name,
                                        relationship: item.relationship,
                                        allergies: item.allergies || [],
                                        diet: item.diet || "NONE",
                                    });
                                    setModalVisible(true);
                                }}>
                                    <Text style={styles.editIcon}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}>
                                    <Text style={styles.deleteIcon}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* Modal Create/Edit */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingId ? "Sửa hồ sơ" : "Thêm hồ sơ"}</Text>
                        
                        <Text style={styles.label}>Tên / Biệt danh</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(t) => setFormData(f => ({ ...f, name: t }))}
                            placeholder="Vd: Bé Tom"
                        />
                        
                        <Text style={styles.label}>Mối quan hệ</Text>
                        <View style={styles.radios}>
                            {["CON_CAI", "VO_CHONG", "BO_ME"].map((rel) => (
                                <TouchableOpacity 
                                    key={rel} 
                                    style={[styles.radio, formData.relationship === rel && styles.radioActive]}
                                    onPress={() => setFormData(f => ({ ...f, relationship: rel }))}
                                >
                                    <Text style={[styles.radioText, formData.relationship === rel && styles.radioTextActive]}>
                                        {rel === "CON_CAI" ? "Con" : rel === "VO_CHONG" ? "Vợ/Chồng" : "Bố/Mẹ"}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Dị ứng (từ khóa, cách nhau bằng dấu phẩy)</Text>
                        <TextInput
                            style={styles.input}
                            value={(formData.allergies || []).join(", ")}
                            onChangeText={(t) => setFormData(f => ({ 
                                ...f, 
                                allergies: t.split(",").map(i => i.trim()).filter(i => i) 
                            }))}
                            placeholder="Vd: sữa, đậu phộng"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                                <Text style={styles.modalSaveText}>Lưu</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: COLORS.background },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 60, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
    backBtn: { padding: 4 },
    backBtnText: { color: COLORS.textMuted },
    addText: { color: COLORS.primary, fontWeight: "600", fontSize: 16 },
    
    emoji: { fontSize: 64, marginBottom: 16 },
    title: { fontSize: 24, fontWeight: "bold", color: COLORS.text, marginBottom: 12, textAlign: "center" },
    description: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", marginBottom: 32, lineHeight: 22 },
    upgradeBtn: { backgroundColor: "#FFC107", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 16, width: "100%", alignItems: "center" },
    upgradeBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
    cancelText: { color: COLORS.textMuted, fontSize: 15 },

    emptyText: { color: COLORS.textMuted, fontSize: 16, marginBottom: 16 },
    actionBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    actionBtnText: { color: COLORS.primary, fontWeight: "600" },

    profileCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: "bold", color: COLORS.text, marginBottom: 4 },
    profileRel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
    allergyChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { backgroundColor: COLORS.danger + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    chipText: { color: COLORS.danger, fontSize: 12, fontWeight: "500" },
    
    actions: { flexDirection: "row", gap: 16 },
    editIcon: { fontSize: 20 },
    deleteIcon: { fontSize: 20 },

    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.text, marginBottom: 20, textAlign: "center" },
    label: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text },
    
    radios: { flexDirection: "row", gap: 8 },
    radio: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
    radioActive: { backgroundColor: COLORS.primary + "20", borderColor: COLORS.primary },
    radioText: { color: COLORS.textMuted, fontWeight: "500" },
    radioTextActive: { color: COLORS.primary, fontWeight: "700" },

    modalActions: { flexDirection: "row", gap: 12, marginTop: 32, marginBottom: 20 },
    modalCancel: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: COLORS.surface },
    modalCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 16 },
    modalSave: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: COLORS.primary },
    modalSaveText: { color: COLORS.white, fontWeight: "600", fontSize: 16 },
});
