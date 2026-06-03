package com.exam.attendance.service;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.entity.IdentityVerification;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.pojo.AlertMessage;
import com.exam.attendance.data.pojo.enums.AlertType;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.data.pojo.enums.RiskLevel;
import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.data.response.VerifyResponse;
import com.exam.attendance.repository.AttendanceSessionRepository;
import com.exam.attendance.repository.ExamSessionRepository;
import com.exam.attendance.repository.IdentityVerificationRepository;
import com.exam.attendance.service.ai.AiClientService;
import com.exam.attendance.service.attendance.AttendanceLogService;
import com.exam.attendance.service.socket.AlertService;
import com.exam.attendance.service.uploads.FileUploadService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

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
    private final SessionStateService  sessionStateService;
    private static final float MIN_CONFIDENCE = 0.7f;
    private static final int MAX_INITIAL_FAIL = 3;
    private static final int MAX_RANDOM_FAIL = 3;
    private static final int RECONNECT_GRACE_MINUTES = 5;

    @Transactional
    public VerifyResponse handleVerify(
            VerifyRequest req
    ) {

        try {
            validateRequest(req);
            ExamSession session = getExamSession(req);
            validateOwnership(session);
            validateCccd(session);
            VerifyResponse reconnect = handleReconnect(req, session);

            if (reconnect != null) {
                return reconnect;
            }

            validateSessionState(req, session);
            validateAttendanceApproved(req, session);

            boolean deviceOk = validateDevice(req, session);
            if (!deviceOk) {
                return VerifyResponse.builder()
                        .passed(false)
                        .attempt(0)
                        .maxAttempt(MAX_RANDOM_FAIL)
                        .remainingAttempt(MAX_RANDOM_FAIL)
                        .sessionStatus(session.getStatus())
                        .message("Đang chờ giám thị duyệt thay đổi thiết bị")
                        .build();
            }

            byte[] captureBytes = decodeCapture(req.getCaptureImage());
            Map<String, Object> aiResult = callAI(captureBytes, session);
            double confidence = extractConfidence(aiResult);
            boolean passed = isPassed(aiResult, confidence);

            int attempt;
            if (passed) {
                attempt = 0;
            } else {
                attempt = countConsecutiveFail(session.getId(), req.getType()) + 1;
            }
            String captureImageUrl = uploadCapture(req, session.getUser());

            saveVerification(req, session, captureImageUrl, confidence, passed, attempt);
            logVerification(req, session, confidence, passed);
            handleAlert(req, session, passed, attempt);
            handleBusiness(req, session, passed, attempt);
            session.setLastSeenAt(LocalDateTime.now());
            examSessionRepo.save(session);
            int maxAttempt =
                    "INITIAL".equalsIgnoreCase(req.getType())
                            ? MAX_INITIAL_FAIL
                            : MAX_RANDOM_FAIL;

            return VerifyResponse.builder()
                    .passed(passed)
                    .confidence(confidence)
                    .attempt(attempt)
                    .maxAttempt(maxAttempt)
                    .remainingAttempt(
                            Math.max(
                                    0,
                                    maxAttempt - attempt
                            )
                    )
                    .sessionStatus(session.getStatus())
                    .reconnect(false)
                    .message(
                            passed
                                    ? "Xác minh thành công"
                                    : String.format(
                                    "Xác minh thất bại (%d/%d)",
                                    attempt,
                                    maxAttempt
                            )
                    )
                    .build();

        } catch (Exception e) {
            log.error("Verification failed", e);
            throw new RuntimeException("Verification failed: " + e.getMessage());
        }
    }

    // =========================================================
    // REQUEST
    // =========================================================
    private void validateRequest(
            VerifyRequest req
    ) {

        if (req == null) {
            throw new RuntimeException("Request null");
        }

        if (req.getExamSessionId() == null) {
            throw new RuntimeException("SessionId required");
        }

        if (!"RECONNECT".equalsIgnoreCase(req.getType())) {
            if (req.getCaptureImage() == null || req.getCaptureImage().isBlank()) {
                throw new RuntimeException("Capture empty");
            }
        }

        if (req.getDeviceId() == null || req.getDeviceId().isBlank()) {
            throw new RuntimeException("Device required");
        }
    }

    private ExamSession getExamSession(
            VerifyRequest req
    ) {
        return examSessionRepo
                .findFullById(
                        req.getExamSessionId()
                )
                .orElseThrow(() -> new RuntimeException("Session not found"));
    }

    // =========================================================
    // RECONNECT
    // =========================================================
    private VerifyResponse handleReconnect(
            VerifyRequest req,
            ExamSession session
    ){
        if (!"RECONNECT".equalsIgnoreCase(req.getType())) {
            return null;
        }
        if (session.getStatus() != ExamSessionStatus.IN_PROGRESS) {
            throw new RuntimeException("Session not running");
        }
        boolean trusted = isTrustedReconnect(req, session);
        if (!trusted) {
            throw new RuntimeException("Reconnect denied");}
        session.setLastSeenAt(LocalDateTime.now());
        examSessionRepo.save(session);
        return VerifyResponse.builder()
                .passed(true)
                .reconnect(true)
                .attempt(0)
                .maxAttempt(0)
                .remainingAttempt(0)
                .sessionStatus(session.getStatus())
                .message("Reconnect thành công")
                .build();
    }

    private boolean isTrustedReconnect(
            VerifyRequest req,
            ExamSession session
    ) {
        if (session.getStatus() == ExamSessionStatus.PENDING_DEVICE_APPROVAL) {
            return false;
        }
        // same device
        if (Objects.equals(session.getDeviceId(), req.getDeviceId())) {
            return true;
        }
        // reconnect grace
        if (session.getLastSeenAt() != null
                && session.getLastSeenAt().isAfter(
                LocalDateTime.now()
                        .minusMinutes(RECONNECT_GRACE_MINUTES)
        )) {
            if (Objects.equals(session.getLastIp(), req.getIpAddress())) {
                sendAlert(
                        session,
                        AlertType.DEVICE_CHANGED,
                        "Reconnect với device khác",
                        RiskLevel.LOW
                );
                return true;
            }
        }
        return false;
    }

    // =========================================================
    // SESSION STATE
    // =========================================================
    private void validateSessionState(
            VerifyRequest req,
            ExamSession session
    ) {
        if (session.getStatus() == ExamSessionStatus.DONE) {
            throw new RuntimeException("Session ended");
        }
        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Session blocked");
        }
        // INITIAL
        if ("INITIAL".equalsIgnoreCase(req.getType())) {
            if (session.getStatus()
                    != ExamSessionStatus.CHECKED_IN
                    && session.getStatus()
                    != ExamSessionStatus.PENDING_REVIEW) {
                throw new RuntimeException("Session chưa sẵn sàng xác minh");
            }
        } else {
            // RANDOM
            if (session.getStatus()
                    != ExamSessionStatus.CHECKED_IN
                    && session.getStatus()
                    != ExamSessionStatus.IN_PROGRESS
                    && session.getStatus()
                    != ExamSessionStatus.PENDING_DEVICE_APPROVAL) {
                throw new RuntimeException("Session not active");
            }
        }
    }

    private void validateAttendanceApproved(
            VerifyRequest req,
            ExamSession session
    ) {
        if (!"INITIAL".equalsIgnoreCase(req.getType())) {
            return;
        }
        AttendanceSession attendance =
                attendanceSessionRepo
                        .findByExamSessionId(
                                session.getId()
                        )
                        .orElseThrow(() -> new RuntimeException("Chưa điểm danh")
                        );
        if (attendance.getStatus() != AttendanceStatus.VERIFIED) {
            throw new RuntimeException("Chưa được giám thị cho phép vào thi");
        }
    }

    private void validateOwnership(
            ExamSession session
    ) {
        Long currentUserId =
                SecurityUtils.getCurrentUserId();
        if (!session.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("No permission");
        }
    }

    private void validateCccd(
            ExamSession session
    ) {
        User user = session.getUser();
        if (user == null || user.getCitizenCard() == null) {
            throw new RuntimeException("No CCCD");
        }
        if (user.getCitizenCard()
                .getFaceEmbedding() == null) {
            throw new RuntimeException("Missing embedding");
        }
    }

    // =========================================================
    // DEVICE
    // =========================================================
    private boolean validateDevice(
            VerifyRequest req,
            ExamSession session
    ) {
        String currentDevice = req.getDeviceId();
        // first device
        if (session.getDeviceId() == null) {
            session.setDeviceId(currentDevice);
            session.setLastIp(req.getIpAddress());
            session.setLastSeenAt(LocalDateTime.now());
            examSessionRepo.save(session);
            return true;
        }

        // same device
        if (session.getDeviceId()
                .equals(currentDevice)) {
            session.setLastSeenAt(LocalDateTime.now());
            session.setLastIp(req.getIpAddress());
            examSessionRepo.save(session);
            return true;
        }
        // suspicious
        session.setPendingDeviceId(currentDevice);
        session.setIsFlagged(true);
        sessionStateService.updateStatus(
                session,
                ExamSessionStatus.PENDING_DEVICE_APPROVAL,
                "Đang chờ giám thị duyệt thay đổi thiết bị"
        );
        examSessionRepo.save(session);
        sendAlert(session,
                AlertType.DEVICE_CHANGED,
                "Thiết bị thay đổi",
                RiskLevel.MEDIUM
        );
        return false;
    }

    // =========================================================
    // AI
    // =========================================================
    private byte[] decodeCapture(
            String base64
    ) {
        if (base64.contains(",")) {
            base64 = base64.split(",")[1];
        }
        return decodeBase64(base64);
    }

    private Map<String, Object> callAI(
            byte[] image,
            ExamSession session
    ) {
        Map<String, Object> result =
                aiClientService.verifyFast(
                        image,
                        session.getUser()
                                .getCitizenCard()
                                .getFaceEmbedding()
                );
        if (result == null) {
            throw new RuntimeException("AI result null");
        }
        if ("ERROR".equalsIgnoreCase(String.valueOf(result.get("status"))
        )) {
            throw new RuntimeException("AI error");
        }
        return result;
    }

    private double extractConfidence(
            Map<String, Object> result
    ) {
        Object val = result.getOrDefault("confidence", 0.0);
        return val instanceof Number
                ? ((Number) val).doubleValue()
                : 0.0;
    }
    private boolean isPassed(
            Map<String, Object> result,
            double confidence
    ) {
        return "SUCCESS".equalsIgnoreCase(
                String.valueOf(result.get("status"))
        ) && confidence >= MIN_CONFIDENCE;
    }

    // =========================================================
    // VERIFY
    // =========================================================
    private int countConsecutiveFail(
            Long sessionId,
            String type
    ) {
        List<IdentityVerification> list =
                verificationRepo
                        .findTop20ByExamSessionIdAndTypeOrderByCreatedAtDesc(sessionId, type);
        int failCount = 0;
        for (IdentityVerification iv : list) {
            if (Boolean.TRUE.equals(iv.getVerified())) {
                break;
            }
            failCount++;
        }
        return failCount;
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
        iv.setCccdImageUrl(session.getUser()
                .getCitizenCard()
                .getFaceImageUrl());
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
            iv.setFailReason(
                    confidence < MIN_CONFIDENCE
                            ? "LOW_CONFIDENCE"
                            : "FACE_NOT_MATCH"
            );
        }
        return verificationRepo.save(iv);
    }

    private String uploadCapture(
            VerifyRequest req,
            User user
    ) {
        UploadResponse upload =
                fileUploadService
                        .uploadBase64Async(req.getCaptureImage(), user.getId())
                        .join();
        return upload.getUrl();
    }

    // =========================================================
    // ALERT
    // =========================================================
    private void handleAlert(
            VerifyRequest req,
            ExamSession session,
            boolean passed,
            int attempt
    ) {
        if (session.getRoom() == null) {
            return;
        }
        if (passed) {
//            sendAlert(
//                    session,
//                    AlertType.VERIFY_SUCCESS,
//                    "Verify success",
//                    RiskLevel.LOW
//            );
            return;
        }
        if (attempt == 1) {
            sendAlert(session, AlertType.VERIFY_FAIL, "Verify failed", RiskLevel.LOW);
        }
        if (attempt >= 2) {
            sendAlert(session, AlertType.SUSPICIOUS_ACTIVITY, "Verify fail nhiều lần", RiskLevel.MEDIUM);
        }
    }

    private void sendAlert(
            ExamSession session,
            AlertType type,
            String msg,
            RiskLevel level
    ) {
        alertService.sendAlert(buildAlert(session, type, msg, level));
    }

    private AlertMessage buildAlert(
            ExamSession session,
            AlertType type,
            String msg,
            RiskLevel level
    ) {
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

    // =========================================================
    // BUSINESS
    // =========================================================
    private void handleBusiness(
            VerifyRequest req,
            ExamSession session,
            boolean passed,
            int attempt
    ) {
        if ("INITIAL".equalsIgnoreCase(
                req.getType()
        )) {
            handleInitialVerify(session, passed, attempt);
        } else {
            handleRandomVerify(session, passed, attempt);
        }
    }

    private void handleInitialVerify(
            ExamSession session,
            boolean passed,
            int attempt
    ) {
        if (passed) {
            // vào thi thật sự
            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.IN_PROGRESS,
                    "Đã được phép vào thi"
            );
            session.setLastSeenAt(LocalDateTime.now());
            session.setReconnectToken(UUID.randomUUID().toString());
            examSessionRepo.save(session);
            return;
        }

        if (attempt >= MAX_INITIAL_FAIL) {
            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.PENDING_VERIFY_REVIEW,
                    "Xác minh khuôn mặt thất bại nhiều lần"
            );
            session.setIsFlagged(true);
            examSessionRepo.save(session);
            sendAlert(
                    session,
                    AlertType.MANUAL_REVIEW_REQUIRED,
                    "Cần giám thị xác minh khuôn mặt",
                    RiskLevel.MEDIUM
            );
        }
    }

    private void handleRandomVerify(
            ExamSession session,
            boolean passed,
            int attempt
    ) {
        if (passed) {
            session.setIsFlagged(false);
            examSessionRepo.save(session);
            return;
        }

        if (attempt >= MAX_RANDOM_FAIL) {
            session.setIsFlagged(true);
            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.PENDING_REVIEW,
                    "Đang chờ giám thị xác minh"
            );
            examSessionRepo.save(session);
            sendAlert(
                    session,
                    AlertType.MULTIPLE_VERIFY_FAILED,
                    "Random verify fail nhiều lần",
                    RiskLevel.HIGH
            );
        }
    }

    // ==================================================
    // LOG
    // ==================================================
    private void logVerification(
            VerifyRequest req,
            ExamSession session,
            double confidence,
            boolean passed
    ) {
        logService.log(
                "VERIFY_" + req.getType(),
                "confidence=" + confidence,
                req.getType(),
                passed
                        ? "SUCCESS"
                        : "FAILED",
                session
        );
    }

    // =========================================================
    // HISTORY
    // =========================================================
    public List<IdentityVerification> getHistory(
            Long sessionId
    ) {
        try {
            return verificationRepo.findHistory(sessionId);
        } catch (Exception e) {
            log.error("Error getHistory", e);
            return Collections.emptyList();
        }
    }

    @Transactional
    public void resetVerificationCounter(
            ExamSession session,
            String type
    ) {
        IdentityVerification iv = new IdentityVerification();
        iv.setUser(session.getUser());
        iv.setExamSession(session);
        iv.setType(type);
        iv.setVerified(true);
        iv.setConfidence(1.0);
        iv.setAttemptNo(0);
        iv.setCreatedAt(LocalDateTime.now());
        iv.setVerifiedAt(LocalDateTime.now());
        verificationRepo.save(iv);
    }
}