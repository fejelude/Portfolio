(() => {
  const items = [...document.querySelectorAll('.gallery-item')];
  const viewer = document.getElementById('lightbox');
  const photo = document.createElement('img');
  photo.referrerPolicy = 'no-referrer';
  viewer.querySelector('.lightbox-scene').prepend(photo);
  const title = viewer.querySelector('h2');
  const count = viewer.querySelector('.lightbox-count');
  const error = viewer.querySelector('.lightbox-error');
  let current = 0;
  let opener;
  let touchStart;

  function show(index) {
    current = (index + items.length) % items.length;
    const item = items[current];
    const caption = item.querySelector('.gallery-caption').textContent;
    title.textContent = caption;
    count.textContent = `${current + 1} of ${items.length}`;
    error.hidden = true;
    photo.hidden = false;
    photo.alt = caption;
    photo.src = item.href;
  }

  items.forEach((item, index) => {
    const thumbnail = item.querySelector('img');
    const markUnavailable = () => item.classList.add('image-unavailable');
    thumbnail.addEventListener('error', markUnavailable);
    if (thumbnail.complete && !thumbnail.naturalWidth) markUnavailable();

    item.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = item;
      show(index);
      viewer.showModal();
    });
  });

  photo.addEventListener('error', () => {
    if (!photo.hasAttribute('src')) return;
    photo.hidden = true;
    error.hidden = false;
  });
  viewer.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  viewer.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('close', () => {
    photo.removeAttribute('src');
    opener?.focus();
  });
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  viewer.addEventListener('touchstart', (event) => {
    touchStart = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });
  viewer.addEventListener('touchend', (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const x = touch.clientX - touchStart.clientX;
    const y = touch.clientY - touchStart.clientY;
    touchStart = null;
    if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y)) show(current + (x < 0 ? 1 : -1));
    else if (Math.abs(y) > 50) viewer.close();
  }, { passive: true });
})();
