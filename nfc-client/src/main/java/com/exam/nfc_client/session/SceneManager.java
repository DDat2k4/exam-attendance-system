package com.exam.nfc_client.session;

import com.exam.nfc_client.ui.MainController;
import com.exam.nfc_client.ui.ScanController;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class SceneManager {

    private static Stage primaryStage;

    public static void setStage(Stage stage) {
        primaryStage = stage;
    }

    public static void showLoginScreen() {
        MainController controller = new MainController();
        primaryStage.setScene(new Scene(controller.getView(), 300, 250));
    }

    public static void showScanScreen() {
        ScanController controller = new ScanController();
        primaryStage.setScene(new Scene(controller.getView(), 400, 300));
    }
}
