package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.service.excel.ExcelExportService;
import com.exam.attendance.service.security.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ExcelExportService excelExportService;
    private final AccessControlService accessControl;

    @GetMapping("/export-excel")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR')")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam Long roomId,
            Authentication auth
    ) {

        // check permission
        accessControl.checkPermission(auth, Resource.REPORT, Action.EXPORT);

        byte[] file = excelExportService.exportFullReport(roomId);

        String fileName = "report_session_" + roomId + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(file.length)
                .body(file);
    }
}
