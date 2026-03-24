const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const WebSocket = require('ws');
const YOLOv8Detector = require('./yolo-detector');
const FaceDetector = require('./face-detector');
const EmotionDetector = require('./emotion-detector');
const FaceMatcher = require('./face-matcher'); // face matcher addition
const path = require('path');
const { expand } = require('dotenv-expand');
expand(require('dotenv').config({
  path: [path.resolve(__dirname, '../common-properties/.env'), path.resolve(__dirname, '.env')]
}));

class ESP32VideoStreamer {
  constructor() {
    this.app = express();
    this.server = null;
    this.mqttClient = null;
    this.streamActive = false;
    this.streamBuffer = Buffer.alloc(0);
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.statsInterval = null;
    this.publishQueue = 0;
    this.droppedFrames = 0;
    this.detectionModel = null;
    this.emotionDetector = null;
    this.lastDetectionTime = 0;
    this.detectionQueue = [];
    this.faceMatcher = null; // face matcher addition
    
    this.faceDetectionActive = true;

    this.config = {
      solace: {
        host: process.env.SOLACE_MQTT_HOST || 'tcp://localhost:1883',
        username: process.env.SOLACE_USERNAME || 'default',
        password: process.env.SOLACE_PASSWORD || 'default',
        clientId: process.env.SOLACE_CLIENT_ID || 'esp32-video-streamer'
      },
      esp32: {
        ip: process.env.ESP32_CAMERA_IP || '192.168.1.100',
        port: process.env.ESP32_STREAM_PORT || '81',
        path: process.env.ESP32_STREAM_PATH || '/stream'
      },
      server: {
        port: process.env.SERVER_PORT || 3000,
        videoTopic: process.env.VIDEO_TOPIC || 'video/esp32/stream',
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 8192,
        minFrameInterval: parseInt(process.env.MIN_FRAME_INTERVAL_MS) || 0, // 0 = no throttling
        maxFps: parseInt(process.env.MAX_FPS) || 0 // 0 = unlimited
      },
      detection: {
        enabled: process.env.ENABLE_FACE_DETECTION === 'true',
        intervalMs: parseInt(process.env.DETECTION_INTERVAL_MS) || 2000,
        confidenceThreshold: parseFloat(process.env.DETECTION_CONFIDENCE_THRESHOLD) || 0.5,
        analyticsTopic: process.env.ANALYTICS_TOPIC || 'video/esp32/analytics',
        faceMatchTopic: process.env.TOPIC_FACE_MATCH_REQUEST || 'aeroswift/terminal1/v1/face/match/request',
        scanResetTopic: process.env.TOPIC_FACE_SCAN_RESET || 'aeroswift/terminal1/v1/face/scan/reset',
        modelType: process.env.FACE_MODEL_TYPE || 'yolov8n-face',
        enableEmotions: process.env.ENABLE_EMOTION_DETECTION === 'true'
      }
    };
    
    // Calculate min frame interval from MAX_FPS if set
    if (this.config.server.maxFps > 0) {
      this.config.server.minFrameInterval = Math.floor(1000 / this.config.server.maxFps);
    }
  }

  async initialize() {
    try {
      await this.setupMQTT();
      if (this.config.detection.enabled) {
        await this.loadDetectionModel();
      }
      this.setupExpress();
      this.startServer();
      this.startVideoStream();
      console.log('ESP32 Video Streamer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize:', error);
      process.exit(1);
    }
  }

