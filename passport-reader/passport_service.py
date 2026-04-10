#!/usr/bin/env python3
"""
Passport Reader Service — Browser-driven flow
Each step is triggered by the browser, no terminal interaction needed.

Endpoints:
  POST /ocr          — accepts base64 image, runs Tesseract OCR, returns passport data
  POST /nfc          — triggers NFC chip read using confirmed OCR data
  GET  /nfc/status   — poll NFC read progress
  POST /enroll       — enroll passport photo into facial recognition + publish to Solace
  GET  /status       — health check
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pytesseract
import cv2
import numpy as np
import base64
import re
import subprocess
import os
import sys
import json
import ssl
import threading
import requests as http_requests

app = Flask(__name__)
CORS(app)

SCRIPT_DIR          = os.path.dirname(os.path.abspath(__file__))
ENROLL_SERVICE_URL  = "http://localhost:3001/enroll"
SOLACE_HOST         = "mr-connection-xaa92v5e29b.messaging.solace.cloud"
SOLACE_PORT         = 8883
SOLACE_USERNAME     = "solace-cloud-client"
SOLACE_PASSWORD     = "s9ntjlnh3hvc92md1qdd05a71l"

# State shared between endpoints
nfc_state = {
    "running": False,
    "status":  "idle",
    "message": "",
    "data":    None,
    "error":   None,
    "photo_path": None
}


# ── OCR ───────────────────────────────────────────────────────────────────────

@app.route("/ocr", methods=["POST"])
def ocr():
    """Accept base64 image, run MRZ OCR, return passport fields."""
    body = request.get_json()
    if not body or "imageBase64" not in body:
        return jsonify({"error": "Missing imageBase64"}), 400

    try:
        img_bytes = base64.b64decode(body["imageBase64"])
        np_arr    = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        gray      = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
        text = pytesseract.image_to_string(gray, config=custom_config)

        lines = [
            l.replace(" ", "").upper()
            for l in text.split('\n')
            if len(l.replace(" ", "")) >= 30 and re.match(r'^[A-Z0-9<]+$', l.replace(" ", ""))
        ]

        if len(lines) < 2:
            return jsonify({"error": "Could not detect passport data — try better lighting or hold it closer"}), 422

        line2           = lines[1]
        passport_number = line2[0:9].replace("<", "")
        dob             = line2[13:19]
        expiry          = line2[21:27]

        line1       = lines[0]
        name_field  = line1[5:] if len(line1) > 5 else ""
        name_parts  = name_field.split("<<")
        surname     = name_parts[0].replace("<", " ").strip() if len(name_parts) > 0 else ""
        given_names = name_parts[1].replace("<", " ").strip() if len(name_parts) > 1 else ""

        return jsonify({
            "passportNumber": passport_number,
            "dateOfBirth":    dob,
            "expiryDate":     expiry,
            "surname":        surname,
            "givenNames":     given_names
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── NFC ───────────────────────────────────────────────────────────────────────

def run_nfc(passport_no, dob, expiry):
    global nfc_state
    nfc_state["running"] = True
    nfc_state["status"]  = "reading"
    nfc_state["message"] = "Reading NFC chip — place passport on reader..."
    nfc_state["error"]   = None
    nfc_state["data"]    = None
    nfc_state["photo_path"] = None

    try:
        result = subprocess.run(
            ["java", "-cp", ".:jmrtd.jar:bcprov.jar:scuba-data.jar:scuba-smartcards.jar",
             "PassportRead", passport_no, dob, expiry],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            nfc_state["status"]  = "error"
            nfc_state["error"]   = "NFC read failed — make sure passport is flat on the reader"
            nfc_state["running"] = False
            return

        output   = result.stdout
        nfc_data = {}
        for line in output.split('\n'):
            line = line.strip()
            if line.startswith("DOC #:"):     nfc_data['passportNumber'] = line.split(":")[-1].strip()
            elif line.startswith("DOB:"):     nfc_data['dateOfBirth']    = line.split(":")[-1].strip()
            elif line.startswith("EXPIRY:"): nfc_data['expiryDate']     = line.split(":")[-1].strip()
            elif line.startswith("SURNAME:"): nfc_data['surname']        = line.split(":")[-1].strip().replace("<", "")
            elif line.startswith("NAME:"):    nfc_data['givenNames']     = line.split(":")[-1].strip().replace("<", " ")
            elif line.startswith("NATION:"): nfc_data['nationality']    = line.split(":")[-1].strip()

        if not nfc_data or not nfc_data.get("passportNumber"):
            nfc_state["status"]  = "error"
            nfc_state["error"]   = "NFC read completed but no data extracted — make sure passport is flat on the reader"
            nfc_state["running"] = False
            return

        photo_path = os.path.join(SCRIPT_DIR, "passport_photo.jpg")
        if not os.path.exists(photo_path):
            nfc_state["status"]  = "error"
            nfc_state["error"]   = "NFC read completed but no photo extracted"
            nfc_state["running"] = False
            return

        nfc_state["photo_path"] = photo_path
        nfc_state["data"]    = nfc_data
        nfc_state["status"]  = "complete"
        nfc_state["message"] = "NFC chip read successfully"
        nfc_state["running"] = False

    except subprocess.TimeoutExpired:
        nfc_state["status"]  = "error"
        nfc_state["error"]   = "NFC read timed out"
        nfc_state["running"] = False
    except Exception as e:
        nfc_state["status"]  = "error"
        nfc_state["error"]   = str(e)
        nfc_state["running"] = False


@app.route("/nfc", methods=["POST"])
def nfc():
    global nfc_state
    if nfc_state["running"]:
        return jsonify({"error": "NFC read already in progress"}), 409

    body = request.get_json()
    if not body:
        return jsonify({"error": "Missing passport data"}), 400

    thread = threading.Thread(
        target=run_nfc,
        args=(body["passportNumber"], body["dateOfBirth"], body["expiryDate"]),
        daemon=True
    )
    thread.start()

    return jsonify({"message": "NFC read started"})


@app.route("/nfc/status", methods=["GET"])
def nfc_status():
    response = dict(nfc_state)
    # Include base64 photo if available
    if nfc_state.get("photo_path") and os.path.exists(nfc_state["photo_path"]):
        with open(nfc_state["photo_path"], "rb") as f:
            response["photoBase64"] = base64.b64encode(f.read()).decode()
    return jsonify(response)


# ── Enroll ────────────────────────────────────────────────────────────────────

@app.route("/enroll", methods=["POST"])
def enroll():
    global nfc_state

    # Block enroll if NFC was never completed
    if nfc_state["status"] != "complete":
        return jsonify({"error": "Passport chip must be read before enrolling"}), 400

    photo_path = nfc_state.get("photo_path")
    nfc_data   = nfc_state.get("data", {})
    flyer_id   = nfc_data.get("passportNumber", "UNKNOWN")

    if not photo_path or not os.path.exists(photo_path):
        return jsonify({"error": "Passport photo not found — NFC read may not have extracted it"}), 400

    # Fix truncated image
    try:
        from PIL import Image, ImageFile
        ImageFile.LOAD_TRUNCATED_IMAGES = True
        img = Image.open(photo_path)
        fixed_path = photo_path.replace(".jpg", "_fixed.jpg")
        img.save(fixed_path, "JPEG", quality=95)
        photo_path = fixed_path
    except Exception:
        pass

    with open(photo_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    try:
        res = http_requests.post(ENROLL_SERVICE_URL, json={
            "flyerId":     flyer_id,
            "imageBase64": image_b64
        }, timeout=10)

        if res.status_code != 200:
            return jsonify({"error": f"Enroll failed: {res.text}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Publish to Solace
    try:
        import paho.mqtt.client as mqtt
        client = mqtt.Client(client_id=f"passport-service-{flyer_id}")
        client.username_pw_set(SOLACE_USERNAME, SOLACE_PASSWORD)
        client.tls_set(cert_reqs=ssl.CERT_NONE)
        client.tls_insecure_set(True)
        client.connect(SOLACE_HOST, SOLACE_PORT, keepalive=10)
        client.publish("aeroswift/passenger/enrolled", json.dumps({
            "flyerId":    flyer_id,
            "enrolled":   True,
            "surname":    nfc_data.get("surname", ""),
            "givenNames": nfc_data.get("givenNames", ""),
            "timestamp":  __import__("datetime").datetime.utcnow().isoformat() + "Z"
        }), qos=1)
        client.publish("aeroswift/terminal1/v1/face/scan/reset",
            json.dumps({"reset": True, "flyerId": flyer_id}), qos=1)
        client.loop(timeout=3)
        client.disconnect()
    except Exception as e:
        print(f"Solace publish warning: {e}")

    return jsonify({"status": "enrolled", "flyerId": flyer_id})


@app.route("/status", methods=["GET"])
def status():
    return jsonify({"service": "passport-reader", "status": "ok"})


if __name__ == "__main__":
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    print("="*60)
    print("AeroSwift Passport Reader Service")
    print("Listening on http://localhost:3003")
    print("  POST /ocr        — run OCR on passport image")
    print("  POST /nfc        — read NFC chip")
    print("  GET  /nfc/status — poll NFC progress")
    print("  POST /enroll     — enroll into facial recognition")
    print("="*60)
    app.run(host="0.0.0.0", port=3003, debug=False, use_reloader=False)