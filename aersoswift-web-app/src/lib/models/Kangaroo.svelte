<script>
  import { T } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  
  let { position = [0, -2, 0], scale = 2.0, rotation = [0, Math.PI, 0], onLoad } = $props();
  
  const gltf = useGltf('/kangaroo.glb', {
    useDraco: false
  });
  
  $effect(() => {
    if ($gltf && onLoad) {
      onLoad();
    }
  });
</script>

{#if $gltf}
  <T.Group position={position} scale={scale} rotation={rotation}>
    <T is={$gltf.scene.clone()} />
  </T.Group>
{/if}
