package com.exam.attendance.service;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.repository.*;
import com.exam.attendance.service.uploads.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

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

    private static final float MIN_CONFIDENCE = 0.7f;
    private static final int MAX_FAIL_ATTEMPT = 2;

    public Map<String, Object> handleVerify(VerifyRequest req) {

        try {
            if (req == null) {
                throw new RuntimeException("Request is null");
            }

            if (req.getExamSessionId() == null) {
                throw new RuntimeException("ExamSessionId is required");
            }

            if (req.getCaptureImage() == null || req.getCaptureImage().isBlank()) {
                throw new RuntimeException("Capture image is empty");
            }

            if (req.getDeviceId() == null) {
                throw new RuntimeException("Device ID is required");
            }

            ExamSession examSession = examSessionRepo.findFullById(req.getExamSessionId())
                    .orElseThrow(() -> new RuntimeException("Exam session not found"));

            if (examSession.getStatus() == null) {
                throw new RuntimeException("Session không hợp lệ");
            }

            User user = examSession.getUser();

            if (user == null || user.getCitizenCard() == null) {
                throw new RuntimeException("User chưa có CCCD");
            }

            String cccdImageUrl = user.getCitizenCard().getFaceImageUrl();
            String embedding = user.getCitizenCard().getFaceEmbedding();

            if (cccdImageUrl == null || embedding == null) {
                throw new RuntimeException("CCCD thiếu dữ liệu");
            }

            // ===== DEVICE CHECK =====
            validateDevice(req, examSession);

            // ===== DECODE IMAGE =====
            byte[] captureBytes = decodeBase64(req.getCaptureImage());

            // ===== AI CALL =====
            Map<String, Object> aiResult = aiClientService.verifyFast(
                    captureBytes,
                    embedding
            );

            if (aiResult == null) {
                throw new RuntimeException("AI result is null");
            }

            String aiStatus = String.valueOf(aiResult.get("status"));

            if ("ERROR".equalsIgnoreCase(aiStatus)) {
                throw new RuntimeException("AI service error");
            }

            Object confidenceObj = aiResult.getOrDefault("confidence", 0.0);
            Double confidence = (confidenceObj instanceof Number)
                    ? ((Number) confidenceObj).doubleValue()
                    : 0.0;

            boolean passed = "VERIFIED".equalsIgnoreCase(aiStatus)
                    && confidence >= MIN_CONFIDENCE;

            int attempt = (int) verificationRepo
                    .countByExamSessionId(examSession.getId()) + 1;

            String captureImageUrl = uploadIfNeeded(req, user, passed);

            // ===== SAVE LOG =====
            IdentityVerification iv = buildVerificationLog(
                    req,
                    examSession,
                    cccdImageUrl,
                    captureImageUrl,
                    passed,
                    confidence,
                    attempt
            );

            verificationRepo.save(iv);

            // ===== ATTENDANCE LOG =====
            logService.log(
                    "VERIFY_" + (req.getType() == null ? "UNKNOWN" : req.getType()),
                    "confidence=" + confidence,
                    req.getType(),
                    passed ? "SUCCESS" : "FAILED",
                    examSession
            );

            // ===== BUSINESS =====
            if ("INITIAL".equalsIgnoreCase(req.getType())) {
                handleInitialVerify(passed, examSession, captureImageUrl);
            } else {
                handleRandomVerify(passed, examSession);
            }

            return Map.of(
                    "passed", passed,
                    "confidence", confidence
            );

        } catch (Exception e) {
            e.printStackTrace(); // 👈 DEBUG
            throw new RuntimeException("Verification failed: " + e.getMessage());
        }
    }

    // ================= HELPER =================

    private byte[] decodeBase64(String base64) {
        try {
            String[] parts = base64.split(",");
            String data = parts.length > 1 ? parts[1] : parts[0];
            return Base64.getDecoder().decode(data);
        } catch (Exception e) {
            throw new RuntimeException("Invalid base64 image");
        }
    }

    private String uploadIfNeeded(VerifyRequest req, User user, boolean passed) {

        if (!"INITIAL".equalsIgnoreCase(req.getType()) && passed) {
            return null;
        }

        try {
            UploadResponse upload = fileUploadService
                    .uploadBase64Async(req.getCaptureImage(), user.getId())
                    .join();

            return upload.getUrl();

        } catch (Exception e) {
            throw new RuntimeException("Upload failed");
        }
    }

    private IdentityVerification buildVerificationLog(
            VerifyRequest req,
            ExamSession examSession,
            String cccdImageUrl,
            String captureImageUrl,
            boolean passed,
            Double confidence,
            int attempt
    ) {

        IdentityVerification iv = new IdentityVerification();

        iv.setUser(examSession.getUser());
        iv.setExamSession(examSession);

        iv.setCccdImageUrl(cccdImageUrl);
        iv.setCaptureImageUrl(captureImageUrl);

        iv.setVerified(passed);
        iv.setConfidence(confidence.doubleValue());
        iv.setType(req.getType());
        iv.setAttemptNo(attempt);

        iv.setDeviceId(req.getDeviceId());
        iv.setIpAddress(req.getIpAddress());
        iv.setUserAgent(req.getUserAgent());

        iv.setCreatedAt(LocalDateTime.now());
        iv.setVerifiedAt(LocalDateTime.now());

        if (!passed) {
            iv.setFailReason(buildFailReason(confidence));
        }

        return iv;
    }

    // ================= DEVICE =================

    private void validateDevice(VerifyRequest req, ExamSession examSession) {

        String currentDevice = req.getDeviceId();

        if (examSession.getDeviceId() == null) {
            examSession.setDeviceId(currentDevice);
            examSessionRepo.save(examSession);
        } else if (!examSession.getDeviceId().equals(currentDevice)) {

            examSession.setIsFlagged(true);
            examSessionRepo.save(examSession);

            logService.log(
                    "DEVICE_MISMATCH",
                    "Device changed",
                    "CHEAT",
                    "FAILED",
                    examSession
            );
        }
    }

    // ================= INITIAL =================

    private void handleInitialVerify(boolean passed,
                                     ExamSession examSession,
                                     String captureImageUrl) {

        if (!passed) {
            logService.log(
                    "INITIAL_VERIFY",
                    "Initial verify failed",
                    "VERIFY",
                    "FAILED",
                    examSession
            );

            throw new RuntimeException("Initial verification failed");
        }

        examSession.setStatus(ExamSessionStatus.CHECKED_IN);
        examSession.setSessionStart(LocalDateTime.now());
        examSessionRepo.save(examSession);

        AttendanceSession as = attendanceSessionRepo
                .findByExamSessionId(examSession.getId())
                .orElse(null);

        if (as == null) {
            as = new AttendanceSession();
            as.setExamSession(examSession);
            as.setCheckinTime(LocalDateTime.now());
        }

        as.setStatus(AttendanceStatus.VERIFIED);
        as.setVerifiedAt(LocalDateTime.now());
        as.setAttendancePhoto(captureImageUrl);
        as.setVerifiedBy(examSession.getUser());

        attendanceSessionRepo.save(as);
    }


    private void handleRandomVerify(boolean passed, ExamSession examSession) {

        AttendanceSession as = attendanceSessionRepo
                .findByExamSessionId(examSession.getId())
                .orElse(null);

        if (as != null && passed) {
            as.setVerifiedAt(LocalDateTime.now());
            as.setVerifiedBy(examSession.getUser());
            attendanceSessionRepo.save(as);
        }

        if (passed) return;

        long failCount = verificationRepo
                .countByExamSessionIdAndTypeAndVerifiedFalse(
                        examSession.getId(),
                        "RANDOM"
                );

        if (failCount >= MAX_FAIL_ATTEMPT) {
            examSession.setIsFlagged(true);
            examSessionRepo.save(examSession);

            logService.log(
                    "RANDOM_FAIL_BLOCK",
                    "Too many failed attempts",
                    "CHEAT",
                    "FAILED",
                    examSession
            );

            if (as != null) {
                as.setStatus(AttendanceStatus.BLOCKED);
                as.setVerifiedAt(LocalDateTime.now());
                as.setVerifiedBy(examSession.getUser());
                attendanceSessionRepo.save(as);
            }
        }
    }

    private String buildFailReason(Double confidence) {
        if (confidence < MIN_CONFIDENCE) {
            return "LOW_CONFIDENCE";
        }
        return "FACE_NOT_MATCH";
    }

    public IdentityVerification getLatest(Long sessionId) {
        return verificationRepo
                .findTopByExamSessionIdOrderByCreatedAtDesc(sessionId)
                .orElse(null);
    }

    public List<IdentityVerification> getHistory(Long sessionId) {
        try {
            return verificationRepo.findHistory(sessionId);
        } catch (Exception e) {
            log.error("Lỗi getVerificationHistory sessionId={}", sessionId, e);
            return Collections.emptyList();
        }
    }
}