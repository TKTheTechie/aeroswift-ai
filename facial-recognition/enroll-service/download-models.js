import { Human } from "@vladmandic/human";

const human = new Human({
  backend: "tensorflow",
  modelBasePath: "https://vladmandic.github.io/human-models/models/",
  cacheModels: true,
});

console.log("Downloading models to cache (one time only)...");
await human.load();
console.log("✅ Download complete! Now run your normal service.");
