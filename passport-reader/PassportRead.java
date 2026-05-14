import java.util.List;
import java.io.FileOutputStream;
import javax.smartcardio.*;
import org.jmrtd.PassportService;
import org.jmrtd.BACKey;
import org.jmrtd.BACKeySpec;
import org.jmrtd.lds.icao.DG1File;
import org.jmrtd.lds.icao.DG2File;
import org.jmrtd.lds.icao.MRZInfo;
import org.jmrtd.lds.iso19794.FaceImageInfo;
import org.jmrtd.lds.iso19794.FaceInfo;
import net.sf.scuba.smartcards.CardService;
import net.sf.scuba.smartcards.CommandAPDU;
import net.sf.scuba.smartcards.ResponseAPDU;

public class PassportRead {
    public static void main(String[] args) {
        try {
            // Accept command-line arguments OR use hardcoded fallback
            String passportNumber, dateOfBirth, expiryDate;
            
            if (args.length == 3) {
                // Use arguments from Python script
                passportNumber = args[0];
                dateOfBirth = args[1];
                expiryDate = args[2];
                System.out.println("[*] Using BAC key from command-line");
                System.out.println("    Passport: " + passportNumber);
                System.out.println("    DOB: " + dateOfBirth);
                System.out.println("    Expiry: " + expiryDate);
            } else {
                // Fallback: your verified hardcoded data
                passportNumber = "23IE17029";
                dateOfBirth = "831003";
                expiryDate = "310719";
                System.out.println("[*] Using HARDCODED BAC key");
            }
            
            // Priority 1 Crypto
            java.security.Security.removeProvider("SunJCE");
            java.security.Security.insertProviderAt(
                (java.security.Provider) Class.forName("org.bouncycastle.jce.provider.BouncyCastleProvider")
                .getDeclaredConstructor().newInstance(), 1);

            TerminalFactory factory = TerminalFactory.getDefault();
            CardTerminal terminal = factory.terminals().list().get(0);
            Card card = terminal.connect("*");
            ManualCardService cs = new ManualCardService(card.getBasicChannel());

            // Use 223 buffer for stability
            PassportService service = new PassportService(cs, 223, 223, false, false);
            service.open();
            service.sendSelectApplet(false);

            // Create BAC key from variables
            BACKeySpec bacKey = new BACKey(passportNumber, dateOfBirth, expiryDate);
            
            System.out.println("[*] Negotiating Secure Tunnel...");
            service.doBAC(bacKey);
            System.out.println("[*] SUCCESS! Tunnel Open.");

            // READ DG1 (The Identity Data)
            System.out.println("[*] Reading Identity Files (DG1)...");
            DG1File dg1 = new DG1File(service.getInputStream(PassportService.EF_DG1));
            MRZInfo mrz = dg1.getMRZInfo();
            
            System.out.println("\n" + "🚀".repeat(20));
            System.out.println("PASSPORT DATA UNLOCKED");
            System.out.println("NAME:    " + mrz.getSecondaryIdentifier().replace("<", " "));
            System.out.println("SURNAME: " + mrz.getPrimaryIdentifier().replace("<", " "));
            System.out.println("DOC #:   " + mrz.getDocumentNumber());
            System.out.println("NATION:  " + mrz.getNationality());
            System.out.println("DOB:     " + mrz.getDateOfBirth());
            System.out.println("EXPIRY:  " + mrz.getDateOfExpiry());
            System.out.println("🚀".repeat(20) + "\n");
            
            // READ DG2 (Passport Photo)
            try {
                System.out.println("[*] Reading Passport Photo (DG2)...");
                DG2File dg2 = new DG2File(service.getInputStream(PassportService.EF_DG2));
                
                List<FaceInfo> faceInfos = dg2.getFaceInfos();
                if (faceInfos != null && !faceInfos.isEmpty()) {
                    FaceInfo faceInfo = faceInfos.get(0);
                    List<FaceImageInfo> faceImageInfos = faceInfo.getFaceImageInfos();
                    
                    if (faceImageInfos != null && !faceImageInfos.isEmpty()) {
                        FaceImageInfo faceImageInfo = faceImageInfos.get(0);
                        
                        // Get image input stream
                        java.io.InputStream imageInputStream = faceImageInfo.getImageInputStream();
                        
                        // Read all bytes from input stream
                        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
                        int nRead;
                        byte[] data = new byte[1024];
                        while ((nRead = imageInputStream.read(data, 0, data.length)) != -1) {
                            buffer.write(data, 0, nRead);
                        }
                        buffer.flush();
                        byte[] imageBytes = buffer.toByteArray();
                        
                        // Determine file extension based on MIME type
                        String mimeType = faceImageInfo.getMimeType();
                        String extension = ".jpg";
                        if (mimeType.contains("jpeg") || mimeType.contains("jpg")) {
                            extension = ".jpg";
                        } else if (mimeType.contains("jp2") || mimeType.contains("jpeg2000")) {
                            extension = ".jp2";
                        }
                        
                        // Save photo to file
                        String filename = "passport_photo" + extension;
                        FileOutputStream fos = new FileOutputStream(filename);
                        fos.write(imageBytes);
                        fos.close();
                        
                        System.out.println("\n📸 Photo extracted!");
                        System.out.println("   Format: " + mimeType);
                        System.out.println("   Size: " + imageBytes.length + " bytes");
                        System.out.println("   Saved to: " + filename);
                        
                    } else {
                        System.out.println("⚠️  No face image data found in DG2");
                    }
                } else {
                    System.out.println("⚠️  No face info found in DG2");
                }
                
            } catch (Exception e) {
                System.out.println("⚠️  Could not read photo: " + e.getMessage());
                e.printStackTrace();
            }
            
            // NEXT STEP: Send to Solace
            publishToSolace(mrz.getSecondaryIdentifier(), mrz.getPrimaryIdentifier());

            service.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void publishToSolace(String name, String surname) {
        System.out.println("\n[*] Solace: Publishing event for " + name + " " + surname + "...");
        // This is where your Solace logic lives
    }

    public static class ManualCardService extends CardService {
        private CardChannel chan;
        public ManualCardService(CardChannel c) { this.chan = c; }
        public void open() {}
        public void close() {}
        public boolean isOpen() { return true; }
        public byte[] transmit(byte[] cmd) {
            try { return chan.transmit(new javax.smartcardio.CommandAPDU(cmd)).getBytes(); }
            catch (Exception e) { return null; }
        }
        public ResponseAPDU transmit(CommandAPDU cmd) {
            return new ResponseAPDU(transmit(cmd.getBytes()));
        }
        public byte[] getATR() { return chan.getCard().getATR().getBytes(); }
        public boolean isConnectionLost(Exception e) { return false; }
        public void addAPDUListener(net.sf.scuba.smartcards.APDUListener l) {}
        public void removeAPDUListener(net.sf.scuba.smartcards.APDUListener l) {}
    }
}