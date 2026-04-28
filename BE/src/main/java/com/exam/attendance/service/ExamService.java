package com.exam.attendance.service;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.mapper.ExamMapper;
import com.exam.attendance.data.request.*;
import com.exam.attendance.data.response.ExamResponse;
import com.exam.attendance.data.response.ExamRoomResponse;
import com.exam.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamRoomRepository roomRepository;
    private final UserRepository userRepository;
    private final ExamRoomRepository examRoomRepository;
    private final ExamSessionRepository examSessionRepository;

    @Transactional
    public ExamResponse createExam(ExamRequest request, Long creatorId) {

        User user = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Exam exam = new Exam();
        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());
        exam.setCreatedAt(LocalDateTime.now());
        exam.setCreatedBy(user);

        return ExamMapper.toResponse(examRepository.save(exam));
    }

    @Transactional(readOnly = true)
    public Page<ExamResponse> getExams(
            String keyword,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        if (keyword == null || keyword.isBlank()) {
            return examRepository.findAll(pageable)
                    .map(ExamMapper::toResponse);
        }

        return examRepository
                .findByTitleContainingIgnoreCase(keyword, pageable)
                .map(ExamMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Exam getById(Long id) {
        return examRepository.findDetailById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
    }

    public ExamResponse getExamById(Long id) {
        return ExamMapper.toDetailResponse(getById(id));
    }

    @Transactional
    public ExamResponse updateExam(Long id, ExamRequest request, Long userId) {

        Exam exam = getById(id);

        if (!exam.getCreatedBy().getId().equals(userId)) {
            throw new RuntimeException("No permission");
        }

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());

        return ExamMapper.toResponse(examRepository.save(exam));
    }

    @Transactional
    public void deleteExam(Long id) {

        Exam exam = getById(id);

        // 1. check session
        if (examSessionRepository.existsByExamId(id)) {
            throw new RuntimeException("Không thể xóa kỳ thi đã có phiên thi");
        }

        // 2. check room
        if (examRoomRepository.existsByExamId(id)) {
            throw new RuntimeException("Không thể xóa kỳ thi đã có phòng thi");
        }

        examRepository.delete(exam);
    }
    @Transactional
    public ExamRoomResponse createRoom(Long examId, ExamRoomRequest request) {

        Exam exam = getById(examId);

        ExamRoom room = new ExamRoom();
        room.setRoomCode(request.getRoomCode());
        room.setMaxStudents(request.getMaxStudents());
        room.setExam(exam);

        return ExamMapper.toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public void deleteRoom(Long roomId) {
        roomRepository.deleteById(roomId);
    }

    public ExamResponse getExamEntity(Long id) {
        Exam exam = getById(id);
        return ExamMapper.toResponse(exam);
    }
}