  async loadDetectionModel() {
    console.log('Initializing face detector...');
    try {
      this.detectionModel = new FaceDetector(
        this.config.detection.confidenceThreshold,
        this.config.detection.modelType
      );
      const success = await this.detectionModel.initialize();
      
      if (success) {
        console.log(`  Detection interval: ${this.config.detection.intervalMs}ms`);
        console.log(`  Confidence threshold: ${this.config.detection.confidenceThreshold}`);
        console.log(`  Analytics topic: ${this.config.detection.analyticsTopic}`);
        console.log(`  Model: ${this.config.detection.modelType}`);
        
        // Initialize emotion detector if enabled
        if (this.config.detection.enableEmotions) {
          console.log('Initializing emotion detector...');
          this.emotionDetector = new EmotionDetector();
          const emotionSuccess = await this.emotionDetector.initialize();
          if (!emotionSuccess) {
            console.warn('Emotion detection disabled - models not available');
            this.emotionDetector = null;
            this.config.detection.enableEmotions = false;
          } else {
            console.log('  Emotion detection enabled');
          }
        }
        // LGU: Initialize face matcher
        console.log('Initializing face matcher...');
        this.faceMatcher = new FaceMatcher();
        try {
          await this.faceMatcher.initialize();
          console.log('  Passport face matching enabled');
        } catch (err) {
          console.warn('  Face matching disabled:', err.message);
          this.faceMatcher = null;
        } 
      } else {
        console.error('Failed to initialize face detector');
        this.config.detection.enabled = false;
        this.detectionModel = null;
      }
    } catch (error) {
      console.error('Failed to load face detection model:', error);
      this.config.detection.enabled = false;
      this.detectionModel = null;
    }
  }

  async setupMQTT() {
    return new Promise((resolve, reject) => {
      console.log('Connecting to Solace MQTT broker...');
      
      const mqttOptions = {
        username: this.config.solace.username,
        password: this.config.solace.password,
        clientId: this.config.solace.clientId,
        clean: true,
        reconnectPeriod: 5000,
        keepalive: 60
      };

      // Try MQTT 5.0 first, fall back to 3.1.1 if not supported
      try {
        mqttOptions.protocolVersion = 5;
        mqttOptions.properties = {
          maximumPacketSize: 268435455,
          receiveMaximum: 65535
        };
      } catch (e) {
        console.log('MQTT 5.0 not supported, using MQTT 3.1.1');
      }

      this.mqttClient = mqtt.connect(this.config.solace.host, mqttOptions);

      this.mqttClient.on('connect', () => {
        console.log('Connected to Solace MQTT broker');
        const scanResetTopic = this.config.detection.scanResetTopic;
        this.mqttClient.subscribe(scanResetTopic, { qos: 1 }, (err) => {
          if (err) {
            console.error(`Failed to subscribe to scan reset topic: ${scanResetTopic}`, err);
          } else {
            console.log(`Subscribed to scan reset topic: ${scanResetTopic}`);
          }
        });
        resolve();
      });

      this.mqttClient.on('message', (topic, _message) => {
        if (topic === this.config.detection.scanResetTopic) {
          console.log('Scan reset command received — face detection re-enabled');
          this.faceDetectionActive = true;
        }
      });

      this.mqttClient.on('error', (error) => {
        console.error('MQTT connection error:', error);
        reject(error);
      });

      this.mqttClient.on('close', () => {
        console.log('MQTT connection closed');
      });
    });
  }

