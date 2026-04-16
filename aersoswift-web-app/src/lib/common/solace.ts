/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { SolaceConfig } from './types';
import { DEMO_MODE } from './config';
import * as solace from 'solclientjs';

// Demo session type
interface DemoSession {
  connected: boolean;
  demo: boolean;
}

export class SolaceVideoClient {
  private session: solace.Session | DemoSession | null = null;
  private sessionEventCb: any = null;
  private messageEventCb: any = null;
  private onFrameCallback?: (imageData: string) => void;
  private topicCallbacks: Map<string, Array<(payload: any) => void>> = new Map();
  private isConnected = false;
  private subscriptions: Set<string> = new Set();
  private demoInterval?: number;
  private static factoryInitialized = false;

  constructor(private config: SolaceConfig) {
    // Initialize the solace client library
    if (!DEMO_MODE) {
      this.initializeSolaceFactory();
    }
  }

  private initializeSolaceFactory(): void {
    if (SolaceVideoClient.factoryInitialized) {
      console.log('Solace factory already initialized');
      return;
    }

    try {
      console.log('Initializing Solace factory...');
      // @ts-ignore
      const factoryProps = new solace.SolclientFactoryProperties();
      factoryProps.profile = solace.SolclientFactoryProfiles.version10;
      solace.SolclientFactory.init(factoryProps);
      SolaceVideoClient.factoryInitialized = true;
      console.log('✅ Solace factory initialized');
    } catch (error: unknown) {
      console.error('❌ Failed to initialize Solace factory:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    if (DEMO_MODE) {
      return this.connectDemo();
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing Solace connection...');

        // Create session properties
        const sessionProperties = new solace.SessionProperties({
          url: this.config.url,
          vpnName: this.config.vpnName,
          userName: this.config.username,
          password: this.config.password,
          connectRetries: 3,
          reconnectRetries: 3,
          reconnectRetryWaitInMsecs: 3000
        });

        console.log('Creating Solace session...');

        // Create session
        this.session = solace.SolclientFactory.createSession(sessionProperties);

        // Session event callback
        this.sessionEventCb = (sessionEvent: any) => {
          const eventType = sessionEvent.type || sessionEvent.sessionEventCode;
          const eventInfo = sessionEvent.infoStr || '';
          
          console.log('Solace session event:', eventType, eventInfo);
          
          // Handle known event types
          if (eventType === solace.SessionEventCode.UP_NOTICE) {
            console.log('✅ Solace session connected successfully');
            this.isConnected = true;
            resolve();
          } else if (eventType === solace.SessionEventCode.CONNECT_FAILED_ERROR) {
            console.error('❌ Solace connection failed:', eventInfo);
            this.isConnected = false;
            reject(new Error(`Connection failed: ${eventInfo}`));
          } else if (eventType === solace.SessionEventCode.DISCONNECTED) {
            console.log('⚠️ Solace session disconnected');
            this.isConnected = false;
          } else if (eventType === solace.SessionEventCode.SUBSCRIPTION_ERROR) {
            console.error('❌ Solace subscription error:', eventInfo);
          } else if (eventType === solace.SessionEventCode.SUBSCRIPTION_OK) {
            console.log('✅ Solace subscription successful');
          } else if (eventType === solace.SessionEventCode.RECONNECTING_NOTICE) {
            console.log('🔄 Reconnecting to Solace broker...');
          } else if (eventType === solace.SessionEventCode.RECONNECTED_NOTICE) {
            console.log('✅ Reconnected to Solace broker');
          } else if (eventInfo) {
            // Log other events with info strings (like connection attempts)
            console.log(`ℹ️ Solace event: ${eventInfo}`);
          }
        };

        // Message event callback
        this.messageEventCb = (message: any) => {
          this.handleMessage(message);
        };

        // Connect session
        this.session.on(solace.SessionEventCode.UP_NOTICE, this.sessionEventCb);
        this.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, this.sessionEventCb);
        this.session.on(solace.SessionEventCode.DISCONNECTED, this.sessionEventCb);
        this.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, this.sessionEventCb);
        this.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, this.sessionEventCb);
        this.session.on(solace.SessionEventCode.MESSAGE, this.messageEventCb);

