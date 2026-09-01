'use strict';

// Keep the dashboard logic isolated in the core file, then layer Sofra's
// official universal media on top. This lets every server see the same
// branded visuals while preserving the existing panel behavior.
document.write('<script src="/sofra-panel-core.js?v=20260901"><\\/script>');

(() => {
  const SOFRA_OFFICIAL_MEDIA = Object.freeze({
    brand: 'https://images-ext-1.discordapp.net/external/iXuJ10mSD28dtzSQj6R7PrgZJSvkEmBx-quRfqgVHgE/https/static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/fb/9e/U1eJq1Kc6FPykBTGeW.mp4',
    overview: 'https://images-ext-1.discordapp.net/external/HVfTgKuy9F_Nn3g8Hgfqn4l8X73IRqd-W6QGH-l6d9k/https/static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/e3/b6/XOCMlFyxQ6Vzk.mp4',
    welcome: 'https://images-ext-1.discordapp.net/external/-8pdUvGwhltnBItSQOPVKZ6RAL3kavUNFhwDeRvHjzA/https/static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/76/02/JOKTPswg70UuvLmU.mp4',
    tickets: 'https://images-ext-1.discordapp.net/external/7oD9z5eSjM8rByu9oHxMMuNucr19mjj-DpqPli5yvhY/https/static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/80/64/bKGnacc5.mp4',
    levels: 'https://images-ext-1.discordapp.net/external/CjA0hlNqqtToPWBIEGjEAR1Uv5PdO_qMATCNfHjtprs/https/static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/49/01/THCweaO9SXtnh.mp4',
    boosters: 'https://images-ext-1.discordapp.net/external/clfPvagAK1XqLdRmOjczv3o3xlxrH6_bUZPb8hZMp68/https/static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/ce/c2/8D5ZPqkh66i64Q3fF.mp4',
    moderation: 'https://images-ext-1.discordapp.net/external/wRsV0D555zcyGBIx2fy2R1JrfbVhpvRUfDfmbCGzRT0/https/static.klipy.com/ii/71b2873e478b9d8d0482ea3ec777ba7f/7f/e5/XTuUicSWZIFin.mp4',
    logs: 'https://images-ext-1.discordapp.net/external/rs94NDf7fgbjzUd9kqIgILw7T_nyWWnxclWyMj0Dz5s/https/static.klipy.com/ii/925f17378dd1893b674a723c07535afe/03/1e/tb2QI8A5.mp4',
    autorole: 'https://images-ext-1.discordapp.net/external/2UPm33suyGS833nZJVf1cfgQXpUDv6pHRnIPNHXXcys/https/static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/01/eb/k9oLv1JBJ5sxy9NyxZ8.mp4'
  });

  function addOfficialMediaStyles() {
    if (document.getElementById('sofra-official-media-styles')) return;
    const style = document.createElement('style');
    style.id = 'sofra-official-media-styles';
    style.textContent = `
      [data-panel="appearance"], [data-page="appearance"] { display: none !important; }
      .media-slot, .sofra-orb, .auth-mark { overflow: hidden; }
      .media-slot > video, .sofra-orb > video, .auth-mark > video,
      .media-slot > img, .sofra-orb > img, .auth-mark > img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        pointer-events: none;
      }
      .nav-icon > video, .module-icon > video { border-radius: inherit; }
    `;
    document.head.appendChild(style);
  }

  function officialMediaNode(key, url) {
    const isVideo = /\.mp4(?:$|[?#])/i.test(url);
    if (isVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.disablePictureInPicture = true;
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('tabindex', '-1');
      video.dataset.sofraOfficialKey = key;
      return video;
    }

    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';
    image.dataset.sofraOfficialKey = key;
    return image;
  }

  function renderOfficialMedia(element, key) {
    const url = SOFRA_OFFICIAL_MEDIA[key];
    if (!element || !url) return;

    const child = element.firstElementChild;
    if (child && child.dataset?.sofraOfficialKey === key && child.getAttribute('src') === url) return;

    const node = officialMediaNode(key, url);
    element.replaceChildren(node);
    element.classList.add('has-media', 'official-media');
    if (node.tagName === 'VIDEO') node.play().catch(() => undefined);
  }

  function hideAppearanceSection() {
    const button = document.querySelector('[data-panel="appearance"]');
    if (!button) return;
    button.hidden = true;
    const title = button.previousElementSibling;
    if (title?.classList.contains('nav-group-title')) title.hidden = true;
  }

  function applyOfficialMedia() {
    document.querySelectorAll('[data-icon-key]').forEach((element) => {
      renderOfficialMedia(element, element.dataset.iconKey);
    });

    // The loading screen and Discord authentication card exist before a
    // server has been selected, so the official Sofra logo is applied there too.
    document.querySelectorAll('.sofra-orb, .auth-mark').forEach((element) => {
      renderOfficialMedia(element, 'brand');
    });

    hideAppearanceSection();
  }

  let scheduled = false;
  function scheduleOfficialMedia() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyOfficialMedia();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    addOfficialMediaStyles();
    applyOfficialMedia();

    const observer = new MutationObserver(scheduleOfficialMedia);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
