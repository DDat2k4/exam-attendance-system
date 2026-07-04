package com.exam.attendance.service.attendance;

import com.exam.attendance.data.dto.FaceVerifyResultDTO;
import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.enums.AttendanceStatus;
import com.exam.attendance.data.enums.ExamSessionStatus;
import com.exam.attendance.data.mapper.AttendanceSessionMapper;
import com.exam.attendance.data.request.CheckinRequest;
import com.exam.attendance.data.response.AttendanceSessionResponse;
import com.exam.attendance.repository.AttendanceSessionRepository;
import com.exam.attendance.repository.CitizenCardRepository;
import com.exam.attendance.repository.ExamRegistrationRepository;
import com.exam.attendance.repository.ExamSessionRepository;
import com.exam.attendance.service.exam.ExamSessionStateService;
import com.exam.attendance.service.ai.AiClientService;
import com.exam.attendance.service.identity.CccdService;
import com.exam.attendance.service.uploads.FileUploadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceCheckinService {

    private final ExamSessionRepository examSessionRepo;
    private final AttendanceSessionRepository attendanceRepo;
    private final CitizenCardRepository citizenCardRepo;
    private final AiClientService aiClientService;
    private final CccdService  cccService;
    private final FileUploadService fileUploadService;
    private final ExamSessionStateService examSessionStateService;
    private final ExamRegistrationRepository registrationRepo;
    private final AttendanceLogService logService;
    private final ObjectMapper objectMapper;
    private static final double MIN_CONFIDENCE = 0.7;

    // =========================================================
    // OFFLINE CHECKIN
    // =========================================================
    @Transactional
    public AttendanceSessionResponse checkin(CheckinRequest req) {

        validateRequest(req);

        CitizenCard card = citizenCardRepo
                .findByCitizenId(req.getCitizenId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy CCCD"));

        validateCccdInfo(req, card);

        ExamRegistration registration = registrationRepo
                .findByCheckinInfo(
                        req.getSemester(),
                        req.getExamCode(),
                        req.getRoomCode(),
                        req.getCitizenId()
                )
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch thi phù hợp"));

        ExamSession session = examSessionRepo
                .findFirstByUserIdAndExamIdOrderByIdDesc(
                        registration.getUser().getId(),
                        registration.getExam().getId()
                )
                .orElse(null);

        if (session == null) {

            session = new ExamSession();
            session.setUser(registration.getUser());
            session.setExam(registration.getExam());
            session.setRoom(registration.getRoom());
            session.setDeviceId(null);
            session.setCreatedAt(LocalDateTime.now());
            session.setLastSeenAt(LocalDateTime.now());
            session.setIsFlagged(false);
            session.setSessionStart(null);
            session.setSessionEnd(null);

            examSessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.INIT,
                    "Tạo phiên từ điểm danh NFC"
            );

            session = examSessionRepo.save(session);
        }

        if (session.getStatus() == ExamSessionStatus.CHECKED_IN
                || session.getStatus() == ExamSessionStatus.IN_PROGRESS
                || session.getStatus() == ExamSessionStatus.DONE) {
            throw new RuntimeException("Thí sinh đã điểm danh");
        }

        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Phiên thi đã bị khóa");
        }

        byte[] webcamBytes = decodeBase64(req.getWebcamImage());
        byte[] cccdBytes   = decodeBase64(req.getFaceImage());

        // Verify face — không throw, chỉ lấy kết quả
        FaceVerifyResultDTO faceResult = verifyRealtimeFaceSafe(cccdBytes, webcamBytes);
        log.info("faceResult isPassed={} confidence={}",
                faceResult.isPassed(), faceResult.getConfidence());
        // Extract embedding từ webcam
        Map<String, Object> embeddingResult = extractEmbedding(webcamBytes);
        Object embedding = embeddingResult.get("embedding");

        if (embedding == null) {
            throw new RuntimeException("Embedding null");
        }

//        try {
//            card.setFaceEmbedding(objectMapper.writeValueAsString(embedding));
////            citizenCardRepo.save(card);
//        } catch (Exception e) {
//            throw new RuntimeException("Convert embedding lỗi");
//        }
//
//        String webcamUrl = uploadImage(req.getWebcamImage(), card.getUser().getId());
//        String cccdUrl   = uploadImage(req.getFaceImage(),   card.getUser().getId());
//        card.setFaceImageUrl(cccdUrl);
//        citizenCardRepo.save(card);

        String embeddingJson;

        try {
            embeddingJson = objectMapper.writeValueAsString(embedding);
        } catch (Exception e) {
            throw new RuntimeException("Convert embedding lỗi");
        }

        String webcamUrl = uploadImage(
                req.getWebcamImage(),
                card.getUser().getId()
        );

        cccService.updateCitizenCardFace(
                card,
                req.getFaceImage(),
                embeddingJson
        );

        String cccdUrl = card.getFaceImageUrl();

        AttendanceSession attendance = attendanceRepo
                .findByExamSessionId(session.getId())
                .orElseGet(AttendanceSession::new);

        attendance.setExamSession(session);
        attendance.setCheckinTime(LocalDateTime.now());
        attendance.setAttendancePhoto(webcamUrl);
        attendance.setCccdPhoto(cccdUrl);
        attendance.setConfidence(faceResult.getConfidence());
        attendance.setVerifiedAt(LocalDateTime.now());

        if (faceResult.isPassed()) {

            // Webcam khớp → VERIFIED
            attendance.setStatus(AttendanceStatus.VERIFIED);
            attendance.setReviewNote("Offline checkin verified");

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

        } else {

            // Webcam không khớp → PENDING, chờ giám thị
            attendance.setStatus(AttendanceStatus.PENDING);
            attendance.setReviewNote(
                    "Face mismatch, confidence="
                            + String.format("%.2f",
                            faceResult.getConfidence())
                            + ". Chờ giám thị xác minh"
            );

            examSessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.PENDING_REVIEW,
                    "Khuôn mặt không khớp, chờ giám thị xác minh"
            );

            session.setIsFlagged(true);
            session.setLastSeenAt(LocalDateTime.now());
            examSessionRepo.save(session);

            logService.log(
                    "CHECKIN_FACE_MISMATCH",
                    "Face mismatch confidence=" + faceResult.getConfidence(),
                    "CHECKIN",
                    "PENDING",
                    session
            );
        }

        return AttendanceSessionMapper.toResponse(attendanceRepo.save(attendance));
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

        if (card.getFullName() == null) {
            throw new RuntimeException(
                    "CCCD chưa có họ tên trong hệ thống"
            );
        }

        if (card.getBirthDate() == null) {
            throw new RuntimeException(
                    "CCCD chưa có ngày sinh trong hệ thống"
            );
        }

        if (!Objects.equals(
                normalize(card.getFullName()),
                normalize(req.getFullName())
        )) {
            throw new RuntimeException("Họ tên không khớp");
        }

        if (!Objects.equals(
                card.getBirthDate(),
                req.getBirthDate()
        )) {
            throw new RuntimeException("Ngày sinh không khớp");
        }
    }

    // =========================================================
    // VERIFY REALTIME FACE
    // =========================================================
    private FaceVerifyResultDTO verifyRealtimeFaceSafe(
            byte[] cccdImage,
            byte[] webcamImage
    ) {
        FaceVerifyResultDTO result = new FaceVerifyResultDTO();

        try {
            Map<String, Object> aiResult =
                    aiClientService.verifyFace(cccdImage, webcamImage);

            if (aiResult == null) {
                log.warn("AI verify không phản hồi");
                result.setPassed(false);
                result.setConfidence(0.0);
                return result;
            }

            String status     = String.valueOf(aiResult.get("status"));
            double confidence = extractConfidence(aiResult);

            log.info("Realtime verify status={} confidence={}", status, confidence);

            boolean passed = "SUCCESS".equalsIgnoreCase(status)
                    && confidence >= MIN_CONFIDENCE;

            result.setPassed(passed);
            result.setConfidence(confidence);
            return result;

        } catch (Exception e) {
            log.warn("verifyFace exception: {}", e.getMessage());
            result.setPassed(false);
            result.setConfidence(0.0);
            return result;
        }
    }


    // =========================================================
    // EXTRACT EMBEDDING
    // =========================================================
    private Map<String, Object> extractEmbedding(
            byte[] imageBytes
    ) {

        Map<String, Object> aiResult =
                aiClientService.extractEmbedding(imageBytes);

        if (aiResult == null) {
            throw new RuntimeException("AI không phản hồi");
        }

        String status =
                String.valueOf(aiResult.get("status"));

        if (!"SUCCESS".equalsIgnoreCase(status)) {
            throw new RuntimeException(
                    String.valueOf(
                            aiResult.getOrDefault(
                                    "message",
                                    "Không extract được embedding"
                            )
                    )
            );
        }

        return aiResult;
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

        if (session.getStatus() == ExamSessionStatus.CHECKED_IN
                || session.getStatus() == ExamSessionStatus.IN_PROGRESS
                || session.getStatus() == ExamSessionStatus.DONE) {
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

            // Upload ảnh
            imageUrl =
                    fileUploadService
                            .uploadBase64Async(
                                    base64Image,
                                    session.getUser().getId()
                            )
                            .join()
                            .getUrl();

            // Extract embedding
            byte[] imageBytes = decodeBase64(base64Image);

            Map<String, Object> embeddingResult =
                    extractEmbedding(imageBytes);

            Object embedding = embeddingResult.get("embedding");

            if (embedding == null) {
                throw new RuntimeException("Không extract được embedding");
            }

            CitizenCard card =
                    citizenCardRepo
                            .findByUserId(session.getUser().getId())
                            .orElseThrow(() ->
                                    new RuntimeException("Không tìm thấy CCCD")
                            );

            try {
                card.setFaceEmbedding(
                        objectMapper.writeValueAsString(embedding)
                );

                citizenCardRepo.save(card);

            } catch (Exception e) {
                throw new RuntimeException("Lưu face embedding thất bại");
            }
        }

        attendance.setExamSession(session);
        attendance.setCheckinTime(LocalDateTime.now());
        attendance.setAttendancePhoto(imageUrl);
        attendance.setStatus(AttendanceStatus.VERIFIED);
        attendance.setConfidence(1.0);
        attendance.setReviewNote(
                reason != null && !reason.isBlank()
                        ? reason
                        : "Manual checkin approved by proctor"
        );
        attendance.setVerifiedBy(proctorUser);
        attendance.setVerifiedAt(LocalDateTime.now());

        AttendanceSession saved = attendanceRepo.save(attendance);

        examSessionStateService.updateStatus(
                session,
                ExamSessionStatus.CHECKED_IN,
                "Giám thị xác minh thủ công thành công"
        );

        session.setIsFlagged(false);
        session.setLastSeenAt(LocalDateTime.now());
        examSessionRepo.save(session);

        logService.log(
                "MANUAL_CHECKIN_APPROVED",
                "Approved by proctorId=" + proctorUser.getId(),
                "CHECKIN",
                "SUCCESS",
                session
        );

        return saved;
    }
}