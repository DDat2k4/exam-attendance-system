package com.exam.attendance.service;

import com.exam.attendance.data.entity.CitizenCard;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.pojo.CCCDInfo;
import com.exam.attendance.data.request.CccdVerifyRequest;
import com.exam.attendance.data.response.CheckinResponse;
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
    private final FileUploadService fileUploadService;
    private final AiClientService aiClientService;
    private final ObjectMapper objectMapper;
    private final UserProfileRepository userProfileRepository;
    private final UserService userService;

    private static final int MAX_IMAGE_SIZE = 2_000_000;

    @Transactional
    public void verifyCccd(CCCDInfo cccdInfo, User user) {
        try {
            validateRequest(cccdInfo, user);
            checkDuplicateCitizen(cccdInfo, user);

            byte[] imageBytes = decodeBase64(cccdInfo.getFaceImage());

            log.info("Calling AI extract embedding");
            String embedding = extractEmbedding(imageBytes);

            CitizenCard card = getOrCreateCard(user);

            deleteOldImage(card);

            UploadResponse upload = uploadImage(cccdInfo, user);

            saveCard(card, cccdInfo, upload, embedding);

            updateUserProfile(user, cccdInfo);

        } catch (Exception e) {
            log.error("CCCD Verify Error", e);
            throw new RuntimeException("Xác thực CCCD thất bại: " + e.getMessage());
        }
    }

    // Validate
    private void validateRequest(CCCDInfo cccdInfo, User user) {

        if (user == null) {
            throw new RuntimeException("User chưa đăng nhập");
        }


        if (cccdInfo.getCitizenId() == null || cccdInfo.getCitizenId().isEmpty()) {
            throw new RuntimeException("Thiếu citizenId");
        } else {
            String citizenId1 = user.getUserProfile().getCitizenId();
            String citizenId2 = cccdInfo.getCitizenId();

            String last9Id1 = citizenId1.substring(Math.max(0, citizenId1.length() - 9));

            if (!last9Id1.equals(citizenId2)) {
                throw new RuntimeException("CitizenId không khớp");
            }
        }

        if (cccdInfo.getFaceImage() == null || cccdInfo.getFaceImage().isEmpty()) {
            throw new RuntimeException("Thiếu ảnh khuôn mặt");
        }

        log.info("Verify CCCD userId={}", user.getId());
    }

    private void checkDuplicateCitizen(CCCDInfo cccdInfo, User user) {

        CitizenCard exist = citizenCardRepository
                .findByCitizenId(cccdInfo.getCitizenId())
                .orElse(null);

        if (exist != null && !exist.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("CCCD đã được dùng bởi tài khoản khác");
        }

        if (user.getUserProfile() != null &&
                user.getUserProfile().getName() != null &&
                cccdInfo.getFullName() != null) {

            if (cccdInfo.getFullName() == null || cccdInfo.getFullName().isEmpty()) {
                throw new RuntimeException("Thiếu tên");
            }

            String dbName = user.getUserProfile().getName();
            String cccdInfoName = cccdInfo.getFullName();

            if (!normalize(dbName).equals(normalize(cccdInfoName))) {
                throw new RuntimeException("Tên CCCD không khớp hồ sơ");
            }
        }
    }

    // Base64
    private byte[] decodeBase64(String image) {

        try {
            String base64 = extractBase64(image);
            byte[] bytes = Base64.getDecoder().decode(base64);

            if (bytes.length > MAX_IMAGE_SIZE) {
                throw new RuntimeException("Ảnh > 2MB");
            }

            return bytes;

        } catch (Exception e) {
            throw new RuntimeException("Ảnh base64 không hợp lệ");
        }
    }

    private String extractBase64(String data) {
        String[] parts = data.split(",");
        return parts.length > 1 ? parts[1] : parts[0];
    }

    private String extractEmbedding(byte[] imageBytes) {

        Map<String, Object> aiResult = aiClientService.extractEmbedding(imageBytes);

        log.info("AI response: {}", aiResult);

        if (aiResult == null) {
            throw new RuntimeException("AI không phản hồi");
        }

        String status = (String) aiResult.get("status");

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

    private CitizenCard getOrCreateCard(User user) {
        return citizenCardRepository
                .findByUserId(user.getId())
                .orElseGet(() -> {
                    CitizenCard c = new CitizenCard();
                    c.setUser(user);
                    return c;
                });
    }

    private void deleteOldImage(CitizenCard card) {

        if (card.getFaceImagePublicId() != null) {
            try {
                fileUploadService.deleteImage(card.getFaceImagePublicId());
            } catch (Exception e) {
                log.warn("Delete old image fail", e);
            }
        }
    }

    private UploadResponse uploadImage(CCCDInfo cccdInfo, User user) {
        return fileUploadService
                .uploadBase64Async(cccdInfo.getFaceImage(), user.getId())
                .join();
    }

    private void saveCard(CitizenCard card,
                          CCCDInfo cccdInfo,
                          UploadResponse upload,
                          String embedding) {

        card.setCitizenId(cccdInfo.getCitizenId());
        card.setFullName(cccdInfo.getFullName());
        card.setBirthDate(cccdInfo.getBirthDate());
        card.setExpiry(cccdInfo.getExpiry());
        card.setFaceImageUrl(upload.getUrl());
        card.setFaceImagePublicId(upload.getPublicId());
        card.setFaceEmbedding(embedding);
        citizenCardRepository.save(card);

        log.info("CCCD verified success userId={}", card.getUser().getId());
    }

    public static String normalize(String input) {
        if (input == null) return null;

        String text = Normalizer.normalize(input, Normalizer.Form.NFD);

        text = text
                // bỏ dấu tiếng Việt
                .replaceAll("\\p{M}", "")

                // chuẩn hóa chữ Đ
                .replace("Đ", "D")
                .replace("đ", "d")

                // OCR fixes phổ biến
                .replace("0", "O")
                .replace("1", "I")
                .replace("5", "S")
                .replace("8", "B")

                // chuẩn hóa khoảng trắng
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);

        return text;
    }

    private void updateUserProfile(User user, CCCDInfo cccdInfo) {

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

        log.info("Updated user profile verified userId={}", user.getId());
    }

    public Object processCheckin(CCCDInfo request) {

        // 1. Tìm user theo CCCD
        User user = userService.findByCitizenId(request.getCitizenId());


        // 2. Check đã verify chưa
        if (user.getUserProfile() == null ||
                !Boolean.TRUE.equals(user.getUserProfile().getIsVerified())) {
            throw new RuntimeException("Sinh viên chưa xác thực CCCD");
        }

        // 3. Lấy embedding đã lưu
        CitizenCard card = citizenCardRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Chưa có dữ liệu CCCD"));

        // 4. Extract embedding từ ảnh mới
        byte[] imageBytes = decodeBase64(request.getFaceImage());

        Map<String, Object> result = aiClientService.verifyFast(
                imageBytes,
                card.getFaceEmbedding()
        );

        if (result == null) {
            throw new RuntimeException("AI verify thất bại");
        }

        String status = (String) result.get("status");

        if (!"VERIFIED".equalsIgnoreCase(status)) {
            throw new RuntimeException("Khuôn mặt không khớp CCCD");
        }

        Double confidence = ((Number) result.get("confidence")).doubleValue();

        log.info("Face match success - confidence={}", confidence);

        // 6. TODO: check exam registration
        // examService.check(user, request.getRoomId());

        // 7. Lưu attendance
        // attendanceService.checkin(user);
        status = (String) result.get("status");
        confidence = ((Number) result.get("confidence")).doubleValue();

        boolean matched = "VERIFIED".equalsIgnoreCase(status);

        return new CheckinResponse(
                user.getId(),
                user.getUserProfile().getName(),
                user.getUserProfile().getCitizenId(),
                matched,
                confidence
        );
    }
}