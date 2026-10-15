// Tres planetas (botones 3D) que suenan al tocarlos.
// Los sonidos se generan por código con la Web Audio API: no hay archivos de audio.
//
// Uso (ver index.html):
//   const planets = setupSoundPlanets(player);   // después de player.load()
//   planets.unlockAudio();                       // dentro de un clic del usuario
//
// Los planetas se agregan dentro de "ARContent", así que aparecen sobre el
// marcador junto al parallax. El MindARController ya hace raycast al tocar la
// pantalla y llama a obj.onClick() del objeto tocado.

import * as THREE from './three.module.js';

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

let audioCtx = null;
let master = null;

function getAudio() {
	if (!audioCtx) {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		audioCtx = new Ctx();
		master = audioCtx.createGain();
		master.gain.value = 0.8;
		master.connect(audioCtx.destination);
	}
	if (audioCtx.state === 'suspended') audioCtx.resume();
	return audioCtx;
}

// Eco simple (delay con realimentación) para dar sensación de espacio.
function makeEcho(ctx, time = 0.25, feedback = 0.4, wet = 0.5) {
	const input = ctx.createGain();
	const delay = ctx.createDelay(2);
	const fb = ctx.createGain();
	const wetGain = ctx.createGain();
	delay.delayTime.value = time;
	fb.gain.value = feedback;
	wetGain.gain.value = wet;
	input.connect(master);
	input.connect(delay);
	delay.connect(fb);
	fb.connect(delay);
	delay.connect(wetGain);
	wetGain.connect(master);
	return input;
}

