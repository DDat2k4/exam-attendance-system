package com.exam.nfc_client.ui;

import com.exam.nfc_client.session.SceneManager;
import javafx.application.Application;
import javafx.stage.Stage;

public class NFCApplication extends Application {

    @Override
    public void start(Stage stage) {
        SceneManager.setStage(stage);
        SceneManager.showLoginScreen();

        stage.setTitle("NFC CCCD");
        stage.show();
    }

    public static void main(String[] args) {
        launch();
    }
}