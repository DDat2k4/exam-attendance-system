package com.exam.nfc_client.service;

import com.exam.nfc_client.data.CCCDInfo;
import org.jmrtd.PassportService;
import org.jmrtd.lds.icao.*;
import org.jmrtd.lds.iso19794.FaceImageInfo;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.time.LocalDate;
import java.util.Base64;

public class CCCDDataService {

    public CCCDInfo readData(PassportService service) throws Exception {

        CCCDInfo info = new CCCDInfo();

        // DG1
        InputStream dg1Stream = service.getInputStream(PassportService.EF_DG1);
        DG1File dg1 = new DG1File(dg1Stream);
        MRZInfo mrz = dg1.getMRZInfo();

        info.setCitizenId(mrz.getDocumentNumber());
        info.setFullName(mrz.getPrimaryIdentifier() + " " + mrz.getSecondaryIdentifier());
        info.setBirthDate(parseMrzDate(mrz.getDateOfBirth()));
        info.setExpiry(parseMrzDate(mrz.getDateOfExpiry()));

        // DG2
        InputStream dg2Stream = service.getInputStream(PassportService.EF_DG2);
        DG2File dg2 = new DG2File(dg2Stream);

        FaceImageInfo face =
                dg2.getFaceInfos().get(0).getFaceImageInfos().get(0);

        byte[] image = face.getImageInputStream().readAllBytes();

        BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(image));

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ImageIO.write(bufferedImage, "jpg", bos);

        info.setFaceImage(Base64.getEncoder().encodeToString(bos.toByteArray()));

        return info;
    }

    private LocalDate parseMrzDate(String mrzDate) {
        int year = Integer.parseInt(mrzDate.substring(0, 2));
        int month = Integer.parseInt(mrzDate.substring(2, 4));
        int day = Integer.parseInt(mrzDate.substring(4, 6));

        int fullYear = (year < 50) ? (2000 + year) : (1900 + year);

        return LocalDate.of(fullYear, month, day);
    }
}