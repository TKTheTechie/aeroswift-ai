<script>
  import { T, useTask } from '@threlte/core';
  import { GLTF, OrbitControls } from '@threlte/extras';
  
  const modelUrl = '/australian-solly.glb';
  const airplaneUrl = '/airplane.glb';
  
  let orbitAngle = $state(0);
  let smokeTrail = $state([]);
  let frameCounter = 0;
  
  useTask((delta) => {
    // Rotate the airplane around the character (360 degrees)
    orbitAngle += delta * 0.5; // Speed of orbit
    
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
      .filter(particle => particle.age < 1.2); // Remove old particles
    
    // Limit trail length for performance
    if (smokeTrail.length > 30) {
      smokeTrail = smokeTrail.slice(-30);
    }
  });
  
  // Function to calculate smoke particle position based on age
  function getSmokePosition(age) {
    // Calculate how far back from the plane this particle should be
    const trailDistance = age * 0.8; // Distance increases with age
    
    // Calculate airplane's current back position
    const airplaneX = Math.cos(orbitAngle) * 2.5;
    const airplaneY = 0.5;
    const airplaneZ = Math.sin(orbitAngle) * 2.5;
    
    // Calculate the direction the plane is facing (tangent to the circle)
    const forwardAngle = orbitAngle + Math.PI / 2;
    
    // Offset backwards from the plane
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

<T.DirectionalLight position={[5, 5, 5]} intensity={2} castShadow />
<T.DirectionalLight position={[-5, 3, -5]} intensity={1} />
<T.AmbientLight intensity={0.8} />
<T.HemisphereLight args={['#ffffff', '#444444', 1]} />

<!-- Character Model -->
<T.Group position={[0, -2, 0]} scale={4.0}>
  <GLTF url={modelUrl} />
</T.Group>

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

<!-- Airplane Model - Orbiting -->
<T.Group 
  position={[
    Math.cos(orbitAngle) * 2.5,
    0.5,
    Math.sin(orbitAngle) * 2.5
  ]}
  rotation={[0, -orbitAngle, 0]}
  scale={0.5}
>
  <GLTF url={airplaneUrl} />
</T.Group>
