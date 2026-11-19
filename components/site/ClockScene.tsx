"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A floating 3D clock beside the booking form. As the section scrolls into
 * view its hands sweep round and settle on 11:11. It tilts toward the pointer.
 */
export default function ClockScene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 7.5);

    const metal = new THREE.MeshStandardMaterial({ color: 0xc840e0, metalness: 0.9, roughness: 0.28 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.5, roughness: 0.6 });
    const clock = new THREE.Group();

    // Bezel, face and tick marks.
    clock.add(new THREE.Mesh(new THREE.TorusGeometry(2, 0.07, 32, 160), metal));
    clock.add(new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.015, 16, 160), metal));
    const face = new THREE.Mesh(new THREE.CylinderGeometry(1.96, 1.96, 0.08, 96), dark);
    face.rotation.x = Math.PI / 2;
    face.position.z = -0.06;
    clock.add(face);
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(major ? 0.05 : 0.018, major ? 0.26 : 0.1, 0.03), metal);
      const a = (i / 60) * Math.PI * 2;
      const r = major ? 1.7 : 1.76;
      tick.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.02);
      tick.rotation.z = -a;
      clock.add(tick);
    }

    // Hands pivot at the centre.
    const hand = (len: number, width: number, z: number) => {
      const pivot = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.04), metal);
      m.position.y = len / 2 - 0.12;
      m.position.z = z;
      pivot.add(m);
      clock.add(pivot);
      return pivot;
    };
    const hourHand = hand(1.05, 0.09, 0.06);
    const minuteHand = hand(1.5, 0.05, 0.1);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 32), metal);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.14;
    clock.add(cap);
    scene.add(clock);

    // Violet dust orbiting the clock.
    const DUST = 600;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 1.6;
      dustPos.set([Math.cos(a) * r, (Math.random() - 0.5) * 1.2, Math.sin(a) * r * 0.5], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xd466ea, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.rotation.x = 0.5;
    scene.add(dust);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.PointLight(0xf6dcff, 40, 30);
    key.position.set(3, 3, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x5500bb, 30, 30);
    rim.position.set(-4, -2, 2);
    scene.add(rim);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
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
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(mount);

    // 11:11 → minute hand at 66°, hour hand at 335.5° (clockwise from 12).
    const MINUTE = THREE.MathUtils.degToRad(66);
    const HOUR = THREE.MathUtils.degToRad(335.5);
    const timer = new THREE.Timer();
    timer.connect(document);
    let raf = 0;
    const frame = (now?: number) => {
      raf = requestAnimationFrame(frame);
      timer.update(now);
      if (!visible || document.hidden) return;
      const t = timer.getElapsed();
      const p = reduced ? 1 : Math.min(1, Math.max(0, progressRef.current ?? 0));
      const e = 1 - Math.pow(1 - p, 3);
      // Sweep: the minute hand spins two extra turns before landing on 11 past.
      minuteHand.rotation.z = -(MINUTE + (1 - e) * Math.PI * 4);
      hourHand.rotation.z = -(HOUR + (1 - e) * Math.PI * 0.6);
      clock.rotation.y += ((reduced ? 0 : pointer.x * 0.5) + Math.sin(t * 0.4) * 0.08 - clock.rotation.y) * 0.05;
      clock.rotation.x += ((reduced ? 0 : pointer.y * 0.35) - clock.rotation.x) * 0.05;
      clock.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.08;
      dust.rotation.y = reduced ? 0 : t * 0.06;
      renderer.render(scene, camera);
    };
    frame();

    return () => {
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
    };
  }, [progressRef]);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}
