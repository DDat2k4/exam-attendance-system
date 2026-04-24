package com.exam.nfc_client.service;

import com.exam.nfc_client.data.CCCDInfo;
import org.jmrtd.PassportService;

import javax.smartcardio.Card;

public class CCCDReaderService {

    private final NFCReaderService nfcReaderService;
    private final CCCDAuthService authService;
    private final CCCDDataService dataService;

    public CCCDReaderService(NFCReaderService nfcReaderService,
                             CCCDAuthService authService,
                             CCCDDataService dataService) {
        this.nfcReaderService = nfcReaderService;
        this.authService = authService;
        this.dataService = dataService;
    }

    public synchronized CCCDInfo read(String can) {

        Card card = null;

        try {
            card = nfcReaderService.connectCard();

            PassportService service = authService.createService(card);

            authService.authenticate(service, can);

            return dataService.readData(service);

        } catch (Exception e) {
            throw new RuntimeException("Lỗi đọc CCCD: " + e.getMessage(), e);

        } finally {
            try {
                if (card != null) {
                    card.disconnect(true);
                }
            } catch (Exception ignored) {}
        }
    }
}