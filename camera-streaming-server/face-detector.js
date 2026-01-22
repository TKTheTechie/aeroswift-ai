const ort = require('onnxruntime-node');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class FaceDetector {
  constructor(confidenceThreshold = 0.5, modelType = 'yolov8n-face') {
    this.session = null;
    this.confidenceThreshold = confidenceThreshold;
    this.modelType = modelType; // yolov8n-face or yunet
    this.modelPath = path.join(__dirname, 'models', `${modelType}.onnx`);
    this.inputSize = modelType === 'yolov8n-face' ? 640 : 320;
  }

  async initialize() {
    try {
      // Check if model exists
      if (!fs.existsSync(this.modelPath)) {
        console.error(`Face detection model not found: ${this.modelPath}`);
        console.log('Available models:');
        const modelsDir = path.join(__dirname, 'models');
        if (fs.existsSync(modelsDir)) {
          fs.readdirSync(modelsDir).forEach(file => {
            if (file.endsWith('.onnx')) {
              const stats = fs.statSync(path.join(modelsDir, file));
              console.log(`  - ${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
            }
          });
        }
        return false;
      }

      const stats = fs.statSync(this.modelPath);
      console.log(`Found ${this.modelType} model: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

      // Load ONNX model
      console.log(`Loading ${this.modelType.toUpperCase()} ONNX model into runtime...`);
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all'
      });
      
      console.log(`✓ ${this.modelType.toUpperCase()} face detection model loaded successfully`);
      console.log(`  Input names: ${JSON.stringify(this.session.inputNames)}`);
      console.log(`  Output names: ${JSON.stringify(this.session.outputNames)}`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      return false;
    }
  }

  async detect(imageBuffer) {
    if (!this.session) {
      throw new Error('Model not initialized');
    }

    try {
      // Get original image dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const originalWidth = metadata.width;
      const originalHeight = metadata.height;

      // Preprocess image
      const { data, width, height } = await this.preprocessImage(imageBuffer);

      // Create tensor
      const tensor = new ort.Tensor('float32', data, [1, 3, height, width]);

      // Run inference
      const feeds = { images: tensor };
      const results = await this.session.run(feeds);

      // Process outputs based on model type
      let faces;
      if (this.modelType === 'yolov8n-face') {
        const output = results.output0.data;
        faces = this.processYOLOOutput(output, originalWidth, originalHeight);
      } else {
        // YuNet model has different output format
        faces = this.processYuNetOutput(results, originalWidth, originalHeight);
      }

      return faces;
    } catch (error) {
      console.error('Face detection error:', error);
      return [];
    }
  }

  async preprocessImage(imageBuffer) {
    // Resize and normalize image
    const image = sharp(imageBuffer);
    const { data, info } = await image
      .resize(this.inputSize, this.inputSize, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert to float32 and normalize to [0, 1]
    const float32Data = new Float32Array(3 * this.inputSize * this.inputSize);
    
    // Convert from HWC to CHW format and normalize
    for (let i = 0; i < this.inputSize * this.inputSize; i++) {
      float32Data[i] = data[i * 3] / 255.0; // R
      float32Data[this.inputSize * this.inputSize + i] = data[i * 3 + 1] / 255.0; // G
      float32Data[2 * this.inputSize * this.inputSize + i] = data[i * 3 + 2] / 255.0; // B
    }

    return {
      data: float32Data,
      width: this.inputSize,
      height: this.inputSize
    };
  }

  processYOLOOutput(output, originalWidth, originalHeight) {
    const faces = [];
    
    // YOLOv8 output format: [batch, num_values, num_detections]
    // For face detection: num_values includes bbox (4) + confidence (1) + landmarks (10)
    const numDetections = 8400;
    const numValues = 15; // 4 bbox + 1 conf + 10 landmarks (5 points x 2 coords)

    for (let i = 0; i < numDetections; i++) {
      // Extract bbox values (center x, center y, width, height)
      const x = output[i];
      const y = output[numDetections + i];
      const w = output[2 * numDetections + i];
      const h = output[3 * numDetections + i];
      
      // Get confidence score
      const confidence = output[4 * numDetections + i];

      // Filter by confidence threshold
      if (confidence >= this.confidenceThreshold) {
        // Convert from normalized center format to pixel corner format
        const xmin = (x - w / 2) * (originalWidth / this.inputSize);
        const ymin = (y - h / 2) * (originalHeight / this.inputSize);
        const xmax = (x + w / 2) * (originalWidth / this.inputSize);
        const ymax = (y + h / 2) * (originalHeight / this.inputSize);

        // Extract landmarks if available (5 facial keypoints)
        const landmarks = [];
        for (let j = 0; j < 5; j++) {
          const lx = output[(5 + j * 2) * numDetections + i] * (originalWidth / this.inputSize);
          const ly = output[(6 + j * 2) * numDetections + i] * (originalHeight / this.inputSize);
          landmarks.push({ x: lx, y: ly });
        }

        faces.push({
          confidence: confidence,
          bbox: {
            x: Math.max(0, xmin),
            y: Math.max(0, ymin),
            width: Math.min(originalWidth, xmax) - Math.max(0, xmin),
            height: Math.min(originalHeight, ymax) - Math.max(0, ymin)
          },
          landmarks: landmarks.length === 5 ? landmarks : undefined
        });
      }
    }

    // Apply NMS (Non-Maximum Suppression)
    return this.applyNMS(faces, 0.45);
  }

  processYuNetOutput(results, originalWidth, originalHeight) {
    // YuNet has a different output format
    // This is a placeholder - adjust based on actual YuNet output structure
    const faces = [];
    // Implementation would depend on YuNet's specific output format
    return faces;
  }

  applyNMS(detections, iouThreshold) {
    // Sort by confidence
    detections.sort((a, b) => b.confidence - a.confidence);

    const keep = [];
    const suppressed = new Set();

    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;

      keep.push(detections[i]);

      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;

        const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }

    return keep;
  }

  calculateIoU(box1, box2) {
    const x1min = box1.x;
    const y1min = box1.y;
    const x1max = box1.x + box1.width;
    const y1max = box1.y + box1.height;

    const x2min = box2.x;
    const y2min = box2.y;
    const x2max = box2.x + box2.width;
    const y2max = box2.y + box2.height;

    const xmin = Math.max(x1min, x2min);
    const ymin = Math.max(y1min, y2min);
    const xmax = Math.min(x1max, x2max);
    const ymax = Math.min(y1max, y2max);

    const intersectionArea = Math.max(0, xmax - xmin) * Math.max(0, ymax - ymin);
    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;
    const unionArea = box1Area + box2Area - intersectionArea;

    return intersectionArea / unionArea;
  }
}

module.exports = FaceDetector;
