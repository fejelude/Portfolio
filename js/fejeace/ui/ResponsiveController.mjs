export class ResponsiveController {
  constructor(root = document.documentElement) {
    this.root = root;
    this.update = this.update.bind(this);
  }

  start() {
    this.update();
    window.addEventListener("resize", this.update, { passive: true });
    window.visualViewport?.addEventListener("resize", this.update, { passive: true });
  }

  update() {
    const height = window.visualViewport?.height || window.innerHeight;
    this.root.style.setProperty("--feje-viewport-height", `${Math.round(height)}px`);
  }
}
