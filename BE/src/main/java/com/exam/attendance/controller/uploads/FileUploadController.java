package com.exam.attendance.controller.uploads;

import com.exam.attendance.data.request.Base64UploadRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.service.uploads.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/single")
    public CompletableFuture<ResponseEntity<ApiResponse<UploadResponse>>> uploadSingle(
            @RequestParam("file") MultipartFile file,
            @RequestParam("userId") Long userId) {

        return fileUploadService.uploadFileAsync(file, userId)
                .thenApply(result ->
                        ResponseEntity.ok(
                                new ApiResponse<>(
                                        200,
                                        "Upload success",
                                        result
                                )
                        )
                );
    }

    @PostMapping("/base64")
    public CompletableFuture<ResponseEntity<ApiResponse<UploadResponse>>> uploadBase64(
            @RequestBody Base64UploadRequest request,
            @RequestParam("userId") Long userId) {

        return fileUploadService.uploadBase64Async(request.getBase64(), userId)
                .thenApply(result ->
                        ResponseEntity.ok(
                                new ApiResponse<>(
                                        200,
                                        "Upload success",
                                        result
                                )
                        )
                );
    }
}