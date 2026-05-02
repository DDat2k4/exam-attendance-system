package com.exam.attendance.service;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.pojo.AlertMessage;
import com.exam.attendance.data.pojo.enums.AlertType;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.data.pojo.enums.RiskLevel;
import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.repository.*;
import com.exam.attendance.service.socket.AlertService;
import com.exam.attendance.service.uploads.FileUploadService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.apache.commons.codec.binary.Base64.decodeBase64;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationService {

    private final AiClientService aiClientService;
    private final IdentityVerificationRepository verificationRepo;
    private final ExamSessionRepository examSessionRepo;
    private final AttendanceSessionRepository attendanceSessionRepo;
    private final FileUploadService fileUploadService;
    private final AttendanceLogService logService;
    private final AlertService alertService;

    private static final float MIN_CONFIDENCE = 0.7f;
    private static final int MAX_FAIL_ATTEMPT = 2;

    @Transactional
    public Map<String, Object> handleVerify(VerifyRequest req) {

        try {
            validateRequest(req);

            ExamSession examSession = getExamSession(req);

            validateSessionState(req, examSession);

            validateOwnership(examSession);

            validateCccd(examSession);

            validateDevice(req, examSession);

            byte[] captureBytes = decodeBase64(req.getCaptureImage());

            Map<String, Object> aiResult = callAI(captureBytes, examSession);

            double confidence = extractConfidence(aiResult);
            boolean passed = isPassed(aiResult, confidence);

            int attempt = countAttempt(examSession, req);

            String captureImageUrl = uploadIfNeeded(req, examSession.getUser(), passed);

            IdentityVerification iv = saveVerification(
                    req, examSession, captureImageUrl, confidence, passed, attempt
            );

            logVerification(req, examSession, confidence, passed);

            handleAlert(req, examSession, passed, attempt);

            handleBusiness(req, examSession, passed, captureImageUrl);

            return Map.of(
                    "passed", passed,
                    "confidence", confidence
            );

        } catch (Exception e) {
            log.error("Verification failed", e);
            throw new RuntimeException("Verification failed: " + e.getMessage());
        }
    }

    // ================= VALIDATE =================

    private void validateRequest(VerifyRequest req) {
        if (req == null) throw new RuntimeException("Request is null");
        if (req.getExamSessionId() == null) throw new RuntimeException("ExamSessionId is required");
        if (req.getCaptureImage() == null || req.getCaptureImage().isBlank())
            throw new RuntimeException("Capture image is empty");
        if (req.getDeviceId() == null)
            throw new RuntimeException("Device ID is required");
    }

    private ExamSession getExamSession(VerifyRequest req) {
        return examSessionRepo.findFullById(req.getExamSessionId())
                .orElseThrow(() -> new RuntimeException("Exam session not found"));
    }

    private void validateSessionState(VerifyRequest req, ExamSession session) {

        if (session.getStatus() == ExamSessionStatus.DONE)
            throw new RuntimeException("Session đã kết thúc");

        if (session.getStatus() == ExamSessionStatus.BLOCKED)
            throw new RuntimeException("Session đã bị khóa");

        if ("INITIAL".equalsIgnoreCase(req.getType())) {
            if (session.getStatus() != ExamSessionStatus.INIT)
                throw new RuntimeException("Session không ở trạng thái INIT");
        } else {
            if (session.getStatus() != ExamSessionStatus.CHECKED_IN &&
                    session.getStatus() != ExamSessionStatus.IN_PROGRESS)
                throw new RuntimeException("Session chưa bắt đầu");
        }
    }

    private void validateOwnership(ExamSession session) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        if (!session.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Không có quyền với session này");
        }
    }

    private void validateCccd(ExamSession session) {
        User user = session.getUser();

        if (user == null || user.getCitizenCard() == null)
            throw new RuntimeException("User chưa có CCCD");

        if (user.getCitizenCard().getFaceEmbedding() == null)
            throw new RuntimeException("CCCD thiếu embedding");
    }

    // ================= DEVICE =================

    private void validateDevice(VerifyRequest req, ExamSession session) {

        String currentDevice = req.getDeviceId();

        if (session.getDeviceId() == null) {
            session.setDeviceId(currentDevice);
            examSessionRepo.save(session);
            return;
        }

        if (!session.getDeviceId().equals(currentDevice)) {

            session.setIsFlagged(true);
            session.setStatus(ExamSessionStatus.BLOCKED);
            examSessionRepo.save(session);

            sendAlert(session, AlertType.DEVICE_CHANGED, "Thiết bị thay đổi", RiskLevel.HIGH);

            alertService.sendToUser(
                    buildAlert(session, AlertType.SESSION_BLOCKED, "Phiên thi đã bị khóa", RiskLevel.HIGH)
            );

            throw new RuntimeException("Thiết bị không hợp lệ");
        }
    }

    // ================= AI =================

    private Map<String, Object> callAI(byte[] image, ExamSession session) {

        Map<String, Object> result = aiClientService.verifyFast(
                image,
                session.getUser().getCitizenCard().getFaceEmbedding()
        );

        if (result == null) throw new RuntimeException("AI result is null");

        if ("ERROR".equalsIgnoreCase(String.valueOf(result.get("status"))))
            throw new RuntimeException("AI error");

        return result;
    }

    private double extractConfidence(Map<String, Object> result) {
        Object val = result.getOrDefault("confidence", 0.0);
        return (val instanceof Number) ? ((Number) val).doubleValue() : 0.0;
    }

    private boolean isPassed(Map<String, Object> result, double confidence) {
        return "VERIFIED".equalsIgnoreCase(String.valueOf(result.get("status")))
                && confidence >= MIN_CONFIDENCE;
    }

    // ================= VERIFY =================

    private int countAttempt(ExamSession session, VerifyRequest req) {
        return (int) verificationRepo
                .countByExamSessionIdAndType(session.getId(), req.getType()) + 1;
    }

    private IdentityVerification saveVerification(
            VerifyRequest req,
            ExamSession session,
            String captureImageUrl,
            double confidence,
            boolean passed,
            int attempt
    ) {

        IdentityVerification iv = new IdentityVerification();

        iv.setUser(session.getUser());
        iv.setExamSession(session);

        iv.setCccdImageUrl(session.getUser().getCitizenCard().getFaceImageUrl());
        iv.setCaptureImageUrl(captureImageUrl);

        iv.setVerified(passed);
        iv.setConfidence(confidence);
        iv.setType(req.getType());
        iv.setAttemptNo(attempt);

        iv.setDeviceId(req.getDeviceId());
        iv.setIpAddress(req.getIpAddress());
        iv.setUserAgent(req.getUserAgent());

        iv.setCreatedAt(LocalDateTime.now());
        iv.setVerifiedAt(LocalDateTime.now());

        if (!passed) {
            iv.setFailReason(confidence < MIN_CONFIDENCE
                    ? "LOW_CONFIDENCE"
                    : "FACE_NOT_MATCH");
        }

        return verificationRepo.save(iv);
    }

    private String uploadIfNeeded(VerifyRequest req, User user, boolean passed) {

        boolean shouldUpload = "INITIAL".equalsIgnoreCase(req.getType()) || !passed;

        if (!shouldUpload) return null;

        UploadResponse upload = fileUploadService
                .uploadBase64Async(req.getCaptureImage(), user.getId())
                .join();

        return upload.getUrl();
    }

    // ================= ALERT =================

    private void handleAlert(VerifyRequest req, ExamSession session, boolean passed, int attempt) {

        if (session.getRoom() == null) return;

        if (passed) {
            sendAlert(session, AlertType.VERIFY_SUCCESS, "Xác thực thành công", RiskLevel.LOW);
            return;
        }

        // chỉ alert lần đầu fail
        if (attempt == 1) {
            sendAlert(session, AlertType.VERIFY_FAIL, "Xác thực thất bại", RiskLevel.MEDIUM);
        }
    }

    private void sendAlert(ExamSession session, AlertType type, String msg, RiskLevel level) {
        alertService.sendAlert(buildAlert(session, type, msg, level));
    }

    private AlertMessage buildAlert(ExamSession session, AlertType type, String msg, RiskLevel level) {
        return AlertMessage.builder()
                .sessionId(session.getId())
                .userId(session.getUser().getId())
                .roomId(session.getRoom().getId())
                .type(type)
                .message(msg)
                .severity(level)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    // ================= BUSINESS =================

    private void handleBusiness(VerifyRequest req,
                                ExamSession session,
                                boolean passed,
                                String captureImageUrl) {

        if ("INITIAL".equalsIgnoreCase(req.getType())) {
            handleInitialVerify(passed, session, captureImageUrl);
        } else {
            handleRandomVerify(passed, session);
        }
    }

    private void handleInitialVerify(boolean passed,
                                     ExamSession session,
                                     String captureImageUrl) {

        if (!passed) throw new RuntimeException("Initial verify failed");

        session.setStatus(ExamSessionStatus.CHECKED_IN);
        session.setSessionStart(LocalDateTime.now());
        examSessionRepo.save(session);

        AttendanceSession as = attendanceSessionRepo
                .findByExamSessionId(session.getId())
                .orElseGet(AttendanceSession::new);

        as.setExamSession(session);
        as.setCheckinTime(LocalDateTime.now());
        as.setStatus(AttendanceStatus.VERIFIED);
        as.setVerifiedAt(LocalDateTime.now());
        as.setAttendancePhoto(captureImageUrl);

        attendanceSessionRepo.save(as);
    }

    private void handleRandomVerify(boolean passed, ExamSession session) {

        if (session.getStatus() == ExamSessionStatus.CHECKED_IN) {
            session.setStatus(ExamSessionStatus.IN_PROGRESS);
            examSessionRepo.save(session);
        }

        if (passed) return;

        long failCount = verificationRepo
                .countByExamSessionIdAndTypeAndVerifiedFalse(
                        session.getId(), "RANDOM"
                );

        if (failCount >= MAX_FAIL_ATTEMPT) {

            session.setStatus(ExamSessionStatus.BLOCKED);
            session.setIsFlagged(true);
            examSessionRepo.save(session);

            sendAlert(session, AlertType.MULTIPLE_VERIFY_FAILED, "Fail nhiều lần", RiskLevel.HIGH);

            alertService.sendToUser(
                    buildAlert(session, AlertType.SESSION_BLOCKED, "Phiên thi bị khóa", RiskLevel.HIGH)
            );

            AttendanceSession as = attendanceSessionRepo
                    .findByExamSessionId(session.getId())
                    .orElse(null);

            if (as != null) {
                as.setStatus(AttendanceStatus.BLOCKED);
                as.setVerifiedAt(LocalDateTime.now());
                attendanceSessionRepo.save(as);
            }
        }
    }

    // ================= LOG =================

    private void logVerification(VerifyRequest req,
                                 ExamSession session,
                                 double confidence,
                                 boolean passed) {

        logService.log(
                "VERIFY_" + (req.getType() == null ? "UNKNOWN" : req.getType()),
                "confidence=" + confidence,
                req.getType(),
                passed ? "SUCCESS" : "FAILED",
                session
        );
    }

    // ================= QUERY =================

    public IdentityVerification getLatest(Long sessionId) {
        return verificationRepo
                .findTopByExamSessionIdOrderByCreatedAtDesc(sessionId)
                .orElse(null);
    }

    public List<IdentityVerification> getHistory(Long sessionId) {
        try {
            return verificationRepo.findHistory(sessionId);
        } catch (Exception e) {
            log.error("Error getHistory", e);
            return Collections.emptyList();
        }
    }
}