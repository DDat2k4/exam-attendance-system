package com.exam.attendance.service.excel;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ImportExamService {

    private final ExamRoomRepository examRoomRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final CitizenCardRepository citizenCardRepository;
    private final UserProfileRepository userProfileRepository;

    @Transactional
    public void importFromExcel(MultipartFile file, Long examId) {

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {

            Exam exam = examRepository.findById(examId)
                    .orElseThrow(() -> new RuntimeException("Exam not found"));

            // Duyệt từng sheet = từng phòng
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {

                Sheet sheet = workbook.getSheetAt(i);
                String roomCode = sheet.getSheetName();

                ExamRoom room = examRoomRepository
                        .findByRoomCodeAndExamId(roomCode, examId)
                        .orElseThrow(() -> new RuntimeException("Room not found: " + roomCode));

                List<ExamRegistration> registrations = new ArrayList<>();
                Set<Integer> seats = new HashSet<>();

                // Đọc từng dòng
                for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {

                    Row row = sheet.getRow(rowIdx);
                    if (row == null) continue;

                    int seat = (int) row.getCell(0).getNumericCellValue();
                    String fullName = getString(row.getCell(1));
                    String cccd = getString(row.getCell(2));
                    String email = getString(row.getCell(3));

                    // Validate cơ bản
                    if (cccd.isBlank()) {
                        throw new RuntimeException("CCCD trống tại dòng " + rowIdx);
                    }

                    if (email.isBlank()) {
                        throw new RuntimeException("Email trống tại dòng " + rowIdx);
                    }

                    // Check trùng seat trong file
                    if (!seats.add(seat)) {
                        throw new RuntimeException("Trùng seat: " + seat + " (room " + roomCode + ")");
                    }

                    // Tìm hoặc tạo user
                    User user = findOrCreateUser(fullName, cccd, email);

                    // Find hoặc create registration
                    ExamRegistration reg = examRegistrationRepository
                            .findByExamIdAndUserId(examId, user.getId())
                            .orElseGet(() -> {
                                ExamRegistration r = new ExamRegistration();
                                r.setExam(exam);
                                r.setUser(user);
                                r.setRegisteredAt(LocalDateTime.now());
                                r.setStatus((short) 1); // REGISTERED
                                return r;
                            });

                    // Không overwrite nếu đã có phòng
                    if (reg.getRoom() != null) {
                        throw new RuntimeException("User đã có phòng: " + user.getId());
                    }

                    reg.setRoom(room);
                    reg.setSeatNumber(seat);

                    registrations.add(reg);
                }

                // check phòng đầy
                long current = examRegistrationRepository.countByRoomId(room.getId());
                if (current + registrations.size() > room.getMaxStudents()) {
                    throw new RuntimeException("Phòng " + roomCode + " bị đầy");
                }

                // Check seat đã tồn tại trong DB
                List<Integer> existingSeats =
                        examRegistrationRepository.findSeatNumbersByRoomId(room.getId());

                for (ExamRegistration r : registrations) {
                    if (existingSeats.contains(r.getSeatNumber())) {
                        throw new RuntimeException("Seat đã tồn tại: " + r.getSeatNumber());
                    }
                }

                // save batch
                examRegistrationRepository.saveAll(registrations);
            }

        } catch (Exception e) {
            throw new RuntimeException("Import failed: " + e.getMessage(), e);
        }
    }

    // Helper: tìm hoặc tạo user
    private User findOrCreateUser(String name, String cccd, String email) {

        return userRepository
                .findByCitizenCard_CitizenId(cccd)
                .orElseGet(() ->
                        userRepository.findByEmail(email)
                                .orElseGet(() -> createUser(name, cccd, email))
                );
    }

    // Tạo user mới
    private User createUser(String name, String cccd, String email) {

        User user = new User();
        user.setUsername("user_" + cccd);
        user.setEmail(email);
        user.setActive((short) 1);

        userRepository.save(user);

        CitizenCard card = new CitizenCard();
        card.setCitizenId(cccd);
        card.setUser(user);
        citizenCardRepository.save(card);

        UserProfile profile = new UserProfile();
        profile.setName(name);
        profile.setUser(user);
        userProfileRepository.save(profile);

        return user;
    }

    // Đọc string an toàn
    private String getString(Cell cell) {
        if (cell == null) return "";
        cell.setCellType(CellType.STRING);
        return cell.getStringCellValue().trim();
    }
}