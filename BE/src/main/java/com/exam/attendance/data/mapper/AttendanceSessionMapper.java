package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.CitizenCard;
import com.exam.attendance.data.response.AttendanceSessionResponse;

public class AttendanceSessionMapper {

    public static AttendanceSessionResponse toResponse(
            AttendanceSession a
    ) {

        if (a == null) {
            return null;
        }

        AttendanceSessionResponse r =
                new AttendanceSessionResponse();

        r.setId(a.getId());

        r.setCheckinTime(
                a.getCheckinTime()
        );

        r.setAttendancePhoto(
                a.getAttendancePhoto()
        );

        r.setCccdPhoto(
                a.getCccdPhoto()
        );

        r.setConfidence(
                a.getConfidence()
        );

        r.setReviewNote(
                a.getReviewNote()
        );

        r.setStatus(
                a.getStatus()
        );

        r.setVerifiedAt(
                a.getVerifiedAt()
        );

        return r;
    }

    public static AttendanceSessionResponse toPendingResponse(AttendanceSession entity) {
        AttendanceSessionResponse response = toResponse(entity);

        CitizenCard citizenCard = entity.getExamSession().getUser().getCitizenCard();
        response.setStudentName(citizenCard.getFullName());
        response.setCitizenId(citizenCard.getCitizenId());

        return response;
    }
}