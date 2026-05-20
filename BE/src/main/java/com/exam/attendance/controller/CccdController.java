package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.CCCDInfo;
import com.exam.attendance.data.request.EncryptedRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.service.CccdService;
import com.exam.attendance.service.security.CryptoService;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cccd")
@RequiredArgsConstructor
public class CccdController extends BaseController {

    private final CccdService cccdService;

    private final CryptoService cryptoService;

    private final ObjectMapper objectMapper;

    // Xác thực CCCD
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Void>> verify(
            @RequestBody EncryptedRequest request
    ) {

        // verify HMAC
        boolean valid =
                cryptoService.verifySignature(
                        request.getData(),
                        request.getSignature()
                );

        if (!valid) {
            throw new RuntimeException(
                    "Invalid signature"
            );
        }

        // decrypt
        String json =
                cryptoService.decrypt(
                        request.getData(),
                        request.getIv()
                );

        try {

            CCCDInfo cccdInfo =
                    objectMapper.readValue(
                            json,
                            CCCDInfo.class
                    );

            cccdService.verifyCccd(cccdInfo);

            return success(null);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Parse request thất bại"
            );
        }
    }
}