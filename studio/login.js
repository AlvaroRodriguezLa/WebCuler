document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  const message = document.querySelector('#message');
  button.disabled = true;
  message.textContent = 'Comprobando…';
  try {
    const response = await fetch('/api/studio/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: new FormData(form).get('code') }),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo iniciar sesión.');
    location.replace('/');
  } catch (error) {
    message.textContent = error.message || 'No se pudo iniciar sesión.';
  } finally {
    button.disabled = false;
  }
});
