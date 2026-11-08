import * as THREE from 'three';

/**
 * VoiceBlob — the 3D presence of Nexus.
 * A noise-displaced sphere that ripples with speech amplitude.
 * It lives on a full-screen fixed canvas and can fly to any DOM slot
 * (hero position on load, the dock orb once the visitor scrolls).
 */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertex = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uListen;
varying vec3 vN; varying vec3 vV; varying float vD;
${NOISE}
float disp(vec3 p){
  float slow = snoise(p*0.9 + vec3(uTime*0.16));
  float voice = snoise(p*1.8 + vec3(0.0, uTime*1.4, uTime*0.8));
  float fine = snoise(p*3.2 + vec3(uTime*2.0));
  return slow*0.13 + voice*(0.02 + uAmp*0.20) + fine*uAmp*0.035 + uListen*0.035*sin(p.y*6.0 - uTime*4.0);
}
void main(){
  vec3 p = position;
  float d = disp(normalize(p));
  vec3 np = p + normal*d;
  // recompute normal by finite differences on the sphere
  vec3 t1 = normalize(cross(normal, vec3(0.0,1.0,0.0)+vec3(0.001)));
  vec3 t2 = normalize(cross(normal, t1));
  float e = 0.02;
  vec3 a = normalize(p + t1*e); vec3 b = normalize(p + t2*e);
  vec3 pa = a*length(p) + a*disp(a); vec3 pb = b*length(p) + b*disp(b);
  vec3 n = normalize(cross(pa-np, pb-np));
  if(dot(n, normal) < 0.0) n = -n;
  vD = d;
  vec4 mv = modelViewMatrix*vec4(np,1.0);
  vN = normalize(normalMatrix*n); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uLight; uniform vec3 uListenCol;
uniform float uListen; uniform float uAmp;
varying vec3 vN; varying vec3 vV; varying float vD;
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(vV);
  float ndv = max(dot(n,v),0.0);
  float fres = pow(1.0 - ndv, 2.2);
  float rim = pow(1.0 - ndv, 2.0);
  vec3 L = normalize(vec3(-0.5, 0.75, 0.55));
  float diff = max(dot(n,L),0.0);
  float spec = pow(max(dot(reflect(-L,n), v),0.0), 40.0);
  // glassy cobalt: deep core, lighter crests, pale rim, soft specular
  float crest = smoothstep(-0.15, 0.22, vD);
  vec3 base = mix(uDeep, uMid, clamp(crest*0.45 + diff*0.65 - 0.1, 0.0, 1.0));
  base = mix(base, uListenCol, uListen*0.6*(0.35+fres));
  vec3 col = mix(base, uLight, rim*(0.85 + uAmp*0.1));
  col += vec3(1.0)*spec*0.5;
  // subsurface-like glow from the core
  col += uMid*0.22*pow(ndv, 3.0);
  // faint violet-to-cyan sheen across the rim
  col += mix(vec3(0.45,0.3,1.0), vec3(0.3,0.8,1.0), 0.5+0.5*n.x)*0.12*smoothstep(0.3,1.0,fres);
  gl_FragColor = vec4(col, 1.0);
}`;

/** hex taken as-is (no sRGB→linear conversion) since the shader writes colours directly */
const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

export type BlobMode = 'idle' | 'speaking' | 'listening';

export class VoiceBlob {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  /** screen-space target (CSS px) the blob centre and radius should occupy */
  target = { x: 0, y: 0, r: 100 };
  private cur = { x: 0, y: 0, r: 0 };
  private amp = 0;
  private listen = 0;
  private seeded = false;

  constructor(canvas: HTMLCanvasElement, opts: { mobile: boolean }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.mobile ? 1.75 : 2));
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.camera.position.set(0, 0, 10);
    const detail = opts.mobile ? 48 : 80;
    const geo = new THREE.IcosahedronGeometry(1, detail);
    this.uniforms = {
      uTime: { value: 0 }, uAmp: { value: 0 }, uListen: { value: 0 },
      uDeep: { value: raw(0x1326C9) },
      uMid: { value: raw(0x5B7BFF) },
      uLight: { value: raw(0xEEF2FF) },
      uListenCol: { value: raw(0x12B3A0) },
    };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: this.uniforms }));
    this.scene.add(this.mesh);
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** world units per CSS pixel on the z=0 plane */
  private unitsPerPx() {
    const h = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    return h / window.innerHeight;
  }

  /**
   * Advance one frame. `time` in seconds, `amp` 0..1 speech level, `mode` who is talking.
   * `dt` lets the demo recorder step deterministically.
   */
  frame(time: number, dt: number, amp: number, mode: BlobMode) {
    const k = 1 - Math.pow(0.0008, dt); // frame-rate independent smoothing
    this.amp += ((mode === 'idle' ? 0 : amp) - this.amp) * Math.min(1, k * 1.6);
    this.listen += ((mode === 'listening' ? 1 : 0) - this.listen) * k;
    if (!this.seeded) { this.cur = { ...this.target, r: 0 }; this.seeded = true; }
    const f = Math.min(1, k * 0.9);
    this.cur.x += (this.target.x - this.cur.x) * f;
    this.cur.y += (this.target.y - this.cur.y) * f;
    this.cur.r += (this.target.r - this.cur.r) * f;

    const u = this.unitsPerPx();
    this.mesh.position.set((this.cur.x - window.innerWidth / 2) * u, -(this.cur.y - window.innerHeight / 2) * u, 0);
    const s = this.cur.r * u * (1 + this.amp * 0.06);
    this.mesh.scale.setScalar(Math.max(s, 0.0001));
    this.mesh.rotation.y = time * 0.15;
    this.mesh.rotation.x = Math.sin(time * 0.2) * 0.2;
    this.uniforms.uTime.value = time;
    this.uniforms.uAmp.value = this.amp;
    this.uniforms.uListen.value = this.listen;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() { this.renderer.dispose(); }
}
