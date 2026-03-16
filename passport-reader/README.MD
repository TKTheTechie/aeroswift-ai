# Passport Reader

Passport onboarding service for AeroSwift AI. Reads passenger passport data via webcam OCR and NFC chip, validates the passport photo, enrolls the face into the facial recognition system, and publishes enrollment events to the Solace event broker.

---

## Architecture

```
Webcam (MRZ OCR) → NFC Chip Read (JMRTD) → Photo Validation → Enroll Service → Solace
```

The passport reader exposes an HTTP service on port 3003 that can be triggered from the web app via a "Scan Passport" button.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/scan` | Trigger a passport scan session |
| `GET` | `/scan/status` | Poll scan progress |
| `POST` | `/scan/reset` | Reset scan state |
| `GET` | `/status` | Service health check |

---

## Flow

1. **MRZ scan** — webcam opens, passenger holds passport MRZ zone to camera, press SPACE to capture
2. **OCR** — Tesseract extracts passport number, date of birth, expiry date, and name
3. **NFC chip read** — JMRTD reads the passport chip using BAC key derived from OCR data
4. **Data validation** — OCR data compared against NFC chip data
5. **Photo validation** — passport photo integrity checked, truncated images auto-recovered
6. **Enroll** — passport photo enrolled into facial recognition via `http://localhost:3001/enroll`
7. **Solace publish** — enrollment event published to `aeroswift/passenger/enrolled`
8. **Scan reset** — face detection reset published to `aeroswift/terminal1/v1/face/scan/reset`

---

## Prerequisites

- Python 3.12+
- Java (for JMRTD NFC reading)
- Tesseract OCR (`brew install tesseract`)
- NFC card reader (ACR122U or compatible)
- JMRTD libraries in `passport-reader/` folder:
  - `jmrtd.jar`
  - `bcprov.jar`
  - `scuba-data.jar`
  - `scuba-smartcards.jar`

---

## Installation

```bash
cd passport-reader
python3 -m venv ~/Downloads/aeroswift-ai/nfc-env
source ~/Downloads/aeroswift-ai/nfc-env/bin/activate
pip install opencv-python pytesseract requests flask flask-cors paho-mqtt Pillow
```

---

## Usage

### As a service (recommended)

```bash
source ~/Downloads/aeroswift-ai/nfc-env/bin/activate
python3 passport_service.py
```

The service starts on `http://localhost:3003`. Trigger a scan from the web app or via:

```bash
curl -X POST http://localhost:3003/scan
```

### Standalone script

```bash
source ~/Downloads/aeroswift-ai/nfc-env/bin/activate
python3 complete_passport_reader.py
```

---

## Files

| File | Description |
|------|-------------|
| `complete_passport_reader.py` | Full passport scan flow — MRZ, NFC, validate, enroll, publish |
| `passport_service.py` | Flask HTTP service wrapping the passport reader |
| `PassportRead.java` | JMRTD NFC chip reader — extracts DG1 (identity) and DG2 (photo) |

---

## Solace Topics

| Topic | Direction | Payload |
|-------|-----------|---------|
| `aeroswift/passenger/enrolled` | Publish | `{ flyerId, enrolled, passportNumber, surname, givenNames, nationality, timestamp }` |
| `aeroswift/terminal1/v1/face/scan/reset` | Publish | `{ reset: true, flyerId }` |

---

## Dependencies

```
opencv-python
pytesseract
requests
flask
flask-cors
paho-mqtt
Pillow
```
