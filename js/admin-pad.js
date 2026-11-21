(() => {
  const form = document.querySelector('[data-admin-pad-form]');
  if (!form) return;
  const input = form.querySelector('#admin-password');
  const pad = form.querySelector('.admin-pad');
  const submit = form.querySelector('.pad-submit');

  pad.hidden = false;
  pad.addEventListener('click', (event) => {
    const key = event.target.closest('[data-pad-key], [data-pad-action]');
    if (!key) return;
    if (key.dataset.padKey) input.value += key.dataset.padKey;
    else if (key.dataset.padAction === 'backspace') input.value = input.value.slice(0, -1);
    else input.value = '';
  });
  form.addEventListener('submit', () => {
    submit.textContent = 'Signing in…';
    submit.disabled = true;
  });
  window.addEventListener('pageshow', () => {
    submit.textContent = 'Sign in';
    submit.disabled = false;
  });
})();
