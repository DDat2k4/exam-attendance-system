package com.exam.attendance.service.exam;

import com.exam.attendance.data.entity.Exam;
import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.mapper.ExamMapper;
import com.exam.attendance.data.request.ExamRequest;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.data.response.ExamResponse;
import com.exam.attendance.data.response.ExamRoomResponse;
import com.exam.attendance.repository.ExamRepository;
import com.exam.attendance.repository.ExamRoomRepository;
import com.exam.attendance.repository.ExamSessionRepository;
import com.exam.attendance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamRoomRepository roomRepository;
    private final UserRepository userRepository;
    private final ExamRoomRepository examRoomRepository;
    private final ExamSessionRepository examSessionRepository;

    // Create exam
    @Transactional
    public ExamResponse createExam(
            ExamRequest request,
            Long creatorId
    ) {

        User user =
                userRepository.findById(creatorId)
                        .orElseThrow(() -> new RuntimeException("User not found"));

        // Check unique examCode + semester
        boolean exists =
                examRepository
                        .existsByExamCodeAndSemester(
                                request.getExamCode(),
                                request.getSemester()
                        );

        if (exists) {
            throw new RuntimeException("Mã môn thi đã tồn tại trong học kỳ");
        }

        Exam exam = new Exam();

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setExamCode(request.getExamCode());
        exam.setSemester(request.getSemester());
        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());
        exam.setCreatedAt(LocalDateTime.now());
        exam.setCreatedBy(user);

        return ExamMapper.toResponse(
                examRepository.save(exam)
        );
    }

    // Get exams
    @Transactional(readOnly = true)
    public Page<ExamResponse> getExams(
            String keyword,
            int page,
            int size
    ) {

        Pageable pageable =
                PageRequest.of(page, size);

        if (keyword == null
                || keyword.isBlank()) {

            return examRepository
                    .findAll(pageable)
                    .map(ExamMapper::toResponse);
        }

        return examRepository
                .search(
                        keyword,
                        pageable
                )
                .map(ExamMapper::toResponse);
    }

    // Get by id
    @Transactional(readOnly = true)
    public Exam getById(Long id) {

        return examRepository
                .findDetailById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
    }

    // Get exam response
    public ExamResponse getExamById(
            Long id
    ) {

        return ExamMapper.toDetailResponse(
                getById(id)
        );
    }

    // Update exam
    @Transactional
    public ExamResponse updateExam(
            Long id,
            ExamRequest request,
            Long userId
    ) {

        Exam exam =
                getById(id);

        if (!exam.getCreatedBy()
                .getId()
                .equals(userId)) {
            throw new RuntimeException("No permission");
        }

        // Check unique examCode + semester
        boolean exists =
                examRepository
                        .existsByExamCodeAndSemesterAndIdNot(
                                request.getExamCode(),
                                request.getSemester(),
                                id
                        );

        if (exists) {
            throw new RuntimeException("Mã môn thi đã tồn tại trong học kỳ");
        }

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setExamCode(request.getExamCode());
        exam.setSemester(request.getSemester());
        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());
        return ExamMapper.toResponse(
                examRepository.save(exam)
        );
    }

    // Delete exam
    @Transactional
    public void deleteExam(
            Long id
    ) {

        Exam exam =
                getById(id);

        // Check session
        if (examSessionRepository
                .existsByExamId(id)) {

            throw new RuntimeException(
                    "Không thể xóa kỳ thi đã có phiên thi"
            );
        }

        // Check room
        if (examRoomRepository
                .existsByExamId(id)) {

            throw new RuntimeException(
                    "Không thể xóa kỳ thi đã có phòng thi"
            );
        }

        examRepository.delete(exam);
    }

    // Create room
    @Transactional
    public ExamRoomResponse createRoom(
            Long examId,
            ExamRoomRequest request
    ) {

        Exam exam = getById(examId);
        ExamRoom room = new ExamRoom();
        room.setRoomCode(request.getRoomCode());
        room.setMaxStudents(request.getMaxStudents());
        room.setExam(exam);
        return ExamMapper.toRoomResponse(
                roomRepository.save(room)
        );
    }

    // Delete room
    @Transactional
    public void deleteRoom(
            Long roomId
    ) {

        roomRepository.deleteById(roomId);
    }

    // Get entity
    public ExamResponse getExamEntity(
            Long id
    ) {
        Exam exam = getById(id);

        return ExamMapper.toResponse(exam);
    }
}