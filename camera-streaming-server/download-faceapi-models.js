const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');
const SOURCE_DIR = path.join(__dirname, 'node_modules', '@vladmandic', 'face-api', 'model');

// Models needed for emotion detection
const MODELS = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_expression_model-weights_manifest.json',
  'face_expression_model.bin'
];

async function copyModels() {
  console.log('Copying face-api.js models for emotion detection...');
  
  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Error: @vladmandic/face-api package not found.');
    console.log('Please run: npm install @vladmandic/face-api');
    process.exit(1);
  }
  
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
  
  for (const model of MODELS) {
    const source = path.join(SOURCE_DIR, model);
    const dest = path.join(MODELS_DIR, model);
    
    if (fs.existsSync(dest)) {
      console.log(`✓ ${model} already exists`);
      continue;
    }
    
    if (!fs.existsSync(source)) {
      console.error(`✗ Source file not found: ${model}`);
      continue;
    }
    
    try {
      console.log(`Copying ${model}...`);
      fs.copyFileSync(source, dest);
      const stats = fs.statSync(dest);
      console.log(`✓ Copied ${model} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`✗ Failed to copy ${model}:`, error.message);
    }
  }
  
  console.log('\nModel setup complete!');
  console.log('You can now enable emotion detection by setting ENABLE_EMOTION_DETECTION=true in .env');
}

copyModels().catch(console.error);
