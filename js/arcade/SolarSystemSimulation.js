import * as THREE from 'three';
import { CelestialBodyRenderer } from './CelestialBodyRenderer.js';

const BODY_DEFINITIONS = [
  { name: 'Sun', radius: 18, distance: 0, color: 0xfbbf24, emissiveIntensity: 2.4, orbitSpeed: 0, rotationSpeed: 0.003, isSun: true, summary: 'The luminous anchor of the simulation and the main local light source.' },
  { name: 'Mercury', radius: 1.2, distance: 34, color: 0x94a3b8, orbitColor: 0x475569, orbitSpeed: 0.032, rotationSpeed: 0.009, summary: 'Fast inner-world orbit with compact scale and high contrast shading.' },
  { name: 'Venus', radius: 2.5, distance: 52, color: 0xf5d08d, orbitColor: 0x8b6b42, orbitSpeed: 0.022, rotationSpeed: 0.005, summary: 'Warm atmospheric tone with a slower cinematic orbital cadence.' },
  { name: 'Earth', radius: 3.4, distance: 74, color: 0xffffff, orbitColor: 0x2563eb, orbitSpeed: 0.016, rotationSpeed: 0.02, textureUrl: 'assets/textures/earth-blue-marble.jpg', summary: 'The same premium Earth palette extended into heliocentric context.' },
  { name: 'Mars', radius: 1.8, distance: 98, color: 0xfb7185, orbitColor: 0x9a3412, orbitSpeed: 0.013, rotationSpeed: 0.016, summary: 'A stylized red-world readout focused on recognizable silhouette and orbit legibility.' },
  { name: 'Jupiter', radius: 8, distance: 146, color: 0xe7c7a2, orbitColor: 0x7c5a42, orbitSpeed: 0.008, rotationSpeed: 0.032, summary: 'Expanded giant-planet presentation with a broader camera offset for readability.' },
  { name: 'Saturn', radius: 6.8, distance: 196, color: 0xf1d7ab, orbitColor: 0x8c6d50, orbitSpeed: 0.005, rotationSpeed: 0.029, ring: { innerRadius: 9.2, outerRadius: 13.4, color: 0xf8e7c7 }, summary: 'Signature ring system rendered as a premium focal body.' },
  { name: 'Uranus', radius: 4.6, distance: 246, color: 0x93c5fd, orbitColor: 0x1d4ed8, orbitSpeed: 0.0036, rotationSpeed: 0.022, summary: 'Cool, distant palette and restrained motion for clean deep-space composition.' },
  { name: 'Neptune', radius: 4.3, distance: 294, color: 0x60a5fa, orbitColor: 0x1e3a8a, orbitSpeed: 0.0028, rotationSpeed: 0.024, summary: 'Outer-world framing with a darker blue read for contrast against the starfield.' }
];

export class SolarSystemSimulation {
  constructor(system) {
    this.system = system;
    this.scene = system.scene;
    this.cameraDirector = system.cameraDirector;
    this.isMounted = false;
    this.boundEvents = [];

    this.baseGroup = new THREE.Group();
    this.baseGroup.visible = false;
    this.scene.add(this.baseGroup);

    this.bodies = BODY_DEFINITIONS.map((definition) => ({
      definition,
      renderer: new CelestialBodyRenderer(this.baseGroup, definition, system.loadingManager)
    }));

    const earthRenderer = this.bodies.find((body) => body.definition.name === 'Earth')?.renderer;
    this.moon = new CelestialBodyRenderer(earthRenderer.group, {
      name: 'Moon',
      radius: 0.82,
      distance: 8,
      color: 0xe5e7eb,
      orbitColor: 0x94a3b8,
      orbitSpeed: 0.038,
      rotationSpeed: 0.008,
      tilt: 0.04,
      summary: 'Earth companion orbiting inside the larger heliocentric composition.'
    }, system.loadingManager);

    this.sunLight = new THREE.PointLight(0xfff1bf, 5, 2000, 1.5);
    this.sunLight.castShadow = true;
    this.baseGroup.add(this.sunLight);
    this.baseGroup.add(new THREE.AmbientLight(0xffffff, 0.15));
    this.sunLight.position.set(0, 0, 0);

    this.selectedBodyName = 'Overview';
  }

