package com.exam.attendance.service.uploads;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.exam.attendance.data.response.UploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class FileUploadService {

    private final Cloudinary cloudinary;

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("File too large (max 5MB)");
        }
    }

    @Async
    public CompletableFuture<UploadResponse> uploadFileAsync(MultipartFile file, Long userId) {
        try {
            validateFile(file);

            Map uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "exam/" + userId,
                            "resource_type", "image",
                            "transformation", "w_400,h_500,c_fill,q_auto",
                            "public_id", "cccd_" + System.currentTimeMillis()
                    )
            );

            return CompletableFuture.completedFuture(mapToResponse(uploadResult));

        } catch (Exception e) {
            throw new RuntimeException("Upload failed: " + e.getMessage());
        }
    }

    @Async
    public CompletableFuture<UploadResponse> uploadBase64Async(String base64, Long userId) {
        try {
            String[] parts = base64.split(",");
            String imageData = parts.length > 1 ? parts[1] : parts[0];

            byte[] bytes = Base64.getDecoder().decode(imageData);

            Map uploadResult = cloudinary.uploader().upload(
                    bytes,
                    ObjectUtils.asMap(
                            "folder", "exam/" + userId,
                            "resource_type", "image",
                            "transformation", "w_400,h_500,c_fill,q_auto",
                            "public_id", "cccd_" + System.currentTimeMillis()
                    )
            );

            return CompletableFuture.completedFuture(mapToResponse(uploadResult));

        } catch (Exception e) {
            throw new RuntimeException("Upload failed: " + e.getMessage());
        }
    }

    public void deleteImage(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            throw new RuntimeException("Delete failed: " + e.getMessage());
        }
    }

    @Cacheable(value = "imageCache", key = "#url")
    public byte[] getImageBytes(String url) {
        try {
            return new java.net.URL(url).openStream().readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Cannot load image");
        }
    }

    private UploadResponse mapToResponse(Map uploadResult) {
        return new UploadResponse(
                uploadResult.get("secure_url").toString(),
                uploadResult.get("format").toString(),
                uploadResult.get("public_id").toString(),
                Long.valueOf(uploadResult.get("bytes").toString())
        );
    }
}