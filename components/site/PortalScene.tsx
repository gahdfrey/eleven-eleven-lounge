"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The hero's 3D scene: a violet spiral galaxy swirling around a pair of portal
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
        uniforms: {
          uSize: { value: size * renderer.getPixelRatio() },
          uOpacity: { value: opacity },
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector3(999, 0, 999) },
          uForce: { value: 0 },
        },
        vertexShader: /* glsl */ `
          attribute float aScale;
          attribute vec3 aColor;
          uniform float uSize;
          uniform float uTime;
          uniform vec3 uPointer;
          uniform float uForce;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            // Stars part around the cursor like a hand through dust.
            vec4 world = modelMatrix * vec4(position, 1.0);
            vec2 away = world.xz - uPointer.xz;
            float dist = length(away);
            float push = uForce * smoothstep(2.2, 0.0, dist);
            world.xz += normalize(away + 0.0001) * push * 1.1;
            world.y += push * 0.45;
            vec4 mv = viewMatrix * world;
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
    const accent = new THREE.Color("#c840e0");
    const warm = new THREE.Color("#f6dcff");
    const ember = new THREE.Color("#5500bb");
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
      const c = (r < 2.4 ? warm : Math.random() < 0.75 ? accent : ember).clone().lerp(ember, Math.min(1, r / RADIUS) * 0.5);
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

    // ── The portal: two thin rings, an inner halo of ticks, and a black core ─
    const portal = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc840e0 });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 16, 220), ringMat);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.006, 16, 220), new THREE.MeshBasicMaterial({ color: 0xd466ea, transparent: true, opacity: 0.6 }));
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
    // Clock hands reading 11:11. They sweep round on load and settle there.
    const handMat = new THREE.MeshBasicMaterial({ color: 0xf6dcff });
    const makeHand = (length: number, width: number, z: number) => {
      const pivot = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.01), handMat);
      bar.position.set(0, length / 2 - 0.08, z); // a short tail past the centre, like a real hand
      pivot.add(bar);
      return pivot;
    };
    const hourHand = makeHand(0.78, 0.055, 0.03);
    const minuteHand = makeHand(1.12, 0.03, 0.04);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), ringMat);
    cap.position.z = 0.05;
    // Angles clockwise from 12: minute hand at 11 minutes (66°), hour hand just past 11 (335.5°).
    const MINUTE_ANGLE = THREE.MathUtils.degToRad(66);
    const HOUR_ANGLE = THREE.MathUtils.degToRad(335.5);
    const setTime = (sweep: number) => {
      // sweep 0 → resting at 11:11; 1 → two extra turns of the minute hand still to go.
      minuteHand.rotation.z = -(MINUTE_ANGLE + sweep * Math.PI * 4);
      hourHand.rotation.z = -(HOUR_ANGLE + sweep * (Math.PI * 4) / 12);
    };
    setTime(reduced ? 0 : 1);
    portal.add(core, ringA, ringB, ticks, hourHand, minuteHand, cap);
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

    // Where the cursor touches the galaxy's plane, for the force field.
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    let lastMove = -10;
    let force = 0;
    const onActivity = () => { lastMove = timer.getElapsed(); };
    window.addEventListener("pointermove", onActivity, { passive: true });

    // ── Shooting stars: ambient ones, plus a "wish" sent into the portal on click ──
    const TRAIL = 28;
    type Streak = { line: THREE.Line; from: THREE.Vector3; dir: THREE.Vector3; speed: number; length: number; age: number; life: number; color: THREE.Color };
    const streaks: Streak[] = [];
    const spawnStreak = (from: THREE.Vector3, to: THREE.Vector3, life: number, color: THREE.Color) => {
      if (streaks.length > 10) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
      geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      line.frustumCulled = false;
      scene.add(line);
      const dir = to.clone().sub(from);
      const length = dir.length();
      streaks.push({ line, from: from.clone(), dir: dir.normalize(), speed: length / life, length: Math.min(3.2, length * 0.35), age: 0, life, color });
    };
    const white = new THREE.Color("#fbeaff");
    const lilac = new THREE.Color("#e9a8f5");
    const ambientStar = () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const from = new THREE.Vector3(side * (8 + Math.random() * 10), 6 + Math.random() * 6, -10 - Math.random() * 10);
      const to = from.clone().add(new THREE.Vector3(-side * (10 + Math.random() * 8), -6 - Math.random() * 4, 4));
      spawnStreak(from, to, 1.1 + Math.random() * 0.6, white);
    };
    let nextAmbient = 3 + Math.random() * 4;
    let pulse = 0;
    const onWish = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      // From the point you clicked (a little in front of the camera) into the portal.
      const from = new THREE.Vector3(x, y, 0.4).unproject(camera);
      const dirToFrom = from.sub(camera.position).normalize().multiplyScalar(5).add(camera.position);
      spawnStreak(dirToFrom, portal.position.clone(), 0.9, lilac);
      setTimeout(() => { pulse = 1; }, 900);
    };
    window.addEventListener("portal:wish", onWish);

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
      // Hands sweep into place after the title appears (0.8s), taking 2.4s to settle on 11:11.
      const s = Math.min(1, Math.max(0, (t - 0.8) / 2.4));
      setTime(Math.pow(1 - s, 3));
      galaxyMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;

      // Force field follows the cursor while it moves, then relaxes.
      const dt = timer.getDelta();
      const targetForce = t - lastMove < 1.5 ? 1 - ease : 0;
      force += (targetForce - force) * Math.min(1, dt * 3);
      ndc.set(pointer.x, -pointer.y);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) galaxyMat.uniforms.uPointer.value.lerp(hit, 0.2);
      galaxyMat.uniforms.uForce.value = force;

      // Shooting stars.
      if (t > nextAmbient) {
        ambientStar();
        nextAmbient = t + 5 + Math.random() * 7;
      }
      for (let i = streaks.length - 1; i >= 0; i--) {
        const st = streaks[i];
        st.age += dt;
        const k = st.age / st.life;
        const pos = st.line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const col = st.line.geometry.getAttribute("color") as THREE.BufferAttribute;
        const head = st.from.clone().addScaledVector(st.dir, Math.min(st.age, st.life) * st.speed);
        const fade = k < 0.8 ? 1 : Math.max(0, 1 - (k - 0.8) / 0.4);
        for (let j = 0; j < TRAIL; j++) {
          const f = j / (TRAIL - 1);
          const p = head.clone().addScaledVector(st.dir, -f * st.length * Math.min(1, k * 3));
          pos.setXYZ(j, p.x, p.y, p.z);
          const a = (1 - f) * (1 - f) * fade;
          col.setXYZ(j, st.color.r * a, st.color.g * a, st.color.b * a);
        }
        pos.needsUpdate = true;
        col.needsUpdate = true;
        if (k > 1.2) {
          scene.remove(st.line);
          st.line.geometry.dispose();
          (st.line.material as THREE.Material).dispose();
          streaks.splice(i, 1);
        }
      }
      // The portal rings swell when a wish arrives.
      pulse = Math.max(0, pulse - dt * 1.4);
      const swell = 1 + Math.sin(Math.min(1, 1 - pulse) * Math.PI) * 0.18 * (pulse > 0 ? 1 : 0);
      ringA.scale.setScalar(swell);
      ringB.scale.setScalar(1 + (swell - 1) * 1.6);

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
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("portal:wish", onWish);
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
