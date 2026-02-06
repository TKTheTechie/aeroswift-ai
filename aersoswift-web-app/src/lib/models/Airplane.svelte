<script>
  import { T } from '@threlte/core';
  import { GLTF } from '@threlte/extras';
  
  let { position, rotation, scale = 0.5, onLoad } = $props();
</script>

<T.Group position={position} rotation={rotation} scale={scale} castShadow>
  <GLTF url="/airplane.glb" onload={onLoad} castShadow />
</T.Group>
