package com.dico.scan.service;

import com.dico.scan.entity.UserWallet;
import com.dico.scan.repository.UserWalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserWalletService {

    private final UserWalletRepository walletRepository;

    public UserWallet getWalletByUserId(UUID userId) {
        return walletRepository.findByUserId(userId)
                .orElseGet(() -> createEmptyWallet(userId));
    }

    private UserWallet createEmptyWallet(UUID userId) {
        UserWallet wallet = new UserWallet();
        wallet.setUserId(userId);
        wallet.setTokens(0);
        return walletRepository.save(wallet);
    }

    @Transactional
    public int rewardToken(UUID userId) {
        UserWallet wallet = getWalletByUserId(userId);
        wallet.setTokens(wallet.getTokens() + 1);
        walletRepository.save(wallet);
        log.info("User {} rewarded 1 token. New balance: {}", userId, wallet.getTokens());
        return wallet.getTokens();
    }

    @Transactional
    public boolean deductToken(UUID userId) {
        UserWallet wallet = getWalletByUserId(userId);
        if (wallet.getTokens() <= 0) {
            log.warn("User {} attempted to use token but balance is 0", userId);
            return false; // Not enough tokens
        }
        wallet.setTokens(wallet.getTokens() - 1);
        walletRepository.save(wallet);
        log.info("User {} deducted 1 token. New balance: {}", userId, wallet.getTokens());
        return true;
    }

    @Transactional
    public void updatePremiumExpiry(UUID userId, OffsetDateTime newExpiryDate) {
        UserWallet wallet = getWalletByUserId(userId);
        wallet.setPremiumExpiryDate(newExpiryDate);
        walletRepository.save(wallet);
    }
}