function envelope(gain, t, attack, peak, decay) {
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

// 1) Marte: "ping" de sonar/radar con eco.
function soundSonar() {
	const ctx = getAudio();
	const t = ctx.currentTime;
	const out = makeEcho(ctx, 0.32, 0.45, 0.6);
	const osc = ctx.createOscillator();
	const g = ctx.createGain();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(1180, t);
	osc.frequency.exponentialRampToValueAtTime(880, t + 0.9);
	envelope(g, t, 0.01, 0.7, 1.1);
	osc.connect(g).connect(out);
	osc.start(t);
	osc.stop(t + 1.2);
}

// 2) Neptuno: disparo láser de ciencia ficción (barrido descendente).
function soundLaser() {
	const ctx = getAudio();
	const t = ctx.currentTime;
	const out = makeEcho(ctx, 0.12, 0.3, 0.35);
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(4000, t);
	filter.frequency.exponentialRampToValueAtTime(400, t + 0.45);
	filter.connect(out);

	[0, 7].forEach((detune) => {
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = 'sawtooth';
		osc.detune.value = detune;
		osc.frequency.setValueAtTime(1600, t);
		osc.frequency.exponentialRampToValueAtTime(90, t + 0.45);
		envelope(g, t, 0.005, 0.3, 0.45);
		osc.connect(g).connect(filter);
		osc.start(t);
		osc.stop(t + 0.5);
	});
}

// 3) Saturno: campanitas cósmicas (arpegio brillante).
function soundChime() {
	const ctx = getAudio();
	const t = ctx.currentTime;
	const out = makeEcho(ctx, 0.18, 0.5, 0.5);
	const notes = [1046.5, 1318.5, 1568.0, 2093.0]; // Do6 Mi6 Sol6 Do7
	notes.forEach((f, i) => {
		const start = t + i * 0.09;
		[1, 2.01].forEach((mult, k) => {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = k === 0 ? 'sine' : 'triangle';
			osc.frequency.value = f * mult;
			envelope(g, start, 0.005, k === 0 ? 0.35 : 0.08, 1.0);
			osc.connect(g).connect(out);
			osc.start(start);
			osc.stop(start + 1.1);
		});
	});
}

// ---------------------------------------------------------------------------
// Texturas generadas con canvas (sin imágenes externas)
// ---------------------------------------------------------------------------

function rand(seed) {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

function planetTexture(kind) {
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 128;
	const g = c.getContext('2d');
	const r = rand(kind === 'mars' ? 7 : kind === 'neptune' ? 13 : 29);

	if (kind === 'mars') {
		g.fillStyle = '#c1440e';
		g.fillRect(0, 0, 256, 128);
		for (let i = 0; i < 70; i++) {
			g.fillStyle = r() > 0.5 ? 'rgba(120,30,10,0.45)' : 'rgba(230,120,60,0.35)';
			g.beginPath();
			g.ellipse(r() * 256, r() * 128, 6 + r() * 26, 3 + r() * 12, r() * 3, 0, Math.PI * 2);
			g.fill();
		}
		g.fillStyle = 'rgba(255,240,230,0.85)'; // casquetes polares
		g.fillRect(0, 0, 256, 7);
		g.fillRect(0, 121, 256, 7);
	} else if (kind === 'neptune') {
		const grad = g.createLinearGradient(0, 0, 0, 128);
		grad.addColorStop(0, '#2a4fd6');
		grad.addColorStop(0.5, '#3f8cff');
		grad.addColorStop(1, '#1d3aa8');
		g.fillStyle = grad;
		g.fillRect(0, 0, 256, 128);
		for (let i = 0; i < 14; i++) {
			g.fillStyle = `rgba(${r() > 0.5 ? '160,210,255' : '20,40,140'},0.35)`;
			g.fillRect(0, r() * 128, 256, 2 + r() * 6);
		}
		g.fillStyle = 'rgba(15,25,90,0.7)'; // gran mancha oscura
		g.beginPath();
		g.ellipse(170, 70, 22, 11, 0, 0, Math.PI * 2);
		g.fill();
	} else {
		const cols = ['#e9c77b', '#d9a95b', '#f3dca2', '#c99245', '#ecd08e'];
		for (let y = 0; y < 128; y += 8) {
			g.fillStyle = cols[Math.floor(r() * cols.length)];
			g.fillRect(0, y, 256, 8);
		}
	}

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

function ringTexture() {
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 4;
	const g = c.getContext('2d');
	const grad = g.createLinearGradient(0, 0, 256, 0);
	grad.addColorStop(0, 'rgba(230,200,140,0.0)');
	grad.addColorStop(0.15, 'rgba(230,200,140,0.9)');
	grad.addColorStop(0.45, 'rgba(180,150,100,0.5)');
	grad.addColorStop(0.55, 'rgba(240,215,160,0.95)');
	grad.addColorStop(1, 'rgba(230,200,140,0.0)');
	g.fillStyle = grad;
	g.fillRect(0, 0, 256, 4);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

// ---------------------------------------------------------------------------
// Planetas
// ---------------------------------------------------------------------------

const PLANETS = [
	{ name: 'Marte', kind: 'mars', glow: 0xff3b1f, sound: soundSonar, label: 'Marte · sonar' },
	{ name: 'Neptuno', kind: 'neptune', glow: 0x3f8cff, sound: soundLaser, label: 'Neptuno · láser' },
	{ name: 'Saturno', kind: 'saturn', glow: 0xffc65c, sound: soundChime, label: 'Saturno · campanas' },
];

// Posiciones en coordenadas del editor (Y arriba, marcador en el plano XZ,
// centrado en el origen, 1.729 de ancho x 1 de alto; +Z = borde inferior de
// la imagen). Flotan por encima del borde inferior del marcador.
const RADIUS = 0.13;
const POSITIONS = [
	new THREE.Vector3(-0.5, 0.22, 0.6),
	new THREE.Vector3(0.0, 0.22, 0.6),
	new THREE.Vector3(0.5, 0.22, 0.6),
];

function createPlanet(def, index) {
	const group = new THREE.Group();
	group.name = def.name;
	group.position.copy(POSITIONS[index]);

	const body = new THREE.Mesh(
		new THREE.SphereGeometry(RADIUS, 48, 32),
		new THREE.MeshStandardMaterial({
			map: planetTexture(def.kind),
			emissive: new THREE.Color(def.glow),
			emissiveIntensity: 0.25,
			roughness: 0.8,
			metalness: 0.0,
		})
	);
	body.name = def.name + '_esfera';
	group.add(body);

	if (def.kind === 'saturn') {
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(RADIUS * 1.3, RADIUS * 2.0, 64),
			new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false })
		);
		// Mapear la textura radialmente (u = distancia al centro).
		const pos = ring.geometry.attributes.position;
		const uv = ring.geometry.attributes.uv;
		for (let i = 0; i < pos.count; i++) {
			const d = Math.hypot(pos.getX(i), pos.getY(i));
			uv.setXY(i, (d - RADIUS * 1.3) / (RADIUS * 0.7), 0.5);
		}
		ring.rotation.x = -Math.PI / 2 + 0.45;
		ring.name = 'Saturno_anillo';
		group.add(ring);
	}

	// Zona de toque más grande e invisible, para que sea fácil darle en el celular.
	const hit = new THREE.Mesh(
		new THREE.SphereGeometry(RADIUS * 1.8, 12, 8),
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
	);
	hit.name = def.name + '_zona';
	group.add(hit);

	group.userData = { body, baseY: group.position.y, phase: index * 2.1, pulse: 0 };

	group.onClick = () => {
		def.sound();
		group.userData.pulse = 1;
		showToast('🔊 ' + def.label);
		(window.__soundLog = window.__soundLog || []).push(def.name);
	};

	return group;
}

// ---------------------------------------------------------------------------
// Interfaz: pista y aviso del sonido
// ---------------------------------------------------------------------------

let hintEl = null;
let toastEl = null;
let toastTimer = null;

function ensureUI() {
	if (hintEl) return;
	hintEl = document.createElement('div');
	hintEl.id = 'planet-hint';
	hintEl.textContent = 'Toca un planeta para escucharlo';
	document.body.appendChild(hintEl);

	toastEl = document.createElement('div');
	toastEl.id = 'planet-toast';
	document.body.appendChild(toastEl);
}

function showToast(text) {
	ensureUI();
	toastEl.textContent = text;
	toastEl.classList.add('visible');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 1200);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function setupSoundPlanets(player) {
	const arContent = player.scene.getObjectByName('ARContent');
	if (!arContent) {
		console.warn('setupSoundPlanets: no se encontró "ARContent" en la escena.');
		return null;
	}

	const root = new THREE.Group();
	root.name = 'SoundPlanets';
	const planets = PLANETS.map(createPlanet);
	planets.forEach((p) => root.add(p));
	arContent.add(root);
	window.soundPlanets = planets;

	// Animación: flotar, girar y "latir" al tocarlos.
	let last = performance.now();
	const animate = (now = performance.now()) => {
		requestAnimationFrame(animate);
		const dt = Math.min((now - last) / 1000, 0.1);
		last = now;
		const t = now / 1000;
		for (const p of planets) {
			const u = p.userData;
			p.position.y = u.baseY + Math.sin(t * 1.6 + u.phase) * 0.03;
			u.body.rotation.y += dt * 0.6;
			u.pulse = Math.max(0, u.pulse - dt * 2.5);
			const s = 1 + Math.sin(u.pulse * Math.PI) * 0.35;
			p.scale.setScalar(s);
			u.body.material.emissiveIntensity = 0.25 + u.pulse * 1.2;
		}
	};
	animate();

	return {
		planets,
		// Llamar dentro de un clic/toque: los navegadores solo permiten audio
		// después de un gesto del usuario.
		unlockAudio() {
			const ctx = getAudio();
			// Sonido mudo de 1 muestra para desbloquear el audio en iOS.
			const buf = ctx.createBuffer(1, 1, 22050);
			const src = ctx.createBufferSource();
			src.buffer = buf;
			src.connect(ctx.destination);
			src.start(0);
		},
		showHint(visible) {
			ensureUI();
			hintEl.classList.toggle('visible', visible);
		},
	};
}
