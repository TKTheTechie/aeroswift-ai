const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const sharp = require('sharp');
const path = require('path');

// Setup canvas for face-api.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class EmotionDetector {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = path.join(__dirname, 'models');
  }

  async initialize() {
    try {
      console.log('Loading face-api.js models for emotion detection...');
      
      // Load required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk(this.modelPath),
        faceapi.nets.faceExpressionNet.loadFromDisk(this.modelPath)
      ]);
      
      this.modelsLoaded = true;
      console.log('✓ Emotion detection models loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load emotion detection models:', error.message);
      console.log('Note: Download models from https://github.com/vladmandic/face-api/tree/master/model');
      return false;
    }
  }

  async detectEmotions(imageBuffer, faces) {
    if (!this.modelsLoaded) {
      throw new Error('Models not loaded');
    }

    try {
      // Convert full image to canvas once
      const img = await canvas.loadImage(imageBuffer);
      const fullCanvas = canvas.createCanvas(img.width, img.height);
      const ctx = fullCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Detect all faces with expressions in the full image
      const detections = await faceapi
        .detectAllFaces(fullCanvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      // Match face-api detections with YOLOv8 detections by proximity
      const emotionResults = [];
      
      for (const yoloFace of faces) {
        // Find the closest face-api detection
        let bestMatch = null;
        let bestIoU = 0;
        
        for (const detection of detections) {
          const faceApiBox = detection.detection.box;
          const iou = this.calculateIoU(
            yoloFace.bbox,
            {
              x: faceApiBox.x,
              y: faceApiBox.y,
              width: faceApiBox.width,
              height: faceApiBox.height
            }
          );
          
          if (iou > bestIoU) {
            bestIoU = iou;
            bestMatch = detection;
          }
        }
        
        if (bestMatch && bestIoU > 0.3) {
          const expressions = bestMatch.expressions;
          
          // Get dominant emotion
          const emotions = Object.entries(expressions).map(([emotion, score]) => ({
            emotion,
            score
          }));
          emotions.sort((a, b) => b.score - a.score);
          
          emotionResults.push({
            bbox: yoloFace.bbox,
            confidence: yoloFace.confidence,
            emotions: expressions,
            dominantEmotion: emotions[0].emotion,
            dominantScore: emotions[0].score
          });
        }
      }

      return emotionResults;
    } catch (error) {
      console.error('Emotion detection error:', error.message);
      return [];
    }
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

module.exports = EmotionDetector;
