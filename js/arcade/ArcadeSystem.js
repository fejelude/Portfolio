import * as THREE from 'three';
import { TimeEngine } from './TimeEngine.js';
import { EarthRenderer } from './EarthRenderer.js';
import { CameraDirector } from './CameraDirector.js';
import { OrbitalEarthSimulation } from './OrbitalEarthSimulation.js';
import { SolarSystemSimulation } from './SolarSystemSimulation.js';

const SIMULATION_META = {
  orbital: {
    title: 'ORBITAL EARTH',
    subtitle: 'Live ISS telemetry, refined Earth rendering, and cinematic orbit control.'
  },
  solar: {
    title: 'SOLAR SYSTEM EXPLORER',
    subtitle: 'Expanded celestial architecture built outward from Orbital Earth.'
  }
};

export class ArcadeSystem {
  constructor() {
    this.container = document.getElementById('sim-canvas');
    if (!this.container) {
      throw new Error('ArcadeSystem: #sim-canvas not found.');
    }

    this.timeEngine = new TimeEngine();
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020712, 0.0011);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 2400);
    this.camera.position.set(0, 10, 32);

    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onLoad = () => {
      const overlay = document.getElementById('loading-overlay');
      if (!overlay) return;
      overlay.classList.add('hidden');
      window.setTimeout(() => {
        overlay.style.display = 'none';
      }, 450);
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(max-width: 767px)').matches ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.activeSimKey = null;
    this.activeSim = null;
    this.isTransitioning = false;

    this.earthRenderer = new EarthRenderer(this.scene, this.loadingManager);
    this.cameraDirector = new CameraDirector(this.camera, this.renderer.domElement);
    this.globalSunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.globalSunLight.position.set(30, 8, 20);
    this.scene.add(this.globalSunLight);
    this.globalAmbientLight = new THREE.HemisphereLight(0x8fb7ff, 0x020712, 0.32);
    this.scene.add(this.globalAmbientLight);

    this.starfield = this.createStars();

    this.simulations = {
      orbital: new OrbitalEarthSimulation(this),
      solar: new SolarSystemSimulation(this)
    };

    this.ui = {
      hub: document.getElementById('arcade-hub-ui'),
      sim: document.getElementById('simulation-ui'),
      title: document.getElementById('sim-title'),
      subtitle: document.getElementById('sim-subtitle')
    };

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    this.attachUI();
    window.addEventListener('resize', this.handleResize, { passive: true });

    const params = new URLSearchParams(window.location.search);
    const requestedSimulation = params.get('sim');
    if (requestedSimulation && this.simulations[requestedSimulation]) {
      this.launchSimulation(requestedSimulation);
    } else {
      this.enterHub();
    }

    this.animate();
  }

  createStars() {
    const geometry = new THREE.BufferGeometry();
    const count = 4500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const stride = index * 3;
      positions[stride] = (Math.random() - 0.5) * 1800;
      positions[stride + 1] = (Math.random() - 0.5) * 1200;
      positions[stride + 2] = (Math.random() - 0.5) * 1800;

      const intensity = 0.6 + Math.random() * 0.4;
      colors[stride] = intensity;
      colors[stride + 1] = intensity;
      colors[stride + 2] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: window.matchMedia('(max-width: 767px)').matches ? 0.85 : 1.05,
      transparent: true,
      opacity: 0.92,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
    return stars;
  }

  attachUI() {
    document.querySelectorAll('.hub-card').forEach((card) => {
      const launch = () => this.launchSimulation(card.dataset.sim);
      card.addEventListener('click', launch);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          launch();
        }
      });
    });

    document.getElementById('btn-exit-arcade')?.addEventListener('click', () => this.enterHub());
    document.querySelectorAll('[data-sim-target]').forEach((button) => {
      button.addEventListener('click', () => this.launchSimulation(button.getAttribute('data-sim-target')));
    });
  }

  setUIState({ showHub, simulationKey = null } = {}) {
    this.ui.hub?.classList.toggle('hidden', !showHub);
    this.ui.sim?.classList.toggle('hidden', showHub);

    document.querySelectorAll('[data-sim-target]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-sim-target') === simulationKey);
    });

    if (simulationKey && SIMULATION_META[simulationKey]) {
      this.ui.title.textContent = SIMULATION_META[simulationKey].title;
      this.ui.subtitle.textContent = SIMULATION_META[simulationKey].subtitle;
    }
  }

  enterHub() {
    if (this.activeSim) {
      this.activeSim.unmount();
      this.activeSim = null;
      this.activeSimKey = null;
    }

    this.earthRenderer.group.visible = true;
    if (this.globalSunLight) this.globalSunLight.visible = true;

    this.setUIState({ showHub: true });
    this.cameraDirector.setMode('FREE');
    this.cameraDirector.flyTo(new THREE.Vector3(0, 10, 32), new THREE.Vector3(0, 0, 0));
  }

  launchSimulation(key) {
    if (!this.simulations[key] || this.activeSimKey === key || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;

    if (this.activeSim) {
      this.activeSim.unmount();
    }

    this.activeSimKey = key;
    this.activeSim = this.simulations[key];
    this.setUIState({ showHub: false, simulationKey: key });
    this.activeSim.mount();

    const url = new URL(window.location.href);
    url.searchParams.set('sim', key);
    window.history.replaceState({}, '', url);

    window.setTimeout(() => {
      this.isTransitioning = false;
    }, 150);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(max-width: 767px)').matches ? 1.5 : 2));
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta() * 60;
    const now = this.timeEngine.getUTCTime();
    const gmst = this.timeEngine.getGMST(now);
    const sunPos = this.timeEngine.getSunPosition(now);

    if (sunPos) {
      this.globalSunLight.position.set(sunPos.x * 50, sunPos.y * 50, sunPos.z * 50);
    }

    this.starfield.rotation.y += 0.00004 * delta;
    this.earthRenderer.update({ sunPos, gmst, delta });

    if (!this.activeSim) {
      this.earthRenderer.group.rotation.y += 0.00055 * delta;
    }

    if (this.activeSim) {
      this.activeSim.update(now, delta);
    }

    this.cameraDirector.update();
    this.renderer.render(this.scene, this.camera);
  }
}
