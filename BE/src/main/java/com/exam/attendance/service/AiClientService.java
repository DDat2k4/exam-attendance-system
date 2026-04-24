package com.exam.attendance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiClientService {

    private final RestTemplate restTemplate = buildRestTemplate();

    private static final String BASE_URL = "http://localhost:5000";

    // Timeout
    private RestTemplate buildRestTemplate() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(7000);
        return new RestTemplate(factory);
    }

    private Map<String, Object> callAi(String url, MultiValueMap<String, Object> body) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> request =
                new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI HTTP error: " + response.getStatusCode());
            }

            return response.getBody();

        } catch (Exception e) {
            throw new RuntimeException("Không gọi được AI service: " + e.getMessage());
        }
    }

    public Map<String, Object> extractEmbedding(byte[] imageBytes) {

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        body.add("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return "cccd.jpg";
            }
        });

        return callAi(BASE_URL + "/extract-embedding", body);
    }

    public Map<String, Object> verifyFast(byte[] captureImage, String embedding) {

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        body.add("captureImage", new ByteArrayResource(captureImage) {
            @Override
            public String getFilename() {
                return "capture.jpg";
            }
        });

        body.add("embedding", embedding);

        return callAi(BASE_URL + "/verify-fast", body);
    }

    public Map<String, Object> verifyFace(byte[] cccdImage, byte[] captureImage) {

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        body.add("cccdImage", new ByteArrayResource(cccdImage) {
            @Override
            public String getFilename() {
                return "cccd.jpg";
            }
        });

        body.add("captureImage", new ByteArrayResource(captureImage) {
            @Override
            public String getFilename() {
                return "capture.jpg";
            }
        });

        return callAi(BASE_URL + "/verify-face", body);
    }
}