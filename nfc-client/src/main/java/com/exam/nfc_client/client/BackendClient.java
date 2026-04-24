package com.exam.nfc_client.client;

import com.exam.nfc_client.session.SessionManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;

public class BackendClient {

//    private static final String URL = "http://localhost:8080/api/cccd/checkin";
    private static final String URL = "http://localhost:8080/api/cccd/verify";

    public static void send(Object info) {
        try {
            var client = java.net.http.HttpClient.newHttpClient();

            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

            String json = mapper.writeValueAsString(info);

            String token = SessionManager.getToken();
            System.out.println("Token: " + token);

            var request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(URL))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(json))
                    .build();

            var response = client.send(
                    request,
                    java.net.http.HttpResponse.BodyHandlers.ofString()
            );

            System.out.println("Status: " + response.statusCode());
            System.out.println("Response: " + response.body());

        } catch (Exception e) {
            System.out.println("Lỗi gửi server: " + e.getMessage());
        }
    }
}