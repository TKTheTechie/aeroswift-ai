<script>
  import { T } from '@threlte/core';
  import { GLTF, useMeshopt } from '@threlte/extras';

  let { position = [0, -2, 0], scale = 4.0, onLoad } = $props();
  const meshoptDecoder = useMeshopt();
</script>

<T.Group position={position} scale={scale}>
  <GLTF url="/australian-solly.glb" onload={onLoad} {meshoptDecoder} />
</T.Group>
