package com.exam.attendance.service.attendance;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.CitizenCard;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.enums.AttendanceStatus;
import com.exam.attendance.data.enums.ExamSessionStatus;
import com.exam.attendance.data.request.CheckinRequest;
import com.exam.attendance.repository.AttendanceSessionRepository;
import com.exam.attendance.repository.CitizenCardRepository;
import com.exam.attendance.repository.ExamSessionRepository;
import com.exam.attendance.service.exam.ExamSessionStateService;
import com.exam.attendance.service.ai.AiClientService;
import com.exam.attendance.service.uploads.FileUploadService;
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
public class AttendanceCheckinService {

    private final ExamSessionRepository examSessionRepo;
    private final AttendanceSessionRepository attendanceRepo;
    private final CitizenCardRepository citizenCardRepo;
    private final AiClientService aiClientService;
    private final FileUploadService fileUploadService;
    private final ExamSessionStateService examSessionStateService;
    private final AttendanceLogService logService;
    private final ObjectMapper objectMapper;
    private static final double MIN_CONFIDENCE = 0.7;
    private static final double FACE_MATCH_THRESHOLD = 0.7;

    // =========================================================
    // OFFLINE CHECKIN
    // =========================================================
    @Transactional
    public AttendanceSession checkin(
            CheckinRequest req
    ) {
        validateRequest(req);

        CitizenCard card =
                citizenCardRepo
                        .findByCitizenId(req.getCitizenId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy CCCD"));
        validateCccdInfo(req, card);

        ExamSession session =
                examSessionRepo
                        .findByCheckinInfo(
                                req.getSemester(),
                                req.getExamCode(),
                                req.getRoomCode(),
                                req.getCitizenId()
                        )
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy ca thi phù hợp"));

        if (session.getStatus()
                == ExamSessionStatus.CHECKED_IN
                || session.getStatus()
                == ExamSessionStatus.IN_PROGRESS
                || session.getStatus()
                == ExamSessionStatus.DONE) {

            throw new RuntimeException("Thí sinh đã điểm danh");
        }

        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Phiên thi đã bị khóa");
        }

        byte[] webcamBytes = decodeBase64(req.getWebcamImage());
        byte[] cccdBytes = decodeBase64(req.getFaceImage());
        verifyRealtimeFace(cccdBytes, webcamBytes);
        String webcamEmbedding = extractEmbedding(webcamBytes);
        verifyFaceEmbedding(card, webcamEmbedding);

        Map<String, Object> result =
                aiClientService.verifyFast(webcamBytes, card.getFaceEmbedding());

        if (result == null) {
            throw new RuntimeException("AI không phản hồi");
        }

        String status = String.valueOf(result.get("status"));
        double confidence = extractConfidence(result);
        boolean passed = "SUCCESS".equalsIgnoreCase(status) && confidence >= MIN_CONFIDENCE;
        String webcamUrl = uploadImage(req.getWebcamImage(), card.getUser().getId());
        String cccdUrl = uploadImage(req.getFaceImage(), card.getUser().getId());
        AttendanceSession attendance =
                attendanceRepo
                        .findByExamSessionId(session.getId())
                        .orElseGet(AttendanceSession::new);

        attendance.setExamSession(session);
        attendance.setCheckinTime(LocalDateTime.now());
        attendance.setAttendancePhoto(webcamUrl);
        attendance.setCccdPhoto(cccdUrl);
        attendance.setConfidence(confidence);
        attendance.setVerifiedAt(LocalDateTime.now());

        if (passed) {
            attendance.setStatus(AttendanceStatus.VERIFIED);

            attendance.setReviewNote("Offline checkin verified");
            // chỉ điểm danh thành công
            // CHƯA vào thi
            examSessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.CHECKED_IN,
                    "Điểm danh thành công, vui lòng xác minh khuôn mặt"
            );

            session.setIsFlagged(false);
            session.setLastSeenAt(LocalDateTime.now());

            examSessionRepo.save(session);
            logService.log(
                    "CHECKIN_SUCCESS",
                    "Điểm danh thành công",
                    "CHECKIN",
                    "SUCCESS",
                    session
            );
        }
        else {
            attendance.setStatus(AttendanceStatus.PENDING);
            attendance.setReviewNote("AI verify failed");
            examSessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.PENDING_REVIEW,
                    "Đang chờ giám thị xác minh"
            );

