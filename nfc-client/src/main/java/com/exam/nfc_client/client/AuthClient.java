package com.exam.nfc_client.client;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

public class AuthClient {

    private static final String LOGIN_URL = "http://localhost:8080/api/auth/login";

    public static String login(String username, String password) {
        try {
            var client = HttpClient.newHttpClient();

            var body = Map.of(
                    "username", username,
                    "password", password
            );

            String json = new ObjectMapper().writeValueAsString(body);

            var request = HttpRequest.newBuilder()
                    .uri(URI.create(LOGIN_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            var response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            System.out.println("Login status: " + response.statusCode());
            System.out.println("Login response: " + response.body());

            if (response.statusCode() != 200) {
                throw new RuntimeException("Login failed");
            }

            Map<String, Object> res =
                    new ObjectMapper().readValue(response.body(), Map.class);

            Map<String, Object> data =
                    (Map<String, Object>) res.get("data");

            String accessToken = (String) data.get("accessToken");

            return accessToken;

        } catch (Exception e) {
            throw new RuntimeException("Login error: " + e.getMessage(), e);
        }
    }
}