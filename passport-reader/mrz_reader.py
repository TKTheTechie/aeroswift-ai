#!/usr/bin/env python3
"""
ESP32-CAM Passport (TD3) MRZ Reader
Works with any TD3 passport (UK, French, US, etc.)
Optimized preprocessing for angle bracket and number recognition
"""

import requests
import cv2
import numpy as np
import pytesseract
from PIL import Image
from io import BytesIO


class MRZReader:
    def __init__(self, esp32_ip):
        self.esp32_url = f"http://{esp32_ip}"

    def capture_image(self, use_flash=False):
        """Capture image from ESP32-CAM"""
        endpoint = "/capture_flash" if use_flash else "/capture"
        url = self.esp32_url + endpoint

        print(f"Capturing image from {url}...")

        try:
            response = requests.get(url, timeout=360)
            if response.status_code == 200:
                img = Image.open(BytesIO(response.content))
                return np.array(img)
            else:
                print(f"Failed to capture: HTTP {response.status_code}")
                return None
        except Exception as e:
            print(f"Error capturing image: {e}")
            return None

    def preprocess_for_mrz(self, image):
        """Preprocessing optimized for digit recognition (especially 1/3/5/7)"""
        h, w = image.shape[:2]
        
        # PERFECT crop region for MRZ (60-70%)
        y_start = int(h * 0.30)  # Start at 60%
        y_end = int(h * 0.70)    # End at 70%
        roi = image[y_start:y_end, :]
        
        # 1. Grayscale
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # 2. VERY LIGHT CLAHE - preserve digit shapes
        clahe = cv2.createCLAHE(clipLimit=1.0, tileGridSize=(8,8))
        contrast = clahe.apply(gray)
        
        # 3. Resize 3x for better character detail
        resized = cv2.resize(contrast, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        
        # 4. NO denoising - preserve sharp edges that distinguish 3/5/8
        
        # 5. Simple binary threshold - preserves character structure better than adaptive
        _, binary = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 6. Very light morphology to connect broken characters without merging
        kernel = np.ones((1,1), np.uint8)
        final = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return final

    def extract_mrz(self, image):
        """Extract MRZ text with multiple OCR attempts"""
        print("Preprocessing image for OCR...")
        processed = self.preprocess_for_mrz(image)

        cv2.imwrite("mrz_processed.jpg", processed)
        print("Saved preprocessed image to mrz_processed.jpg")

        # Try multiple OCR configurations
        configs = [
            r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
            r'--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
            r'--oem 3 --psm 13 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
        ]
        
        results = []
        for i, config in enumerate(configs):
            print(f"Running OCR attempt {i+1}/{len(configs)}...")
            text = pytesseract.image_to_string(processed, config=config)
            results.append(text)
        
        # Pick the longest result (usually most complete)
        best_result = max(results, key=lambda x: len(x))
        print(f"Selected best OCR result (length: {len(best_result)})")
        
        return best_result

    def parse_mrz_td3(self, mrz_text):
        """ICAO TD3 parser with lenient line detection"""
        print(f"\nRaw OCR output:\n{mrz_text}\n")

        # Clean lines
        lines = [
            l.strip().upper().replace(" ", "")
            for l in mrz_text.split("\n")
            if len(l.strip()) > 20
        ]

        if len(lines) < 2:
            print("Error: Need at least 2 MRZ lines")
            return None

        print(f"Found {len(lines)} candidate lines:")
        for i, line in enumerate(lines):
            print(f"  {i+1}: {line}")

        # Find line 1 - starts with P (with or without <)
        line1 = None
        line2 = None
        
        for i, line in enumerate(lines):
            if line.startswith('P'):  # Accept P or P<
                line1 = line
                # Get the other line as line 2
                remaining = [l for j, l in enumerate(lines) if j != i]
                if remaining:
                    line2 = remaining[0]
                break
        
        if not line1 or not line2:
            print("❌ Could not find passport MRZ lines")
            return None

        # Pad to 44 chars
        line1 = line1[:44].ljust(44, '<')
        line2 = line2[:44].ljust(44, '<')

        print(f"\nMRZ Line 1: {line1}")
        print(f"MRZ Line 2: {line2}")

        try:
            # ===== LINE 1 (ICAO positions) =====
            doc_type = 'P'
            country = line1[2:5].replace("<", "").strip()

            name_field = line1[5:44]

            if "<<" in name_field:
                parts = name_field.split("<<", 1)
                surname = parts[0].replace("<", " ").strip()
                given_names = parts[1].replace("<", " ").strip()
            else:
                surname = name_field.replace("<", " ").strip()
                given_names = ""

            surname = " ".join(surname.split())
            given_names = " ".join(given_names.split())

            # ===== LINE 2 (ICAO positions) =====
            passport_no_raw = line2[0:9]
            nationality_raw = line2[10:13]
            dob_raw = line2[13:19]
            sex_raw = line2[20]
            expiry_raw = line2[21:27]

            # Fix OCR errors - CORRECTED mappings based on actual errors
            def fix_ocr_numbers(text):
                """Fix letter→digit OCR errors based on MRZ OCR-B font"""
                fixes = {
                    'O': '0', 'Q': '0', 'D': '0',  # O/Q/D → 0
                    'I': '1', 'L': '1', '|': '1', 'T': '1',  # I/L/T → 1 (not 7!)
                    'Z': '2',  # Z → 2
                    'S': '3',  # S → 3 (NOT 5! Common OCR error)
                    'A': '4',  # A → 4
                    'B': '8', 'G': '6'  # B → 8, G → 6
                }
                result = ''
                for char in text:
                    if char.isdigit():
                        result += char
                    elif char in fixes:
                        result += fixes[char]
                return result

            # Passport number can have letters, so only light cleaning
            passport_no = passport_no_raw.replace('<', '').strip()
            
            # Nationality - keep letters only
            nationality = ''.join(c for c in nationality_raw if c.isalpha()).strip()

            # Dates - MUST be all digits
            dob = fix_ocr_numbers(dob_raw)[:6].ljust(6, '0')
            expiry = fix_ocr_numbers(expiry_raw)[:6].ljust(6, '0')
            
            sex = sex_raw.upper() if sex_raw in 'MF' else 'M'

            # Display format - SEPARATE logic for DOB vs Expiry
            def format_dob(yyMMdd):
                """Format date of birth - can be 1900s or 2000s"""
                if len(yyMMdd) != 6 or not yyMMdd.isdigit():
                    return yyMMdd
                yy = int(yyMMdd[0:2])
                mm = yyMMdd[2:4]
                dd = yyMMdd[4:6]
                # If yy > 30, assume 1900s, else 2000s
                year = 1900 + yy if yy > 30 else 2000 + yy
                return f"{dd}/{mm}/{year}"
            
            def format_expiry(yyMMdd):
                """Format expiry date - ALWAYS 2000s (expiry is always future)"""
                if len(yyMMdd) != 6 or not yyMMdd.isdigit():
                    return yyMMdd
                yy = int(yyMMdd[0:2])
                mm = yyMMdd[2:4]
                dd = yyMMdd[4:6]
                # Expiry dates are ALWAYS 2000s
                year = 2000 + yy
                return f"{dd}/{mm}/{year}"

            print("\n=== EXTRACTED DATA ===")
            print(f"Country: {country}")
            print(f"Name: {given_names} {surname}")
            print(f"Passport Number: {passport_no}")
            print(f"Nationality: {nationality}")
            print(f"Date of Birth: {format_dob(dob)}")
            print(f"Sex: {sex}")
            print(f"Expiry Date: {format_expiry(expiry)}")

            return {
                'document_type': doc_type,
                'country': country,
                'surname': surname,
                'given_names': given_names,
                'passport_number': passport_no,
                'nationality': nationality,
                'date_of_birth': dob,
                'sex': sex,
                'expiry_date': expiry,
                'raw_line1': line1,
                'raw_line2': line2,
            }

        except Exception as e:
            print(f"Parsing error: {e}")
            import traceback
            traceback.print_exc()
            return None

    def read_passport(self):
        print("=" * 60)
        print("ESP32-CAM PASSPORT (TD3) MRZ READER")
        print("=" * 60)

        image = self.capture_image(use_flash=True)  # No flash for speed
        if image is None:
            return None

        cv2.imwrite(
            "passport_captured.jpg",
            cv2.cvtColor(image, cv2.COLOR_RGB2BGR),
        )

        mrz_text = self.extract_mrz(image)
        mrz_data = self.parse_mrz_td3(mrz_text)

        if mrz_data:
            print("\nBAC Key for JMRTD:")
            print(
                f'BACKeySpec bacKey = new BACKey("{mrz_data["passport_number"]}", '
                f'"{mrz_data["date_of_birth"]}", '
                f'"{mrz_data["expiry_date"]}");'
            )
            return mrz_data
        else:
            print("❌ Parsing failed")
            return None


def main():
    ESP32_IP = "10.73.85.200"

    print("Ready to capture from ESP32-CAM")
    input("Press Enter to capture...")

    reader = MRZReader(ESP32_IP)
    reader.read_passport()


if __name__ == "__main__":
    main()
