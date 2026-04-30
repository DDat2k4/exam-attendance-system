package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.Exam;
import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.pojo.ExamRoomDTO;
import com.exam.attendance.data.request.ExamRoomRequest;

public class ExamRoomMapper {
    public static ExamRoomDTO toDTO(ExamRoom r) {
        ExamRoomDTO dto = new ExamRoomDTO();
        dto.setId(r.getId());
        dto.setRoomCode(r.getRoomCode());
        dto.setMaxStudents(r.getMaxStudents());
        return dto;
    }

    public static ExamRoom toEntity(ExamRoomRequest req, Exam exam) {
        ExamRoom r = new ExamRoom();
        r.setRoomCode(req.getRoomCode());
        r.setMaxStudents(req.getMaxStudents());
        r.setExam(exam);
        return r;
    }
}
