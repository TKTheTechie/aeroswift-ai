<script>
  import { T, useTask } from '@threlte/core';
  import { GLTF, OrbitControls } from '@threlte/extras';
  
  const modelUrl = '/australian-solly.glb';
  const airplaneUrl = '/airplane.glb';
  
  let orbitAngle = $state(0);
  
  useTask((delta) => {
    // Rotate the airplane around the character (360 degrees)
    orbitAngle += delta * 0.5; // Speed of orbit
  });
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
