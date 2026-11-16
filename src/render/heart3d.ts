/**
 * Cœur 3D d'Hémodyssée : cavités à double paroi (coupe possible), valves animées,
 * sang qui circule, système de conduction, coronaires, lésions visibles,
 * zones cliquables avec zoom de caméra.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';
import { effetsVisibles } from '../core/effets.ts';
import type { ZoneId } from '../content/zones.ts';

export type Coupe = 'aucune' | 'frontale';

export interface OptionsCoeur3D {
  onPick?: (z: ZoneId | null) => void;
  onHover?: (z: ZoneId | null) => void;
  leger?: boolean;
}

export interface Coeur3D {
  frame(i: Instant, dt: number): void;
  maj(e: Etat): void;
  setCoupe(c: Coupe, pos: number): void;
  setOpacite(a: number): void;
  /** Durée du déplacement de caméra, en secondes (visite guidée : plus long = plus fluide). */
  setDureeTween(d: number): void;
  /** Bloque la rotation et le déplacement à la souris (pendant une animation guidée). */
  setInteraction(rotation: boolean): void;
  focus(z: ZoneId | null): void;
  selection(z: ZoneId | null): void;
  setEtiquettes(on: boolean, noms: Partial<Record<ZoneId, string>>): void;
  vueInitiale(): void;
  /** Définition imposée pour l'export (pixels par point CSS) ; null = automatique. */
  setDefinition(pr: number | null): void;
  dispose(): void;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ── Repères anatomiques (vue antérieure : x vers la gauche du patient, y vers le haut, z vers l'avant) ──
const P = {
  od: V(-1.0, 0.86, -0.04), og: V(0.58, 0.98, -0.72),
  vgBase: V(0.42, 0.36, -0.24), vgDir: V(0.4, -0.84, 0.38).normalize(),
  vdBase: V(-0.3, 0.38, 0.4), vdDir: V(0.26, -0.88, 0.4).normalize(),
  tri: V(-0.6, 0.44, 0.2), pu: V(0.0, 0.88, 0.52), mi: V(0.5, 0.56, -0.46), ao: V(0.18, 0.62, -0.12),
  sa: V(-0.8, 1.26, 0.32), av: V(-0.34, 0.26, 0.12), auricule: V(1.02, 1.08, -0.38),
  centre: V(0.05, 0.1, -0.05),
};

const ANCRES: Partial<Record<ZoneId, THREE.Vector3>> = {
  od: P.od, og: P.og, vg: V(0.7, -0.45, 0.05), vd: V(-0.18, -0.3, 0.66),
  valveTri: P.tri, valvePu: P.pu, valveMi: P.mi, valveAo: P.ao, noeudSinusal: P.sa, noeudAV: P.av,
  aorte: V(0.45, 2.0, -0.32), artPulm: V(0.12, 1.45, 0.4), veinesCaves: V(-1.02, 1.85, 0), veinesPulm: V(1.25, 1.02, -0.86),
  coronaires: V(0.15, -0.35, 0.95), carotides: V(0.42, 2.45, -0.3),
};
const DISTANCE: Partial<Record<ZoneId, number>> = { valveTri: 4.6, valvePu: 4.6, valveMi: 4.6, valveAo: 4.6, noeudSinusal: 4.0, noeudAV: 4.2, coronaires: 6.8, carotides: 4.4, aorte: 6.2, artPulm: 5.4, veinesCaves: 6, veinesPulm: 5.4, od: 5.2, og: 5.2, vd: 5.6, vg: 5.8 };
const INTERNES: ZoneId[] = ['od', 'vd', 'og', 'vg', 'valveTri', 'valvePu', 'valveMi', 'valveAo', 'noeudAV'];

// ── Textures procédurales ──
function textureFibres(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256, x = Math.random() * 256, l = 20 + Math.random() * 60;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.05 + Math.random() * 0.1})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (Math.random() - 0.5) * 12, x + l, y + (Math.random() - 0.5) * 6); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  return t;
}
function texturePoint(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function textureCroix(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#ff3344'; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 14); g.lineTo(50, 50); g.moveTo(50, 14); g.lineTo(14, 50); g.stroke();
  return new THREE.CanvasTexture(c);
}

// ── Géométries ──
function profilVentricule(R: number, L: number, n = 30): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(R * 0.92, 0.12)];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0.002, R * Math.cos(a)), -L * Math.sin(a)));
  }
  return pts.reverse();
}

interface Paroi { ext: THREE.Mesh; extDos: THREE.Mesh; int: THREE.Mesh; intDos: THREE.Mesh; group: THREE.Group }

