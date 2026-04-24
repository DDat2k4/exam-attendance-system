package com.exam.attendance.service.excel;

import com.exam.attendance.data.pojo.report.*;
import com.exam.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExcelExportService {

    private final AttendanceLogRepository attendanceLogRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final ExamSessionRepository examSessionRepository;
    private final IdentityVerificationRepository identityVerificationRepository;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private CellStyle headerStyle;
    private CellStyle successStyle;
    private CellStyle failedStyle;
    private CellStyle normalStyle;

    public byte[] exportFullReport(Long roomId) {

        List<AttendanceReportDTO> attendance = attendanceSessionRepository.getAttendanceReport(roomId);
        List<VerificationReportDTO> verification = identityVerificationRepository.getVerificationReport(roomId);
        List<LogReportDTO> logs = attendanceLogRepository.getLogReport(roomId);
        SummaryDTO summary = examSessionRepository.getSummary(roomId);

        try (Workbook workbook = new SXSSFWorkbook()) {

            initStyles(workbook);

            createAttendanceSheet(workbook, attendance);
            createVerificationSheet(workbook, verification);
            createLogSheet(workbook, logs);
            createSummarySheet(workbook, summary);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Export Excel failed: " + e.getMessage(), e);
        }
    }

    private void initStyles(Workbook wb) {

        Font headerFont = wb.createFont();
        headerFont.setBold(true);

        headerStyle = wb.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        successStyle = wb.createCellStyle();
        successStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        successStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        failedStyle = wb.createCellStyle();
        failedStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
        failedStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        normalStyle = wb.createCellStyle();
        normalStyle.setAlignment(HorizontalAlignment.LEFT);
    }

    // Attendance
    private void createAttendanceSheet(Workbook wb, List<AttendanceReportDTO> data) {

        Sheet sheet = createSheetSafe(wb, "Attendance");

        String[] headers = {"STT", "CCCD", "Họ tên", "Status", "Checkin", "Verified By", "Room"};
        createHeader(sheet, headers);

        int rowIdx = 1, index = 1;

        for (AttendanceReportDTO dto : data) {
            Row row = sheet.createRow(rowIdx++);

            row.createCell(0).setCellValue(index++);
            row.createCell(1).setCellValue(nvl(dto.getCitizenId()));
            row.createCell(2).setCellValue(nvl(dto.getName()));

            Cell statusCell = row.createCell(3);
            String status = dto.getStatus() != null ? dto.getStatus().name() : "";
            statusCell.setCellValue(status);

            if ("SUCCESS".equals(status)) {
                statusCell.setCellStyle(successStyle);
            } else if ("FAILED".equals(status)) {
                statusCell.setCellStyle(failedStyle);
            }

            row.createCell(4).setCellValue(
                    dto.getCheckinTime() != null ? dto.getCheckinTime().format(FORMATTER) : ""
            );

            row.createCell(5).setCellValue(nvl(dto.getVerifiedBy()));
            row.createCell(6).setCellValue(nvl(dto.getRoomName()));
        }

        autoSize(sheet, headers.length);
    }

    // Verification
    private void createVerificationSheet(Workbook wb, List<VerificationReportDTO> data) {

        Sheet sheet = createSheetSafe(wb, "Verification");

        String[] headers = {"CCCD", "Attempt", "Result", "Confidence", "Reason", "Device"};
        createHeader(sheet, headers);

        int rowIdx = 1;

        for (VerificationReportDTO dto : data) {
            Row row = sheet.createRow(rowIdx++);

            row.createCell(0).setCellValue(nvl(dto.getCitizenId()));
            row.createCell(1).setCellValue(dto.getAttemptNo() != null ? dto.getAttemptNo() : 0);

            Cell resultCell = row.createCell(2);
            String result = Boolean.TRUE.equals(dto.getVerified()) ? "SUCCESS" : "FAILED";
            resultCell.setCellValue(result);

            if ("SUCCESS".equals(result)) {
                resultCell.setCellStyle(successStyle);
            } else {
                resultCell.setCellStyle(failedStyle);
            }

            row.createCell(3).setCellValue(dto.getConfidence() != null ? dto.getConfidence() : 0);
            row.createCell(4).setCellValue(nvl(dto.getFailReason()));
            row.createCell(5).setCellValue(nvl(dto.getDeviceId()));
        }

        autoSize(sheet, headers.length);
    }

    // Log
    private void createLogSheet(Workbook wb, List<LogReportDTO> data) {

        Sheet sheet = createSheetSafe(wb, "Logs");

        String[] headers = {"Action", "Type", "Result", "Time", "Detail"};
        createHeader(sheet, headers);

        int rowIdx = 1;

        for (LogReportDTO dto : data) {
            Row row = sheet.createRow(rowIdx++);

            row.createCell(0).setCellValue(nvl(dto.getAction()));
            row.createCell(1).setCellValue(nvl(dto.getType()));
            row.createCell(2).setCellValue(nvl(dto.getResult()));

            row.createCell(3).setCellValue(
                    dto.getCreatedAt() != null ? dto.getCreatedAt().format(FORMATTER) : ""
            );

            row.createCell(4).setCellValue(nvl(dto.getDetail()));
        }

        autoSize(sheet, headers.length);
    }

    // Summary
    private void createSummarySheet(Workbook wb, SummaryDTO s) {

        Sheet sheet = createSheetSafe(wb, "Summary");

        if (s == null) {
            s = new SummaryDTO(0L, 0L, 0L, 0L, 0L);
        }

        String[][] data = {
                {"Total", String.valueOf(nvlLong(s.getTotal()))},
                {"Verified", String.valueOf(nvlLong(s.getVerified()))},
                {"Failed", String.valueOf(nvlLong(s.getFailed()))},
                {"Blocked", String.valueOf(nvlLong(s.getBlocked()))},
                {"Pending", String.valueOf(nvlLong(s.getPending()))},
        };

        for (int i = 0; i < data.length; i++) {
            Row row = sheet.createRow(i);

            Cell key = row.createCell(0);
            key.setCellValue(data[i][0]);
            key.setCellStyle(headerStyle);

            row.createCell(1).setCellValue(data[i][1]);
        }

        autoSize(sheet, 2);
    }

    private Sheet createSheetSafe(Workbook wb, String name) {
        Sheet sheet = wb.createSheet(name);

        if (sheet instanceof org.apache.poi.xssf.streaming.SXSSFSheet sxSheet) {
            sxSheet.trackAllColumnsForAutoSizing();
        }

        return sheet;
    }

    private void createHeader(Sheet sheet, String[] headers) {
        Row header = sheet.createRow(0);

        for (int i = 0; i < headers.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));
    }

    private void autoSize(Sheet sheet, int colCount) {
        for (int i = 0; i < colCount; i++) {
            try {
                sheet.autoSizeColumn(i);
            } catch (Exception e) {
                sheet.setColumnWidth(i, 5000);
            }
        }
    }

    private String nvl(String v) {
        return v != null ? v : "";
    }

    private Long nvlLong(Long v) {
        return v != null ? v : 0L;
    }
}