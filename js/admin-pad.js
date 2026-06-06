(() => {
  const form = document.querySelector('[data-admin-pad-form]');
  if (!form) return;

  const pad = form.querySelector('.admin-pad');
  const input = form.querySelector('#admin-password');
  const status = form.querySelector('[data-pad-status]');
  const submitButton = form.querySelector('[data-pad-submit]');
  const slots = Array.from(form.querySelectorAll('[data-code-slot]'));
  const maxLength = Number(pad?.dataset.codeLength) || slots.length || 8;
  let code = '';

  const setStatus = (text, tone = '') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
  };

  const flash = (className) => {
    if (!pad) return;
    pad.classList.remove(className);
    void pad.offsetWidth;
    pad.classList.add(className);
  };

  const sync = () => {
    if (input) input.value = code;

    slots.forEach((slot, index) => {
      const isFilled = index < code.length;
      slot.classList.toggle('is-filled', isFilled);
      slot.classList.toggle('is-current', isFilled && index === code.length - 1);
      slot.setAttribute('aria-label', isFilled ? 'Digit entered' : 'Digit empty');
    });

    const isReady = code.length === maxLength;
    form.classList.toggle('is-ready', isReady);
    if (submitButton) submitButton.disabled = !isReady;

    if (isReady) {
      setStatus('CODE SEALED. READY TO VERIFY.', 'ready');
    } else if (code.length === 0) {
      setStatus('AWAITING ACCESS CODE');
    } else {
      setStatus(`${maxLength - code.length} DIGITS REMAINING`);
    }
  };

  const addDigit = (digit) => {
    if (code.length >= maxLength) {
      flash('is-maxed');
      return;
    }

    code += digit;
    flash('is-typing');
    sync();
  };

  const backspace = () => {
    code = code.slice(0, -1);
    sync();
  };

  const clear = () => {
    code = '';
    flash('is-cleared');
    sync();
  };

  form.addEventListener('click', (event) => {
    const digitButton = event.target.closest('[data-pad-key]');
    if (digitButton) {
      addDigit(digitButton.dataset.padKey);
      return;
    }

    const actionButton = event.target.closest('[data-pad-action]');
    if (!actionButton) return;

    if (actionButton.dataset.padAction === 'backspace') backspace();
    if (actionButton.dataset.padAction === 'clear') clear();
  });

  form.addEventListener('submit', (event) => {
    if (code.length !== maxLength) {
      event.preventDefault();
      setStatus('FULL ACCESS CODE REQUIRED.', 'danger');
      flash('is-denied');
      return;
    }

    form.classList.add('is-unlocking');
    form.closest('.admin-auth-card')?.classList.add('is-unlocking');
    setStatus('VERIFYING SECURE SESSION...', 'ready');
    if (submitButton) submitButton.disabled = true;
  });

  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      addDigit(event.key);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clear();
      return;
    }

    if (event.key === 'Enter' && code.length === maxLength) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  sync();
})();
