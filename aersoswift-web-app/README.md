# AeroSwift AI - Web Application

A real-time airport passenger recognition and boarding assistance web application built with Svelte 5, Tailwind CSS, and Solace PubSub+. The application displays live camera feeds and passenger information for streamlined boarding operations.

## Features

- **Real-time Camera Feed**: Live video streaming from ESP32 cameras via Solace PubSub
- **Passenger Information Display**: Shows passenger details including loyalty status, flight info, and boarding group
- **People Analytics**: Real-time people detection and counting from camera feeds
- **Modern UI**: Built with Svelte 5 and styled with Tailwind CSS
- **Demo Mode**: Run without Solace connection for testing and development
- **Responsive Design**: Optimized for various screen sizes and devices

## Tech Stack

- **Frontend Framework**: Svelte 5
- **Styling**: Tailwind CSS with custom airline theme
- **Messaging**: Solace PubSub (via solclientjs)
- **Build Tool**: Vite
- **Language**: JavaScript/TypeScript

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Access to a Solace PubSub+ broker (or use demo mode)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment configuration:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```env
# Solace PubSub+ Configuration
VITE_SOLACE_URL=ws://your-solace-broker:8008
VITE_SOLACE_VPN=your-vpn-name
VITE_SOLACE_USERNAME=your-username
VITE_SOLACE_PASSWORD=your-password

# Application Topics
VITE_VIDEO_TOPIC=aeroswift/camera/feed
VITE_ANALYTICS_TOPIC=aeroswift/camera/analytics/gate1

# Demo Mode (set to 'true' to run without Solace connection)
VITE_DEMO_MODE=false
```

## Usage

### Development Mode

Start the development server with hot module replacement:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build the application for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Demo Mode

To run the application without a Solace connection (useful for development and testing):

1. Set `VITE_DEMO_MODE=true` in your `.env` file
2. Start the development server
3. The app will display simulated camera feeds and analytics data

## Project Structure

```
aersoswift-web-app/
├── src/
│   ├── lib/
│   │   ├── common/
│   │   │   ├── config.ts          # Application configuration
│   │   │   ├── solace.ts          # Solace PubSub+ client
│   │   │   └── types.ts           # TypeScript type definitions
│   │   ├── CameraFeed.svelte      # Camera feed component
│   │   └── PassengerInfo.svelte   # Passenger information component
│   ├── App.svelte                 # Main application component
│   ├── app.css                    # Global styles and Tailwind config
│   └── main.js                    # Application entry point
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── vite.config.js                 # Vite build configuration
└── .env                           # Environment variables (create from .env.example)
```

## Components

### CameraFeed
Displays the live camera feed from ESP32 cameras via Solace PubSub+. Features:
- Real-time video streaming
- Connection status indicator
- Automatic reconnection handling
- Fallback placeholder when no feed is available

### PassengerInfo
Shows passenger details for boarding assistance:
- Passenger name
- Loyalty status (with visual indicators)
- Flight number and destination
- Seat assignment
- Boarding group

## Solace PubSub+ Integration

The application uses Solace PubSub+ for real-time messaging:

### Topics

- **Video Feed**: `aeroswift/camera/feed` - Receives JPEG frames from camera server
- **Analytics**: `aeroswift/camera/analytics/gate1` - Receives people detection data

### Message Formats

**Video Frame Message** (Binary):
```
frameId|timestamp|frameSize|<binary JPEG data>
```

**Analytics Message** (JSON):
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "peopleCount": 3,
  "detections": [
    {
      "confidence": 0.87,
      "bbox": { "x": 120, "y": 80, "width": 150, "height": 320 }
    }
  ],
  "frameSize": { "width": 640, "height": 480 },
  "videoTopic": "aeroswift/camera/feed",
  "model": "YOLOV8M-ONNX"
}
```

## Customization

### Theme Colors

The application uses custom airline-themed colors defined in `tailwind.config.js`:
- `aero-teal`: Primary brand color
- `aero-dark`: Dark accent color
- `aero-light`: Light accent color
- `aero-bg`: Background color

Modify these in `tailwind.config.js` to match your branding.

### Passenger Data

Update passenger information in `App.svelte`:
```javascript
let passengerData = $state({
  name: 'Thomas Kunnumpurath',
  loyaltyStatus: 'Platinum Elite',
  flightNumber: 'AS 1234',
  seat: '12A',
  destination: 'San Francisco',
  boardingGroup: '1'
});
```

## Troubleshooting

### Connection Issues

If you're having trouble connecting to Solace:
1. Verify your Solace broker URL and credentials in `.env`
2. Check that the Solace broker is running and accessible
3. Ensure the VPN name matches your Solace configuration
4. Try enabling demo mode to verify the UI works independently

### Video Feed Not Displaying

1. Verify the camera streaming server is running
2. Check that the `VITE_VIDEO_TOPIC` matches the server's publishing topic
3. Open browser console to see connection and message logs
4. Ensure the Solace session is connected (check status indicator)

### Build Errors

If you encounter build errors:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (WebSocket support required)

## License

MIT

## Related Projects

- [Camera Streaming Server](../camera-streaming-server) - ESP32 camera server with YOLOv8 people detection
