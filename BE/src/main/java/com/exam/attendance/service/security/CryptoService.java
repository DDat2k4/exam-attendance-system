package com.exam.attendance.service.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class CryptoService {

    @Value("${app.crypto.aes-key}")
    private String aesKey;

    @Value("${app.crypto.hmac-key}")
    private String hmacKey;

    private static final int GCM_TAG_LENGTH = 128;

    public boolean verifySignature(String data,
                                   String signature) {

        try {

            String expected = hmac(data);

            return expected.equals(signature);

        } catch (Exception e) {

            return false;
        }
    }

    public String decrypt(String encryptedData,
                          String ivText) {

        try {

            byte[] encrypted =
                    Base64.getDecoder()
                            .decode(encryptedData);

            byte[] iv =
                    Base64.getDecoder()
                            .decode(ivText);

            Cipher cipher =
                    Cipher.getInstance(
                            "AES/GCM/NoPadding"
                    );

            SecretKeySpec key =
                    new SecretKeySpec(
                            aesKey.getBytes(
                                    StandardCharsets.UTF_8
                            ),
                            "AES"
                    );

            GCMParameterSpec spec =
                    new GCMParameterSpec(
                            GCM_TAG_LENGTH,
                            iv
                    );

            cipher.init(
                    Cipher.DECRYPT_MODE,
                    key,
                    spec
            );

            byte[] decrypted =
                    cipher.doFinal(encrypted);

            return new String(
                    decrypted,
                    StandardCharsets.UTF_8
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Decrypt thất bại"
            );
        }
    }

    private String hmac(String data)
            throws Exception {

        Mac mac =
                Mac.getInstance("HmacSHA256");

        SecretKeySpec secretKey =
                new SecretKeySpec(
                        hmacKey.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        "HmacSHA256"
                );

        mac.init(secretKey);

        byte[] hash =
                mac.doFinal(
                        data.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        return Base64.getEncoder()
                .encodeToString(hash);
    }
}