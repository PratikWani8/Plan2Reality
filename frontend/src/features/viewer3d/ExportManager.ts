import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';
import { FloorPlanGeometry } from '../../types/geometry';

export function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);
}

export function exportSceneToGLB(scene: THREE.Scene, baseName: string = 'Plan2Reality_Building') {
  return new Promise<void>((resolve, reject) => {
    try {
      const exporter = new GLTFExporter();
      
      // Filter out helpers, cameras, and UI html elements before exporting
      const exportGroup = new THREE.Group();
      scene.children.forEach((child) => {
        if (
          !(child instanceof THREE.Camera) &&
          !(child instanceof THREE.Light) &&
          !(child instanceof THREE.GridHelper) &&
          !(child instanceof THREE.AxesHelper) &&
          child.type !== 'Line'
        ) {
          exportGroup.add(child.clone());
        }
      });

      exporter.parse(
        exportGroup,
        (gltf) => {
          if (gltf instanceof ArrayBuffer) {
            const blob = new Blob([gltf], { type: 'model/gltf-binary' });
            saveBlob(blob, `${baseName}.glb`);
            resolve();
          } else {
            const output = JSON.stringify(gltf, null, 2);
            const blob = new Blob([output], { type: 'application/json' });
            saveBlob(blob, `${baseName}.gltf`);
            resolve();
          }
        },
        (error) => {
          console.error('Error during GLTF export:', error);
          reject(error);
        },
        { binary: true, embedImages: true }
      );
    } catch (err) {
      console.error('Export exception:', err);
      reject(err);
    }
  });
}

export function exportGeometryToJSON(geometry: FloorPlanGeometry, baseName: string = 'Plan2Reality_Geometry') {
  const dataStr = JSON.stringify(geometry, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  saveBlob(blob, `${baseName}.json`);
}
