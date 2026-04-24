package com.exam.nfc_client.service;

import net.sf.scuba.smartcards.*;
import net.sf.scuba.smartcards.ResponseAPDU;
import org.jmrtd.*;
import org.jmrtd.lds.PACEInfo;

import javax.smartcardio.*;
import java.math.BigInteger;

public class CCCDAuthService {

    public PassportService createService(Card card) throws Exception {

        CardChannel channel = card.getBasicChannel();

        CardService cs = new CardService() {

            public void open() {}
            public void close() {}
            public boolean isOpen() { return true; }

            public byte[] getATR() {
                return card.getATR().getBytes();
            }

            public boolean isConnectionLost(Exception e) {
                return e instanceof CardException;
            }

            public ResponseAPDU transmit(net.sf.scuba.smartcards.CommandAPDU capdu) throws CardServiceException {
                try {
                    javax.smartcardio.CommandAPDU apdu =
                            new javax.smartcardio.CommandAPDU(capdu.getBytes());

                    javax.smartcardio.ResponseAPDU resp =
                            channel.transmit(apdu);

                    return new net.sf.scuba.smartcards.ResponseAPDU(resp.getBytes());

                } catch (Exception e) {
                    throw new CardServiceException(e.getMessage(), e);
                }
            }
        };

        PassportService service =
                new PassportService(cs, 256, 224, false, false);

        service.open();
        return service;
    }

    public void authenticate(PassportService service, String can) throws Exception {

        String oid = "0.4.0.127.0.7.2.2.4.2.2";
        BigInteger parameterId = BigInteger.valueOf(13);

        service.sendSelectApplet(false);

        service.doPACE(
                PACEKeySpec.createCANKey(can),
                oid,
                PACEInfo.toParameterSpec(parameterId),
                parameterId
        );

        service.sendSelectApplet(true);

        // nhẹ delay giúp card commit trạng thái
        Thread.sleep(120);

        System.out.println("PACE SUCCESS");
    }
}