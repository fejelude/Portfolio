import { DevelopmentScenarios, createScenario, scenarioFromGridJson } from "./ScenarioFactory.mjs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "terminal.local"]);

export function developmentControlsAllowed(locationObject = window.location) {
  return LOCAL_HOSTS.has(locationObject.hostname);
}

export class TestControls {
  constructor(container, app) {
    this.container = container;
    this.app = app;
  }

  mount() {
    if (!developmentControlsAllowed()) return;
    this.container.hidden = false;
    this.container.innerHTML = `
      <div class="dev-head"><strong>FejeAce Test Lab</strong><span>Local development only</span></div>
      <label>Forced scenario
        <select data-dev-scenario>
          ${DevelopmentScenarios.map((scenario) => `<option value="${scenario.id}">${scenario.label}</option>`).join("")}
        </select>
      </label>
      <button type="button" data-dev-run>Run scenario</button>
      <details>
        <summary>Specific 5×4 grid</summary>
        <textarea data-dev-grid rows="6" spellcheck="false">[["ace","king","heart","diamond"],["queen","jack","club","spade"],["heart","diamond","ace","king"],["club","spade","queen","jack"],["diamond","heart","king","ace"]]</textarea>
        <button type="button" data-dev-grid-run>Run custom grid</button>
      </details>`;

    this.container.querySelector("[data-dev-run]").addEventListener("click", () => {
      const id = this.container.querySelector("[data-dev-scenario]").value;
      this.app.runDevelopmentScenario(createScenario(id));
    });
    this.container.querySelector("[data-dev-grid-run]").addEventListener("click", () => {
      try {
        const scenario = scenarioFromGridJson(this.container.querySelector("[data-dev-grid]").value);
        this.app.runDevelopmentScenario(scenario);
      } catch (error) {
        this.app.showMessage(error.message, "error");
      }
    });
  }
}
