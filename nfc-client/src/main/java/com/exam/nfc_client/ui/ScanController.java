package com.exam.nfc_client.ui;

import com.exam.nfc_client.client.BackendClient;
import com.exam.nfc_client.service.*;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;

import java.io.ByteArrayInputStream;
import java.util.Base64;

public class ScanController {

    // INPUT
    private TextField canField = new TextField();
    private Button scanBtn = new Button("Quét CCCD");
    private Label statusLabel = new Label("Chưa scan");

    // INFO LABELS
    private Label idLabel = new Label();
    private Label nameLabel = new Label();
    private Label dobLabel = new Label();
    private Label expiryLabel = new Label();

    // IMAGE
    private ImageView avatar = new ImageView();

    private CCCDReaderService reader;

    public ScanController() {
        reader = new CCCDReaderService(
                new NFCReaderService(),
                new CCCDAuthService(),
                new CCCDDataService()
        );

        // input
        canField.setPromptText("Nhập CAN (6 số cuối CCCD)");
        canField.setPrefWidth(280);

        // button
        scanBtn.setOnAction(e -> scan());
        scanBtn.setStyle("""
                -fx-background-color: #1976d2;
                -fx-text-fill: white;
                -fx-font-weight: bold;
                """);

        // avatar
        avatar.setFitWidth(140);
        avatar.setFitHeight(180);
        avatar.setPreserveRatio(true);
        avatar.setSmooth(true);

        // labels style
        nameLabel.setStyle("-fx-font-size: 16px; -fx-font-weight: bold;");
        idLabel.setStyle("-fx-text-fill: #333;");
        dobLabel.setStyle("-fx-text-fill: #555;");
        expiryLabel.setStyle("-fx-text-fill: #555;");

        // tránh lệch layout
        idLabel.setMinWidth(260);
        nameLabel.setMinWidth(260);
        dobLabel.setMinWidth(260);
        expiryLabel.setMinWidth(260);
    }

    public VBox getView() {

        // INPUT ROW
        HBox inputRow = new HBox(10, canField, scanBtn);
        inputRow.setAlignment(Pos.CENTER_LEFT);

        // INFO BOX
        VBox infoBox = new VBox(8,
                idLabel,
                nameLabel,
                dobLabel,
                expiryLabel
        );
        infoBox.setPrefWidth(300);

        // CARD
        HBox card = new HBox(20, avatar, infoBox);
        card.setPadding(new Insets(15));
        card.setAlignment(Pos.CENTER_LEFT);
        card.setStyle("""
                -fx-background-color: white;
                -fx-background-radius: 10;
                -fx-border-radius: 10;
                -fx-border-color: #e0e0e0;
                -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.1), 10, 0.2, 0, 2);
                """);

        // ROOT
        VBox root = new VBox(15,
                new Label("QUÉT CCCD"),
                inputRow,
                card,
                statusLabel
        );

        root.setPadding(new Insets(15));
        root.setStyle("-fx-background-color: #f4f6f8;");
        root.setAlignment(Pos.TOP_CENTER);

        return root;
    }

    private void scan() {
        String can = canField.getText();

        if (can == null || can.length() != 6) {
            statusLabel.setText("CAN phải 6 số");
            return;
        }

        statusLabel.setText("Đang quét...");

        new Thread(() -> {
            try {
                var info = reader.read(can);

                Platform.runLater(() -> {

                    idLabel.setText("CCCD: " + info.getCitizenId());
                    nameLabel.setText("Tên: " + info.getFullName());
                    dobLabel.setText("Ngày sinh: " + info.getBirthDate());
                    expiryLabel.setText("Hết hạn: " + info.getExpiry());

                    statusLabel.setText("Quét thành công");

                    if (info.getFaceImage() != null && !info.getFaceImage().isEmpty()) {
                        try {
                            byte[] imageBytes = Base64.getDecoder().decode(info.getFaceImage());
                            avatar.setImage(new Image(new ByteArrayInputStream(imageBytes)));
                        } catch (Exception e) {
                            avatar.setImage(null);
                        }
                    } else {
                        avatar.setImage(null);
                    }
                });

                BackendClient.send(info);

            } catch (Exception e) {
                Platform.runLater(() ->
                        statusLabel.setText("Lỗi: " + e.getMessage())
                );
            }
        }).start();
    }
}