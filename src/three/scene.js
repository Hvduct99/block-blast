// scene.js - nen 3D trang dang nhap (Three.js): bau troi dem, trang, day nui thuy mac nhieu lop trong suong,
// Do Long Dao phat sang lo lung, tan lua vang bay len. Nhe: khong post-processing, tu giam chat luong tren dien thoai.
import * as THREE from 'three';

const GOLD = new THREE.Color('#ffcf5a');

function glowTexture(inner = 'rgba(255,230,160,1)', outer = 'rgba(255,170,60,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, 'rgba(255,200,110,0.55)'); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Day nui: dai dat hep, dinh nhap nho bang tong cac song sin (on dinh, khong can noise lib)
function ridge(width, height, seed, color, z, segs = 160) {
  const shape = new THREE.Shape(), half = width / 2;
  shape.moveTo(-half, -40);
  for (let i = 0; i <= segs; i++) {
    const x = -half + (i / segs) * width, u = x * 0.02 + seed;
    const y = height * (0.55 + 0.25 * Math.sin(u * 1.3) + 0.12 * Math.sin(u * 3.7 + seed) + 0.06 * Math.sin(u * 9.1)) * (1 - Math.pow(Math.abs(x) / half, 6) * 0.4);
    shape.lineTo(x, y);
  }
  shape.lineTo(half, -40); shape.lineTo(-half, -40);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, fog: true }));
  m.position.z = z; return m;
}

function saber() {
  const g = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#d8dde8', metalness: 0.95, roughness: 0.18, emissive: '#3a2a10', emissiveIntensity: 0.6 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 9, 0.12), bladeMat); blade.position.y = 4.5;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.64, 1.6, 4), bladeMat); tip.rotation.y = Math.PI / 4; tip.scale.z = 0.19; tip.position.y = 9.8;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 9.2, 0.14), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); edge.position.set(0.45, 4.6, 0);
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d6a23a', metalness: 1, roughness: 0.3, emissive: '#5a3a00', emissiveIntensity: 0.8 });
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.22, 12, 32), goldMat); guard.rotation.x = Math.PI / 2; guard.scale.set(1.3, 1, 1);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3, 12), new THREE.MeshStandardMaterial({ color: '#5a1418', roughness: 0.7 })); grip.position.y = -1.6;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), goldMat); pommel.position.y = -3.3;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: GOLD, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(16, 22, 1); halo.position.y = 3.5;
  g.add(halo, blade, tip, edge, guard, grip, pommel);
  return g;
}

export function startScene(canvas) {
  const mobile = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer:coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0714');
  scene.fog = new THREE.Fog('#160f24', 40, 260);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  camera.position.set(0, 18, 70);

  // bau troi: dai mau chuyen sac + sao
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#05030c') }, mid: { value: new THREE.Color('#2a1638') }, bot: { value: new THREE.Color('#5a2a2a') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying float h; void main(){ vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bot, mid, smoothstep(-0.1, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
  }));
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < (mobile ? 500 : 1200); i++) { const t = Math.random() * Math.PI * 2, p = Math.random() * 0.45 + 0.08, r = 380; sp.push(r * Math.cos(t) * Math.cos(p), r * Math.sin(p), r * Math.sin(t) * Math.cos(p)); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fff4dd', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));

  // trang
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,250,235,1)', 'rgba(255,220,180,0)'), fog: false, transparent: true, depthWrite: false }));
  moon.scale.set(90, 90, 1); moon.position.set(-70, 95, -300); scene.add(moon);

  // day nui (xa -> gan): mau dam dan, suong (fog) tao chieu sau
  [[520, 120, 1.1, '#3a2848', -230], [460, 90, 4.2, '#2a1c38', -160], [400, 62, 7.9, '#1d1328', -100], [340, 40, 2.6, '#120b1a', -45]].forEach(([w, h, s, c, z]) => {
    const r = ridge(w, h, s, c, z); r.position.y = -18; scene.add(r);
  });

  // Do Long Dao
  scene.add(new THREE.AmbientLight('#6a5a8a', 0.8));
  const key = new THREE.PointLight('#ffd27a', 220, 80, 1.6); key.position.set(6, 22, 22); scene.add(key);
  const rim = new THREE.DirectionalLight('#8aa8ff', 1.4); rim.position.set(-20, 30, -10); scene.add(rim);
  const blade = saber(); blade.position.set(0, 12, 18); blade.rotation.z = -0.18; scene.add(blade);

  // tan lua / canh hoa bay
  const N = mobile ? 260 : 700, emb = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 200; pos[i * 3 + 1] = Math.random() * 90 - 20; pos[i * 3 + 2] = (Math.random() - 0.5) * 140; spd[i] = 2 + Math.random() * 6; }
  emb.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(emb, new THREE.PointsMaterial({ map: glowTexture(), color: '#ffb44a', size: 1.6, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    blade.position.x = w / h < 1 ? 0 : 3; // giua khoang trong giua tieu de va khung dang nhap
  }
  addEventListener('resize', resize); resize();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock(); // tab an: trinh duyet tu dung requestAnimationFrame, dt bi chan 0.05s
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, m = reduce ? 0.15 : 1;
    blade.position.y = 12 + Math.sin(t * 0.9) * 1.6 * m; blade.rotation.y += dt * 0.5 * m; blade.rotation.z = -0.18 + Math.sin(t * 0.6) * 0.06 * m;
    key.intensity = 200 + Math.sin(t * 3.1) * 30;
    const a = emb.attributes.position;
    for (let i = 0; i < N; i++) {
      a.array[i * 3 + 1] += spd[i] * dt * m; a.array[i * 3] += Math.sin(t * 0.7 + i) * dt * 1.5 * m;
      if (a.array[i * 3 + 1] > 75) { a.array[i * 3 + 1] = -20; a.array[i * 3] = (Math.random() - 0.5) * 200; }
    }
    a.needsUpdate = true;
    camera.position.x += (mx * 14 - camera.position.x) * 0.03;
    camera.position.y += (18 - my * 8 - camera.position.y) * 0.03;
    camera.lookAt(0, 12, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
}
