const menu = document.querySelector('.menu-toggle');
const navigation = document.getElementById('site-nav');

if (menu && navigation) {
  const compact = window.matchMedia('(max-width: 44rem)');
  const setMenu = (open) => {
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Close menu' : 'Menu';
    navigation.hidden = compact.matches && !open;
  };
  const resetMenu = () => {
    menu.hidden = !compact.matches;
    setMenu(false);
  };

  menu.addEventListener('click', () => setMenu(navigation.hidden));
  compact.addEventListener('change', resetMenu);
  navigation.addEventListener('click', (event) => {
    if (!compact.matches || !event.target.closest('a')) return;
    setMenu(false);
    menu.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menu.getAttribute('aria-expanded') !== 'true') return;
    setMenu(false);
    menu.focus();
  });
  resetMenu();
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const copyDiscord = document.getElementById('copy-discord');
if (copyDiscord && navigator.clipboard?.writeText) {
  copyDiscord.hidden = false;
  copyDiscord.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText('itsmefeje');
      status.textContent = 'Discord username copied.';
    } catch {
      status.textContent = 'Could not copy. Your Discord username is shown above.';
    }
  });
}
