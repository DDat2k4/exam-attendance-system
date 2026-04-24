package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.pojo.ExamRoomDTO;

public class ExamRoomMapper {
    public static ExamRoomDTO toDTO(ExamRoom r) {
        ExamRoomDTO dto = new ExamRoomDTO();
        dto.setId(r.getId());
        dto.setRoomCode(r.getRoomCode());
        dto.setMaxStudents(r.getMaxStudents());
        return dto;
    }
}
