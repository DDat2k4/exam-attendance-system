package com.exam.attendance.service.excel;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.mapper.ExamRoomMapper;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

    private final DataFormatter dataFormatter = new DataFormatter();

    @Transactional
    public void importFromExcel(MultipartFile file, Long examId) {

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {

            Exam exam = examRepository.findById(examId)
                    .orElseThrow(() -> new RuntimeException("Exam not found"));

            // Duyệt từng sheet = từng phòng
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {

                Sheet sheet = workbook.getSheetAt(i);

                String roomCode = sheet.getSheetName()
                        .trim()
                        .toUpperCase();

                int totalStudents = countStudents(sheet);

                // Auto create room nếu chưa có
                ExamRoom room = examRoomRepository
                        .findByRoomCodeAndExamId(roomCode, examId)
                        .orElseGet(() -> {

                            ExamRoomRequest req = new ExamRoomRequest();
                            req.setRoomCode(roomCode);
                            req.setExamId(examId);

                            // set capacity theo số SV
                            req.setMaxStudents(totalStudents);

                            return createEntity(req);
                        });

                List<ExamRegistration> registrations = new ArrayList<>();

                // check trùng seat trong file
                Set<Integer> seats = new HashSet<>();

                // check seat tồn tại DB
                Set<Integer> existingSeats = new HashSet<>(
                        examRegistrationRepository
                                .findSeatNumbersByRoomId(room.getId())
                );

                // Đọc từng dòng
                for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {

                    Row row = sheet.getRow(rowIdx);

                    if (row == null) {
                        continue;
                    }

                    // bỏ dòng trống
                    if (isEmptyRow(row)) {
                        continue;
                    }

                    int seat = (int) row.getCell(0).getNumericCellValue();

                    String fullName = getString(row.getCell(1));
                    String cccd = getString(row.getCell(2));
                    String email = getString(row.getCell(3));

                    // Validate
                    if (seat <= 0) {
                        throw new RuntimeException(
                                "Seat không hợp lệ tại dòng " + (rowIdx + 1)
                        );
                    }

                    if (fullName.isBlank()) {
                        throw new RuntimeException(
                                "Tên trống tại dòng " + (rowIdx + 1)
                        );
                    }

                    if (cccd.isBlank()) {
                        throw new RuntimeException(
                                "CCCD trống tại dòng " + (rowIdx + 1)
                        );
                    }

                    if (!cccd.matches("\\d{9,12}")) {
                        throw new RuntimeException(
                                "CCCD không hợp lệ tại dòng " + (rowIdx + 1)
                        );
                    }

                    if (email.isBlank()) {
                        throw new RuntimeException(
                                "Email trống tại dòng " + (rowIdx + 1)
                        );
                    }

                    // check seat trùng trong file
                    if (!seats.add(seat)) {
                        throw new RuntimeException(
                                "Trùng seat " + seat +
                                        " trong phòng " + roomCode
                        );
                    }

                    // check seat tồn tại DB
                    if (existingSeats.contains(seat)) {
                        throw new RuntimeException(
                                "Seat đã tồn tại: " + seat
                        );
                    }

                    // Tìm hoặc tạo user
                    User user = findOrCreateUser(
                            fullName,
                            cccd,
                            email
                    );

                    // registration
                    ExamRegistration reg = examRegistrationRepository
                            .findByExamIdAndUserId(examId, user.getId())
                            .orElseGet(() -> {

                                ExamRegistration r = new ExamRegistration();

                                r.setExam(exam);
                                r.setUser(user);
                                r.setRegisteredAt(LocalDateTime.now());
                                r.setStatus((short) 1);

                                return r;
                            });

                    // Không overwrite nếu đã có phòng
                    if (reg.getRoom() != null) {
                        throw new RuntimeException(
                                "User đã có phòng: " + user.getId()
                        );
                    }

                    reg.setRoom(room);
                    reg.setSeatNumber(seat);

                    registrations.add(reg);
                }

                // check capacity
                long current = examRegistrationRepository
                        .countByRoomId(room.getId());

                if (current + registrations.size() > room.getMaxStudents()) {

                    throw new RuntimeException(
                            "Phòng " + roomCode + " bị đầy"
                    );
                }

                // save batch
                examRegistrationRepository.saveAll(registrations);
            }

        } catch (Exception e) {

            throw new RuntimeException(
                    "Import failed: " + e.getMessage(),
                    e
            );
        }
    }

    // Tìm hoặc tạo user
    private User findOrCreateUser(
            String name,
            String cccd,
            String email
    ) {

        String last9 = getLast9(cccd);

        Optional<User> byCccd = userRepository
                .findByCitizenCard_CitizenId(last9);

        Optional<User> byEmail = userRepository
                .findByEmail(email);

        // conflict
        if (byCccd.isPresent()
                && byEmail.isPresent()
                && !Objects.equals(
                byCccd.get().getId(),
                byEmail.get().getId()
        )) {

            throw new RuntimeException(
                    "Email và CCCD thuộc 2 user khác nhau"
            );
        }

        return byCccd.orElseGet(() ->
                byEmail.orElseGet(() ->
                        createUser(name, cccd, email)
                )
        );
    }

    // Create room
    private ExamRoom createEntity(ExamRoomRequest room) {

        Exam exam = examRepository.findById(room.getExamId())
                .orElseThrow(() ->
                        new RuntimeException("Exam not found")
                );

        ExamRoom examRoom =
                ExamRoomMapper.toEntity(room, exam);

        return examRoomRepository.save(examRoom);
    }

    // Tạo user mới
    private User createUser(
            String name,
            String cccd,
            String email
    ) {

        User user = new User();

        user.setUsername(cccd);
        user.setEmail(email);

        // password mặc định = CCCD
        user.setPasswordHash(
                passwordEncoder.encode(cccd)
        );

        user.setCreatedAt(LocalDateTime.now());
        user.setActive((short) 1);

        userRepository.save(user);

        // lưu 9 số cuối CCCD
        String last9 = getLast9(cccd);

        CitizenCard card = new CitizenCard();
        card.setCitizenId(last9);
        card.setUser(user);

        citizenCardRepository.save(card);

        UserProfile profile = new UserProfile();
        profile.setName(name);
        profile.setCitizenId(last9);
        profile.setUser(user);

        userProfileRepository.save(profile);

        return user;
    }

    // lấy 9 số cuối
    private String getLast9(String cccd) {

        return cccd.substring(cccd.length() - 9);
    }

    // Đọc string an toàn
    private String getString(Cell cell) {

        if (cell == null) {
            return "";
        }

        return dataFormatter
                .formatCellValue(cell)
                .trim();
    }

    // Check dòng trống
    private boolean isEmptyRow(Row row) {

        for (int i = 0; i < 4; i++) {

            Cell cell = row.getCell(i);

            if (cell != null
                    && !getString(cell).isBlank()) {

                return false;
            }
        }

        return true;
    }

    // Count sinh viên thực tế
    private int countStudents(Sheet sheet) {

        int count = 0;

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {

            Row row = sheet.getRow(i);

            if (row != null && !isEmptyRow(row)) {
                count++;
            }
        }

        return count;
    }
}