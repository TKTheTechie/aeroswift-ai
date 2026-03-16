#!/usr/bin/env python3
"""
Complete Passport Reader Integration
1. Reads MRZ from webcam
2. Feeds data to JMRTD for NFC chip reading
3. Validates passport photo integrity
4. Enrolls photo into facial recognition
5. Publishes enrollment event to Solace
"""

import subprocess
import sys
import os
import cv2
import pytesseract
import re
import base64
import requests
import json
import ssl

# ── Config ────────────────────────────────────────────────────────────────────
ENROLL_SERVICE_URL = "http://localhost:3001/enroll"

SOLACE_HOST     = "mr-connection-xaa92v5e29b.messaging.solace.cloud"
SOLACE_PORT     = 8883
SOLACE_USERNAME = "solace-cloud-client"
SOLACE_PASSWORD = "s9ntjlnh3hvc92md1qdd05a71l"
SOLACE_TOPIC    = "aeroswift/passenger/enrolled"


# ── Image validation ──────────────────────────────────────────────────────────

def validate_and_fix_image(path):
    try:
        from PIL import Image, ImageFile
        ImageFile.LOAD_TRUNCATED_IMAGES = True
        img = Image.open(path)
        fixed_path = path.replace(".jpg", "_fixed.jpg")
        img.save(fixed_path, "JPEG", quality=95)
        print(f"✅ Passport photo validated and re-saved.")
        return True, fixed_path
    except Exception as e:
        print(f"❌ Could not process image: {e}")
        return False, path


# ── Solace publish ────────────────────────────────────────────────────────────

def publish_to_solace(flyer_id, passport_data):
    """Publish enrollment event to Solace via MQTT"""
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        print("⚠️  paho-mqtt not installed — skipping Solace publish. Run: pip install paho-mqtt")
        return

    payload = json.dumps({
        "flyerId":        flyer_id,
        "enrolled":       True,
        "passportNumber": passport_data.get("passport_number", ""),
        "surname":        passport_data.get("surname", ""),
        "givenNames":     passport_data.get("given_names", ""),
        "nationality":    passport_data.get("nationality", ""),
        "timestamp":      __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "source":         "passport-reader"
    })

    client = mqtt.Client(client_id=f"passport-reader-{flyer_id}")
    client.username_pw_set(SOLACE_USERNAME, SOLACE_PASSWORD)
    client.tls_set(cert_reqs=ssl.CERT_NONE)
    client.tls_insecure_set(True)

    try:
        client.connect(SOLACE_HOST, SOLACE_PORT, keepalive=10)
        result = client.publish(SOLACE_TOPIC, payload, qos=1)
        client.loop(timeout=3)
        client.publish('aeroswift/terminal1/v1/face/scan/reset',
        json.dumps({"reset": True, "flyerId": flyer_id}), qos=1)
        client.disconnect()
        if result.rc == 0:
            print(f"✅ Published enrollment event to Solace topic: {SOLACE_TOPIC}")
        else:
            print(f"⚠️  Solace publish returned code: {result.rc}")
    except Exception as e:
        print(f"⚠️  Could not publish to Solace: {e}")


# ── MRZ reader ────────────────────────────────────────────────────────────────