export function creerCoeur3D(conteneur: HTMLElement, opt: OptionsCoeur3D = {}): Coeur3D {
  const leger = !!opt.leger;
  const renderer = new THREE.WebGLRenderer({ antialias: !leger, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, leger ? 1.35 : 1.75));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  conteneur.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 1.6; controls.maxDistance = 14; controls.enablePan = true;
  const CIBLE0 = V(0.1, 0.45, -0.1), CAM0 = V(0.9, 0.9, 8.2);
  camera.position.copy(CAM0); controls.target.copy(CIBLE0);

  // Environnement de studio : reflets doux et réalistes sur les surfaces humides.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.32;
  scene.add(new THREE.HemisphereLight(0xfff1ee, 0x1a0e18, 0.45));
  const key = new THREE.DirectionalLight(0xfff4ee, 2.3); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 1.0); rim.position.set(-5, 2, -4); scene.add(rim);
  const fill = new THREE.PointLight(0xff8888, 0.8, 20); fill.position.set(-2, -2, 4); scene.add(fill);

  const plan = new THREE.Plane(V(0, 0, -1), 0);
  let coupeActive = false;
  const fibres = textureFibres();
  const ptTex = texturePoint();

  // Matériaux par zone (pour la surbrillance et la coupe).
  const matsZone = new Map<ZoneId, THREE.MeshStandardMaterial[]>();
  const clippables: THREE.Material[] = [];
  const parois: THREE.MeshStandardMaterial[] = [];
  const cibleOpacite = new Map<THREE.Material, number>();
  const vaisseaux: THREE.MeshStandardMaterial[] = [];
  const pickables: THREE.Object3D[] = [];
  const reg = (z: ZoneId, m: THREE.MeshStandardMaterial) => { if (!matsZone.has(z)) matsZone.set(z, []); matsZone.get(z)!.push(m); };
  const mat = (o: THREE.MeshPhysicalMaterialParameters, z?: ZoneId, clip = true) => {
    const { clearcoat: _c, clearcoatRoughness: _cr, sheen: _s, sheenRoughness: _sr, sheenColor: _sc, ...std } = o;
    const m: THREE.MeshStandardMaterial = leger
      ? new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02, ...std })
      : new THREE.MeshPhysicalMaterial({ roughness: 0.5, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.28, sheen: 0.12, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x802030), ...o });
    m.userData.zone = z;
    if (z) reg(z, m);
    if (clip) clippables.push(m);
    return m;
  };

  const coeur = new THREE.Group(); scene.add(coeur);

  function paroi(z: ZoneId, coulExt: number, geoExt: THREE.BufferGeometry, geoInt: THREE.BufferGeometry, vertexColors = false): Paroi {
    const ext = mat({ color: coulExt, bumpMap: fibres, bumpScale: 0.6, vertexColors }, z);
    const extDos = mat({ color: 0x7c222b, side: THREE.BackSide, roughness: 0.7, clearcoat: 0.2, bumpMap: fibres, bumpScale: 0.5 }, z);
    const intFace = mat({ color: 0x86262f, roughness: 0.7, clearcoat: 0.2, bumpMap: fibres, bumpScale: 0.5, vertexColors }, z);
    const intDos = mat({ color: 0xd98f90, side: THREE.BackSide, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.18, bumpMap: fibres, bumpScale: 0.35 }, z);
    for (const m of [ext, extDos, intFace, intDos]) { m.transparent = true; m.depthWrite = true; }
    parois.push(ext, extDos, intFace, intDos);
    const g = new THREE.Group();
    const m1 = new THREE.Mesh(geoExt, ext), m2 = new THREE.Mesh(geoExt, extDos), m3 = new THREE.Mesh(geoInt, intFace), m4 = new THREE.Mesh(geoInt, intDos);
    [m1, m2, m3, m4].forEach((m) => { m.userData.zone = z; g.add(m); });
    pickables.push(m1);
    coeur.add(g);
    return { ext: m1, extDos: m2, int: m3, intDos: m4, group: g };
  }

  // Ventricule gauche (déformable : contraction, zone d'infarctus akinétique).
  let vgR = 0.86, vgL = 2.05;
  const vgGeo = { ext: new THREE.BufferGeometry(), int: new THREE.BufferGeometry() };
  const vg = paroi('vg', 0x8a1f2b, vgGeo.ext, vgGeo.int, true);
  vg.group.position.copy(P.vgBase);
  vg.group.quaternion.setFromUnitVectors(V(0, -1, 0), P.vgDir);
  let vgBaseExt = new Float32Array(0), vgBaseInt = new Float32Array(0), vgNecExt = new Float32Array(0), vgNecInt = new Float32Array(0);
  const anterieurLocal = V(-0.35, 0, 1).normalize().applyQuaternion(vg.group.quaternion.clone().invert()).setY(0).normalize();
  let paramsVG = { hvg: -1, dil: -1, isch: -1, hypo: -1 };
  // Couleurs de la zone atteinte, exprimées en facteurs de la couleur de base (espace linéaire) :
  // nécrose = tissu mort gris violacé ; ischémie (angor) = muscle pâle et violacé, encore vivant.
  const facteurs = (base: number, cible: number) => { const b = new THREE.Color(base), c = new THREE.Color(cible); return [c.r / b.r, c.g / b.g, c.b / b.b]; };
  const NEC_EXT = facteurs(0x8a1f2b, 0x76668a), NEC_INT = facteurs(0x86262f, 0x463a52);
  const necCentre = new THREE.Vector3(0.62, -0.75, 0.55);
  const HYPO_EXT = facteurs(0x8a1f2b, 0xa85a8c), HYPO_INT = facteurs(0x86262f, 0x8a4a72);

  function construireVG(hvg: number, dil: number, isch: number, hypo = 0) {
    const R = vgR * (1 + 0.32 * dil), L = vgL * (1 + 0.18 * dil);
    const paroiE = 0.24 * (1 + 1.5 * hvg) * (1 - 0.45 * dil);
    const Rext = R + paroiE * 0.45, Rint = R - paroiE * 0.55;
    const ge = new THREE.LatheGeometry(profilVentricule(Rext, L + paroiE * 0.3), leger ? 28 : 44);
    const gi = new THREE.LatheGeometry(profilVentricule(Rint, L - paroiE * 0.6), leger ? 28 : 44);
    let cx = 0, cy = 0, cz = 0, nc = 0;
    for (const [g, est] of [[ge, true], [gi, false]] as const) {
      const pos = g.attributes.position.array as Float32Array;
      const n = pos.length / 3;
      const col = new Float32Array(n * 3);
      const nec = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
        const rr = Math.hypot(x, z) || 1;
        const ang = (x * anterieurLocal.x + z * anterieurLocal.z) / rr;
        // Territoire de l'artère interventriculaire antérieure : paroi antérieure et pointe.
        const terr = smooth(-0.15, 0.35, ang) * smooth(0.05, 0.4, -y / L);
        const w = isch > 0.02 ? terr * clamp(isch * 2.4, 0, 1) : 0;
        const h = hypo > 0.02 ? terr * clamp(hypo, 0, 1) * (1 - w) : 0;
        nec[i] = w;
        const N = est ? NEC_EXT : NEC_INT, Hc = est ? HYPO_EXT : HYPO_INT;
        for (let c = 0; c < 3; c++) col[i * 3 + c] = 1 + (N[c] - 1) * w + (Hc[c] - 1) * h;
        if (est && w + h > 0.6) { cx += x; cy += y; cz += z; nc++; }
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      if (est) { vgBaseExt = new Float32Array(pos); vgNecExt = nec; } else { vgBaseInt = new Float32Array(pos); vgNecInt = nec; }
    }
    // Centre de la zone atteinte (repère du cœur), pour y placer l'étiquette.
    if (nc) necCentre.set(cx / nc, cy / nc, cz / nc).multiplyScalar(1.08).applyQuaternion(vg.group.quaternion).add(vg.group.position);
    vg.ext.geometry.dispose(); vg.int.geometry.dispose();
    vg.ext.geometry = ge; vg.extDos.geometry = ge; vg.int.geometry = gi; vg.intDos.geometry = gi;
  }
  construireVG(0, 0, 0);

  // Ventricule droit (aplati, paroi fine).
  const vdExt = new THREE.LatheGeometry(profilVentricule(0.82, 1.6), leger ? 24 : 36);
  const vdInt = new THREE.LatheGeometry(profilVentricule(0.74, 1.5), leger ? 24 : 36);
  const vd = paroi('vd', 0x8f2530, vdExt, vdInt);
  vd.group.position.copy(P.vdBase);
  vd.group.quaternion.setFromUnitVectors(V(0, -1, 0), P.vdDir);
  vd.group.scale.set(1, 1, 0.58);

  // Oreillettes.
  const sph = (r: number) => new THREE.SphereGeometry(r, leger ? 22 : 32, leger ? 16 : 24);
  const od = paroi('od', 0x93303a, sph(0.52), sph(0.46));
  od.group.position.copy(P.od);
  const og = paroi('og', 0x93303a, sph(0.55), sph(0.485));
  og.group.position.copy(P.og);
  const auricule = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), og.ext.material as THREE.Material);
  auricule.scale.set(1.3, 0.8, 0.9); auricule.position.copy(P.auricule).sub(P.og); auricule.userData.zone = 'og';
  og.group.add(auricule); pickables.push(auricule);
  const thrombus = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat({ color: 0x4a0d12, roughness: 0.9 }, undefined, false));
  thrombus.position.copy(P.auricule); thrombus.visible = false; coeur.add(thrombus);

  // ── Vaisseaux ──
  function tube(z: ZoneId, pts: THREE.Vector3[], r: number, couleur: number, opacite = 0.55): { mesh: THREE.Mesh; courbe: THREE.CatmullRomCurve3; mat: THREE.MeshStandardMaterial } {
    const courbe = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const m = mat({ color: couleur, transparent: true, opacity: opacite, depthWrite: false, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide }, z);
    m.userData.opacite = opacite;
    vaisseaux.push(m);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(courbe, leger ? 48 : 80, r, leger ? 12 : 18, false), m);
    mesh.userData.zone = z; mesh.renderOrder = 2;
    coeur.add(mesh); pickables.push(mesh);
    return { mesh, courbe, mat: m };
  }
  const ptsAorte = [P.ao, V(0.12, 1.35, -0.05), V(0.28, 1.95, -0.15), V(0.72, 2.08, -0.45), V(1.0, 1.62, -0.85), V(1.02, 0.5, -0.95), V(1.0, -1.7, -0.9)];
  const aorte = tube('aorte', ptsAorte, 0.27, 0xd2484e);
  const AO_SOUPLE = new THREE.Color(0xd2484e), AO_RIGIDE = new THREE.Color(0xe6d2b0);
  const branches = [[V(0.3, 1.98, -0.17), V(0.18, 2.75, -0.15)], [V(0.5, 2.06, -0.3), V(0.48, 2.8, -0.32)], [V(0.7, 2.06, -0.44), V(0.95, 2.7, -0.55)]];
  const carotides = branches.map((b, i) => tube(i === 2 ? 'aorte' : 'carotides', b, 0.085, 0xd2484e));
  const ptsAP = [P.pu, V(0.08, 1.42, 0.42), V(0.42, 1.72, 0.0), V(0.98, 1.78, -0.36)];
  tube('artPulm', ptsAP, 0.24, 0x4f6fc4);
  const ptsAPd = [V(0.1, 1.5, 0.33), V(-0.32, 1.64, -0.02), V(-0.85, 1.64, -0.32)];
  tube('artPulm', ptsAPd, 0.17, 0x4f6fc4);
  const ptsVCS = [V(-1.02, 2.4, -0.06), V(-1.03, 1.85, 0.0), P.od];
  const ptsVCI = [V(-0.9, -1.75, -0.32), V(-1.0, -0.4, -0.12), P.od];
  tube('veinesCaves', ptsVCS, 0.22, 0x3e5bb0);
  tube('veinesCaves', ptsVCI, 0.24, 0x3e5bb0);
  const ptsVPd = [V(-0.35, 1.08, -1.0), V(0.12, 1.0, -0.82), P.og];
  const ptsVPg = [V(1.5, 1.05, -0.95), V(1.05, 1.0, -0.8), P.og];
  tube('veinesPulm', ptsVPd, 0.12, 0xd25a5a);
  tube('veinesPulm', ptsVPg, 0.12, 0xd25a5a);
  tube('veinesPulm', [V(-0.3, 0.7, -0.95), V(0.15, 0.8, -0.8), P.og], 0.11, 0xd25a5a);
  tube('veinesPulm', [V(1.45, 0.68, -0.95), V(1.0, 0.8, -0.8), P.og], 0.11, 0xd25a5a);

  // ── Valves ──
  interface Valve { g: THREE.Group; feuillets: THREE.Object3D[]; mats: THREE.MeshStandardMaterial[]; anneau: THREE.Mesh; calcif: THREE.Group; ouvMax: number; fermeMin: number }
  function valve(z: ZoneId, pos: THREE.Vector3, dir: THREE.Vector3, r: number, n: number): Valve {
    const g = new THREE.Group(); g.position.copy(pos);
    g.quaternion.setFromUnitVectors(V(0, 0, 1), dir.clone().normalize());
    const mAnneau = mat({ color: 0xf2e6d8, roughness: 0.4 }, z);
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.11, 8, 36), mAnneau);
    anneau.userData.zone = z; g.add(anneau); pickables.push(anneau);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.zone = z; g.add(hit); pickables.push(hit);
    const feuillets: THREE.Object3D[] = [];
    const mats: THREE.MeshStandardMaterial[] = [];
    for (let k = 0; k < n; k++) {
      const m0 = (k + 0.5) * (2 * Math.PI / n);
      const geo = new THREE.CircleGeometry(r * 0.97, 10, k * 2 * Math.PI / n, 2 * Math.PI / n);
      const rim = V(Math.cos(m0) * r * 0.97, Math.sin(m0) * r * 0.97, 0);
      geo.translate(-rim.x, -rim.y, 0);
      const mf = mat({ color: 0xf5d6cf, side: THREE.DoubleSide, roughness: 0.5, transparent: true, opacity: 0.95 }, z);
      mats.push(mf);
      const piv = new THREE.Object3D(); piv.position.copy(rim);
      const mesh = new THREE.Mesh(geo, mf); mesh.userData.zone = z; piv.add(mesh);
      piv.userData.tangente = V(-Math.sin(m0), Math.cos(m0), 0);
      g.add(piv); feuillets.push(piv);
    }
    const calcif = new THREE.Group();
    const mc = mat({ color: 0xf0d27a, roughness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, rr = r * (0.55 + Math.random() * 0.4);
      const s = new THREE.Mesh(new THREE.SphereGeometry(r * (0.08 + Math.random() * 0.06), 8, 6), mc);
      s.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.02); calcif.add(s);
    }
    calcif.visible = false; g.add(calcif);
    coeur.add(g);
    return { g, feuillets, mats, anneau, calcif, ouvMax: 1.25, fermeMin: 0 };
  }
  const vTri = valve('valveTri', P.tri, V(0.45, -0.72, 0.35), 0.3, 3);
  const vPu = valve('valvePu', P.pu, V(0.05, 1, -0.12), 0.22, 3);
  const vMi = valve('valveMi', P.mi, V(0.05, -0.9, 0.42), 0.3, 2);
  const vAo = valve('valveAo', P.ao, V(-0.03, 1, 0.04), 0.23, 3);
  const valves = [vTri, vPu, vMi, vAo];

  // ── Système de conduction ──
  const mNoeud = mat({ color: 0xffe08a, emissive: 0xffb020, emissiveIntensity: 0.6 }, 'noeudSinusal', false);
  const sa = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), mNoeud); sa.position.copy(P.sa); sa.userData.zone = 'noeudSinusal';
  const mAV = mat({ color: 0xffe08a, emissive: 0xffb020, emissiveIntensity: 0.6 }, 'noeudAV', false);
  const avn = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), mAV); avn.position.copy(P.av); avn.userData.zone = 'noeudAV';
  coeur.add(sa, avn);
  for (const [n, z] of [[sa, 'noeudSinusal'], [avn, 'noeudAV']] as const) {
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(n.position); hit.userData.zone = z; coeur.add(hit); pickables.push(hit);
  }
  const cheminElec = new THREE.CatmullRomCurve3([P.sa, V(-0.6, 0.8, 0.25), P.av, V(-0.05, -0.25, 0.22), V(0.3, -1.0, 0.32), V(0.55, -1.45, 0.3)]);
  const ligneElec = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cheminElec.getPoints(60)), new THREE.LineBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.55 }));
  ligneElec.renderOrder = 5; coeur.add(ligneElec);
  const etincelle = new THREE.Sprite(new THREE.SpriteMaterial({ map: ptTex, color: 0xfff2a8, transparent: true, depthTest: false }));
  etincelle.scale.setScalar(0.35); etincelle.visible = false; coeur.add(etincelle);
  const croix = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureCroix(), depthTest: false, transparent: true }));
  croix.scale.setScalar(0.32); croix.position.copy(P.av).add(V(0, 0.05, 0.12)); croix.visible = false; coeur.add(croix);

  // ── Particules ──
  function systemePoints(n: number, taille: number) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const m = new THREE.PointsMaterial({ size: taille, map: ptTex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05, sizeAttenuation: true });
    const pts = new THREE.Points(geo, m); pts.renderOrder = 4; pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  }

  interface Chemin { courbe: THREE.CatmullRomCurve3; len: number; sAV: number; sSig: number; bleu: boolean; rayons: [number, number][] }
  function chemin(pts: THREE.Vector3[], iAV: number, iSig: number, bleu: boolean, rayons: number[]): Chemin {
    const courbe = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const tot = cum[cum.length - 1];
    return { courbe, len: courbe.getLength(), sAV: cum[iAV] / tot, sSig: cum[iSig] / tot, bleu, rayons: cum.map((c, i) => [c / tot, rayons[i]] as [number, number]) };
  }
  const vgC = V(0.66, -0.36, 0.0), vgApex = V(0.88, -0.95, 0.2), vdC = V(-0.2, -0.3, 0.62), vdApex = V(0.0, -0.75, 0.72);
  const chemins: Chemin[] = [
    chemin([V(-1.02, 2.4, -0.06), V(-1.03, 1.8, 0), P.od, P.tri, vdC, vdApex, V(-0.05, 0.1, 0.62), P.pu, V(0.08, 1.42, 0.42), V(0.42, 1.72, 0.0), V(0.98, 1.78, -0.36)], 3, 7, true, [0.12, 0.14, 0.35, 0.12, 0.3, 0.2, 0.2, 0.1, 0.15, 0.15, 0.12]),
    chemin([V(-0.9, -1.75, -0.32), V(-1.0, -0.4, -0.12), P.od, P.tri, vdC, vdApex, V(-0.05, 0.1, 0.62), P.pu, V(0.08, 1.42, 0.42), V(-0.32, 1.64, -0.02), V(-0.85, 1.64, -0.32)], 3, 7, true, [0.14, 0.15, 0.35, 0.12, 0.3, 0.2, 0.2, 0.1, 0.15, 0.12, 0.1]),
    chemin([V(-0.35, 1.08, -1.0), V(0.12, 1.0, -0.82), P.og, P.mi, vgC, vgApex, V(0.32, -0.15, 0.0), P.ao, V(0.12, 1.35, -0.05), V(0.28, 1.95, -0.15), V(0.72, 2.08, -0.45), V(1.0, 1.62, -0.85), V(1.02, 0.5, -0.95), V(1.0, -1.7, -0.9)], 3, 7, false, [0.08, 0.1, 0.32, 0.12, 0.35, 0.22, 0.22, 0.1, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16]),
    chemin([V(1.5, 1.05, -0.95), V(1.05, 1.0, -0.8), P.og, P.mi, vgC, vgApex, V(0.32, -0.15, 0.0), P.ao, V(0.12, 1.35, -0.05), V(0.28, 1.95, -0.15), V(0.72, 2.08, -0.45), V(1.0, 1.62, -0.85), V(1.02, 0.5, -0.95), V(1.0, -1.7, -0.9)], 3, 7, false, [0.08, 0.1, 0.32, 0.12, 0.35, 0.22, 0.22, 0.1, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16]),
  ];
  const rayonAu = (c: Chemin, s: number) => {
    const r = c.rayons;
    for (let i = 1; i < r.length; i++) if (s <= r[i][0]) { const t = (s - r[i - 1][0]) / (r[i][0] - r[i - 1][0] || 1); return r[i - 1][1] + (r[i][1] - r[i - 1][1]) * t; }
    return r[r.length - 1][1];
  };
  const NS = leger ? 260 : 620;
  const sang = systemePoints(NS, leger ? 0.11 : 0.09);
  const part = Array.from({ length: NS }, (_, i) => ({ c: i % 4, s: Math.random(), o: V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.random()) }));
  const ROUGE = new THREE.Color(0xff3b4a), BLEU = new THREE.Color(0x4f7dff), JAUNE = new THREE.Color(0xffd84a);
  {
    const col = sang.geometry.attributes.color.array as Float32Array;
    part.forEach((p, i) => { const c = chemins[p.c].bleu ? BLEU : ROUGE; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; });
  }
  const NL = 70;
  const ldl = systemePoints(NL, 0.07);
  const partL = Array.from({ length: NL }, () => ({ c: 2 + Math.floor(Math.random() * 2), s: Math.random(), o: V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.random()) }));
  { const col = ldl.geometry.attributes.color.array as Float32Array; for (let i = 0; i < NL; i++) { col[i * 3] = JAUNE.r; col[i * 3 + 1] = JAUNE.g; col[i * 3 + 2] = JAUNE.b; } }

  // Jets (fuites et sténoses).
  const NJ = 220;
  const jets = systemePoints(NJ, 0.075);
  const pj = Array.from({ length: NJ }, () => ({ p: V(0, 0, 0), v: V(0, 0, 0), vie: 0, max: 1 }));
  let jIdx = 0;
  const emettre = (orig: THREE.Vector3, dir: THREE.Vector3, vitesse: number, ecart: number, coul: THREE.Color, vie = 0.45) => {
    const q = pj[jIdx]; jIdx = (jIdx + 1) % NJ;
    q.p.copy(orig).add(V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.06));
    q.v.copy(dir).normalize().add(V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(ecart)).normalize().multiplyScalar(vitesse * (0.7 + Math.random() * 0.6));
    q.vie = vie; q.max = vie;
    const col = jets.geometry.attributes.color.array as Float32Array;
    const i = (jIdx + NJ - 1) % NJ; col[i * 3] = coul.r; col[i * 3 + 1] = coul.g; col[i * 3 + 2] = coul.b;
  };

  // Fibrillation : étincelles sur les oreillettes.
  const NF = 50;
  const fibr = systemePoints(NF, 0.09);
  { const col = fibr.geometry.attributes.color.array as Float32Array; for (let i = 0; i < NF; i++) { col[i * 3] = 1; col[i * 3 + 1] = 0.9; col[i * 3 + 2] = 0.45; } }
  fibr.visible = false;

  // ── Coronaires (posées sur la surface par lancer de rayons) ──
  coeur.updateMatrixWorld(true);
  const rayc = new THREE.Raycaster();
  const surfaces = [vg.ext, vd.ext, od.ext, og.ext];
  /** Pose une artère sur la surface : chaque point est projeté le long de la direction donnée. */
  function surPoser(guides: THREE.Vector3[], dir: THREE.Vector3): THREE.Vector3[] {
    const d = dir.clone().normalize();
    return guides.map((g) => {
      rayc.set(g.clone().addScaledVector(d, -6), d);
      const hit = rayc.intersectObjects(surfaces, false)[0];
      return hit ? hit.point.clone().addScaledVector(d, -0.03) : g;
    });
  }
  // IVA dans le sillon interventriculaire antérieur, coronaire droite dans le sillon auriculo-ventriculaire droit, circonflexe à gauche.
  const ptsIVA = surPoser([V(0.2, 0.62, 0), V(0.25, 0.4, 0), V(0.3, 0.0, 0), V(0.42, -0.45, 0), V(0.58, -0.9, 0), V(0.78, -1.3, 0)], V(0, 0, -1));
  const ptsCD = surPoser([V(0.05, 0.6, 0), V(-0.3, 0.42, 0), V(-0.62, 0.22, 0), V(-0.86, -0.05, 0), V(-0.92, -0.4, 0)], V(0.15, 0, -1));
  const ptsCx = surPoser([V(0.3, 0.55, 0), V(0.7, 0.45, 0), V(1.0, 0.25, 0), V(1.2, -0.05, 0)], V(-0.25, 0, -1));
  const mCoro = mat({ color: 0xc8343f, roughness: 0.3, emissive: 0x220000 }, 'coronaires');
  const courbeIVA = new THREE.CatmullRomCurve3(ptsIVA);
  let meshIVA!: THREE.Mesh;
  for (const pts of [ptsIVA, ptsCD, ptsCx]) {
    const c = pts === ptsIVA ? courbeIVA : new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.035, 8, false), mCoro); m.userData.zone = 'coronaires'; coeur.add(m);
    if (pts === ptsIVA) meshIVA = m;
    const hit = new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.12, 6, false), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.zone = 'coronaires'; coeur.add(hit); pickables.push(hit);
  }
  const plaque = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), mat({ color: 0xf2c94c, roughness: 0.8 }, 'coronaires'));
  plaque.position.copy(courbeIVA.getPointAt(0.3)); plaque.visible = false; coeur.add(plaque);
  const caillot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat({ color: 0x5a0a10, roughness: 0.9 }, undefined, false));
  caillot.position.copy(courbeIVA.getPointAt(0.32)); caillot.visible = false; coeur.add(caillot);
  const NC = 24;
  const coro = systemePoints(NC, 0.06);
  const pc = Array.from({ length: NC }, () => Math.random());
  { const col = coro.geometry.attributes.color.array as Float32Array; for (let i = 0; i < NC; i++) { col[i * 3] = 1; col[i * 3 + 1] = 0.35; col[i * 3 + 2] = 0.4; } }

  // ── Rétrécissement visible des artères (déformation du tube) ──
  interface Tube { mesh: THREE.Mesh; courbe: THREE.CatmullRomCurve3; base: Float32Array; tub: number; rad: number }
  function tubeDeformable(mesh: THREE.Mesh, courbe: THREE.CatmullRomCurve3, tub: number, rad: number): Tube {
    return { mesh, courbe, base: new Float32Array(mesh.geometry.attributes.position.array as Float32Array), tub, rad };
  }
  function retrecir(t: Tube, t0: number, largeur: number, f: number) {
    const pos = t.mesh.geometry.attributes.position.array as Float32Array;
    const c = V(0, 0, 0);
    for (let i = 0; i <= t.tub; i++) {
      const u = i / t.tub;
      const k = 1 - f * Math.exp(-(((u - t0) / largeur) ** 2));
      t.courbe.getPointAt(u, c);
      for (let j = 0; j <= t.rad; j++) {
        const n = (i * (t.rad + 1) + j) * 3;
        pos[n] = c.x + (t.base[n] - c.x) * k; pos[n + 1] = c.y + (t.base[n + 1] - c.y) * k; pos[n + 2] = c.z + (t.base[n + 2] - c.z) * k;
      }
    }
    t.mesh.geometry.attributes.position.needsUpdate = true;
  }
  const tubesCarotides = carotides.slice(0, 2).map((c) => tubeDeformable(c.mesh, c.courbe, leger ? 48 : 80, leger ? 12 : 18));
  const plaquesCarotides = carotides.slice(0, 2).map((c) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat({ color: 0xf2c94c, roughness: 0.75 }, 'carotides'));
    m.position.copy(c.courbe.getPointAt(0.42)); m.visible = false; coeur.add(m); return m;
  });
  const tubeIVA = tubeDeformable(meshIVA, courbeIVA, 60, 8);

  // ── Halos qui signalent les lésions, visibles même à travers les parois ──
  const texHalo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g2 = c.getContext('2d')!;
    g2.strokeStyle = 'rgba(255,255,255,1)'; g2.lineWidth = 9; g2.beginPath(); g2.arc(64, 64, 48, 0, Math.PI * 2); g2.stroke();
    g2.lineWidth = 3; g2.globalAlpha = 0.6; g2.beginPath(); g2.arc(64, 64, 58, 0, Math.PI * 2); g2.stroke();
    return new THREE.CanvasTexture(c);
  })();
  const halos: THREE.Sprite[] = Array.from({ length: 10 }, () => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: 0xffc04a, transparent: true, depthTest: false, depthWrite: false }));
    sp.visible = false; sp.renderOrder = 10; coeur.add(sp); return sp;
  });
  let lesionsActives: { p: THREE.Vector3; r: number; c: number; nom: string }[] = [];
  // Étiquettes qui nomment chaque atteinte (toujours visibles).
  const calqueLesions = document.createElement('div');
  calqueLesions.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  conteneur.appendChild(calqueLesions);
  const etiqLesions: HTMLDivElement[] = Array.from({ length: 10 }, () => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;display:none;font:700 10.5px "Plus Jakarta Sans",system-ui;color:#1a0d06;padding:2px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.4);will-change:transform';
    calqueLesions.appendChild(el); return el;
  });

  // ── Étiquettes HTML ──
  const calque = document.createElement('div');
  calque.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  conteneur.appendChild(calque);
  let etiquettes: { z: ZoneId; el: HTMLDivElement }[] = [];

  // ── État courant ──
  let etat: Etat | null = null;
  let opacite = 1;
  let survol: ZoneId | null = null, choisi: ZoneId | null = null;
  let anim: { t: number; duree: number; dePos: THREE.Vector3; deCible: THREE.Vector3; aPos: THREE.Vector3; aCible: THREE.Vector3 } | null = null;
  let dureeTween = 0.9;

  /** Opacité des parois ; en mode zoom, les structures autour de la zone choisie deviennent « fantômes ». */
  function appliquerOpacite() {
    const fantome = choisi && ANCRES[choisi] && !['aorte', 'veinesCaves', 'veinesPulm', 'artPulm', 'carotides'].includes(choisi);
    for (const m of parois) {
      const z = m.userData.zone as ZoneId;
      // Coronaires : le ventricule gauche qu'elles nourrissent reste opaque (on y voit l'ischémie ou la nécrose).
      const cible = fantome && z !== choisi && !(choisi === 'coronaires' && z === 'vg') ? Math.min(opacite, (choisi === 'coronaires' ? 0.85 : 0.16)) : opacite;
      // Les parois restent toujours « transparent » : changer ce drapeau recompile le shader et saccade l'animation.
      m.opacity = cibleOpacite.has(m) ? cible : cible;
      cibleOpacite.set(m, cible);
      m.depthWrite = cible >= 0.999;
    }
    for (const m of vaisseaux) {
      const z = m.userData.zone as ZoneId;
      m.opacity = fantome ? 0.12 : z === choisi ? 0.8 : (m.userData.opacite as number);
    }
  }
  function surbrillance() {
    for (const [z, ms] of matsZone) {
      const on = z === choisi ? 0.32 : z === survol ? 0.18 : 0;
      for (const m of ms) {
        if (m === mNoeud || m === mAV) { m.emissiveIntensity = 0.6 + on * 2; continue; }
        if (m === mCoro) { m.emissive.setRGB(0.13 + on, on * 0.6, on * 0.4); continue; }
        m.emissive.setRGB(on, on * 0.75, on * 0.55);
      }
    }
  }

  // ── Interaction ──
  const ptr = new THREE.Vector2();
  let downX = 0, downY = 0;
  function zoneSous(ev: PointerEvent): ZoneId | null {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayc.setFromCamera(ptr, camera);
    const hits = rayc.intersectObjects(pickables, false);
    for (const h of hits) {
      if (coupeActive && plan.distanceToPoint(h.point) < 0) continue;
      const z = h.object.userData.zone as ZoneId | undefined;
      if (z) return z;
    }
    return null;
  }
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse') return;
    const z = zoneSous(ev);
    if (z !== survol) { survol = z; surbrillance(); renderer.domElement.style.cursor = z ? 'pointer' : 'grab'; opt.onHover?.(z); }
  };
  const onDown = (ev: PointerEvent) => { downX = ev.clientX; downY = ev.clientY; };
  const onUp = (ev: PointerEvent) => {
    if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return;
    opt.onPick?.(zoneSous(ev));
  };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  const ro = new ResizeObserver(() => {
    const w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.position.multiplyScalar(1);
    camera.updateProjectionMatrix();
  });
  ro.observe(conteneur);

  function allerVers(pos: THREE.Vector3, cible: THREE.Vector3) {
    anim = { t: 0, duree: dureeTween, dePos: camera.position.clone(), deCible: controls.target.clone(), aPos: pos, aCible: cible };
  }

  // ── Boucle d'image ──
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0);
  let temps = 0;
  // Résolution adaptative : si l'appareil peine, on baisse la définition par paliers.
  let prActuel = renderer.getPixelRatio(), cumul = 0, nbImages = 0, dernier = performance.now();
  let defImposee: number | null = null;
  function gouverneur() {
    const now = performance.now(); cumul += now - dernier; dernier = now; nbImages++;
    if (nbImages < 90 || defImposee) return;
    const moy = cumul / nbImages; cumul = 0; nbImages = 0;
    if (moy > 30 && prActuel > 1) {
      prActuel = Math.max(1, prActuel - 0.25);
      renderer.setPixelRatio(prActuel);
      renderer.setSize(conteneur.clientWidth, conteneur.clientHeight, false);
    }
  }

  function frame(i: Instant, dt: number) {
    temps += dt;
    gouverneur();
    const e = etat;
    const t = e?.terrain;
    const debit = e ? e.debit / 5 : 1;
    const fe = e ? e.fe : 0.62;

    // Caméra animée.
    if (anim) {
      anim.t = Math.min(1, anim.t + dt / anim.duree);
      // Accélération puis freinage très progressifs : la caméra glisse au lieu de sauter.
      const x = anim.t;
      const k = x * x * x * (x * (x * 6 - 15) + 10);
      camera.position.lerpVectors(anim.dePos, anim.aPos, k);
      controls.target.lerpVectors(anim.deCible, anim.aCible, k);
      if (anim.t >= 1) anim = null;
    }
    controls.update();

    // Contraction du VG (déformation des sommets, zone nécrosée immobile).
    const amp = clamp(0.2 * (fe / 0.62), 0.04, 0.26) * i.contractionV;
    for (const [mesh, base, nec] of [[vg.ext, vgBaseExt, vgNecExt], [vg.int, vgBaseInt, vgNecInt]] as const) {
      const pos = mesh.geometry.attributes.position.array as Float32Array;
      if (pos.length !== base.length) continue;
      for (let k = 0, n = pos.length / 3; k < n; k++) {
        const w = 1 - nec[k];
        const fr = 1 - amp * w * (mesh === vg.int ? 1.35 : 1);
        pos[k * 3] = base[k * 3] * fr;
        pos[k * 3 + 1] = base[k * 3 + 1] * (1 - 0.07 * i.contractionV * w);
        pos[k * 3 + 2] = base[k * 3 + 2] * fr;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
    }
    const sV = 1 - 0.12 * i.contractionV;
    vd.group.scale.set(sV, 1 - 0.05 * i.contractionV, 0.58 * sV);
    const dilOG = t ? 1 + 0.45 * Math.max(t.rm, t.im * 0.9, t.rythme === 'fa' ? 0.25 : 0, t.hvg * 0.3) : 1;
    const dilOD = t ? 1 + 0.5 * t.it : 1;
    const jit = i.fibrillation ? 1 + 0.012 * Math.sin(temps * 61) * Math.sin(temps * 37) : 1;
    og.group.scale.setScalar(dilOG * (1 - 0.1 * i.contractionA) * jit);
    od.group.scale.setScalar(dilOD * (1 - 0.1 * i.contractionA) * (i.fibrillation ? 1 + 0.012 * Math.sin(temps * 53) : 1));

    // Aorte : distension systolique, d'autant plus faible que l'aorte est rigide.
    const rig = t ? t.rigidite : 0.1;
    const dist = 1 + 0.035 * (1 - rig) * i.ouvertureSig;
    aorte.mat.color.copy(AO_SOUPLE).lerp(AO_RIGIDE, smooth(0.2, 0.9, rig));
    aorte.mesh.scale.set(dist, dist, dist);
    aorte.mesh.position.copy(P.ao).multiplyScalar(1 - dist);

    // Valves.
    const lesions = t ? { tri: [0, t.it], pu: [0, 0], mi: [t.rm, t.im], ao: [t.ra, t.ia] } : { tri: [0, 0], pu: [0, 0], mi: [0, 0], ao: [0, 0] };
    const ouvertures = [i.ouvertureAV, i.ouvertureSig, i.ouvertureAV, i.ouvertureSig];
    [lesions.tri, lesions.pu, lesions.mi, lesions.ao].forEach(([sten, fuite], k) => {
      const v = valves[k];
      const max = 1.25 * (1 - 0.72 * sten);
      const ferme = 0.42 * fuite;
      const ang = ferme + (max - ferme) * ouvertures[k];
      v.feuillets.forEach((f) => f.quaternion.setFromAxisAngle(f.userData.tangente, ang));
      v.calcif.visible = sten > 0.3;
      const cible = sten > 0.3 ? 0xe8c46a : fuite > 0.3 ? 0xf0a0b0 : 0xf5d6cf;
      v.mats.forEach((m) => m.color.setHex(cible));
      v.anneau.scale.setScalar(1);
    });

    // Sang.
    const posS = sang.geometry.attributes.position.array as Float32Array;
    const vit = 1.5 * clamp(debit, 0.4, 1.6);
    for (let k = 0; k < NS; k++) {
      const p = part[k], c = chemins[p.c];
      let v = vit;
      if (p.s < c.sAV && p.s > c.sAV - 0.035 && i.ouvertureAV < 0.5) v *= 0.03;
      if (p.s < c.sSig && p.s > c.sSig - 0.035 && i.ouvertureSig < 0.3) v *= 0.03;
      if (p.s > c.sSig && p.s < c.sSig + 0.2) v *= 0.6 + 1.6 * i.ouvertureSig + (c.bleu ? 0 : 2.2 * (t?.ra ?? 0) * i.ouvertureSig);
      if (p.s > c.sAV && p.s < c.sSig) v *= 0.75;
      p.s += (v * dt) / c.len;
      if (p.s >= 1) { p.s -= 1; }
      c.courbe.getPointAt(p.s, tmp);
      let r = rayonAu(c, p.s);
      if (!c.bleu && t && Math.abs(p.s - c.sSig) < 0.03) r *= 1 - 0.6 * t.ra;
      if (!c.bleu && t && Math.abs(p.s - c.sAV) < 0.03) r *= 1 - 0.6 * t.rm;
      posS[k * 3] = tmp.x + p.o.x * r; posS[k * 3 + 1] = tmp.y + p.o.y * r; posS[k * 3 + 2] = tmp.z + p.o.z * r;
    }
    sang.geometry.attributes.position.needsUpdate = true;

    // LDL.
    const nLdl = t ? Math.round(clamp((t.ldl - 2.2) / 2.8, 0, 1) * NL) : 0;
    const posL = ldl.geometry.attributes.position.array as Float32Array;
    for (let k = 0; k < NL; k++) {
      const p = partL[k], c = chemins[p.c];
      if (k >= nLdl) { posL[k * 3] = 1e5; continue; }
      p.s = (p.s + (vit * 0.8 * dt) / c.len) % 1;
      c.courbe.getPointAt(p.s, tmp);
      const r = rayonAu(c, p.s);
      posL[k * 3] = tmp.x + p.o.x * r; posL[k * 3 + 1] = tmp.y + p.o.y * r; posL[k * 3 + 2] = tmp.z + p.o.z * r;
    }
    ldl.geometry.attributes.position.needsUpdate = true;

    // Jets.
    if (t) {
      const systole = i.contractionV > 0.25 && i.phase !== 'remplissage';
      const diastole = i.phase === 'remplissage' || i.phase === 'isoRelaxation' || i.phase === 'auriculaire';
      const n = (s: number) => Math.random() < s * 3.2;
      const C_FUITE = new THREE.Color(0xff9a4a), C_STEN = new THREE.Color(0xfff0a0);
      if (t.im > 0.15 && systole) for (let k = 0; k < 3; k++) if (n(t.im)) emettre(P.mi, tmp2.copy(P.og).sub(P.mi), 2.2, 0.35, C_FUITE);
      if (t.ia > 0.15 && diastole) for (let k = 0; k < 3; k++) if (n(t.ia)) emettre(P.ao, tmp2.copy(vgC).sub(P.ao), 1.9, 0.3, C_FUITE);
      if (t.it > 0.15 && systole) for (let k = 0; k < 3; k++) if (n(t.it)) emettre(P.tri, tmp2.copy(P.od).sub(P.tri), 1.8, 0.35, new THREE.Color(0x9ab0ff));
      if (t.ra > 0.25 && i.ouvertureSig > 0.3) for (let k = 0; k < 4; k++) if (n(t.ra)) emettre(P.ao, V(-0.02, 1, 0.02), 3.4, 0.08, C_STEN, 0.4);
      if (t.rm > 0.25 && i.ouvertureAV > 0.5) for (let k = 0; k < 3; k++) if (n(t.rm)) emettre(P.mi, tmp2.copy(vgC).sub(P.mi), 2.4, 0.08, C_STEN, 0.38);
    }
    const posJ = jets.geometry.attributes.position.array as Float32Array;
    for (let k = 0; k < NJ; k++) {
      const q = pj[k];
      if (q.vie <= 0) { posJ[k * 3] = 1e5; continue; }
      q.vie -= dt; q.p.addScaledVector(q.v, dt);
      posJ[k * 3] = q.p.x; posJ[k * 3 + 1] = q.p.y; posJ[k * 3 + 2] = q.p.z;
    }
    jets.geometry.attributes.position.needsUpdate = true;

    // Fibrillation.
    fibr.visible = i.fibrillation;
    if (i.fibrillation) {
      const posF = fibr.geometry.attributes.position.array as Float32Array;
      for (let k = 0; k < NF; k++) {
        if (Math.random() < 0.35) {
          const c = k % 2 ? P.og : P.od, r = (k % 2 ? 0.56 * dilOG : 0.53 * dilOD);
          tmp.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.2).normalize().multiplyScalar(r).add(c);
          posF[k * 3] = tmp.x; posF[k * 3 + 1] = tmp.y; posF[k * 3 + 2] = tmp.z;
        }
      }
      fibr.geometry.attributes.position.needsUpdate = true;
    }

    // Onde électrique.
    const bav = t?.rythme === 'bav3';
    croix.visible = bav;
    if (i.onde >= 0) {
      etincelle.visible = true;
      etincelle.position.copy(cheminElec.getPointAt(clamp(bav ? Math.min(i.onde, 0.4) : i.onde, 0, 1)));
    } else etincelle.visible = false;

    // Coronaires.
    const posC = coro.geometry.attributes.position.array as Float32Array;
    const occl = t ? t.occlusion > 0.3 || (t.ischemie > 0.2 && t.plaqueCoro > 0.85) : false;
    const stenose = t ? t.plaqueCoro : 0;
    for (let k = 0; k < NC; k++) {
      let s = pc[k] + dt * 0.35 * (1 - 0.8 * stenose) * (0.6 + 0.8 * (1 - i.contractionV));
      if (occl && s > 0.31 && pc[k] <= 0.31) s = 0.31 - Math.random() * 0.02;
      if (s > 1) s = 0;
      pc[k] = s;
      courbeIVA.getPointAt(s, tmp);
      posC[k * 3] = tmp.x; posC[k * 3 + 1] = tmp.y; posC[k * 3 + 2] = tmp.z;
    }
    coro.geometry.attributes.position.needsUpdate = true;

    // Halos de lésion (pulsation).
    halos.forEach((h, k) => {
      const l = lesionsActives[k];
      h.visible = !!l && l.r > 0;
      if (!l || l.r <= 0) return;
      const pul = 1 + 0.18 * Math.sin(temps * 4 + k);
      h.position.copy(l.p); h.scale.setScalar(l.r * pul);
      (h.material as THREE.SpriteMaterial).color.setHex(l.c);
      (h.material as THREE.SpriteMaterial).opacity = 0.55 + 0.35 * Math.sin(temps * 4 + k) ** 2;
    });
    {
      const w = conteneur.clientWidth, hh = conteneur.clientHeight;
      etiqLesions.forEach((el, k) => {
        const l = lesionsActives[k];
        if (!l) { el.style.display = 'none'; return; }
        tmp.copy(l.p).project(camera);
        if (tmp.z > 1) { el.style.display = 'none'; return; }
        el.style.display = 'block';
        if (el.textContent !== l.nom) { el.textContent = l.nom; el.dataset.w = ''; }
        el.style.background = '#' + l.c.toString(16).padStart(6, '0');
        // L'étiquette reste dans le cadre (petits écrans) : on la décale vers la gauche si besoin.
        const lw = +(el.dataset.w ||= String(el.offsetWidth));
        const x = Math.max(4, Math.min(((tmp.x + 1) / 2) * w + 14, w - lw - 4));
        el.style.transform = `translate(${x}px, ${((1 - tmp.y) / 2) * hh - 10}px)`;
      });
    }

    // Étiquettes.
    if (etiquettes.length) {
      const w = conteneur.clientWidth, h = conteneur.clientHeight;
      // Noms des zones : on décale verticalement ceux qui se chevaucheraient.
      const places: { x: number; y: number; w: number; h: number }[] = [];
      const pos = etiquettes.map(({ z, el }) => {
        const a = ANCRES[z]; if (!a) return null;
        tmp.copy(a).project(camera);
        const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
        el.style.display = vis ? 'block' : 'none';
        if (!vis) return null;
        const lw = +(el.dataset.w ||= String(el.offsetWidth || 80)), lh = +(el.dataset.h ||= String(el.offsetHeight || 18));
        return { el, x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, w: lw, h: lh };
      }).filter((p): p is NonNullable<typeof p> => !!p).sort((p, q) => p.y - q.y);
      for (const p of pos) {
        let y = p.y;
        for (const d of [0, 1, -1, 2, -2, 3]) {
          const yy = p.y + d * (p.h + 2);
          if (!places.some((b) => Math.abs(b.x - p.x) < (b.w + p.w) / 2 + 2 && Math.abs(b.y - yy) < (b.h + p.h) / 2 + 1)) { y = yy; break; }
        }
        places.push({ x: p.x, y, w: p.w, h: p.h });
        p.el.style.transform = `translate(${p.x}px, ${y}px) translate(-50%, -50%)`;
      }
    }

    renderer.render(scene, camera);
  }

  function maj(e: Etat) {
    etat = e;
    const t = e.terrain;
    const r = (x: number) => Math.round(x * 25) / 25;
    const isch = Math.max(t.ischemie, t.occlusion * 0.6);
    const cle = { hvg: r(t.hvg), dil: r(t.dilatation), isch: r(isch), hypo: r(isch > 0.1 ? 0 : clamp((0.9 - e.perfusion.coeur) / 0.25, 0, 1)) };
    if (cle.hvg !== paramsVG.hvg || cle.dil !== paramsVG.dil || cle.isch !== paramsVG.isch || cle.hypo !== paramsVG.hypo) {
      construireVG(cle.hvg, cle.dil, cle.isch, cle.hypo); paramsVG = cle;
    }
    thrombus.visible = e.thrombusOG;
    plaque.visible = t.plaqueCoro > 0.08;
    plaque.scale.setScalar(0.6 + 1.6 * t.plaqueCoro);
    caillot.visible = t.occlusion > 0.3 || (t.ischemie > 0.2 && t.plaqueCoro > 0.85);
    const cp = new THREE.Color(0xd2484e).lerp(new THREE.Color(0xe8c070), t.plaqueCarotide * 0.6);
    carotides.forEach((c, k) => { if (k < 2) c.mat.color.copy(cp); });
    tubesCarotides.forEach((tb, k) => retrecir(tb, 0.42, 0.12, 0.75 * t.plaqueCarotide * (k === 0 ? 1 : 0.7)));
    plaquesCarotides.forEach((m, k) => { m.visible = t.plaqueCarotide > 0.15; m.scale.setScalar(0.8 + 1.4 * t.plaqueCarotide * (k === 0 ? 1 : 0.7)); });
    retrecir(tubeIVA, 0.3, 0.06, 0.8 * t.plaqueCoro);
    const L: { p: THREE.Vector3; r: number; c: number; nom: string }[] = [];
    const ORANGE = 0xffb03a, ROUGE = 0xff6b78, JAUNE = 0xffe066, VIOLET = 0xc9a7ff, BLEU = 0x8fb8ff;
    const valve = (st: number, fu: number) => (st > 0.25 && fu > 0.25 ? 'Rétrécie et fuit' : st > 0.25 ? 'Valve rétrécie' : 'Valve qui fuit');
    if (t.ra > 0.25 || t.ia > 0.25) L.push({ p: P.ao, r: 0.75, c: ORANGE, nom: valve(t.ra, t.ia) });
    if (t.rm > 0.25 || t.im > 0.25) L.push({ p: P.mi, r: 0.85, c: ORANGE, nom: valve(t.rm, t.im) });
    if (t.it > 0.25) L.push({ p: P.tri, r: 0.85, c: ORANGE, nom: 'Valve qui fuit' });
    if (t.plaqueCoro > 0.15) L.push({ p: courbeIVA.getPointAt(0.3), r: 0.45, c: t.plaqueCoro > 0.85 ? ROUGE : JAUNE, nom: t.plaqueCoro > 0.85 ? 'Artère bouchée' : 'Plaque' });
    if (t.plaqueCarotide > 0.15) L.push({ p: carotides[0].courbe.getPointAt(0.42), r: 0.45, c: JAUNE, nom: 'Carotide rétrécie' });
    if (e.thrombusOG) L.push({ p: P.auricule, r: 0.5, c: ROUGE, nom: 'Caillot' });
    // Nécrose et ischémie : montrées par la couleur du muscle, sans halo (étiquette seule).
    if (t.ischemie > 0.1) L.push({ p: necCentre, r: 0, c: ROUGE, nom: 'Nécrose : muscle mort (gris violacé)' });
    else if (cle.hypo > 0.1) L.push({ p: necCentre, r: 0, c: VIOLET, nom: 'Manque d\'oxygène (angor)' });
    else if (e.fe < 0.42) L.push({ p: V(0.75, -0.35, 0.35), r: 0.9, c: BLEU, nom: 'Contraction faible' });
    if (e.postcharge > 1.25) L.push({ p: V(0.45, 2.05, -0.3), r: 0.7, c: ORANGE, nom: 'Post-charge ↑ : le cœur force' });
    if (t.hvg > 0.35) L.push({ p: V(0.95, -0.6, -0.1), r: 0.7, c: VIOLET, nom: 'Paroi épaissie' });
    if (t.rythme === 'bav3') L.push({ p: P.av, r: 0.5, c: ROUGE, nom: 'Bloc : rythme lent' });
    if (t.rythme === 'fa') L.push({ p: P.og.clone().add(V(0, 0.45, 0)), r: 0.6, c: JAUNE, nom: 'Fibrillation' });
    // Effets des traitements : étiquettes vertes, sans halo.
    const VERT = 0x6ee7b7, fx = effetsVisibles(e);
    if (fx.anticoagulant) L.push({ p: P.auricule, r: 0, c: VERT, nom: 'Anticoagulant : plus de caillot' });
    if (fx.statine && t.plaqueCoro > 0.15) L.push({ p: courbeIVA.getPointAt(0.5), r: 0, c: VERT, nom: 'Statine : plaque stabilisée' });
    if (fx.bradycardie) L.push({ p: P.sa, r: 0, c: VERT, nom: `Bêtabloquant : ${e.fc}/min` });
    if (fx.vasodilatation && e.postcharge <= 1.25) L.push({ p: V(0.45, 2.05, -0.3), r: 0, c: VERT, nom: 'Post-charge ↓ : le cœur force moins' });
    lesionsActives = L.slice(0, halos.length);
  }

  function setCoupe(c: Coupe, pos: number) {
    const avant = coupeActive;
    coupeActive = c !== 'aucune';
    if (c === 'frontale') plan.set(V(0, 0, -1), 0.05 + pos);
    if (avant !== coupeActive) for (const m of clippables) { m.clippingPlanes = coupeActive ? [plan] : []; m.needsUpdate = true; }
  }

  function focus(z: ZoneId | null) {
    if (!z || !ANCRES[z]) return;
    const a = ANCRES[z]!.clone();
    const d = DISTANCE[z] ?? 3.4;
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (INTERNES.includes(z)) dir.set(0.15, 0.2, 1).normalize();
    allerVers(a.clone().add(dir.multiplyScalar(d)), a);
  }

  return {
    frame, maj, setCoupe, focus,
    setOpacite(a) { opacite = a; appliquerOpacite(); },
    setDureeTween(d) { dureeTween = d; },
    setInteraction(rotation) { controls.enableRotate = rotation; controls.enablePan = rotation; },
    selection(z) { choisi = z; surbrillance(); appliquerOpacite(); },
    setEtiquettes(on, noms) {
      calque.innerHTML = ''; etiquettes = [];
      if (!on) return;
      for (const [z, nom] of Object.entries(noms) as [ZoneId, string][]) {
        if (!ANCRES[z]) continue;
        const el = document.createElement('div');
        el.textContent = nom;
        el.style.cssText = 'position:absolute;left:0;top:0;font:600 11px "Plus Jakarta Sans",system-ui;color:#fff;background:rgba(7,10,18,.72);border:1px solid rgba(255,255,255,.18);padding:2px 7px;border-radius:999px;white-space:nowrap;will-change:transform';
        calque.appendChild(el); etiquettes.push({ z, el });
      }
    },
    vueInitiale() { allerVers(CAM0.clone(), CIBLE0.clone()); },
    setDefinition(pr) {
      defImposee = pr;
      renderer.setPixelRatio(pr ?? prActuel);
      renderer.setSize(conteneur.clientWidth, conteneur.clientHeight, false);
    },
    dispose() {
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      envTex.dispose(); pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove(); calque.remove(); calqueLesions.remove();
    },
  };
}
