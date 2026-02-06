<script>
  import { T } from '@threlte/core';
  import { GLTF } from '@threlte/extras';
  
  let { position = [0, -2, 0], scale = 4.0, onLoad } = $props();
</script>

<T.Group position={position} scale={scale}>
  <GLTF url="/australian-solly.glb" onload={onLoad} />
</T.Group>
