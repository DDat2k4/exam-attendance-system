package com.exam.attendance.service;

import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.mapper.ExamRoomMapper;
import com.exam.attendance.data.pojo.ExamRoomDTO;
import com.exam.attendance.repository.ExamRoomRepository;
import com.exam.attendance.repository.ExamSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamRoomService {

    private final ExamRoomRepository examRoomRepository;
    private final ExamSessionRepository examSessionRepository;

    // GET LIST BY EXAM
    public List<ExamRoomDTO> getRoomsByExam(Long examId) {
        return examRoomRepository.findByExamId(examId)
                .stream()
                .map(ExamRoomMapper::toDTO)
                .toList();
    }

    // GET DETAIL
    public ExamRoomDTO getById(Long id) {
        ExamRoom room = examRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        return ExamRoomMapper.toDTO(room);
    }

    // CREATE
    public ExamRoomDTO create(ExamRoom room) {
        return ExamRoomMapper.toDTO(
                examRoomRepository.save(room)
        );
    }

    // UPDATE
    public ExamRoomDTO update(Long id, ExamRoom request) {
        ExamRoom room = examRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        room.setRoomCode(request.getRoomCode());
        room.setMaxStudents(request.getMaxStudents());

        return ExamRoomMapper.toDTO(
                examRoomRepository.save(room)
        );
    }

    // DELETE
    public void delete(Long id) {

        if (!examRoomRepository.existsById(id)) {
            throw new RuntimeException("Room not found");
        }

        if (examSessionRepository.existsByRoomId(id)) {
            throw new RuntimeException("Không thể xóa phòng đã có thí sinh");
        }

        examRoomRepository.deleteById(id);
    }

    //Phân trang, lọc
    public Page<ExamRoomDTO> getRoomsByExam(
            Long examId,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        return examRoomRepository.findByExamId(examId, pageable)
                .map(ExamRoomMapper::toDTO);
    }
}
