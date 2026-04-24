package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.ExamRegistration;
import com.exam.attendance.data.response.ExamRegistrationResponse;

public class ExamRegistrationMapper {

    public static ExamRegistrationResponse toResponse(ExamRegistration dto) {
        if (dto == null) return null;

        ExamRegistrationResponse res = new ExamRegistrationResponse();
        res.setId(dto.getId());
        res.setUserId(dto.getUser().getId());
        res.setExamId(dto.getExam().getId());
        res.setStatus(dto.getStatus());
        res.setRegisteredAt(dto.getRegisteredAt());

        return res;
    }
}