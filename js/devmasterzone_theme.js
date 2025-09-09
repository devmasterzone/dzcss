function toggleTheme() {
  const root = document.documentElement; // <html>
  const isNowDark = !root.classList.contains('dz-dark');

  if (isNowDark) {
    root.classList.add('dz-dark');
    root.classList.remove('dz-light');
  } else {
    root.classList.remove('dz-dark');
    root.classList.add('dz-light');
  }

  try {
    localStorage.setItem('dz-theme', isNowDark ? 'dark' : 'light');
  } catch (e) {}

  return isNowDark;
}

(function applySavedOrDefaultTheme() {
  try {
    const root = document.documentElement;
    const saved = localStorage.getItem('dz-theme'); // 'dark'|'light'|null

    if (saved === 'dark') {
      root.classList.add('dz-dark');
      root.classList.remove('dz-light');
    } else if (saved === 'light') {
      root.classList.add('dz-light');
      root.classList.remove('dz-dark');
    } else {
      // Default to light if no saved preference
      root.classList.add('dz-light');
      root.classList.remove('dz-dark');
    }
  } catch (e) {
    // fallback to light
    try { document.documentElement.classList.add('dz-light'); } catch (_) {}
  }
})();