  setupExpress() {
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        mqtt: this.mqttClient?.connected || false,
        streaming: this.streamActive,
        timestamp: new Date().toISOString()
      });
    });

    // Start streaming endpoint
    this.app.post('/stream/start', async (req, res) => {
      try {
        await this.startVideoStream();
        res.json({ message: 'Video streaming started', status: 'success' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to start streaming', error: error.message });
      }
    });

    // Stop streaming endpoint
    this.app.post('/stream/stop', (req, res) => {
      this.stopVideoStream();
      res.json({ message: 'Video streaming stopped', status: 'success' });
    });

    // Get stream status
    this.app.get('/stream/status', (req, res) => {
      res.json({
        active: this.streamActive,
        esp32Url: `http://${this.config.esp32.ip}:${this.config.esp32.port}${this.config.esp32.path}`,
        videoTopic: this.config.server.videoTopic,
        faceDetection: {
          enabled: this.config.detection.enabled,
          modelLoaded: this.detectionModel !== null,
          intervalMs: this.config.detection.intervalMs,
          emotionDetection: this.emotionDetector !== null
        }
      });
    });
  }

  startServer() {
    this.server = this.app.listen(this.config.server.port, () => {
      console.log(`Server running on port ${this.config.server.port}`);
      console.log(`ESP32 Camera URL: http://${this.config.esp32.ip}:${this.config.esp32.port}${this.config.esp32.path}`);
      console.log(`Video Topic: ${this.config.server.videoTopic}`);
      
      if (this.config.server.maxFps > 0) {
        console.log(`Frame Rate Limit: ${this.config.server.maxFps} fps (${this.config.server.minFrameInterval}ms interval)`);
      } else if (this.config.server.minFrameInterval > 0) {
        console.log(`Frame Interval: ${this.config.server.minFrameInterval}ms`);
      } else {
        console.log(`Frame Rate: Unlimited`);
      }
    });
  }
  async startVideoStream() {
    if (this.streamActive) {
      console.log('Stream already active');
      return;
    }

    const streamUrl = `http://${this.config.esp32.ip}:${this.config.esp32.port}${this.config.esp32.path}`;
    console.log(`Starting video stream from: ${streamUrl}`);
    console.log(`Testing connection to ESP32...`);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.config.esp32.ip,
        port: this.config.esp32.port,
        path: this.config.esp32.path,
        method: 'GET',
        headers: {
          'Connection': 'keep-alive',
          'Accept': '*/*'
        },
        timeout: 30000 // 30 second timeout
      };

      console.log(`Connecting to ${options.hostname}:${options.port}${options.path}`);

      const req = http.request(options, (response) => {
        console.log(`HTTP Response: ${response.statusCode} ${response.statusMessage}`);
        console.log(`Headers:`, response.headers);

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        console.log('Connected to ESP32 stream successfully');
        this.streamActive = true;
        let frameBuffer = Buffer.alloc(0);
        let framesDetected = 0;
        let lastFrameDetectedTime = Date.now();
        let totalBytesReceived = 0;
        let lastBytesReport = Date.now();

        // Start stats reporting
        this.startStatsReporting();

        // Disable buffering - process data immediately
        response.on('data', (chunk) => {
          totalBytesReceived += chunk.length;
          
          // Report bytes received every 2 seconds
          const now = Date.now();
          if (now - lastBytesReport > 2000) {
            const bytesPerSecond = totalBytesReceived / ((now - lastBytesReport) / 1000);
            console.log(`Receiving ${(bytesPerSecond / 1024).toFixed(2)} KB/s from ESP32`);
            totalBytesReceived = 0;
            lastBytesReport = now;
          }
          
          frameBuffer = Buffer.concat([frameBuffer, chunk]);
          
          // Look for JPEG frame boundaries
          const startMarker = Buffer.from([0xFF, 0xD8]); // JPEG start
          const endMarker = Buffer.from([0xFF, 0xD9]);   // JPEG end

          let startIndex = 0;
          
          // Process all complete frames in the buffer
          while (true) {
            startIndex = frameBuffer.indexOf(startMarker, startIndex);
            if (startIndex === -1) break;
            
            const endIndex = frameBuffer.indexOf(endMarker, startIndex + 2);
            if (endIndex === -1) break;
            
            // Extract complete JPEG frame
            const frame = frameBuffer.subarray(startIndex, endIndex + 2);
            framesDetected++;
            
            const timeSinceLastFrame = now - lastFrameDetectedTime;
            
            // Log first few frames to verify detection
            if (framesDetected <= 10) {
              console.log(`Frame ${framesDetected} detected: ${frame.length} bytes, ${timeSinceLastFrame}ms since last frame`);
            }
            
            lastFrameDetectedTime = now;
            
            // Throttle frame rate if configured
            if (this.config.server.minFrameInterval === 0 || 
                now - this.lastFrameTime >= this.config.server.minFrameInterval) {
              this.publishVideoFrame(frame);
              this.lastFrameTime = now;
              
              // Queue frame for detection if enabled (analytics always run)
              if (this.config.detection.enabled &&
                  now - this.lastDetectionTime >= this.config.detection.intervalMs) {
                this.queueFrameForDetection(frame);
                this.lastDetectionTime = now;
              }
            }

            // Move to next potential frame
            startIndex = endIndex + 2;
          }
          
          // Keep only data after the last processed frame
          if (startIndex > 0) {
            frameBuffer = frameBuffer.subarray(startIndex);
          }

          // Keep buffer size manageable
          if (frameBuffer.length > 100000) {
            console.warn(`Buffer overflow: ${frameBuffer.length} bytes, clearing...`);
            frameBuffer = Buffer.alloc(0);
          }
        });

        response.on('error', (error) => {
          console.error('Stream error:', error);
          this.streamActive = false;
        });

        response.on('end', () => {
          console.log('Stream ended');
          this.streamActive = false;
        });

        resolve();
      });

      req.on('error', (error) => {
        console.error('Failed to connect to ESP32 camera:', error.message);
        this.streamActive = false;
        reject(error);
      });

      req.on('timeout', () => {
        console.error('Connection timeout - ESP32 not responding');
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      req.end();
    });
  }

  publishVideoFrame(frameData) {
    if (!this.mqttClient || !this.mqttClient.connected) {
      return;
    }

    // Drop frames if queue is backing up (more than 1 frame pending)
    if (this.publishQueue > 1) {
      this.droppedFrames++;
      return;
    }

    this.publishQueue++;
    const now = Date.now();
    const frameId = now.toString();

    // Publish frame as binary buffer directly (no base64 encoding)
    // Use a simple header format: frameId|timestamp|frameSize|data
    const header = `${frameId}|${new Date(now).toISOString()}|${frameData.length}|`;
    const headerBuffer = Buffer.from(header, 'utf8');
    const fullMessage = Buffer.concat([headerBuffer, frameData]);

    // Use setImmediate to prevent blocking
    setImmediate(() => {
      this.mqttClient.publish(
        this.config.server.videoTopic,
        fullMessage,
        { qos: 0 },
        (error) => {
          this.publishQueue--;
          if (error) {
            console.error(`Publish error:`, error.message);
          }
        }
      );
    });
    
    this.frameCount++;
  }

  queueFrameForDetection(frameData) {
    // Keep only the latest frame in queue to avoid backlog
    this.detectionQueue = [frameData];
    
    // Process detection asynchronously
    setImmediate(() => this.processDetection());
  }

  async processDetection() {
    if (this.detectionQueue.length === 0 || !this.detectionModel) {
      return;
    }

    const frameData = this.detectionQueue.shift();
    
    try {
      const sharp = require('sharp');
      
      // Get image metadata
      const metadata = await sharp(frameData).metadata();
      
      // Run face detection
      const faces = await this.detectionModel.detect(frameData);

      let detections = faces.map(f => ({
        confidence: f.confidence,
        bbox: f.bbox
      }));

      // Run emotion detection if enabled and faces were found
      if (this.emotionDetector && faces.length > 0) {
        try {
          const emotionResults = await this.emotionDetector.detectEmotions(frameData, faces);
          
          // Merge emotion data with face detections
          if (emotionResults.length > 0) {
            detections = emotionResults.map(er => ({
              confidence: er.confidence,
              bbox: er.bbox,
              emotions: er.emotions,
              dominantEmotion: er.dominantEmotion,
              dominantScore: er.dominantScore
            }));
          }
        } catch (error) {
          console.error('Emotion detection error:', error.message);
        }
      }

      // Publish analytics
      const analytics = {
        timestamp: new Date().toISOString(),
        faceCount: faces.length,
        detections: detections,
        frameSize: {
          width: metadata.width,
          height: metadata.height
        },
        videoTopic: this.config.server.videoTopic,
        model: `${this.config.detection.modelType.toUpperCase()}-ONNX`,
        emotionDetection: this.emotionDetector !== null
      };

          
      // LGU: Match against passport if faces detected
      if (this.faceMatcher && analytics.faceCount > 0) {
        const matchResult = await this.faceMatcher.matchFace(frameData);
        analytics.passportMatch = matchResult;
        
        if (matchResult.match) {
          console.log(`✅ PASSPORT MATCH - Confidence: ${matchResult.confidence}`);
          analytics.passenger = {
                                  name: "Laurent Guillot",
                                  loyaltyStatus: "Economy Plus",
                                  flightNumber: "AF 1234",
                                  seatAssignment: "33A",
                                  destination: "Paris",
                                  boardingGroup: "Group 6"
                                };
        } else {
          console.log(`❌ No passport match - Distance: ${matchResult.distance}`);
        }
      }

      this.publishAnalytics(analytics);
      
      if (faces.length > 0) {
        console.log(`Faces detected: ${faces.length} (confidence >= ${this.config.detection.confidenceThreshold})`);
        detections.forEach((d, i) => {
          let logMsg = `  Face ${i + 1}: ${(d.confidence * 100).toFixed(1)}% confidence`;
          if (d.dominantEmotion) {
            logMsg += ` - ${d.dominantEmotion} (${(d.dominantScore * 100).toFixed(1)}%)`;
          }
          console.log(logMsg);
        });

        const highConfidenceFace = detections.find(d => d.confidence > 0.5);
        if (highConfidenceFace && this.faceDetectionActive) {
          const base64encoded = frameData.toString('base64');
          const matchPayload = JSON.stringify({
            imageBase64: base64encoded,
            source: "camera-streaming-server",
            timestamp: new Date().toISOString()
          });
          this.faceDetectionActive = false;
          console.log(`Face detected with ${(highConfidenceFace.confidence * 100).toFixed(1)}% confidence — publishing to ${this.config.detection.faceMatchTopic} and suspending face match until reset`);
          this.mqttClient.publish(
            this.config.detection.faceMatchTopic,
            matchPayload,
            { qos: 1 },
            (error) => {
              if (error) {
                console.error('Failed to publish face match payload:', error.message);
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('Detection error:', error.message);
    }
  }

  publishAnalytics(analytics) {
    if (!this.mqttClient || !this.mqttClient.connected) {
      return;
    }

    const payload = JSON.stringify(analytics, null, 2);


    console.log('\n📊 Publishing Analytics:');
    console.log('─────────────────────────────────────────');
    console.log(`Topic: ${this.config.detection.analyticsTopic}`);
    console.log('Payload:');
    console.log(payload);
    console.log('─────────────────────────────────────────\n');

    this.mqttClient.publish(
      this.config.detection.analyticsTopic,
      payload,
      { qos: 1 },
      (error) => {
        if (error) {
          console.error('Failed to publish analytics:', error.message);
        } else {
          console.log('✓ Analytics published successfully');
        }
      }
    );
  }

  stopVideoStream() {
    this.streamActive = false;
    this.stopStatsReporting();
    console.log('Video streaming stopped');
  }

  startStatsReporting() {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastStatsTime = Date.now();
    this.lastStatsFrameCount = 0;
    const startTime = Date.now();
    
    this.statsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const totalFps = (this.frameCount / elapsed).toFixed(2);
      
      // Calculate instantaneous FPS (last 5 seconds)
      const intervalSeconds = (now - this.lastStatsTime) / 1000;
      const intervalFrames = this.frameCount - this.lastStatsFrameCount;
      const instantFps = (intervalFrames / intervalSeconds).toFixed(2);
      
      const dropRate = this.droppedFrames > 0 ? ` (${this.droppedFrames} dropped)` : '';
      console.log(`Stats: ${this.frameCount} frames, Avg: ${totalFps} fps, Current: ${instantFps} fps${dropRate}, Queue: ${this.publishQueue}`);
      
      this.lastStatsTime = now;
      this.lastStatsFrameCount = this.frameCount;
    }, 5000); // Report every 5 seconds
  }

  stopStatsReporting() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }



  async shutdown() {
    console.log('Shutting down server...');
    this.stopVideoStream();
    
    if (this.mqttClient) {
      this.mqttClient.end();
    }
    
    if (this.server) {
      this.server.close();
    }
    
    // Give time for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Initialize and start the server
const streamer = new ESP32VideoStreamer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await streamer.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await streamer.shutdown();
  process.exit(0);
});

// Start the application
streamer.initialize().catch(console.error);