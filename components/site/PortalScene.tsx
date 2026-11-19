"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The hero's 3D scene: a gold spiral galaxy swirling around a pair of portal
 * rings, inside a starfield. The mouse tilts the camera; scrolling flies the
 * camera through the portal. Rendering pauses when the hero is off screen or
 * the tab is hidden, and holds still for people who prefer reduced motion.
 */
export default function PortalScene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: "high-performance" });
    } catch {
      return; // No WebGL: the page still works, the hero just stays black.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 1);
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.045);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 2.2, 9);

    // ── Soft round points (shared shader) ─────────────────────────────────
    const pointMaterial = (size: number, opacity: number) =>
      new THREE.ShaderMaterial({
        uniforms: { uSize: { value: size * renderer.getPixelRatio() }, uOpacity: { value: opacity }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aScale;
          attribute vec3 aColor;
          uniform float uSize;
          uniform float uTime;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            vTwinkle = 0.65 + 0.35 * sin(uTime * 1.7 + position.x * 3.1 + position.z * 2.3);
            gl_PointSize = uSize * aScale * (1.0 / -mv.z);
            vColor = aColor;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor, a * a * uOpacity * vTwinkle);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

    // ── Spiral galaxy ──────────────────────────────────────────────────────
    const COUNT = small ? 5000 : reduced ? 6000 : 11000;
    const ARMS = 4;
    const RADIUS = 7;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const gold = new THREE.Color("#d4a84b");
    const warm = new THREE.Color("#fff1d0");
    const ember = new THREE.Color("#8a5a1c");
    for (let i = 0; i < COUNT; i++) {
      const r = Math.pow(Math.random(), 1.6) * RADIUS + 0.9;
      const branch = ((i % ARMS) / ARMS) * Math.PI * 2;
      const spin = r * 0.55;
      const spread = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.45 * r;
      const spreadY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.18 * r;
      const spreadZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.45 * r;
      positions[i * 3] = Math.cos(branch + spin) * r + spread;
      positions[i * 3 + 1] = spreadY;
      positions[i * 3 + 2] = Math.sin(branch + spin) * r + spreadZ;
      const c = (r < 2.4 ? warm : Math.random() < 0.8 ? gold : ember).clone().lerp(ember, Math.min(1, r / RADIUS) * 0.5);
      colors.set([c.r, c.g, c.b], i * 3);
      scales[i] = 0.4 + Math.random() * 1.1;
    }
    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    galaxyGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    galaxyGeo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    const galaxyMat = pointMaterial(small ? 70 : 60, 0.95);
    const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
    galaxy.rotation.x = 0.18;
    scene.add(galaxy);

    // ── Distant stars ──────────────────────────────────────────────────────
    const STARS = small ? 900 : 2000;
    const starPos = new Float32Array(STARS * 3);
    const starCol = new Float32Array(STARS * 3);
    const starScale = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 60);
      starPos.set([v.x, v.y, v.z], i * 3);
      const w = 0.6 + Math.random() * 0.4;
      starCol.set([w, w, w * 0.95], i * 3);
      starScale[i] = 0.6 + Math.random() * 1.6;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("aColor", new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute("aScale", new THREE.BufferAttribute(starScale, 1));
    const starMat = pointMaterial(160, 0.8);
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── The portal: two thin gold rings, an inner halo of ticks, and a black core ─
    const portal = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4a84b });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 16, 220), ringMat);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.006, 16, 220), new THREE.MeshBasicMaterial({ color: 0xe2b95c, transparent: true, opacity: 0.6 }));
    const core = new THREE.Mesh(new THREE.CircleGeometry(1.5, 96), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    // 12 clock ticks around the ring (11:11 is a time, after all).
    const ticks = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const long = i % 3 === 0;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.018, long ? 0.22 : 0.12, 0.018), ringMat);
      const a = (i / 12) * Math.PI * 2;
      tick.position.set(Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0.01);
      tick.rotation.z = -a;
      ticks.add(tick);
    }
    portal.add(core, ringA, ringB, ticks);
    portal.position.set(0, 0.2, 0);
    scene.add(portal);

    // ── Sizing, input and visibility ───────────────────────────────────────
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.fov = camera.aspect < 0.8 ? 75 : 60;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(mount);

    // ── Loop ───────────────────────────────────────────────────────────────
    const timer = new THREE.Timer();
    timer.connect(document); // pauses time while the tab is hidden
    const look = new THREE.Vector3();
    let raf = 0;
    const frame = (now?: number) => {
      raf = requestAnimationFrame(frame);
      timer.update(now);
      if (!visible || document.hidden) return;
      const t = timer.getElapsed();
      const p = Math.min(1, Math.max(0, progressRef.current ?? 0));
      const ease = p * p * (3 - 2 * p);
      const speed = reduced ? 0 : 1;

      galaxy.rotation.y = t * 0.05 * speed + ease * 1.2;
      stars.rotation.y = t * 0.004 * speed;
      ringA.rotation.x = Math.sin(t * 0.35) * 0.35 * speed;
      ringA.rotation.y = t * 0.25 * speed;
      ringB.rotation.x = t * 0.18 * speed;
      ringB.rotation.y = -t * 0.12 * speed + 0.6;
      ticks.rotation.z = -t * 0.08 * speed;
      galaxyMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;

      // Scroll: fly from the galaxy's edge into the portal.
      const targetZ = 9 - ease * 8.6;
      const targetY = 2.2 - ease * 2;
      camera.position.x += (pointer.x * 0.8 * (1 - ease) - camera.position.x) * 0.04;
      camera.position.y += (targetY - pointer.y * 0.5 * (1 - ease) - camera.position.y) * 0.06;
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      // Start looking above the portal so it sits under the title, then centre on it as we fly in.
      look.set(0, 0.2 + 1.6 * (1 - ease), 0);
      camera.lookAt(look);
      portal.lookAt(camera.position);
      renderer.render(scene, camera);
    };
    if (reduced) {
      renderer.render(scene, camera);
      const onScroll = () => requestAnimationFrame(() => {
        camera.position.z = 9 - (progressRef.current ?? 0) * 8.6;
        camera.lookAt(0, 0.2 + 1.6 * (1 - (progressRef.current ?? 0)), 0);
        renderer.render(scene, camera);
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        cleanup();
      };
    }
    frame();
    return cleanup;

    function cleanup() {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  }, [progressRef]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