  mount() {
    if (this.isMounted) return;
    this.isMounted = true;
    this.baseGroup.visible = true;
    this.system.earthRenderer.group.visible = false;
    if (this.system.globalSunLight) this.system.globalSunLight.visible = false;

    this.injectUI();
    this.bindEvents();
    this.focusOverview();
  }

  injectUI() {
    const uiLayer = document.getElementById('sim-controls-slot');
    if (!uiLayer) return;

    const bodyNames = ['Overview', ...this.bodies.map(({ definition }) => definition.name), 'Moon'];
    const buttons = bodyNames
      .map((name) => `<button class="btn-control ${name === 'Overview' ? 'is-active' : ''}" type="button" data-target-body="${name}">${name}</button>`)
      .join('');

    uiLayer.innerHTML = `
      <div id="solar-ui-container" class="sim-panel-stack">
        <section class="hud-panel hud-top-left">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Solar</div>
              <h2>Solar System Explorer</h2>
            </div>
          </div>
          <div class="panel-facts">
            <div class="data-card"><span class="data-label">Light</span><strong>Sun Core</strong></div>
            <div class="data-card"><span class="data-label">Bodies</span><strong>${this.bodies.length + 1}</strong></div>
            <div class="data-card"><span class="data-label">Mode</span><strong id="solar-mode-label">Overview</strong></div>
            <div class="data-card"><span class="data-label">Scale</span><strong>Cinematic</strong></div>
          </div>
        </section>

        <section class="hud-panel hud-top-right">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Focus</div>
              <h3 id="solar-body-title">Overview</h3>
            </div>
          </div>
          <p class="panel-description" id="solar-body-summary">Select a body to reframe the camera.</p>
        </section>

        <section class="hud-panel solar-selector">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Bodies</div>
              <h3>Choose</h3>
            </div>
          </div>
          <div class="selector-grid horizontal-scroll-mobile">${buttons}</div>
        </section>
      </div>
    `;
  }

  bindEvents() {
    document.querySelectorAll('[data-target-body]').forEach((button) => {
      const handler = () => this.focusBody(button.getAttribute('data-target-body'));
      button.addEventListener('click', handler);
      this.boundEvents.push({ element: button, event: 'click', handler });
    });

  }

  focusOverview() {
    this.selectedBodyName = 'Overview';
    this.cameraDirector.setMode('FREE');
    this.cameraDirector.flyTo(new THREE.Vector3(0, 110, 330), new THREE.Vector3(0, 0, 0));
    this.syncSelectionState();
    this.updateInfoPanel('Overview', 'Select a body to inspect orbit spacing and scale.');
  }

  focusBody(name) {
    if (name === 'Overview') {
      this.focusOverview();
      return;
    }

    this.selectedBodyName = name;
    const target = name === 'Moon'
      ? { definition: { name: 'Moon', summary: 'Earth companion orbiting within the larger solar composition.' }, renderer: this.moon }
      : this.bodies.find((body) => body.definition.name === name);

    if (!target) return;

    this.cameraDirector.setMode('FOCUS', target.renderer);
    this.updateInfoPanel(target.definition.name, target.definition.summary);
    this.syncSelectionState();

    const modeLabel = document.getElementById('solar-mode-label');
    if (modeLabel) modeLabel.textContent = target.definition.name;
  }

  syncSelectionState() {
    document.querySelectorAll('[data-target-body]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-target-body') === this.selectedBodyName);
    });
  }

  updateInfoPanel(title, summary) {
    const titleElement = document.getElementById('solar-body-title');
    const summaryElement = document.getElementById('solar-body-summary');
    if (titleElement) titleElement.textContent = title;
    if (summaryElement) summaryElement.textContent = summary;
  }

  unmount() {
    if (!this.isMounted) return;
    this.isMounted = false;
    this.boundEvents.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.boundEvents = [];

    this.baseGroup.visible = false;
    this.system.earthRenderer.group.visible = true;
    if (this.system.globalSunLight) this.system.globalSunLight.visible = true;
    this.cameraDirector.setMode('FREE');

    const uiLayer = document.getElementById('sim-controls-slot');
    if (uiLayer) uiLayer.innerHTML = '';
  }

  update(now, delta) {
    if (!this.isMounted) return;

    this.bodies.forEach((body) => body.renderer.update(now, delta, this.system.timeEngine));
    this.moon.update(now, delta, this.system.timeEngine);
  }
}
