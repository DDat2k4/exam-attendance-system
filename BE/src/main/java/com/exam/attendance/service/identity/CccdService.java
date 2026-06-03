package com.exam.attendance.service;

import com.exam.attendance.data.entity.CitizenCard;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserProfile;
import com.exam.attendance.data.pojo.CCCDInfo;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.repository.CitizenCardRepository;
import com.exam.attendance.repository.UserProfileRepository;
import com.exam.attendance.service.ai.AiClientService;
import com.exam.attendance.service.uploads.FileUploadService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
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
    private static final double FACE_MATCH_THRESHOLD = 0.7;

    // Verify
    public void verifyCccd(CCCDInfo cccdInfo) {

        validateRequest(cccdInfo);

        User user = findUserByCitizenId(cccdInfo.getCitizenId());

        validateProfileMatch(cccdInfo, user);

        // Ảnh CCCD
        byte[] cccdImage = decodeBase64(cccdInfo.getFaceImage());

        // Ảnh webcam realtime
        byte[] webcamImage = decodeBase64(cccdInfo.getWebcamImage());

        // Verify webcam vs CCCD
        verifyRealtimeFace(cccdImage, webcamImage);

        // Extract embedding
        String newEmbedding = extractEmbedding(cccdImage);

        // Compare với embedding cũ
        verifyFace(user, newEmbedding);

        // Upload ảnh CCCD
        UploadResponse upload = uploadImage(cccdInfo, user);

        // Save DB
        saveCccd(user, cccdInfo, upload, newEmbedding);
    }

    // Validate
    private void validateRequest(CCCDInfo cccdInfo) {

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
            throw new RuntimeException("Thiếu ảnh CCCD");
        }

        if (cccdInfo.getWebcamImage() == null || cccdInfo.getWebcamImage().isBlank()) {
            throw new RuntimeException("Thiếu ảnh webcam");
        }

        log.info("Verify CCCD citizenId={}", cccdInfo.getCitizenId());
    }

    // Find user
    private User findUserByCitizenId(
            String citizenId
    ) {

        UserProfile profile =
                userProfileRepository
                        .findByCitizenId(citizenId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (profile.getUser() == null) {
            throw new RuntimeException("User không tồn tại");
        }

        return profile.getUser();
    }

    // Profile match
    private void validateProfileMatch(
            CCCDInfo cccdInfo,
            User user
    ) {

        UserProfile profile = user.getUserProfile();

        if (profile == null) {
            throw new RuntimeException("UserProfile không tồn tại");
        }

        // Check tên
        if (profile.getName() != null
                && !normalize(profile.getName())
                .equals(
                        normalize(cccdInfo.getFullName())
                )) {

            throw new RuntimeException("Tên CCCD không khớp");
        }

        // Check ngày sinh
        if (profile.getBirthDate() != null
                && !profile.getBirthDate()
                .equals(cccdInfo.getBirthDate())) {
            throw new RuntimeException("Ngày sinh không khớp");
        }
    }

    // Verify realtime
    private void verifyRealtimeFace(
            byte[] cccdImage,
            byte[] webcamImage
    ) {

        Map<String, Object> result =
                aiClientService.verifyFace(cccdImage, webcamImage);

        log.info("Realtime face verify: {}", result);

        if (result == null) {
            throw new RuntimeException("AI verify không phản hồi");
        }

        String status = String.valueOf(result.get("status"));

        if (!"SUCCESS".equalsIgnoreCase(status)) {
            String message = String.valueOf(result.get("message"));

            throw new RuntimeException("Xác thực khuôn mặt thất bại: " + message);
        }

        Object matched = result.get("matched");
        if (!(matched instanceof Boolean) || !((Boolean) matched)) {
            throw new RuntimeException("Khuôn mặt webcam không khớp CCCD");
        }
    }

    // ExtractEmbedding
    private String extractEmbedding(
            byte[] imageBytes
    ) {

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
            log.error("Convert embedding fail", e);
            throw new RuntimeException("Convert embedding lỗi");
        }
    }

    // VerifyFace
    private void verifyFace(
            User user,
            String newEmbeddingJson
    ) {

        CitizenCard card =
                citizenCardRepository
                        .findByUserId(user.getId())
                        .orElse(null);

        // lần đầu
        if (card == null || card.getFaceEmbedding() == null) {
            log.info("First verify userId={}", user.getId());
            return;
        }

        List<Double> oldEmbedding = parseEmbedding(card.getFaceEmbedding());
        List<Double> newEmbedding = parseEmbedding(newEmbeddingJson);
        double similarity = cosineSimilarity(oldEmbedding, newEmbedding);
        log.info("Face similarity={}", similarity);

        if (similarity < FACE_MATCH_THRESHOLD) {
            throw new RuntimeException("Khuôn mặt không khớp dữ liệu cũ");
        }
    }

    // Parse Embedding
    private List<Double> parseEmbedding(
            String json
    ) {

        try {
            return objectMapper.readValue(
                    json,
                    new TypeReference<List<Double>>() {}
            );

        } catch (Exception e) {
            log.error("Parse embedding fail", e);

            throw new RuntimeException("Embedding không hợp lệ");
        }
    }

    // Cosine
    private double cosineSimilarity(
            List<Double> a,
            List<Double> b
    ) {

        if (a == null || b == null || a.size() != b.size()) {
            return 0;
        }

        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.size(); i++) {
            dot += a.get(i) * b.get(i);
            normA += Math.pow(a.get(i), 2);
            normB += Math.pow(b.get(i), 2);
        }

        if (normA == 0 || normB == 0) {
            return 0;
        }

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Upload
    private UploadResponse uploadImage(
            CCCDInfo cccdInfo,
            User user
    ) {

        try {
            return fileUploadService
                    .uploadBase64Async(cccdInfo.getFaceImage(), user.getId())
                    .join();

        } catch (Exception e) {

            log.error("Upload ảnh lỗi", e);

            throw new RuntimeException("Upload ảnh thất bại");
        }
    }

    // Save
    @Transactional
    protected void saveCccd(
            User user,
            CCCDInfo cccdInfo,
            UploadResponse upload,
            String embedding
    ) {

        CitizenCard card =
                citizenCardRepository
                        .findByUserId(user.getId())
                        .orElseGet(() -> {
                            CitizenCard c = new CitizenCard();
                            c.setUser(user);
                            return c;
                        });

        // delete ảnh cũ
        if (card.getFaceImagePublicId() != null) {

            try {
                fileUploadService.deleteImage(card.getFaceImagePublicId()
                );

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

    // Base64
    private byte[] decodeBase64(
            String image
    ) {

        try {
            String[] parts = image.split(",");
            String base64 =
                    parts.length > 1
                            ? parts[1]
                            : parts[0];

            byte[] bytes = Base64.getDecoder().decode(base64);

            if (bytes.length > MAX_IMAGE_SIZE) {
                throw new RuntimeException("Ảnh > 2MB");
            }
            return bytes;
        } catch (Exception e) {
            throw new RuntimeException("Ảnh base64 không hợp lệ");
        }
    }

    // Normalize
    public static String normalize(
            String input
    ) {
        if (input == null) {
            return null;
        }

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