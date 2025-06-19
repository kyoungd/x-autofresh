document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('enableToggle');
  const statusEl = document.getElementById('status');

  const setVisual = (enabled) => {
    toggle.classList.toggle('active', enabled);
    toggle.setAttribute('aria-checked', enabled);
    statusEl.textContent = enabled ? 'Auto scroll is ON' : 'Auto scroll is OFF';
    statusEl.style.color = enabled ? '#28a745' : '#dc3545';
  };

  const { isEnabled } = await chrome.storage.sync.get({ isEnabled: true });
  setVisual(isEnabled);

  toggle.addEventListener('click', async () => {
    const newState = !(toggle.getAttribute('aria-checked') === 'true');
    await chrome.storage.sync.set({ isEnabled: newState });
    setVisual(newState);
  });
});