
"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        scene.add(model);

        // Adjust camera to fit model
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Add some padding
        camera.position.z = cameraZ;
        controls.update();
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
      requestAnimationFrame(animate);
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
      if (mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
      // Dispose Three.js objects to free memory
      scene.children.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (Array.isArray(obj.material)) {
                  obj.material.forEach(material => material.dispose());
              } else {
                  obj.material.dispose();
              }
          }
      });
      renderer.dispose();
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
