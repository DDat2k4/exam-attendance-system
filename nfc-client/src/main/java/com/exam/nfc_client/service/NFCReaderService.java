package com.exam.nfc_client.service;

import javax.smartcardio.*;

public class NFCReaderService {

    public Card connectCard() {

        int retry = 10;

        while (retry-- > 0) {
            try {
                TerminalFactory factory = TerminalFactory.getInstance("PC/SC", null);
                CardTerminals terminals = factory.terminals();

                var terminalList = terminals.list();

                System.out.println("Readers: " + terminalList);

                if (terminalList.isEmpty()) {
                    System.out.println("Chưa có NFC reader...");
                    Thread.sleep(2000);
                    continue;
                }

                CardTerminal terminal = terminalList.stream()
                        .filter(t -> {
                            try {
                                return t.isCardPresent();
                            } catch (Exception e) {
                                return false;
                            }
                        })
                        .findFirst()
                        .orElse(terminalList.get(0));

                System.out.println("Đang chờ thẻ...");

                boolean present = terminal.waitForCardPresent(3000);

                if (!present) {
                    continue;
                }

                System.out.println("Đã phát hiện thẻ!");

                Thread.sleep(500);

                for (int i = 0; i < 3; i++) {
                    try {
                        Card card = terminal.connect("*");

                        System.out.println("ATR: " + bytesToHex(card.getATR().getBytes()));

                        return card;

                    } catch (Exception e) {
                        Thread.sleep(500);
                    }
                }

            } catch (Exception e) {
                System.out.println("Lỗi NFC: " + e.getMessage());
            }

            try {
                Thread.sleep(2000);
            } catch (InterruptedException ignored) {}
        }

        throw new RuntimeException("Không tìm thấy NFC reader hoặc thẻ");
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X ", b));
        }
        return sb.toString();
    }
}