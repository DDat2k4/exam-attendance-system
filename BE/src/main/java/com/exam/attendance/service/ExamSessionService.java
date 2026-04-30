package com.exam.attendance.service;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.mapper.ExamSessionMapper;
import com.exam.attendance.data.pojo.MyRoomInfoDTO;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.pojo.enums.RiskLevel;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import com.exam.attendance.data.response.ExamSessionResponse;
import com.exam.attendance.repository.*;
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
    private final ExamRoomRepository roomRepo;
    private final ExamRegistrationRepository registrationRepo;

    @Transactional
    public ExamSessionResponse startExam(Long userId, Long examId, String deviceId) {

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        validateUserVerified(user);

        Exam exam = examRepo.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        // Kiểm tra đăng ký
        ExamRegistration reg = registrationRepo
                .findByExamIdAndUserId(examId, userId)
                .orElseThrow(() -> new RuntimeException("User not registered"));

        if (reg.getStatus() != null && reg.getStatus() == 3) {
            throw new RuntimeException("User is banned");
        }

        // Kiểm tra thời gian
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(exam.getStartTime()) || now.isAfter(exam.getEndTime())) {
            throw new RuntimeException("Exam not active");
        }

        // Kiểm tra session trùng
        if (examSessionRepo.existsByUserIdAndExamIdAndSessionEndIsNull(userId, examId)) {
            throw new RuntimeException("Already started exam");
        }

        ExamRoom room = reg.getRoom();

        if (room == null) {
            throw new RuntimeException("Bạn chưa được phân phòng");
        }

        // Check room full
        long count = examSessionRepo.countByRoomId(room.getId());
        if (count >= room.getMaxStudents()) {
            throw new RuntimeException("Phòng đã đầy");
        }

        // validate device
        if (deviceId == null || deviceId.isBlank()) {
            throw new RuntimeException("Thiết bị không hợp lệ");
        }

        // Tạo session
        ExamSession s = new ExamSession();
        s.setUser(user);
        s.setExam(exam);
        s.setRoom(room);
        s.setSessionStart(now);
        s.setStatus(ExamSessionStatus.STARTED);
        s.setIsFlagged(false);
        s.setDeviceId(deviceId);

        return ExamSessionMapper.toResponse(examSessionRepo.save(s));
    }

    //Kiểm tra xác thực
    private void validateUserVerified(User user) {

        UserProfile profile = user.getUserProfile();

        if (profile == null) {
            throw new RuntimeException("User chưa có hồ sơ cá nhân");
        }

        if (profile.getCitizenId() == null || profile.getCitizenId().isBlank()) {
            throw new RuntimeException("Chưa có CCCD");
        }

        if (!Boolean.TRUE.equals(profile.getIsVerified())) {
            throw new RuntimeException("CCCD chưa được xác thực");
        }
    }

//    private ExamRoom assignRoom(Long examId) {
//
//        List<ExamRoom> rooms = roomRepo.findByExamId(examId);
//
//        // TH1: chưa tạo phòng
//        if (rooms.isEmpty()) {
//            throw new RuntimeException("Chưa tạo phòng thi cho kỳ thi này");
//        }
//
//        // TH2: có phòng nhưng full
//        return rooms.stream()
//                .filter(room -> {
//                    long count = examSessionRepo.countByRoomId(room.getId());
//                    return count < room.getMaxStudents();
//                })
//                .min((r1, r2) -> {
//                    long c1 = examSessionRepo.countByRoomId(r1.getId());
//                    long c2 = examSessionRepo.countByRoomId(r2.getId());
//                    return Long.compare(c1, c2);
//                })
//                .orElseThrow(() -> new RuntimeException("Tất cả phòng thi đã đầy"));
//    }

    @Transactional
    public void endExam(Long sessionId) {

        ExamSession session = examSessionRepo.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        session.setSessionEnd(LocalDateTime.now());
        session.setStatus(ExamSessionStatus.DONE);

        examSessionRepo.save(session);
    }

    public ExamSession getById(Long id) {
        return examSessionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
    }

    public ExamSessionResponse getExamSessionById(Long id) {
        ExamSession examSessionResponse = examSessionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return  ExamSessionMapper.toResponse(examSessionResponse);
    }

    public List<ExamSession> getAll() {
        return examSessionRepo.findAll();
    }

    public List<ExamSessionResponse> getByUser(Long userId) {
        List<ExamSessionResponse> examSessionList = examSessionRepo.findByUserId(userId).stream().map(ExamSessionMapper::toResponse).toList();
        return examSessionList;
    }

    public Page<ProctorDashboardDTO> getDashboard(ProctorDashboardFilterRequest req) {

        Pageable pageable = PageRequest.of(
                req.getPage() != null ? req.getPage() : 0,
                req.getSize() != null ? req.getSize() : 20,
                Sort.by(Sort.Direction.DESC, "sessionId")
        );

        String keyword = req.getKeyword();
        if (keyword == null || keyword.isBlank()) {
            keyword = "";
        }
        List<ProctorDashboardDTO> data =
                examSessionRepo.findDashboard(
                        req.getRoomId(),
                        req.getStatus(),
                        req.getFlagged(),
                        keyword
                );

        if (data.isEmpty()) {
            return Page.empty(pageable);
        }

        List<ProctorDashboardDTO> result = data.stream()
                .peek(dto -> {
                    dto.setRiskLevel(
                            calculateRisk(
                                    dto.getLastConfidence(),
                                    dto.getFlagged(),
                                    dto.getAttendanceStatus()
                            )
                    );
                })
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), result.size());

        List<ProctorDashboardDTO> pageContent =
                start >= result.size() ? List.of() : result.subList(start, end);

        return new PageImpl<>(pageContent, pageable, result.size());
    }

    public void save(ExamSession session) {
        examSessionRepo.save(session);
    }

    public List<Object[]> getDashboardRaw(Long roomId) {
        return examSessionRepo.getDashboardFull(roomId);
    }

    public List<ExamSession> getFlaggedSessions() {
        return examSessionRepo.findFlaggedSessions();
    }

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
        } else if (attendanceStatus != AttendanceStatus.VERIFIED) {
            score += 1;
        }

        if (score >= 5) return RiskLevel.HIGH;
        if (score >= 2) return RiskLevel.MEDIUM;

        return RiskLevel.LOW;
    }

    public MyRoomInfoDTO getMyRoomInfo(Long userId) {

        LocalDateTime now = LocalDateTime.now();

        ExamRegistration reg = registrationRepo
                .findByUserIdAndExam_StartTimeBeforeAndExam_EndTimeAfter(userId, now, now)
                .orElseThrow(() -> new RuntimeException("Không có kỳ thi đang diễn ra"));

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

    public ExamSessionResponse getEntity(Long id) {
        ExamSession session = examSessionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return ExamSessionMapper.toResponse(session);
    }
}