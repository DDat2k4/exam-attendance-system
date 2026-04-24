package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.Exam;
import com.exam.attendance.data.entity.ExamRegistration;
import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.response.ExamRegistrationResponse;
import com.exam.attendance.data.response.ExamResponse;
import com.exam.attendance.data.response.ExamRoomResponse;

import java.util.List;
import java.util.stream.Collectors;

public class ExamMapper {

    public static ExamResponse toResponse(Exam exam) {
        if (exam == null) return null;

        ExamResponse res = new ExamResponse();
        res.setId(exam.getId());
        res.setTitle(exam.getTitle());
        res.setDescription(exam.getDescription());
        res.setStartTime(exam.getStartTime());
        res.setEndTime(exam.getEndTime());

        if (exam.getCreatedBy() != null) {
            res.setCreatedById(exam.getCreatedBy().getId());
            res.setCreatedByUsername(exam.getCreatedBy().getUsername());
        }

        if (exam.getRooms() != null) {
            List<ExamRoomResponse> rooms = exam.getRooms().stream()
                    .map(ExamMapper::toRoomResponse)
                    .collect(Collectors.toList());
            res.setRooms(rooms);
        }

        return res;
    }

    public static ExamRoomResponse toRoomResponse(ExamRoom room) {
        if (room == null) return null;

        ExamRoomResponse res = new ExamRoomResponse();
        res.setId(room.getId());
        res.setRoomCode(room.getRoomCode());
        res.setMaxStudents(room.getMaxStudents());

        return res;
    }

    public static ExamRegistrationResponse toRegistrationResponse(ExamRegistration reg) {
        if (reg == null) return null;

        ExamRegistrationResponse res = new ExamRegistrationResponse();
        res.setId(reg.getId());
        res.setExamId(reg.getExam().getId());
        res.setUserId(reg.getUser().getId());
        res.setStatus(reg.getStatus());

        return res;
    }

    public static ExamResponse toSimpleResponse(Exam exam) {
        if (exam == null) return null;

        ExamResponse res = new ExamResponse();
        res.setId(exam.getId());
        res.setTitle(exam.getTitle());
        res.setDescription(exam.getDescription());
        res.setStartTime(exam.getStartTime());
        res.setEndTime(exam.getEndTime());

        if (exam.getCreatedBy() != null) {
            res.setCreatedById(exam.getCreatedBy().getId());
            res.setCreatedByUsername(exam.getCreatedBy().getUsername());
        }

        return res;
    }

    public static ExamResponse toDetailResponse(Exam exam) {
        if (exam == null) return null;

        ExamResponse res = toSimpleResponse(exam);

        if (exam.getRooms() != null) {
            List<ExamRoomResponse> rooms = exam.getRooms().stream()
                    .map(ExamMapper::toRoomResponse)
                    .toList();
            res.setRooms(rooms);
        }

        return res;
    }
}