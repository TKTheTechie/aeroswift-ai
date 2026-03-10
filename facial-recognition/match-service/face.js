// face.js
import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs-node';
import { Canvas, Image, ImageData } from 'canvas';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(__dirname, '..', 'models', 'face-api');

export async function loadModels() {
  console.log('🔄 Loading face-api models...');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
  console.log('✅ face-api models loaded');
}

export async function getFaceEmbedding(imageBuffer) {
  // Resize but preserve aspect ratio
  const img = await sharp(imageBuffer)
    .resize(640, 640, { fit: 'inside' })
    .toBuffer();

  const tensor = tf.node.decodeImage(img, 3);

  const detection = await faceapi
    .detectSingleFace(
      tensor,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  tensor.dispose();

  if (!detection) {
    throw new Error('No face detected');
  }

  // descriptor is Float32Array(128), already L2-normalized
  if (detection.descriptor.length !== 128) {
    throw new Error('Invalid face descriptor length');
  }

  return Array.from(detection.descriptor);
}

