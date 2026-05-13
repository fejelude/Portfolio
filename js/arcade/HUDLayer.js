const formatSigned = (value, positive, negative) => {
  if (!Number.isFinite(value)) return '--';
  const suffix = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}\u00b0 ${suffix}`;
};

export class HUDLayer {
  constructor() {
    this.elements = {
      utc: document.getElementById('utc-time'),
      userLocation: document.getElementById('user-loc'),
      userCoords: document.getElementById('user-coords'),
      userTimezone: document.getElementById('user-timezone'),
      issLat: document.getElementById('iss-lat'),
      issLon: document.getElementById('iss-lon'),
      issAlt: document.getElementById('iss-alt'),
      issVel: document.getElementById('iss-vel'),
      issVisibility: document.getElementById('iss-visibility'),
      issStatus: document.getElementById('status-msg'),
      orbitProgress: document.getElementById('orbit-progress'),
      orbitPrediction: document.getElementById('orbit-prediction'),
      cameraMode: document.getElementById('camera-mode-label')
    };
  }

  updateTime(date) {
    if (this.elements.utc) {
      this.elements.utc.textContent = `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
    }
  }

  updateISS(issData) {
    if (!issData) return;
    if (this.elements.issLat) this.elements.issLat.textContent = formatSigned(issData.lat, 'N', 'S');
    if (this.elements.issLon) this.elements.issLon.textContent = formatSigned(issData.lon, 'E', 'W');
    if (this.elements.issAlt) this.elements.issAlt.textContent = `${issData.alt.toFixed(1)} km`;
    if (this.elements.issVel) this.elements.issVel.textContent = `${Math.round(issData.vel).toLocaleString()} km/h`;
    if (this.elements.issVisibility) this.elements.issVisibility.textContent = String(issData.visibility || 'unknown').toUpperCase();
  }

  updateOrbit({ progress = 0, predictionMinutes = 45 } = {}) {
    if (this.elements.orbitProgress) {
      this.elements.orbitProgress.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    }
    if (this.elements.orbitPrediction) {
      this.elements.orbitPrediction.textContent = `Forecast horizon ${predictionMinutes} min`;
    }
  }

  updateUser(location) {
    if (!location) return;
    if (this.elements.userLocation) {
      this.elements.userLocation.textContent = `${location.city}, ${location.country}`;
    }
    if (this.elements.userCoords) {
      this.elements.userCoords.textContent = `${formatSigned(location.lat, 'N', 'S')} / ${formatSigned(location.lon, 'E', 'W')}`;
    }
    if (this.elements.userTimezone) {
      this.elements.userTimezone.textContent = location.timezone || 'UTC';
    }
  }

  setStatus(message) {
    if (this.elements.issStatus) this.elements.issStatus.textContent = message;
  }

  setCameraMode(label) {
    if (this.elements.cameraMode) this.elements.cameraMode.textContent = label;
  }
}
