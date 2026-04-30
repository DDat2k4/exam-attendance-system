package com.exam.attendance.service;

import com.exam.attendance.data.entity.Exam;
import com.exam.attendance.data.entity.ExamRegistration;
import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.mapper.ExamMapper;
import com.exam.attendance.data.mapper.ExamRoomMapper;
import com.exam.attendance.data.pojo.ExamRoomDTO;
import com.exam.attendance.data.pojo.RoomStudentDTO;
import com.exam.attendance.data.pojo.StudentSeatDTO;
import com.exam.attendance.data.request.AssignRoomBatchRequest;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.repository.ExamRegistrationRepository;
import com.exam.attendance.repository.ExamRepository;
import com.exam.attendance.repository.ExamRoomRepository;
import com.exam.attendance.repository.ExamSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamRoomService {

    private final ExamRoomRepository examRoomRepository;
    private final ExamSessionRepository examSessionRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final ExamRepository examRepository;

    // Lấy danh sách room theo examId
    public List<ExamRoomDTO> getRoomsByExam(Long examId) {
        return examRoomRepository.findByExamId(examId)
                .stream()
                .map(ExamRoomMapper::toDTO)
                .toList();
    }

    // Lấy room theo id
    public ExamRoomDTO getById(Long id) {
        ExamRoom room = examRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        return ExamRoomMapper.toDTO(room);
    }

    // Tạo room
    public ExamRoomDTO create(ExamRoomRequest room) {

        Exam exam = examRepository.findById(room.getExamId())
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        ExamRoom examRoom = ExamRoomMapper.toEntity(room, exam);

        return ExamRoomMapper.toDTO(
                examRoomRepository.save(examRoom)
        );
    }

    // Cập nhật room
    public ExamRoomDTO update(Long id, ExamRoomRequest request) {
        ExamRoom room = examRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        room.setRoomCode(request.getRoomCode());
        room.setMaxStudents(request.getMaxStudents());

        return ExamRoomMapper.toDTO(
                examRoomRepository.save(room)
        );
    }

    // Xóa room
    public void delete(Long id) {

        if (!examRoomRepository.existsById(id)) {
            throw new RuntimeException("Room not found");
        }

        if (examSessionRepository.existsByRoomId(id)) {
            throw new RuntimeException("Không thể xóa phòng đã gán sinh viên");
        }

        if (examRegistrationRepository.existsByRoomId(id)) {
            throw new RuntimeException("Không thể xóa phòng đã được phân");
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

    @Transactional
    public void assignRoom(Long registrationId, Long roomId, Integer seat) {

        ExamRegistration reg = examRegistrationRepository.findById(registrationId)
                .orElseThrow(() -> new RuntimeException("Registration not found"));

        ExamRoom room = examRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // check cùng exam
        if (!room.getExam().getId().equals(reg.getExam().getId())) {
            throw new RuntimeException("Room không thuộc kỳ thi");
        }

        // không cho assign lại
        if (reg.getRoom() != null) {
            throw new RuntimeException("Thí sinh đã được phân phòng");
        }

        // validate seat
        if (seat == null) {
            throw new RuntimeException("Thiếu số ghế");
        }

        // check seat trùng
        if (examRegistrationRepository.existsByRoomIdAndSeatNumber(roomId, seat)) {
            throw new RuntimeException("Ghế đã có người");
        }

        // check full
        long count = examRegistrationRepository.countByRoomId(roomId);
        if (count >= room.getMaxStudents()) {
            throw new RuntimeException("Phòng đầy");
        }

        reg.setRoom(room);
        reg.setSeatNumber(seat);

        examRegistrationRepository.save(reg);
    }

    public Page<RoomStudentDTO> getStudentsInRoom(
            Long roomId,
            int page,
            int size
    ) {

        if (!examRoomRepository.existsById(roomId)) {
            throw new RuntimeException("Room not found");
        }

        Pageable pageable = PageRequest.of(page, size);

        return examRegistrationRepository.findStudentsByRoom(roomId, pageable);
    }

    @Transactional
    public void assignMultipleStudents(AssignRoomBatchRequest request) {

        ExamRoom room = examRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));

        List<Long> regIds = request.getStudents()
                .stream()
                .map(StudentSeatDTO::getRegistrationId)
                .toList();

        List<ExamRegistration> registrations =
                examRegistrationRepository.findAllById(regIds);

        if (registrations.size() != regIds.size()) {
            throw new RuntimeException("Có registration không tồn tại");
        }

        // Kiểm tra trùng seat (trong request)
        Set<Integer> seats = new HashSet<>();
        for (StudentSeatDTO s : request.getStudents()) {
            if (!seats.add(s.getSeatNumber())) {
                throw new RuntimeException("Trùng số ghế trong request: " + s.getSeatNumber());
            }
        }

        // Kiểm tra trùng seat (trong DB)
        List<Integer> existingSeats =
                examRegistrationRepository.findSeatNumbersByRoomId(room.getId());

        for (StudentSeatDTO s : request.getStudents()) {
            if (existingSeats.contains(s.getSeatNumber())) {
                throw new RuntimeException("Ghế đã tồn tại trong phòng: " + s.getSeatNumber());
            }
        }

        // Kiểm tra trùng Exam
        for (ExamRegistration reg : registrations) {
            if (!reg.getExam().getId().equals(room.getExam().getId())) {
                throw new RuntimeException("Có sinh viên không thuộc kỳ thi");
            }
        }

        // Kiểm tra sinh viên đã có phòng
        for (ExamRegistration reg : registrations) {
            if (reg.getRoom() != null) {
                throw new RuntimeException(
                        "User đã có phòng: " + reg.getUser().getId()
                );
            }
        }

        // Kiểm tra phòng full
        long current = examRegistrationRepository.countByRoomId(room.getId());

        if (current + registrations.size() > room.getMaxStudents()) {
            throw new RuntimeException("Phòng đã đầy");
        }

        // MAP seatNumber
        Map<Long, Integer> seatMap = request.getStudents()
                .stream()
                .collect(Collectors.toMap(
                        StudentSeatDTO::getRegistrationId,
                        StudentSeatDTO::getSeatNumber
                ));

        // Gán phòng
        for (ExamRegistration reg : registrations) {
            reg.setRoom(room);
            reg.setSeatNumber(seatMap.get(reg.getId()));
        }

        examRegistrationRepository.saveAll(registrations);
    }
}
