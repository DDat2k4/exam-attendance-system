package com.exam.attendance.controller;

import com.exam.attendance.service.excel.ExcelExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ExcelExportService excelExportService;

    @GetMapping("/export-excel")
    @PreAuthorize("hasAuthority('EXPORT_REPORT')")
    public ResponseEntity<byte[]> exportExcel(@RequestParam Long roomId) {

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
