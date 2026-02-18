const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class FaceMatcher {
  constructor() {
    this.passportDescriptor = null;
    this.modelsLoaded = false;
  }

  async initialize() {
    const modelPath = path.join(__dirname, 'models');
    
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    
    this.modelsLoaded = true;
    console.log('✓ Face recognition models loaded');
    
    await this.loadPassportPhoto();
  }

  async loadPassportPhoto() {
    const passportPath = path.join(__dirname, 'face.jpg');
    const img = await canvas.loadImage(passportPath);
    
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      throw new Error('No face found in passport photo');
    }
    
    this.passportDescriptor = detection.descriptor;
    console.log('✓ Passport face loaded');
  }

  async matchFace(imageBuffer) {
    if (!this.modelsLoaded || !this.passportDescriptor) {
      return { match: false, error: 'Not initialized' };
    }

    try {
      const img = await canvas.loadImage(imageBuffer);
      
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
        return { match: false, reason: 'No face detected' };
      }

      const distance = faceapi.euclideanDistance(
        this.passportDescriptor,
        detection.descriptor
      );

      const match = distance < 0.6;
      const confidence = Math.max(0, 1 - distance);

      return {
        match,
        confidence: confidence.toFixed(3),
        distance: distance.toFixed(3)
      };
    } catch (err) {
      return { match: false, error: err.message };
    }
  }
}

module.exports = FaceMatcher;
