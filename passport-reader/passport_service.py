#!/usr/bin/env python3
"""
Passport Reader Service
Runs complete_passport_reader.py as a subprocess so the webcam
window opens correctly on macOS (OpenCV requires the main thread).

Endpoints:
  GET  /status      — check if service is running
  POST /scan        — trigger a passport scan session
  GET  /scan/status — check scan progress
"""

from flask import Flask, jsonify
from flask_cors import CORS
import subprocess
import threading
import json
import os
import sys
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)  # Only show errors, not every request

app = Flask(__name__)
CORS(app)

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
SCAN_SCRIPT  = os.path.join(SCRIPT_DIR, "complete_passport_reader.py")
STATE_FILE   = os.path.join(SCRIPT_DIR, ".scan_state.json")

scan_process = None

def write_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def read_state():
    if not os.path.exists(STATE_FILE):
        return {"running": False, "status": "idle", "message": "", "flyerId": None, "error": None}
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {"running": False, "status": "error", "message": "", "flyerId": None, "error": "Could not read state"}

def run_scan_subprocess():
    """Launch complete_passport_reader.py as a subprocess and track its exit"""
    global scan_process

    write_state({
        "running": True,
        "status":  "scanning",
        "message": "Passport scan in progress — check webcam window in terminal...",
        "flyerId": None,
        "error":   None
    })

    try:
        # Run with the same Python interpreter and inherit the terminal
        scan_process = subprocess.Popen(
            [sys.executable, SCAN_SCRIPT],
            cwd=SCRIPT_DIR,
            # Inherit stdin/stdout/stderr so webcam window and prompts work
            stdin=sys.stdin,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        scan_process.wait()

        if scan_process.returncode == 0:
            write_state({
                "running": False,
                "status":  "complete",
                "message": "✅ Passport scan complete — passenger enrolled successfully.",
                "flyerId": None,
                "error":   None
            })
        else:
            write_state({
                "running": False,
                "status":  "error",
                "message": "",
                "flyerId": None,
                "error":   f"Scan exited with code {scan_process.returncode}"
            })

    except Exception as e:
        write_state({
            "running": False,
            "status":  "error",
            "message": "",
            "flyerId": None,
            "error":   str(e)
        })


@app.route("/status", methods=["GET"])
def status():
    return jsonify({"service": "passport-reader", "state": read_state()})


@app.route("/scan", methods=["POST"])
def scan():
    state = read_state()
    if state.get("running"):
        return jsonify({"error": "Scan already in progress"}), 409

    # Run in a background thread so HTTP response returns immediately
    # The subprocess itself handles the webcam on the terminal's main thread
    thread = threading.Thread(target=run_scan_subprocess, daemon=True)
    thread.start()

    return jsonify({"message": "Passport scan started"})


@app.route("/scan/status", methods=["GET"])
def scan_status():
    return jsonify(read_state())


@app.route("/scan/reset", methods=["POST"])
def scan_reset():
    global scan_process
    if scan_process and scan_process.poll() is None:
        scan_process.terminate()
    write_state({"running": False, "status": "idle", "message": "", "flyerId": None, "error": None})
    return jsonify({"message": "Reset"})


if __name__ == "__main__":
    # Clear any stale state on startup
    write_state({"running": False, "status": "idle", "message": "", "flyerId": None, "error": None})

    print("="*60)
    print("AeroSwift Passport Reader Service")
    print(f"Script: {SCAN_SCRIPT}")
    print("Listening on http://localhost:3003")
    print("  POST /scan        — trigger passport scan")
    print("  GET  /scan/status — check scan progress")
    print("  POST /scan/reset  — reset state")
    print("="*60)
    print("NOTE: When a scan is triggered, the webcam window")
    print("      will open in THIS terminal. Keep it visible.")
    print("="*60)

    app.run(host="0.0.0.0", port=3003, debug=False, use_reloader=False)