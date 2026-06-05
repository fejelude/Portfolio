import * as THREE from 'three';
import { ISSService } from './ISSService.js';
import { GeoService } from './GeoService.js';
import { HUDLayer } from './HUDLayer.js';

const EARTH_RADIUS = 10;
const ORBIT_RADIUS = EARTH_RADIUS + 0.65;
const PREDICTION_STEPS = 160;
const ORBITAL_PERIOD_SECONDS = 92 * 60;

export class OrbitalEarthSimulation {
  constructor(system) {
    this.system = system;
    this.scene = system.scene;
    this.cameraDirector = system.cameraDirector;
    this.earthGroup = system.earthRenderer.group;
    this.timeEngine = system.timeEngine;

    this.issService = new ISSService();
    this.geoService = new GeoService();
    this.hud = null;
    this.isMounted = false;
    this.boundEvents = [];

    this.issMarker = null;
    this.userMarker = null;
    this.trailLine = null;
    this.predictionLine = null;
    this.issPulse = null;

    this.createObjects();
  }

  createObjects() {
    this.issMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );

    this.issPulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      })
    );
    this.issMarker.add(this.issPulse);

    this.userMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );

    this.trailLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 })
    );

    this.predictionLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xf472b6, dashSize: 0.32, gapSize: 0.16, transparent: true, opacity: 0.82 })
    );
  }

  mount() {
    if (this.isMounted) return;
    this.isMounted = true;

    const uiLayer = document.getElementById('sim-controls-slot');
    if (uiLayer) {
      uiLayer.innerHTML = this.getTemplate();
    }

    this.hud = new HUDLayer();
    this.bindControls();

    this.earthGroup.add(this.issMarker);
    this.earthGroup.add(this.userMarker);
    this.earthGroup.add(this.trailLine);
    this.earthGroup.add(this.predictionLine);

    this.hud.setStatus('Acquiring live ISS telemetry and ground reference.');
    this.hud.setCameraMode(this.cameraDirector.modeLabel);

    void this.issService.start();
    void this.geoService.fetchLocation().then((location) => {
      this.hud?.updateUser(location);
    });

    this.cameraDirector.setMode('ISS');
    this.hud.setCameraMode(this.cameraDirector.modeLabel);

  }

  getTemplate() {
    return `
      <div id="orbital-ui-container" class="sim-panel-stack">
        <section class="hud-panel hud-top-left">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Mission</div>
              <h2>Orbital Earth</h2>
            </div>
            <div class="status-pill"><span class="pulse-dot"></span><span id="camera-mode-label">ISS Track</span></div>
          </div>
          <div class="data-grid">
            <div class="data-card">
              <span class="data-label">UTC Time</span>
              <strong id="utc-time">--</strong>
            </div>
            <div class="data-card">
              <span class="data-label">Sun</span>
              <strong>${new Date().toUTCString().slice(17, 22)} live</strong>
            </div>
            <div class="data-card">
              <span class="data-label">Location</span>
              <strong id="user-loc">Scanning...</strong>
            </div>
            <div class="data-card">
              <span class="data-label">Local Coordinates</span>
              <strong id="user-coords">--</strong>
            </div>
            <div class="data-card">
              <span class="data-label">Time Zone</span>
              <strong id="user-timezone">UTC</strong>
            </div>
            <div class="data-card">
              <span class="data-label">Telemetry</span>
              <strong id="status-msg">Initializing</strong>
            </div>
          </div>
        </section>

        <section class="hud-panel hud-top-right">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Orbit</div>
              <h3>ISS Telemetry</h3>
            </div>
          </div>
          <div class="hud-stack">
            <div class="data-row"><span class="data-label">Latitude</span><span class="data-value" id="iss-lat">--</span></div>
            <div class="data-row"><span class="data-label">Longitude</span><span class="data-value" id="iss-lon">--</span></div>
            <div class="data-row"><span class="data-label">Altitude</span><span class="data-value" id="iss-alt">--</span></div>
            <div class="data-row"><span class="data-label">Velocity</span><span class="data-value" id="iss-vel">--</span></div>
            <div class="data-row"><span class="data-label">Visibility</span><span class="data-value" id="iss-visibility">--</span></div>
            <div class="timeline-meter"><span id="orbit-progress"></span></div>
            <div class="data-note" id="orbit-prediction">Forecast horizon 45 min</div>
          </div>
        </section>

        <section class="hud-panel hud-bottom-left">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Trajectory</div>
              <h3>Orbit Layers</h3>
            </div>
          </div>
          <div class="orbit-legend horizontal-scroll-mobile">
            <span class="legend-item"><span class="legend-swatch trail"></span>Live trail</span>
            <span class="legend-item"><span class="legend-swatch prediction"></span>Predicted path</span>
            <span class="legend-item"><span class="legend-swatch user"></span>Ground marker</span>
          </div>
        </section>

        <section class="hud-panel hud-bottom-right">
          <div class="panel-title">
            <div>
              <div class="panel-kicker">Camera</div>
              <h3>Navigation</h3>
            </div>
          </div>
          <div class="control-stack">
            <div class="control-group horizontal-scroll-mobile">
              <button class="btn-control" id="btn-mode-free" type="button">Free Orbit</button>
              <button class="btn-control is-active" id="btn-mode-iss" type="button">Track ISS</button>
              <button class="btn-control" id="btn-mode-user" type="button">Locate User</button>
              <button class="btn-control" id="btn-mode-reset" type="button">Reset View</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  bindControls() {
    this.addListener('btn-mode-free', 'click', () => this.setCameraMode('FREE'));
    this.addListener('btn-mode-iss', 'click', () => this.setCameraMode('ISS'));
    this.addListener('btn-mode-user', 'click', () => {
      const location = this.geoService.getLocation();
      if (!location) return;
      const localPosition = this.latLonToVector3(location.lat, location.lon, EARTH_RADIUS + 1.6);
      const worldPosition = localPosition.clone().applyMatrix4(this.earthGroup.matrixWorld);
      this.setCameraMode('USER', worldPosition);
    });
    this.addListener('btn-mode-reset', 'click', () => {
      this.setCameraMode('FREE');
      this.cameraDirector.flyTo(new THREE.Vector3(0, 10, 32), new THREE.Vector3(0, 0, 0));
    });

  }

  addListener(id, event, handler) {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener(event, handler);
    this.boundEvents.push({ element, event, handler });
  }

  setCameraMode(mode, payload) {
    this.cameraDirector.setMode(mode, payload);
    this.hud?.setCameraMode(this.cameraDirector.modeLabel);
    document.querySelectorAll('.hud-bottom-right .btn-control').forEach((button) => {
      button.classList.toggle('is-active', button.id === `btn-mode-${mode.toLowerCase()}`);
    });
  }

  unmount() {
    if (!this.isMounted) return;
    this.isMounted = false;

    this.boundEvents.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.boundEvents = [];

    this.issService.stop();
    this.cameraDirector.setMode('FREE');

    this.earthGroup.remove(this.issMarker);
    this.earthGroup.remove(this.userMarker);
    this.earthGroup.remove(this.trailLine);
    this.earthGroup.remove(this.predictionLine);

    const uiLayer = document.getElementById('sim-controls-slot');
    if (uiLayer) uiLayer.innerHTML = '';
    this.hud = null;
  }

  update(time) {
    if (!this.isMounted) return;

    this.hud?.updateTime(time);

    const user = this.geoService.getLocation();
    if (user) {
      this.hud?.updateUser(user);
      const userPosition = this.latLonToVector3(user.lat, user.lon, EARTH_RADIUS + 0.25);
      this.userMarker.position.copy(userPosition);
      this.userMarker.visible = true;
    }

    const issData = this.issService.getPosition();
    if (issData) {
      const issPosition = this.latLonToVector3(issData.lat, issData.lon, ORBIT_RADIUS + (issData.alt - 400) / 1200);
      this.issMarker.position.copy(issPosition);
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.18;
      this.issPulse.scale.setScalar(pulse);
      this.hud?.updateISS(issData);
      this.hud?.setStatus(`Telemetry ${this.issService.getStatus()} - Updated ${new Date(issData.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      this.updateOrbitPath(issData);

      if (this.cameraDirector.mode === 'ISS') {
        const worldPosition = issPosition.clone().applyMatrix4(this.earthGroup.matrixWorld);
        this.cameraDirector.setTarget(worldPosition);
      }
    }
  }

  updateOrbitPath(current) {
    const history = this.issService.getHistory();
    if (history.length < 2) return;

    const trailPoints = history.slice(-120).map((entry) => {
      const radius = ORBIT_RADIUS + (entry.alt - 400) / 1200;
      return this.latLonToVector3(entry.lat, entry.lon, radius);
    });
    this.trailLine.geometry.setFromPoints(trailPoints);

    const predictionPoints = [];
    const currentLon = current.lon;
    for (let index = 0; index < PREDICTION_STEPS; index += 1) {
      const progress = index / (PREDICTION_STEPS - 1);
      const futureSeconds = progress * ORBITAL_PERIOD_SECONDS * 0.5;
      const futureLon = currentLon + (futureSeconds / ORBITAL_PERIOD_SECONDS) * 360 * 1.02;
      const futureLat = current.lat + Math.sin(progress * Math.PI * 2) * 18;
      predictionPoints.push(this.latLonToVector3(futureLat, futureLon, ORBIT_RADIUS));
    }

    this.predictionLine.geometry.setFromPoints(predictionPoints);
    this.predictionLine.computeLineDistances();
    this.hud?.updateOrbit({
      progress: ((current.lon + 180) % 360) / 360,
      predictionMinutes: 45
    });
  }

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }
}