            session.setIsFlagged(true);
            examSessionRepo.save(session);

            logService.log(
                    "CHECKIN_FAILED",
                    "AI verify failed",
                    "CHECKIN",
                    "FAILED",
                    session
            );
        }

        AttendanceSession saved = attendanceRepo.save(attendance);

        log.info(
                "Offline checkin completed sessionId={} passed={} confidence={}",
                session.getId(),
                passed,
                confidence
        );
        return saved;
    }

    // =========================================================
    // VALIDATE REQUEST
    // =========================================================
    private void validateRequest(
            CheckinRequest req
    ) {

        if (req == null) {
            throw new RuntimeException("Request null");
        }

        if (req.getCitizenId() == null || req.getCitizenId().isBlank()) {
            throw new RuntimeException("CitizenId required");
        }

        if (req.getFullName() == null || req.getFullName().isBlank()) {
            throw new RuntimeException("FullName required");
        }

        if (req.getBirthDate() == null) {
            throw new RuntimeException("BirthDate required");
        }

        if (req.getSemester() == null || req.getSemester().isBlank()) {
            throw new RuntimeException("Semester required");
        }

        if (req.getExamCode() == null || req.getExamCode().isBlank()) {
            throw new RuntimeException("ExamCode required");
        }

        if (req.getRoomCode() == null || req.getRoomCode().isBlank()) {
            throw new RuntimeException("RoomCode required");
        }

        if (req.getFaceImage() == null || req.getFaceImage().isBlank()) {
            throw new RuntimeException("CCCD image required");
        }

        if (req.getWebcamImage() == null || req.getWebcamImage().isBlank()) {
            throw new RuntimeException("Webcam image required");
        }
    }

    // =========================================================
    // VALIDATE CCCD
    // =========================================================
    private void validateCccdInfo(
            CheckinRequest req,
            CitizenCard card
    ) {

        if (!normalize(card.getFullName())
                .equals(normalize(req.getFullName()))) {
            throw new RuntimeException("Họ tên không khớp");
        }

        if (!card.getBirthDate()
                .equals(req.getBirthDate())) {
            throw new RuntimeException("Ngày sinh không khớp");
        }

        if (card.getExpiry() != null
                && card.getExpiry().isBefore(
                LocalDateTime.now().toLocalDate()
        )) {
            throw new RuntimeException("CCCD đã hết hạn");
        }
    }

    // =========================================================
    // VERIFY REALTIME FACE
    // =========================================================
    private void verifyRealtimeFace(
            byte[] cccdImage,
            byte[] webcamImage
    ) {

        Map<String, Object> result = aiClientService.verifyFace(cccdImage, webcamImage);

        if (result == null) {
            throw new RuntimeException("AI verify không phản hồi");
        }

        String status = String.valueOf(result.get("status"));

        double confidence = extractConfidence(result);

        log.info(
                "Realtime verify status={} confidence={}",
                status,
                confidence
        );

        boolean passed =
                "SUCCESS".equalsIgnoreCase(status)
                        && confidence >= MIN_CONFIDENCE;

        if (!passed) {
            throw new RuntimeException("Webcam không khớp CCCD");
        }
    }


    // =========================================================
    // EXTRACT EMBEDDING
    // =========================================================
    private String extractEmbedding(
            byte[] imageBytes
    ) {

        Map<String, Object> aiResult = aiClientService.extractEmbedding(imageBytes);
        if (aiResult == null) {
            throw new RuntimeException("AI không phản hồi");
        }

        String status = String.valueOf(aiResult.get("status"));

        if (!"SUCCESS".equalsIgnoreCase(status)) {
            throw new RuntimeException("Không extract được embedding");
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

    // =========================================================
    // VERIFY FACE EMBEDDING
    // =========================================================
    private void verifyFaceEmbedding(
            CitizenCard card,
            String newEmbeddingJson
    ) {

        if (card.getFaceEmbedding() == null) {
            return;
        }

        List<Double> oldEmbedding = parseEmbedding(card.getFaceEmbedding());
        List<Double> newEmbedding = parseEmbedding(newEmbeddingJson);
        double similarity = cosineSimilarity(oldEmbedding, newEmbedding);

        log.info("Embedding similarity={}", similarity);

        if (similarity < FACE_MATCH_THRESHOLD) {
            throw new RuntimeException("Khuôn mặt không khớp dữ liệu cũ");
        }
    }

    // =========================================================
    // PARSE EMBEDDING
    // =========================================================
    private List<Double> parseEmbedding(
            String json
    ) {
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory()
                            .constructCollectionType(
                                    List.class,
                                    Double.class
                            )
            );

        } catch (Exception e) {
            throw new RuntimeException("Embedding không hợp lệ");
        }
    }

    // =========================================================
    // COSINE
    // =========================================================
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

    // =========================================================
    // BASE64
    // =========================================================
    private byte[] decodeBase64(
            String image
    ) {
        try {
            if (image.contains(",")) {
                image = image.split(",")[1];
            }
            return Base64.getDecoder()
                    .decode(image);

        } catch (Exception e) {
            throw new RuntimeException("Ảnh base64 không hợp lệ");
        }
    }

    // =========================================================
    // CONFIDENCE
    // =========================================================
    private double extractConfidence(
            Map<String, Object> result
    ) {

        Object val = result.getOrDefault("confidence", 0.0);
        return val instanceof Number
                ? ((Number) val).doubleValue()
                : 0.0;
    }

    // =========================================================
    // UPLOAD IMAGE
    // =========================================================
    private String uploadImage(
            String base64,
            Long userId
    ) {

        return fileUploadService
                .uploadBase64Async(
                        base64,
                        userId
                )
                .join()
                .getUrl();
    }

    // =========================================================
    // NORMALIZE
    // =========================================================
    private String normalize(
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
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    @Transactional
    public AttendanceSession manualCheckin(
            Long examSessionId,
            String base64Image,
            User proctorUser,
            String reason
    ) {

        ExamSession session =
                examSessionRepo
                        .findById(examSessionId)
                        .orElseThrow(() ->
                                new RuntimeException("Không tìm thấy ca thi")
                        );

        if (session.getStatus()
                == ExamSessionStatus.CHECKED_IN
                || session.getStatus()
                == ExamSessionStatus.IN_PROGRESS
                || session.getStatus()
                == ExamSessionStatus.DONE) {
            throw new RuntimeException("Thí sinh đã điểm danh");
        }

        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Phiên thi đã bị khóa");
        }

        AttendanceSession attendance =
                attendanceRepo
                        .findByExamSessionId(session.getId())
                        .orElseGet(AttendanceSession::new);

        String imageUrl = null;
        if (base64Image != null && !base64Image.isBlank()) {
            imageUrl =
                    fileUploadService
                            .uploadBase64Async(
                                    base64Image,
                                    session.getUser().getId()
                            )
                            .join()
                            .getUrl();
        }

        attendance.setExamSession(session);
        attendance.setCheckinTime(LocalDateTime.now());
        attendance.setAttendancePhoto(imageUrl);
        attendance.setStatus(AttendanceStatus.PENDING);
        attendance.setReviewNote(
                reason != null
                        ? reason
                        : "Manual checkin created"
        );
        attendance.setVerifiedBy(proctorUser);
        AttendanceSession saved = attendanceRepo.save(attendance);
        examSessionStateService.updateStatus(
                session,
                ExamSessionStatus.PENDING_REVIEW,
                "Đang chờ giám thị xác minh"
        );

        session.setIsFlagged(true);
        session.setLastSeenAt(LocalDateTime.now());
        examSessionRepo.save(session);
        logService.log(
                "MANUAL_CHECKIN_CREATED",
                "Created by proctorId="
                        + proctorUser.getId(),
                "CHECKIN",
                "PENDING",
                session
        );
        return saved;
    }
}