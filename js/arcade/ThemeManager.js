export const ARCADE_THEMES = [
  { id: 'premium-dark', label: 'Premium Dark' },
  { id: 'clean-light', label: 'Clean Light' },
  { id: 'neon-arcade', label: 'Neon Arcade' },
  { id: 'luxury-gold', label: 'Luxury Gold' },
  { id: 'blue-tech', label: 'Blue Tech' },
  { id: 'minimal-glass', label: 'Minimal Glass' },
  { id: 'high-contrast', label: 'High Contrast' }
];

const THEME_IDS = new Set(ARCADE_THEMES.map((theme) => theme.id));

export class ThemeManager {
  constructor({ storageKey = 'portfolio-arcade-theme' } = {}) {
    this.storageKey = storageKey;
    this.theme = this.getInitialTheme();
    this.bindControls();
    this.applyTheme(this.theme, { persist: false });
  }

  getInitialTheme() {
    try {
      const storedTheme = window.localStorage.getItem(this.storageKey);
      if (THEME_IDS.has(storedTheme)) return storedTheme;
    } catch (error) {
      console.warn('ThemeManager: local storage unavailable.', error);
    }

    return document.body?.dataset.arcadeTheme || 'premium-dark';
  }

  bindControls() {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.addEventListener('click', () => this.applyTheme(button.getAttribute('data-theme-option')));
    });

    document.querySelectorAll('[data-theme-select]').forEach((select) => {
      select.addEventListener('change', () => this.applyTheme(select.value));
    });
  }

  applyTheme(themeId, { persist = true } = {}) {
    if (!THEME_IDS.has(themeId)) return;
    this.theme = themeId;

    if (document.body) {
      document.body.dataset.arcadeTheme = themeId;
    }

    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const isActive = button.getAttribute('data-theme-option') === themeId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('[data-theme-select]').forEach((select) => {
      select.value = themeId;
    });

    if (persist) {
      try {
        window.localStorage.setItem(this.storageKey, themeId);
      } catch (error) {
        console.warn('ThemeManager: unable to persist theme.', error);
      }
    }

    document.dispatchEvent(new CustomEvent('arcade:theme-change', {
      detail: { theme: ARCADE_THEMES.find((item) => item.id === themeId) }
    }));
  }
}
