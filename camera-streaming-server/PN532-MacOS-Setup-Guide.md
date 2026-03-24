# PN532 NFC Module Setup on macOS

Complete setup guide for reading NFC/RFID cards using the PN532 module on macOS with libnfc.

## Table of Contents
- [Hardware Components](#hardware-components)
- [Hardware Setup](#hardware-setup)
- [Software Installation](#software-installation)
- [Configuration](#configuration)
- [Testing](#testing)
- [Capabilities & Limitations](#capabilities--limitations)

---

## Hardware Components

### Required Hardware
- **PN532 NFC RFID Module V3** (Elechouse or HiLetgo)
  - Supports I2C, SPI, and HSU (UART) modes
  - Built-in PCB antenna with 5-7cm range
  - Voltage: 3.3V-5V
  
- **USB-to-TTL Serial Adapter**
  - DSD TECH SH-U09B3 (CP2102N chip)
  - USB-C connector for modern MacBooks
  - 3.3V/5V compatible

- **Jumper Wires** (4x female-to-female)
- **Soldering Equipment**
  - Soldering iron
  - Solder wire
  - Header pins (included with PN532)

### Test Cards (Included)
- S50 Mifare Classic white card
- Blue RFID key fob

---

## Hardware Setup

### 1. Solder Header Pins

**Critical Step:** The PN532 module requires soldered connections for reliable serial communication.

1. Insert the short side of header pins through the PN532 board holes
2. Solder each pin creating a shiny, cone-shaped joint
3. Let cool completely before handling

**Note:** While power (VCC/GND) may work with friction-fit connections, data transmission (TX/RX) requires proper soldered connections for the high-speed serial communication at 115200 baud.

### 2. Set Communication Mode

Configure the DIP switches on the PN532 for UART/HSU mode:

```
Switch 1: OFF (left/down) = 0
Switch 2: OFF (left/down) = 0

Mode Reference Table (printed on board):
HSU = 0, 0  ← Use this mode
I2C = 1, 0
SPI = 0, 1
```

### 3. Wiring Connections

Connect the PN532 to the USB-TTL adapter using 4 jumper wires:

```
PN532 Board    →    DSD TECH Adapter
─────────────────────────────────────
GND            →    GND
VCC            →    5V (or 5V0)
SDA (TX)       →    RXD    ← Crossed!
SCL (RX)       →    TXD    ← Crossed!
```

**Important:** TX/RX must be crossed - PN532's transmit goes to adapter's receive and vice versa.

---

## Software Installation

### System Requirements
- macOS 10.15 (Catalina) or later
- Homebrew package manager
- Python 3.x
- Xcode Command Line Tools

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Python and libnfc

```bash
# Install Python 3
brew install python3

# Install libnfc (NFC communication library)
brew install libnfc

# Verify installation
brew link libnfc
```

### 3. Install Python Libraries (Optional)

For custom Python scripts:

```bash
# Create virtual environment
python3 -m venv ~/nfc-env
source ~/nfc-env/bin/activate

# Install NFC libraries
pip install nfcpy
pip install pyserial
pip install pycryptodome
pip install pyasn1
```

---

## Configuration

### 1. Find Serial Port

After connecting the USB adapter to your Mac:

```bash
ls /dev/tty.*
```

Expected output:
```
/dev/tty.usbserial-0001
/dev/tty.Bluetooth-Incoming-Port
/dev/tty.debug-console
```

Note the `tty.usbserial-*` device - this is your PN532.

### 2. Configure libnfc

Create the configuration file:

```bash
sudo mkdir -p /etc/nfc
sudo nano /etc/nfc/libnfc.conf
```

Add the following configuration:

```ini
# Allow device auto-detection
allow_autoscan = true

# Allow intrusive auto-detection
allow_intrusive_scan = false

# Set log level (0-3, 3 is most verbose)
log_level = 1

# Define the PN532 device
device.name = "PN532 over UART"
device.connstring = "pn532_uart:/dev/tty.usbserial-0001"
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

---

## Testing

### 1. Device Detection

Verify the PN532 is detected:

```bash
nfc-list
```

Expected output:
```
nfc-list uses libnfc 1.8.0
NFC device: pn532_uart:/dev/tty.usbserial-0001 opened
```

### 2. Card Reading Test

Poll for NFC cards:

```bash
nfc-poll
```

Place a card on the PN532. Expected output:

```
NFC reader: pn532_uart:/dev/tty.usbserial-0001 opened
NFC device will poll during 36000 ms (20 pollings of 300 ms for 6 modulations)
ISO/IEC 14443A (106 kbps) target:
    ATQA (SENS_RES): 00  04  
       UID (NFCID1): c2  93  76  06  
      SAK (SEL_RES): 08  
Waiting for card removing...done.
```

### 3. Python Test Script

Create a simple test script:

```python
#!/usr/bin/env python3
import nfc

def on_connect(tag):
    print(f"\n✅ Card detected!")
    print(f"Type: {tag.type}")
    print(f"UID: {tag.identifier.hex().upper()}")
    return False

print("Opening NFC reader...")
clf = nfc.ContactlessFrontend('tty:usbserial-0001:pn53x')
print("Ready! Place card on reader...")
clf.connect(rdwr={'on-connect': on_connect})
clf.close()
```

Run with:
```bash
source ~/nfc-env/bin/activate
python test_nfc.py
```

---

## Capabilities & Limitations

### ✅ What Works

**Supported Card Types:**
- Mifare Classic (1K, 4K)
- Mifare Ultralight
- NTAG213/215/216
- ISO/IEC 14443A cards
- ISO/IEC 14443B cards
- FeliCa cards

**Supported Operations:**
- Read card UID
- Read/write data blocks
- Authenticate with keys
- Card emulation
- P2P communication (I2C mode only)

### ❌ Limitations

**ePassport Reading:**
The PN532 via UART cannot read ePassports because:
- Requires PCSC/CCID smartcard interface (not available via UART)
- ePassport software tools (ePassportViewer, pypassport) expect PCSC readers
- No bridge exists to expose PN532 UART as PCSC device on macOS
- Would require custom implementation of BAC (Basic Access Control) authentication

**Next Steps:**
Testing with a proper PCSC-compliant NFC reader (ACR122U or contactless CAC reader) will be required for ePassport reading functionality.