        console.log('Attempting to connect to Solace PubSub+...');
        this.session.connect();

      } catch (error: unknown) {
        console.error('❌ Failed to create Solace session:', error);
        reject(error);
      }
    });
  }

  private async connectDemo(): Promise<void> {
    return new Promise((resolve) => {
      console.log('Running in demo mode - simulating Solace connection');
      setTimeout(() => {
        this.session = { connected: true, demo: true } as DemoSession;
        this.isConnected = true;
        console.log('Demo Solace session connected');
        resolve();
      }, 1000);
    });
  }



  subscribe(topic: string, onFrame: (imageData: string) => void): void {
    this.onFrameCallback = onFrame;

    if (DEMO_MODE || (this.session && 'demo' in this.session && this.session.demo)) {
      console.log(`Demo mode: Subscribing to ${topic}`);
      this.startDemoVideoFeed();
      return;
    }

    if (!this.session || !this.isConnected) {
      console.error('Solace session not connected');
      return;
    }
    
    // Type guard to ensure we have a real Solace session
    if ('demo' in this.session) {
      console.error('Cannot subscribe with demo session');
      return;
    }
    
    try {
      const streamTopic = solace.SolclientFactory.createTopicDestination(topic);
      this.session.subscribe(streamTopic, true, topic, 10000);
      this.subscriptions.add(topic);

      console.log(`Subscribed to video stream topic: ${topic}`);
    } catch (error: unknown) {
      console.error('Failed to subscribe to stream topic:', error);
    }
  }

  subscribeToTopic(topic: string, onMessage: (payload: any) => void): void {
    console.log('subscribeToTopic called with topic:', topic, 'type:', typeof topic);
    
    if (!topic || topic.trim() === '') {
      console.error('Invalid topic: topic is empty or undefined');
      return;
    }
    
    if (DEMO_MODE || (this.session && 'demo' in this.session && this.session.demo)) {
      console.log(`Demo mode: Subscribing to ${topic}`);
      // Simulate people count data in demo mode
      const demoInterval = window.setInterval(() => {
        onMessage({
          peopleCount: Math.floor(Math.random() * 5) + 1,
          detections: [],
          timestamp: new Date().toISOString(),
          frameSize: { width: 640, height: 480 },
          activeTopic: 'demo',
          model: 'DEMO-ONNX'
        });
      }, 2000);
      return;
    }

    if (!this.session || !this.isConnected) {
      console.error('Solace session not connected');
      return;
    }
    
    // Type guard to ensure we have a real Solace session
    if ('demo' in this.session) {
      console.error('Cannot subscribe with demo session');
      return;
    }
    
    try {
      // Add callback to the list for this topic
      const existing = this.topicCallbacks.get(topic);
      if (existing) {
        existing.push(onMessage);
      } else {
        this.topicCallbacks.set(topic, [onMessage]);
        // Only subscribe to Solace once per topic
        console.log('Creating topic destination for:', topic);
        const destination = solace.SolclientFactory.createTopicDestination(topic);
        console.log('Topic destination created, subscribing...');
        this.session.subscribe(destination, true, topic, 10000);
        this.subscriptions.add(topic);
        console.log(`Subscribed to topic: ${topic}`);
      }
    } catch (error: unknown) {
      console.error('Failed to subscribe to topic:', error);
      console.error('Topic value was:', topic);
    }
  }

  private startDemoVideoFeed(): void {
    // Clear any existing interval
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
    }

    // Generate demo video frames
    this.demoInterval = window.setInterval(() => {
      if (this.onFrameCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create animated background
          const time = Date.now() / 1000;
          const gradient = ctx.createLinearGradient(0, 0, 640, 480);
          gradient.addColorStop(0, `hsl(${(time * 30) % 360}, 70%, 50%)`);
          gradient.addColorStop(1, `hsl(${(time * 30 + 180) % 360}, 70%, 30%)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 640, 480);
          
          // Add moving elements
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          const x = (Math.sin(time) * 200) + 320;
          const y = (Math.cos(time * 0.7) * 150) + 240;
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fill();
          
          // Add timestamp
          ctx.fillStyle = 'white';
          ctx.font = '20px Arial';
          ctx.fillText(new Date().toLocaleTimeString(), 20, 40);
          
          // Add GTAA branding
          ctx.fillStyle = '#003366';
          ctx.font = 'bold 24px Arial';
          ctx.fillText('GTAA Camera Feed (Demo)', 20, 80);
          
          // Add demo indicator
          ctx.fillStyle = '#ff6b35';
          ctx.font = '16px Arial';
          ctx.fillText('DEMO MODE', 20, 110);
          
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          this.onFrameCallback(imageData);
        }
      }
    }, 100); // 10 FPS
  }

  private handleMessage(message: any): void {
    try {
      const destination = message.getDestination();
      if (!destination) return;
      
      const topic = destination.getName();
      const binaryAttachment = message.getBinaryAttachment();
      if (!binaryAttachment) return;

      // Check if there are callbacks registered for this specific topic
      const topicCallbacks = this.topicCallbacks.get(topic);
      if (topicCallbacks && topicCallbacks.length > 0) {
        let payload: any = null;
        try {
          payload = JSON.parse(binaryAttachment);
          console.log(`Received message on topic ${topic}:`, payload);
        } catch {
          // Payload is not JSON (e.g. large binary attachment) — callbacks still fire with null
          console.log(`Non-JSON message received on topic ${topic}, invoking callbacks with null payload`);
        }
        topicCallbacks.forEach(cb => cb(payload));
        return;
      }

      // Handle video stream messages (topics registered via subscribe(), not subscribeToTopic())
      if (this.onFrameCallback && !this.topicCallbacks.has(topic)) {
        // Try to parse as JSON first (for inactive messages)
        try {
          const payload = JSON.parse(binaryAttachment);
          if (payload.type === 'inactive') {
            this.handleInactiveMessage(payload);
            return;
          }
        } catch {
          // Not JSON, treat as binary format
        }
        
        // Handle binary format with header
        this.handleStreamMessage(binaryAttachment);
      }
    } catch (error: unknown) {
      console.error('Error handling message:', error);
    }
  }

  private handleInactiveMessage(payload: any): void {
    try {
      // Signal inactive state to the callback with a special marker
      if (this.onFrameCallback) {
        this.onFrameCallback('INACTIVE');
      }
    } catch (error: unknown) {
      console.error('Error handling inactive message:', error);
    }
  }

  private handleStreamMessage(binaryData: string): void {
    try {
      // Parse header format: frameId|timestamp|frameSize|<binary JPEG data>
      // Find the position of the third pipe character
      let pipeCount = 0;
      let headerEndIndex = -1;
      
      for (let i = 0; i < binaryData.length && pipeCount < 3; i++) {
        if (binaryData.charCodeAt(i) === 124) { // 124 is '|'
          pipeCount++;
          if (pipeCount === 3) {
            headerEndIndex = i;
            break;
          }
        }
      }

      if (headerEndIndex === -1) {
        console.warn('Invalid frame format: header not found');
        return;
      }

      // Extract header and parse
      const header = binaryData.substring(0, headerEndIndex);
      const parts = header.split('|');
      
      if (parts.length !== 3) {
        console.warn('Invalid header format');
        return;
      }

      const frameId = parts[0];
      const timestamp = parts[1];
      const frameSize = parseInt(parts[2], 10);

      // Extract binary JPEG data (after the third pipe)
      const jpegData = binaryData.substring(headerEndIndex + 1);

      // Convert binary string to base64
      // The binary data is already in the string, we need to convert it to base64
      const base64Data = btoa(jpegData);

      // Create data URL
      const imageData = `data:image/jpeg;base64,${base64Data}`;
      
      // Call the frame callback
      if (this.onFrameCallback) {
        this.onFrameCallback(imageData);
      }

    } catch (error: unknown) {
      console.error('Error handling stream message:', error);
    }
  }

  publishControl(topic: string, payload: any): void {
    if (DEMO_MODE || (this.session && 'demo' in this.session && this.session.demo)) {
      console.log(`Demo mode: Publishing control message to ${topic}:`, payload);
      return;
    }

    if (!this.session || !this.isConnected) {
      console.warn('Solace session not connected, cannot publish control message');
      return;
    }

    // Type guard to ensure we have a real Solace session
    if ('demo' in this.session) {
      console.warn('Cannot publish with demo session');
      return;
    }

    try {
      const message = solace.SolclientFactory.createMessage();
      const destination = solace.SolclientFactory.createTopicDestination(topic);
      
      message.setDestination(destination);
      message.setBinaryAttachment(JSON.stringify(payload));
      message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
      
      this.session.send(message);
      console.log(`Published control message to ${topic}:`, payload);
    } catch (error: unknown) {
      console.error('Failed to publish control message:', error);
    }
  }

  unsubscribe(topic: string): void {
    if (DEMO_MODE || (this.session && 'demo' in this.session && this.session.demo)) {
      console.log(`Demo mode: Unsubscribing from ${topic}`);
      if (this.demoInterval) {
        clearInterval(this.demoInterval);
        this.demoInterval = undefined;
      }
      return;
    }

    if (!this.session || !this.isConnected) {
      return;
    }

    // Type guard to ensure we have a real Solace session
    if ('demo' in this.session) {
      return;
    }

    try {
      const streamTopic = solace.SolclientFactory.createTopicDestination(topic);
      if (this.subscriptions.has(topic)) {
        this.session.unsubscribe(streamTopic, true, topic, 10000);
        this.subscriptions.delete(topic);
      }

      console.log(`Unsubscribed from video stream topic: ${topic}`);
    } catch (error: unknown) {
      console.error('Failed to unsubscribe from stream topic:', error);
    }
  }

  disconnect(): void {
    // Clear demo interval
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = undefined;
    }

    if (DEMO_MODE || (this.session && 'demo' in this.session && this.session.demo)) {
      console.log('Demo mode: Disconnecting');
      this.session = null;
      this.isConnected = false;
      return;
    }

    if (this.session && !('demo' in this.session)) {
      try {
        // Unsubscribe from all topics
        this.subscriptions.forEach(topic => {
          const destination = solace.SolclientFactory.createTopicDestination(topic);
          (this.session as solace.Session)?.unsubscribe(destination, true, topic, 10000);
        });
        this.subscriptions.clear();

        // Disconnect session
        this.session.disconnect();
        this.session.dispose();
        this.session = null;
        this.isConnected = false;
        
        console.log('Disconnected from Solace PubSub+');
      } catch (error: unknown) {
        console.error('Error during disconnect:', error);
      }
    }
  }

  isSessionConnected(): boolean {
    return this.isConnected && this.session !== null;
  }
}