// src/components/TokenBalanceHeader.tsx

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { COLORS } from '../constants/colors';

interface TokenBalanceHeaderProps {
    onPressAddToken?: () => void;
}

export const TokenBalanceHeader: React.FC<TokenBalanceHeaderProps> = ({ onPressAddToken }) => {
    const { tokens, tier, isLoading, fetchStatus } = useSubscriptionStore();

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (tier === 'PREMIUM' || tier === 'PREMIUM_GOLD') {
        return (
            <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>💎 {tier}</Text>
            </View>
        );
    }

    return (
        <TouchableOpacity 
            onPress={onPressAddToken}
            style={styles.tokenBadge}
            activeOpacity={0.8}
        >
            <Text style={styles.icon}>🪙</Text>
            {isLoading ? (
                <ActivityIndicator size="small" color="#ca8a04" />
            ) : (
                <Text style={styles.tokenText}>{tokens} Xu</Text>
            )}
            <View style={styles.addBtn}>
                <Text style={styles.addText}>+</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    premiumBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#EEF2FF', // indigo-50
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    premiumText: {
        color: '#4338CA', // indigo-700
        fontWeight: 'bold',
    },
    tokenBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FEFCE8', // yellow-50
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF08A', // yellow-200
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    icon: {
        fontSize: 16,
        marginRight: 8,
    },
    tokenText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#A16207', // yellow-700
    },
    addBtn: {
        marginLeft: 8,
        backgroundColor: '#EAB308', // yellow-500
        borderRadius: 12,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
