package com.exam.nfc_client.ui;

import com.exam.nfc_client.client.AuthClient;
import com.exam.nfc_client.session.SceneManager;
import com.exam.nfc_client.session.SessionManager;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;

public class MainController {

    private TextField usernameField = new TextField();
    private PasswordField passwordField = new PasswordField();
    private Button loginBtn = new Button("Đăng nhập");
    private Label statusLabel = new Label();

    public MainController() {

        usernameField.setPromptText("Username");
        usernameField.setPrefWidth(280);

        passwordField.setPromptText("Password");
        passwordField.setPrefWidth(280);

        loginBtn.setOnAction(e -> login());

        loginBtn.setStyle("""
                -fx-background-color: #1976d2;
                -fx-text-fill: white;
                -fx-font-weight: bold;
                """);

        statusLabel.setStyle("-fx-text-fill: #555;");
    }

    public VBox getView() {

        // INPUT BOX
        VBox inputBox = new VBox(10,
                usernameField,
                passwordField,
                loginBtn
        );
        inputBox.setAlignment(Pos.CENTER);

        // CARD
        VBox card = new VBox(15,
                new Label("ĐĂNG NHẬP HỆ THỐNG"),
                inputBox,
                statusLabel
        );

        card.setPadding(new Insets(25));
        card.setAlignment(Pos.CENTER);

        card.setPrefWidth(420);
        card.setMaxWidth(420);
        card.setStyle("""
                -fx-background-color: white;
                -fx-background-radius: 10;
                -fx-border-radius: 10;
                -fx-border-color: #e0e0e0;
                -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.1), 10, 0.2, 0, 2);
                """);

        // ROOT
        VBox root = new VBox(card);
        root.setPadding(new Insets(30));
        root.setAlignment(Pos.CENTER);
        root.setStyle("-fx-background-color: #f4f6f8;");

        return root;
    }

    private void login() {
        String username = usernameField.getText();
        String password = passwordField.getText();

        if (username == null || username.isBlank()
                || password == null || password.isBlank()) {
            statusLabel.setText("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        loginBtn.setDisable(true);
        statusLabel.setText("Đang đăng nhập...");

        new Thread(() -> {
            try {
                String token = AuthClient.login(username, password);

                SessionManager.setToken(token);

                Platform.runLater(() -> {
                    statusLabel.setText("Đăng nhập thành công");
                    loginBtn.setDisable(false);

                    SceneManager.showScanScreen();
                });

            } catch (Exception e) {
                Platform.runLater(() -> {
                    statusLabel.setText("Đăng nhập thất bại: " + e.getMessage());
                    loginBtn.setDisable(false);
                });
            }
        }).start();
    }
}