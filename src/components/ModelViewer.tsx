
"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ModelViewerProps {
  modelUrl: string;
  className?: string;
}

export function ModelViewer({ modelUrl, className }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || !modelUrl) return;

    setLoading(true);
    setError(null);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x2b3240, 0.55);
    scene.add(hemiLight);
    
    // Draco loader setup
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    const clock = new THREE.Clock();
    let mixer: THREE.AnimationMixer | null = null;
    let frameId = 0;

    const median = (values: number[]) => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const collectMeshEntries = (root: THREE.Object3D) => {
      const entries: Array<{ box: THREE.Box3; maxDim: number }> = [];
      root.updateMatrixWorld(true);
      root.traverse((obj) => {
        const anyObj = obj as any;
        if (!anyObj?.isMesh) return;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (Number.isFinite(maxDim) && maxDim > 0) entries.push({ box, maxDim });
      });
      return entries;
    };

    const pickCoreEntries = (entries: Array<{ box: THREE.Box3; maxDim: number }>) => {
      if (entries.length === 0) return entries;
      const dims = entries.map((e) => e.maxDim).filter((d) => Number.isFinite(d) && d > 0);
      if (dims.length === 0) return entries;
      const med = median(dims);
      if (!Number.isFinite(med) || med <= 0) return entries;
      const lower = med / 8;
      const upper = med * 8;
      const core = entries.filter((e) => e.maxDim >= lower && e.maxDim <= upper);
      return core.length > 0 ? core : entries;
    };

    const unionBox = (entries: Array<{ box: THREE.Box3; maxDim: number }>) => {
      const box = new THREE.Box3();
      entries.forEach((entry) => box.union(entry.box));
      return box;
    };
    
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Harmonize top-level part scale only when there is an extreme mismatch.
        const topLevelParts = model.children
          .map((child) => {
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            return { child, maxDim };
          })
          .filter((part) => Number.isFinite(part.maxDim) && part.maxDim > 0);

        if (topLevelParts.length >= 2) {
          const dims = topLevelParts.map((part) => part.maxDim);
          const med = median(dims);
          const minDim = Math.min(...dims);
          const maxDim = Math.max(...dims);
          const extremeRatio = maxDim / Math.max(0.0001, minDim);
          if (Number.isFinite(med) && med > 0 && extremeRatio >= 40) {
            topLevelParts.forEach((part) => {
              if (part.maxDim > med * 8 || part.maxDim < med / 8) {
                const correction = med / part.maxDim;
                const clamped = THREE.MathUtils.clamp(correction, 0.05, 20);
                part.child.scale.multiplyScalar(clamped);
              }
            });
            model.updateMatrixWorld(true);
          }
        }

        // Normalize overall model using robust core mesh size (ignore huge/small outliers).
        const preEntries = collectMeshEntries(model);
        const preCoreEntries = pickCoreEntries(preEntries);
        const referenceMaxDim = Math.max(1, ...preCoreEntries.map((entry) => entry.maxDim));
        const targetMaxDim = 3;
        const uniformScale = targetMaxDim / referenceMaxDim;
        model.scale.setScalar(uniformScale);
        model.updateMatrixWorld(true);

        // Re-center on robust core bounds after normalization.
        const normalizedEntries = collectMeshEntries(model);
        const normalizedCoreEntries = pickCoreEntries(normalizedEntries);
        const fitBoxBeforeCenter = normalizedCoreEntries.length > 0
          ? unionBox(normalizedCoreEntries)
          : new THREE.Box3().setFromObject(model);
        const fitCenter = fitBoxBeforeCenter.getCenter(new THREE.Vector3());
        model.position.sub(fitCenter);
        model.updateMatrixWorld(true);
        scene.add(model);

        const centeredEntries = collectMeshEntries(model);
        const centeredCoreEntries = pickCoreEntries(centeredEntries);
        const finalFitBox = centeredCoreEntries.length > 0
          ? unionBox(centeredCoreEntries)
          : new THREE.Box3().setFromObject(model);
        const sphere = finalFitBox.getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(0.001, sphere.radius);

        // Better default viewing angle to avoid "looking down a long axis".
        const viewDir = new THREE.Vector3(1.25, 0.85, 1.15).normalize();
        const fovRad = (camera.fov * Math.PI) / 180;
        const fitDistance = radius / Math.sin(fovRad / 2);
        const distance = fitDistance * 1.25;
        camera.position.copy(viewDir.multiplyScalar(distance));
        camera.near = Math.max(0.001, radius / 100);
        camera.far = Math.max(100, radius * 200);
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);

        controls.target.set(0, 0, 0);
        controls.minDistance = radius * 0.25;
        controls.maxDistance = radius * 14;
        controls.update();

        // Auto-play embedded animation clips when present.
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
        }

        setLoading(false);
      },
      undefined,
      (error) => {
        console.error('An error happened loading the model:', error);
        setError('Failed to load 3D model.');
        setLoading(false);
      }
    );

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (mountNode) {
        camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      controls.dispose();
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
      // Dispose Three.js objects to free memory
      scene.children.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
              if(obj.geometry) obj.geometry.dispose();
              if (Array.isArray(obj.material)) {
                  obj.material.forEach(material => material.dispose());
              } else if (obj.material) {
                  obj.material.dispose();
              }
          }
      });
      renderer.dispose();
      dracoLoader.dispose();
    };
  }, [modelUrl]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm">
          {error}
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
