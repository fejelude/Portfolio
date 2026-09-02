export class ResponsiveController {
  constructor(root = document.documentElement) {
    this.root = root;
    this.update = this.update.bind(this);
    this.frame = 0;
  }

  start() {
    this.update();
    window.addEventListener("resize", this.update, { passive: true });
    window.addEventListener("orientationchange", this.update, { passive: true });
    window.addEventListener("pageshow", this.update, { passive: true });
    window.visualViewport?.addEventListener("resize", this.update, { passive: true });
    window.visualViewport?.addEventListener("scroll", this.update, { passive: true });
  }

  update() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const height = viewport && viewport.height > 0 ? viewport.height : window.innerHeight;
      this.root.style.setProperty("--feje-viewport-height", `${Math.round(height)}px`);
      this.root.style.setProperty("--feje-viewport-top", `${Math.round(viewport?.offsetTop || 0)}px`);
    });
  }
}
