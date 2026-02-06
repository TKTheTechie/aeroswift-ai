<script>
  import { T, useTask } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import Solly from './models/Solly.svelte';
  import Kangaroo from './models/Kangaroo.svelte';
  import Airplane from './models/Airplane.svelte';
  
  let { isLoading = $bindable(true) } = $props();
  
  let orbitAngle = $state(0);
  let smokeTrail = $state([]);
  let frameCounter = 0;
  
  let sollyLoaded = $state(false);
  let airplaneLoaded = $state(false);
  let kangarooLeftLoaded = $state(false);
  let kangarooRightLoaded = $state(false);
  
  $effect(() => {
    if (sollyLoaded && airplaneLoaded && kangarooLeftLoaded && kangarooRightLoaded) {
      isLoading = false;
    }
  });
  
  useTask((delta) => {
    // Rotate the airplane around the character (360 degrees)
    orbitAngle += delta * 0.5;
    
    frameCounter++;
    
    // Add new smoke particle every few frames
    if (frameCounter % 2 === 0) {
      smokeTrail.push({
        age: 0,
        id: Date.now() + Math.random()
      });
    }
    
    // Update existing smoke particles
    smokeTrail = smokeTrail
      .map(particle => ({
        ...particle,
        age: particle.age + delta
      }))
      .filter(particle => particle.age < 1.2);
    
    // Limit trail length for performance
    if (smokeTrail.length > 30) {
      smokeTrail = smokeTrail.slice(-30);
    }
  });
  
  // Function to calculate smoke particle position based on age
  function getSmokePosition(age) {
    const trailDistance = age * 0.8;
    const airplaneX = Math.cos(orbitAngle) * 2.5;
    const airplaneY = 0.5;
    const airplaneZ = Math.sin(orbitAngle) * 2.5;
    const forwardAngle = orbitAngle + Math.PI / 2;
    const offsetX = -Math.cos(forwardAngle) * (0.25 + trailDistance);
    const offsetZ = -Math.sin(forwardAngle) * (0.25 + trailDistance);
    
    return {
      x: airplaneX + offsetX,
      y: airplaneY,
      z: airplaneZ + offsetZ
    };
  }
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 4]} fov={65}>
  <OrbitControls 
    enableZoom={true}
    enablePan={false}
    autoRotate={true}
    autoRotateSpeed={1}
    minDistance={2.5}
    maxDistance={7}
    maxPolarAngle={Math.PI / 1.5}
    minPolarAngle={Math.PI / 4}
  />
</T.PerspectiveCamera>

<T.DirectionalLight 
  position={[5, 5, 5]} 
  intensity={2} 
  castShadow 
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
  shadow.camera.near={0.5}
  shadow.camera.far={50}
/>
<T.DirectionalLight position={[-5, 3, -5]} intensity={1} castShadow />
<T.AmbientLight intensity={0.8} />
<T.HemisphereLight args={['#ffffff', '#444444', 1]} />

<!-- Solly Character -->
<Solly onLoad={() => sollyLoaded = true} />

<!-- Kangaroos -->
<Kangaroo position={[-1.5, -2, 0]} onLoad={() => kangarooLeftLoaded = true} />
<Kangaroo position={[1.5, -2, 0]} onLoad={() => kangarooRightLoaded = true} />

<!-- Smoke Trail Particles -->
{#each smokeTrail as particle (particle.id)}
  {@const pos = getSmokePosition(particle.age)}
  {@const opacity = Math.max(0, 1 - particle.age / 1.2)}
  <T.Mesh position={[pos.x, pos.y, pos.z]}>
    <T.SphereGeometry args={[0.04, 6, 6]} />
    <T.MeshBasicMaterial 
      color="#e0e0e0" 
      transparent={true}
      opacity={opacity * 0.3}
    />
  </T.Mesh>
{/each}

<!-- Airplane -->
<Airplane 
  position={[
    Math.cos(orbitAngle) * 2.5,
    0.5,
    Math.sin(orbitAngle) * 2.5
  ]}
  rotation={[0, -orbitAngle, 0]}
  onLoad={() => airplaneLoaded = true}
/>
