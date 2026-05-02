package com.exam.attendance.service;

import com.exam.attendance.data.entity.CitizenCard;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.pojo.CCCDInfo;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.repository.CitizenCardRepository;
import com.exam.attendance.repository.UserProfileRepository;
import com.exam.attendance.service.uploads.FileUploadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CccdService {

    private final CitizenCardRepository citizenCardRepository;
    private final UserProfileRepository userProfileRepository;
    private final FileUploadService fileUploadService;
    private final AiClientService aiClientService;
    private final ObjectMapper objectMapper;

    private static final int MAX_IMAGE_SIZE = 2_000_000;

    public void verifyCccd(CCCDInfo cccdInfo, User user) {

        validateRequest(cccdInfo, user);

        checkDuplicate(cccdInfo, user);

        byte[] imageBytes = decodeBase64(cccdInfo.getFaceImage());

        String embedding = extractEmbedding(imageBytes);

        UploadResponse upload = uploadImage(cccdInfo, user);

        saveCccd(user, cccdInfo, upload, embedding);
    }


    private void validateRequest(CCCDInfo cccdInfo, User user) {

        if (user == null) {
            throw new RuntimeException("User chưa đăng nhập");
        }

        if (cccdInfo == null) {
            throw new RuntimeException("Request rỗng");
        }

        if (cccdInfo.getCitizenId() == null || cccdInfo.getCitizenId().isBlank()) {
            throw new RuntimeException("Thiếu citizenId");
        }

        if (cccdInfo.getFullName() == null || cccdInfo.getFullName().isBlank()) {
            throw new RuntimeException("Thiếu họ tên");
        }

        if (cccdInfo.getBirthDate() == null) {
            throw new RuntimeException("Thiếu ngày sinh");
        }

        if (cccdInfo.getFaceImage() == null || cccdInfo.getFaceImage().isBlank()) {
            throw new RuntimeException("Thiếu ảnh khuôn mặt");
        }

        // match citizenId với profile nếu đã có
        if (user.getUserProfile() != null &&
                user.getUserProfile().getCitizenId() != null) {
                String citizenId1 = user.getUserProfile().getCitizenId();
                String citizenId2 = cccdInfo.getCitizenId();

                String last9Id1 = citizenId1.substring(Math.max(0,
                        citizenId1.length() - 9));

                if (!last9Id1.equals(citizenId2)) {
                    throw new RuntimeException("CitizenId không khớp");
                }
        }

        log.info("Verify CCCD userId={}", user.getId());
    }

    private void checkDuplicate(CCCDInfo cccdInfo, User user) {

        // check trong citizen_card
        CitizenCard existCard = citizenCardRepository
                .findByCitizenId(cccdInfo.getCitizenId())
                .orElse(null);

        if (existCard != null &&
                !existCard.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("CCCD đã được dùng bởi tài khoản khác");
        }

        // check trong user_profile
        UserProfile existProfile = userProfileRepository
                .findByCitizenId(cccdInfo.getCitizenId())
                .orElse(null);

        if (existProfile != null &&
                !existProfile.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("CCCD đã tồn tại trong hệ thống");
        }

        // check tên
        if (user.getUserProfile() != null &&
                user.getUserProfile().getName() != null) {

            String dbName = user.getUserProfile().getName();
            String inputName = cccdInfo.getFullName();

            if (!normalize(dbName).equals(normalize(inputName))) {
                throw new RuntimeException("Tên CCCD không khớp hồ sơ");
            }
        }
    }


    private String extractEmbedding(byte[] imageBytes) {

        Map<String, Object> aiResult = aiClientService.extractEmbedding(imageBytes);

        log.info("AI response: {}", aiResult);

        if (aiResult == null) {
            throw new RuntimeException("AI không phản hồi");
        }

        String status = String.valueOf(aiResult.get("status"));

        if (!"SUCCESS".equalsIgnoreCase(status)) {
            throw new RuntimeException("AI không extract được embedding");
        }

        Object embedding = aiResult.get("embedding");

        if (embedding == null) {
            throw new RuntimeException("Embedding null");
        }

        try {
            return objectMapper.writeValueAsString(embedding);
        } catch (Exception e) {
            throw new RuntimeException("Convert embedding lỗi");
        }
    }

    private UploadResponse uploadImage(CCCDInfo cccdInfo, User user) {

        try {
            return fileUploadService
                    .uploadBase64Async(cccdInfo.getFaceImage(), user.getId())
                    .join();
        } catch (Exception e) {
            log.error("Upload ảnh lỗi", e);
            throw new RuntimeException("Upload ảnh thất bại");
        }
    }


    @Transactional
    protected void saveCccd(User user,
                            CCCDInfo cccdInfo,
                            UploadResponse upload,
                            String embedding) {

        CitizenCard card = citizenCardRepository
                .findByUserId(user.getId())
                .orElseGet(() -> {
                    CitizenCard c = new CitizenCard();
                    c.setUser(user);
                    return c;
                });

        // delete ảnh cũ
        if (card.getFaceImagePublicId() != null) {
            try {
                fileUploadService.deleteImage(card.getFaceImagePublicId());
            } catch (Exception e) {
                log.warn("Delete old image fail", e);
            }
        }

        // save card
        card.setCitizenId(cccdInfo.getCitizenId());
        card.setFullName(cccdInfo.getFullName());
        card.setBirthDate(cccdInfo.getBirthDate());
        card.setExpiry(cccdInfo.getExpiry());
        card.setFaceImageUrl(upload.getUrl());
        card.setFaceImagePublicId(upload.getPublicId());
        card.setFaceEmbedding(embedding);

        citizenCardRepository.save(card);

        // update profile
        UserProfile profile = user.getUserProfile();

        if (profile == null) {
            throw new RuntimeException("UserProfile chưa tồn tại");
        }

        profile.setCitizenId(cccdInfo.getCitizenId());
        profile.setName(cccdInfo.getFullName());
        profile.setBirthDate(cccdInfo.getBirthDate());
        profile.setIsVerified(true);
        profile.setVerifiedAt(LocalDateTime.now());

        userProfileRepository.save(profile);

        log.info("CCCD verified success userId={}", user.getId());
    }

    private byte[] decodeBase64(String image) {

        try {
            String[] parts = image.split(",");
            String base64 = parts.length > 1 ? parts[1] : parts[0];

            byte[] bytes = Base64.getDecoder().decode(base64);

            if (bytes.length > MAX_IMAGE_SIZE) {
                throw new RuntimeException("Ảnh > 2MB");
            }

            return bytes;

        } catch (Exception e) {
            throw new RuntimeException("Ảnh base64 không hợp lệ");
        }
    }

    public static String normalize(String input) {

        if (input == null) return null;

        String text = Normalizer.normalize(input, Normalizer.Form.NFD);

        return text
                .replaceAll("\\p{M}", "")
                .replace("Đ", "D")
                .replace("đ", "d")
                .replace("0", "O")
                .replace("1", "I")
                .replace("5", "S")
                .replace("8", "B")
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }
}