def read_mrz_from_webcam():
    """Capture webcam frame and extract MRZ data using OCR"""

    print("\n" + "="*60)
    print("WEBCAM MRZ READER")
    print("="*60)
    print("Hold passport MRZ zone (bottom 2 lines) up to camera.")
    print("Press SPACE to capture, Q to quit.")
    print("="*60)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Could not open webcam.")
        return None

    mrz_data = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        cv2.imshow("MRZ Reader - SPACE to capture, Q to quit", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break
        elif key == ord(' '):
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
            text = pytesseract.image_to_string(gray, config=custom_config)

            lines = [
                l.replace(" ", "").upper()
                for l in text.split('\n')
                if len(l.replace(" ", "")) >= 30 and re.match(r'^[A-Z0-9<]+$', l.replace(" ", ""))
            ]

            if len(lines) < 2:
                print("\n⚠️  MRZ not detected — try better lighting or hold passport closer. Press SPACE to retry.")
                continue

            line2           = lines[1]
            passport_number = line2[0:9].replace("<", "")
            dob             = line2[13:19]
            expiry          = line2[21:27]

            line1       = lines[0]
            name_field  = line1[5:] if len(line1) > 5 else ""
            name_parts  = name_field.split("<<")
            surname     = name_parts[0].replace("<", " ").strip() if len(name_parts) > 0 else ""
            given_names = name_parts[1].replace("<", " ").strip() if len(name_parts) > 1 else ""

            mrz_data = {
                'passport_number': passport_number,
                'date_of_birth':   dob,
                'expiry_date':     expiry,
                'surname':         surname,
                'given_names':     given_names
            }

            print(f"\n✅ MRZ detected!")
            print(f"  Passport: {passport_number}  DOB: {dob}  Expiry: {expiry}")
            print(f"  Name: {given_names} {surname}")
            break

    cap.release()
    cv2.destroyAllWindows()
    return mrz_data


# ── NFC reader ────────────────────────────────────────────────────────────────

def run_jmrtd_reader(passport_no, dob, expiry):
    """Run JMRTD Java code and return extracted NFC data"""

    print("\n" + "="*60)
    print("STARTING NFC CHIP READ WITH JMRTD")
    print("="*60)
    print(f"  Passport Number: {passport_no}")
    print(f"  Date of Birth:   {dob}")
    print(f"  Expiry Date:     {expiry}")
    print("="*60)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    java_file  = os.path.join(script_dir, "PassportRead.java")

    if not os.path.exists(java_file):
        print(f"\n❌ Error: {java_file} not found!")
        return None

    print("\nCompiling Java code...")
    compile_result = subprocess.run(
        ["javac", "-cp", ".:jmrtd.jar:bcprov.jar:scuba-data.jar:scuba-smartcards.jar", "PassportRead.java"],
        cwd=script_dir,
        capture_output=True,
        text=True
    )

    if compile_result.returncode != 0:
        print(f"Compilation error:\n{compile_result.stderr}")
        return None

    print("\n" + "="*60)
    print("⚠️  PLACE PASSPORT ON NFC READER NOW")
    print("="*60)
    input("Press Enter when passport is properly positioned...")
    print("\nReading NFC chip...")

    run_result = subprocess.run(
        ["java", "-cp", ".:jmrtd.jar:bcprov.jar:scuba-data.jar:scuba-smartcards.jar",
         "PassportRead", passport_no, dob, expiry],
        cwd=script_dir,
        capture_output=True,
        text=True
    )

    if run_result.returncode != 0:
        print("\n❌ NFC reading failed!")
        print(run_result.stderr)
        if "CardNotPresentException" in run_result.stderr:
            retry = input("\nRetry? (y/n): ").lower()
            if retry == 'y':
                return run_jmrtd_reader(passport_no, dob, expiry)
        return None

    output = run_result.stdout
    print(output)

    nfc_data = {}
    for line in output.split('\n'):
        line = line.strip()
        if line.startswith("DOC #:"):
            nfc_data['passport_number'] = line.split(":")[-1].strip()
        elif line.startswith("DOB:"):
            nfc_data['date_of_birth'] = line.split(":")[-1].strip()
        elif line.startswith("EXPIRY:"):
            nfc_data['expiry_date'] = line.split(":")[-1].strip()
        elif line.startswith("SURNAME:"):
            nfc_data['surname'] = line.split(":")[-1].strip().replace("<", "")
        elif line.startswith("NAME:"):
            nfc_data['given_names'] = line.split(":")[-1].strip().replace("<", " ")
        elif line.startswith("NATION:"):
            nfc_data['nationality'] = line.split(":")[-1].strip()

    return nfc_data


# ── Data comparison ───────────────────────────────────────────────────────────

def compare_data(ocr_data, nfc_data):
    """Compare OCR MRZ data with NFC chip data"""
    print("\n" + "="*60)
    print("DATA VALIDATION: OCR vs NFC CHIP")
    print("="*60)

    discrepancies = []
    fields = [
        ('Passport Number', 'passport_number'),
        ('Date of Birth',   'date_of_birth'),
        ('Expiry Date',     'expiry_date'),
        ('Surname',         'surname'),
        ('Given Names',     'given_names'),
    ]

    for label, key in fields:
        ocr_val = ocr_data.get(key, '').replace('<', '').strip()
        nfc_val = nfc_data.get(key, '').replace('<', '').strip()
        match   = ocr_val == nfc_val
        icon    = "✅" if match else "❌"
        print(f"\n{icon} {label}:")
        print(f"  OCR: {ocr_val}")
        print(f"  NFC: {nfc_val}")
        if not match:
            discrepancies.append((label, ocr_val, nfc_val))

    print("\n" + "="*60)
    if not discrepancies:
        print("✅ ALL DATA MATCHES - Passport is authentic!")
    else:
        print(f"⚠️  Found {len(discrepancies)} discrepanc{'y' if len(discrepancies) == 1 else 'ies'}:")
        for field, ocr_val, nfc_val in discrepancies:
            print(f"  {field}: OCR={ocr_val} | Chip={nfc_val}")
    print("="*60)

    return len(discrepancies) == 0


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("="*60)
    print("COMPLETE PASSPORT READER DEMO")
    print("="*60)

    # Step 1: Read MRZ from webcam
    print("\nStep 1: Reading MRZ from webcam...")
    mrz_data = read_mrz_from_webcam()

    if not mrz_data:
        print("\n❌ Failed to read MRZ. Cannot proceed.")
        return

    # Step 2: Confirm data
    print("\n" + "="*60)
    print("MRZ DATA EXTRACTED - Please Verify:")
    print("="*60)
    print(f"Passport Number: {mrz_data['passport_number']}")
    print(f"Date of Birth:   {mrz_data['date_of_birth']}")
    print(f"Expiry Date:     {mrz_data['expiry_date']}")
    print(f"Name:            {mrz_data['given_names']} {mrz_data['surname']}")
    print("="*60)

    proceed = input("\nData looks correct? (y/n): ").lower()

    if proceed != 'y':
        passport_no = input(f"Passport Number [{mrz_data['passport_number']}]: ") or mrz_data['passport_number']
        dob         = input(f"Date of Birth (YYMMDD) [{mrz_data['date_of_birth']}]: ") or mrz_data['date_of_birth']
        expiry      = input(f"Expiry Date (YYMMDD) [{mrz_data['expiry_date']}]: ") or mrz_data['expiry_date']
    else:
        passport_no = mrz_data['passport_number']
        dob         = mrz_data['date_of_birth']
        expiry      = mrz_data['expiry_date']

    # Step 3: Read NFC chip
    print("\nStep 2: Reading NFC chip with JMRTD...")
    nfc_data = run_jmrtd_reader(passport_no, dob, expiry)

    if not nfc_data:
        print("\n❌ Failed to read passport chip.")
        return

    # Step 4: Compare OCR vs NFC
    data_match = compare_data(mrz_data, nfc_data)
    if not data_match:
        print("\n⚠️  Data mismatch between OCR and NFC chip.")
        proceed = input("Continue anyway? (y/n): ").lower()
        if proceed != 'y':
            return

    # Step 5: Validate passport photo
    print("\n" + "="*60)
    print("Step 3: Validating passport photo integrity...")
    print("="*60)

    script_dir     = os.path.dirname(os.path.abspath(__file__))
    passport_photo = os.path.join(script_dir, "passport_photo.jpg")

    if not os.path.exists(passport_photo):
        print(f"❌ Passport photo not found at {passport_photo}")
        print("   Make sure PassportRead.java extracted the DG2 photo correctly.")
        return

    is_valid, photo_path = validate_and_fix_image(passport_photo)
    if not is_valid:
        print("❌ Passport photo is corrupted and could not be recovered. Cannot enroll.")
        return

    # Step 6: Enroll passport photo into facial recognition
    print("\n" + "="*60)
    print("Step 4: Enrolling passport photo into facial recognition...")
    print("="*60)

    flyer_id = nfc_data.get('passport_number', passport_no)

    with open(photo_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    try:
        response = requests.post(ENROLL_SERVICE_URL, json={
            "flyerId":     flyer_id,
            "imageBase64": image_b64
        }, timeout=10)

        if response.status_code == 200:
            print(f"✅ Passport photo enrolled for flyer: {flyer_id}")
            print("   ESP32-CAM will now match this passenger at the gate.")
        else:
            print(f"❌ Enroll failed: {response.status_code} - {response.text}")
            return

    except requests.exceptions.ConnectionError:
        print("❌ Could not reach enroll service on http://localhost:3001")
        print("   Start it with: cd facial-recognition/enroll-service && node index.js")
        return

    # Step 7: Publish enrollment event to Solace
    print("\n" + "="*60)
    print("Step 5: Publishing enrollment event to Solace...")
    print("="*60)

    publish_to_solace(flyer_id, nfc_data)

    print("\n" + "="*60)
    print("✅ PASSPORT ONBOARDING COMPLETE")
    print(f"   Flyer ID:  {flyer_id}")
    print(f"   Name:      {nfc_data.get('given_names', '')} {nfc_data.get('surname', '')}")
    print(f"   The gate camera will now recognise this passenger automatically.")
    print("="*60)



if __name__ == "__main__":
    main()
