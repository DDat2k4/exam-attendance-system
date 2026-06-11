package com.exam.attendance.service.exam;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.mapper.ExamSessionMapper;
import com.exam.attendance.data.dto.MyRoomInfoDTO;
import com.exam.attendance.data.pojo.ProctorDashboard;
import com.exam.attendance.data.enums.AttendanceStatus;
import com.exam.attendance.data.enums.ExamSessionStatus;
import com.exam.attendance.data.enums.RiskLevel;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import com.exam.attendance.data.response.ExamSessionResponse;
import com.exam.attendance.data.response.ExamSessionStateResponse;
import com.exam.attendance.repository.*;
import com.exam.attendance.security.SecurityContextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamSessionService {

    private final ExamSessionRepository examSessionRepo;
    private final ExamRepository examRepo;
    private final UserRepository userRepo;
    private final ExamRegistrationRepository registrationRepo;
    private final AttendanceSessionRepository attendanceSessionRepo;
    private final IdentityVerificationRepository verificationRepo;
    private final ExamSessionStateService examSessionStateService;

    // =========================================================
    // START EXAM
    // =========================================================
    @Transactional
    public ExamSessionResponse startExam(
            Long userId,
            Long examId,
            String deviceId
    ) {

        Long currentUser =
                SecurityContextUtils.getCurrentUserId();

        if (!currentUser.equals(userId)) {

            throw new RuntimeException("Không có quyền");
        }

        User user =
                userRepo.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found"));
        validateUserVerified(user);

        Exam exam =
                examRepo.findById(examId)
                        .orElseThrow(() -> new RuntimeException("Exam not found"));

        // =====================================================
        // CHECK REGISTRATION
        // =====================================================
        ExamRegistration reg =
                registrationRepo
                        .findByExamIdAndUserId(
                                examId,
                                userId
                        )
                        .orElseThrow(() -> new RuntimeException("User not registered"));

        if (reg.getStatus() != null
                && reg.getStatus() == 3) {
            throw new RuntimeException("User is banned");
        }

        // =====================================================
        // CHECK TIME
        // =====================================================
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(exam.getStartTime()) || now.isAfter(exam.getEndTime())) {
            throw new RuntimeException("Exam not active");
        }

        // =====================================================
        // FIND EXISTING SESSION
        // =====================================================
        ExamSession existingSession =
                examSessionRepo
                        .findFirstByUserIdAndExamIdAndStatusInOrderBySessionStartDesc(
                                userId,
                                examId,
                                List.of(
                                        ExamSessionStatus.CHECKED_IN,
                                        ExamSessionStatus.IN_PROGRESS,
                                        ExamSessionStatus.PENDING_REVIEW,
                                        ExamSessionStatus.PENDING_DEVICE_APPROVAL
                                )
                        )
                        .orElse(null);

        if (existingSession != null) {
            return ExamSessionMapper.toResponse(
                    existingSession
            );
        }

        ExamRoom room =
                reg.getRoom();

        if (room == null) {
            throw new RuntimeException("Bạn chưa được phân phòng");
        }

        long count =
                examSessionRepo.countByRoomId(room.getId());
        if (count >= room.getMaxStudents()) {
            throw new RuntimeException("Phòng đã đầy");
        }

        if (deviceId == null || deviceId.isBlank()) {
            throw new RuntimeException("Thiết bị không hợp lệ");
        }

        ExamSession s = new ExamSession();
        s.setUser(user);
        s.setExam(exam);
        s.setRoom(room);
        s.setSessionStart(null);
        s.setSessionEnd(null);
        s.setStatus(ExamSessionStatus.INIT);
        s.setIsFlagged(false);
        s.setDeviceId(deviceId);
        s.setCreatedAt(LocalDateTime.now());
        return ExamSessionMapper.toResponse(examSessionRepo.save(s));
    }

    // =========================================================
    // ENTER EXAM
    // =========================================================
    @Transactional
    public void enterExam(
            Long sessionId
    ) {

        ExamSession session =
                examSessionRepo.findById(sessionId)
                        .orElseThrow(() ->
                                new RuntimeException("Session not found"));

        Long currentUserId = SecurityContextUtils.getCurrentUserId();

        if (!session.getUser()
                .getId()
                .equals(currentUserId)) {

            throw new RuntimeException("Không có quyền");
        }

        validateAttendanceVerified(session);
        validateInitialVerify(session);

        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Phiên thi đã bị khóa");
        }

        if (session.getStatus() == ExamSessionStatus.PENDING_REVIEW) {
            throw new RuntimeException("Đang chờ giám thị duyệt");
        }

        if (session.getStatus() == ExamSessionStatus.PENDING_DEVICE_APPROVAL) {
            throw new RuntimeException("Đang chờ duyệt đổi thiết bị");
        }

        examSessionStateService.updateStatus(
                session,
                ExamSessionStatus.IN_PROGRESS,
                "Đã được phép vào thi"
        );

        session.setSessionStart(LocalDateTime.now());
        session.setLastSeenAt(LocalDateTime.now());
        examSessionRepo.save(session);
    }

    // =========================================================
    // VALIDATE ATTENDANCE
    // =========================================================
    private void validateAttendanceVerified(
            ExamSession session
    ) {

        AttendanceSession attendance =
                attendanceSessionRepo
                        .findByExamSessionId(
                                session.getId()
                        )
                        .orElseThrow(() -> new RuntimeException("Bạn chưa điểm danh"));

        if (attendance.getStatus() != AttendanceStatus.VERIFIED) {
            throw new RuntimeException("Điểm danh chưa được xác thực");
        }
    }

    // =========================================================
    // VALIDATE INITIAL VERIFY
    // =========================================================
    private void validateInitialVerify(
            ExamSession session
    ) {

        LocalDateTime fromTime = LocalDateTime.now().minusMinutes(5);

        boolean verified =
                verificationRepo
                        .existsInitialVerified(
                                session.getId(),
                                fromTime
                        );

        if (!verified) {
            throw new RuntimeException("Bạn chưa xác minh khuôn mặt");
        }
    }

    // =========================================================
    // USER VERIFIED
    // =========================================================
    private void validateUserVerified(
            User user
    ) {

        UserProfile profile = user.getUserProfile();

        if (profile == null) {
            throw new RuntimeException("User chưa có hồ sơ cá nhân");
        }

        if (profile.getCitizenId() == null || profile.getCitizenId().isBlank()) {
            throw new RuntimeException("Chưa có CCCD");
        }
    }

    // =========================================================
    // END EXAM
    // =========================================================
    @Transactional
    public void endExam(
            Long sessionId
    ) {

        ExamSession session =
                examSessionRepo.findById(sessionId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Session not found"
                                )
                        );

        Long currentUserId = SecurityContextUtils.getCurrentUserId();

        if (!session.getUser()
                .getId()
                .equals(currentUserId)) {

            throw new RuntimeException("Không có quyền");
        }

        if (session.getStatus() == ExamSessionStatus.DONE) {
            throw new RuntimeException("Session đã kết thúc");
        }

        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Session đã bị khóa");
        }

        session.setSessionEnd(LocalDateTime.now());
        examSessionStateService.updateStatus(
                session,
                ExamSessionStatus.DONE,
                "Bài thi đã kết thúc"
        );

        examSessionRepo.save(session);
    }

    // =========================================================
    // GET
    // =========================================================
    public ExamSession getById(
            Long id
    ) {

        return examSessionRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Session not found")
                );
    }

    public ExamSessionResponse getExamSessionById(
            Long id
    ) {

        ExamSession session =
                examSessionRepo.findById(id)
                        .orElseThrow(() -> new RuntimeException("Session not found")
                        );

        return ExamSessionMapper.toResponse(
                session
        );
    }

    public List<ExamSession> getAll() {

        return examSessionRepo.findAll();
    }

    public List<ExamSessionResponse> getByUser(
            Long userId
    ) {

        return examSessionRepo.findByUserId(userId)
                .stream()
                .map(ExamSessionMapper::toResponse)
                .toList();
    }

    // =========================================================
    // SAVE
    // =========================================================
    public void save(
            ExamSession session
    ) {

        examSessionRepo.save(session);
    }

    // =========================================================
    // DASHBOARD
    // =========================================================
    public Page<ProctorDashboard> getDashboard(
            ProctorDashboardFilterRequest req
    ) {

        Pageable pageable =
                PageRequest.of(
                        req.getPage() != null
                                ? req.getPage()
                                : 0,

                        req.getSize() != null
                                ? req.getSize()
                                : 20,

                        Sort.by(
                                Sort.Direction.DESC,
                                "sessionId"
                        )
                );

        String keyword =
                (req.getKeyword() == null
                        || req.getKeyword().isBlank())
                        ? ""
                        : req.getKeyword();

        List<ProctorDashboard> data =
                examSessionRepo.findDashboard(
                        req.getRoomId(),
                        req.getStatus(),
                        req.getFlagged(),
                        keyword
                );

        if (data.isEmpty()) {

            return Page.empty(pageable);
        }

        List<ProctorDashboard> result =
                data.stream()
                        .peek(dto ->
                                dto.setRiskLevel(
                                        calculateRisk(
                                                dto.getLastConfidence(),
                                                dto.getFlagged(),
                                                dto.getAttendanceStatus()
                                        )
                                )
                        )
                        .toList();

        int start = (int) pageable.getOffset();

        int end = Math.min(
                        start + pageable.getPageSize(),
                        result.size()
                );

        List<ProctorDashboard> pageContent = start >= result.size()
                        ? List.of()
                        : result.subList(start, end);

        return new PageImpl<>(
                pageContent,
                pageable,
                result.size()
        );
    }

    public List<Object[]> getDashboardRaw(
            Long roomId
    ) {

        return examSessionRepo
                .getDashboardFull(roomId);
    }

    public List<ExamSession> getFlaggedSessions() {

        return examSessionRepo
                .findFlaggedSessions();
    }

    // =========================================================
    // RISK
    // =========================================================
    private RiskLevel calculateRisk(
            Double confidence,
            Boolean flagged,
            AttendanceStatus attendanceStatus
    ) {

        int score = 0;
        if (Boolean.TRUE.equals(flagged)) {
            score += 3;
        }
        if (confidence == null) {
            score += 2;

        } else if (confidence < 0.5) {
            score += 3;
        } else if (confidence < 0.75) {
            score += 1;
        }

        if (attendanceStatus == null) {
            score += 2;
        } else if (
                attendanceStatus != AttendanceStatus.VERIFIED
        ) {
            score += 1;
        }
        if (score >= 5)
            return RiskLevel.HIGH;
        if (score >= 2)
            return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }

    // =========================================================
    // MY ROOM
    // =========================================================
    @Transactional
    public MyRoomInfoDTO getMyRoomInfo(
            Long userId,
            Long examId
    ) {

        LocalDateTime now = LocalDateTime.now();
        ExamRegistration reg =
                registrationRepo
                        .findByUserIdAndExam_Id(
                                userId,
                                examId
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy đăng ký kỳ thi"
                                )
                        );

        if (reg.getExam()
                .getStartTime()
                .isAfter(now)
                || reg.getExam()
                .getEndTime()
                .isBefore(now)) {

            throw new RuntimeException("Kỳ thi không nằm trong thời gian hợp lệ");
        }

        ExamRoom room = reg.getRoom();

        if (room == null) {
            throw new RuntimeException("Bạn chưa được phân phòng");
        }

        MyRoomInfoDTO dto = new MyRoomInfoDTO();
        dto.setExamId(reg.getExam().getId());
        dto.setExamTitle(reg.getExam().getTitle());
        dto.setRoomId(room.getId());
        dto.setRoomCode(room.getRoomCode());
        dto.setSeatNumber(reg.getSeatNumber());

        return dto;
    }

    public ExamSessionStateResponse getSessionState(
            Long sessionId
    ) {

        ExamSession session =
                examSessionRepo.findById(sessionId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Session not found"
                                )
                        );

        Long currentUserId = SecurityContextUtils.getCurrentUserId();
        if (!session.getUser()
                .getId()
                .equals(currentUserId)) {

            throw new RuntimeException("Không có quyền");
        }

        AttendanceSession attendance =
                attendanceSessionRepo
                        .findByExamSessionId(
                                sessionId
                        )
                        .orElse(null);

        ExamSessionStateResponse r = new ExamSessionStateResponse();
        r.setSessionId(sessionId);
        r.setSessionStatus(session.getStatus());

        if (attendance != null) {
            r.setAttendanceStatus(attendance.getStatus());
        }

        // BLOCKED
        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            r.setBlocked(true);
            r.setCanEnterExam(false);
            r.setWaitingProctor(false);
            r.setMessage("Phiên thi đã bị khóa");

            return r;
        }

        // PENDING REVIEW
        if (session.getStatus() == ExamSessionStatus.PENDING_REVIEW) {
            r.setBlocked(false);
            r.setCanEnterExam(false);
            r.setWaitingProctor(true);
            r.setMessage("Đang chờ giám thị xác minh");

            return r;
        }

        // VERIFIED
        if (attendance != null && attendance.getStatus() == AttendanceStatus.VERIFIED) {

            boolean initialVerified =
                    verificationRepo
                            .existsInitialVerified(
                                    session.getId(),
                                    LocalDateTime.now()
                                            .minusMinutes(5)
                            );

            r.setBlocked(false);
            r.setWaitingProctor(false);
            r.setCanEnterExam(initialVerified);
            r.setMessage(
                    initialVerified
                            ? "Được phép vào thi"
                            : "Chưa xác minh khuôn mặt"
            );

            return r;
        }

        // DEFAULT
        r.setBlocked(false);
        r.setWaitingProctor(false);
        r.setCanEnterExam(false);
        r.setMessage("Chưa điểm danh");

        return r;
    }

    // =========================================================
    // ENTITY
    // =========================================================
    public ExamSessionResponse getEntity(
            Long id
    ) {

        ExamSession session =
                examSessionRepo.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Session not found"
                                )
                        );

        return ExamSessionMapper.toResponse(
                session
        );
    }

    // =========================================================
    // INIT SESSION
    // =========================================================
    @Transactional
    public ExamSessionResponse initSession(
            Long userId,
            Long examId,
            String deviceId
    ) {

        Long currentUser = SecurityContextUtils.getCurrentUserId();
        if (!currentUser.equals(userId)) {
            throw new RuntimeException("Không có quyền");
        }

        User user =
                userRepo.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found"));

        validateUserVerified(user);
        Exam exam =
                examRepo.findById(examId)
                        .orElseThrow(() -> new RuntimeException("Exam not found"));

        ExamRegistration reg =
                registrationRepo
                        .findByExamIdAndUserId(
                                examId,
                                userId
                        )
                        .orElseThrow(() ->
                                new RuntimeException("User not registered")
                        );

        if (reg.getStatus() != null
                && reg.getStatus() == 3) {
            throw new RuntimeException("User is banned");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(exam.getStartTime()) || now.isAfter(exam.getEndTime())) {
            throw new RuntimeException("Exam not active");
        }

        ExamSession existing = examSessionRepo.findFirstByUserIdAndExamIdOrderByIdDesc(
                                userId,
                                examId
                        )
                        .orElse(null);

        if (existing != null
                && existing.getStatus()
                != ExamSessionStatus.DONE) {

            return ExamSessionMapper.toResponse(
                    existing
            );
        }

        ExamRoom room = reg.getRoom();
        if (room == null) {
            throw new RuntimeException("Bạn chưa được phân phòng");
        }

        if (deviceId == null || deviceId.isBlank()) {
            throw new RuntimeException("Thiết bị không hợp lệ");
        }


        ExamSession session = new ExamSession();
        session.setUser(user);
        session.setExam(exam);
        session.setRoom(room);
        session.setDeviceId(deviceId);
        examSessionStateService.updateStatus(
                session,
                ExamSessionStatus.INIT,
                "Phiên thi đã được khởi tạo"
        );
        session.setIsFlagged(false);
        session.setSessionStart(null);
        session.setSessionEnd(null);
        session.setLastSeenAt(LocalDateTime.now());
        session.setCreatedAt(LocalDateTime.now());
        ExamSession saved = examSessionRepo.save(session);

        log.info(
                "Init exam session success sessionId={} userId={}",
                saved.getId(),
                userId
        );

        return ExamSessionMapper.toResponse(
                saved
        );
    }
}