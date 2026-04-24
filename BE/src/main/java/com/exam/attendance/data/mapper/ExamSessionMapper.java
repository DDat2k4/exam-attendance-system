package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.response.ExamSessionResponse;

public class ExamSessionMapper {

    public static ExamSessionResponse toResponse(ExamSession s) {
        if (s == null) return null;

        ExamSessionResponse res = new ExamSessionResponse();
        res.setId(s.getId());
        res.setSessionStart(s.getSessionStart());
        res.setSessionEnd(s.getSessionEnd());
        res.setStatus(s.getStatus());
        res.setIsFlagged(s.getIsFlagged());
        res.setDeviceId(s.getDeviceId());

        if (s.getExam() != null)
            res.setExamId(s.getExam().getId());

        if (s.getUser() != null)
            res.setUserId(s.getUser().getId());

        if (s.getRoom() != null)
            res.setRoomId(s.getRoom().getId());

        return res;
    }
}