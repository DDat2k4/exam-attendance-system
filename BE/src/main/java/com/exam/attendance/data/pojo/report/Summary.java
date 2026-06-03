package com.exam.attendance.data.pojo.report;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SummaryDTO {

    private Long total;
    private Long verified;
    private Long failed;
    private Long blocked;
    private Long pending;

    public SummaryDTO(Number total,
                      Number verified,
                      Number failed,
                      Number blocked,
                      Number pending) {

        this.total = total != null ? total.longValue() : 0L;
        this.verified = verified != null ? verified.longValue() : 0L;
        this.failed = failed != null ? failed.longValue() : 0L;
        this.blocked = blocked != null ? blocked.longValue() : 0L;
        this.pending = pending != null ? pending.longValue() : 0L;
    }
}
