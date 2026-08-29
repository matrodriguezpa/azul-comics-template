document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');

  if (!header) return;

  let lastScrollY = window.scrollY;
  const threshold = 10;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY <= 0) {
      header.classList.remove('header-hidden');
      lastScrollY = currentScrollY;
      return;
    }

    if (Math.abs(currentScrollY - lastScrollY) < threshold) {
      return;
    }

    if (currentScrollY > lastScrollY) {
      // ↓ Scroll hacia abajo
      header.classList.add('header-hidden');
    } else {
      // ↑ Scroll hacia arriba
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
  }, { passive: true });
});

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');

  if (!header) return;

  const setHeaderHeight = () => {
    document.documentElement.style.setProperty(
      '--header-height',
      `${header.offsetHeight}px`
    );
  };

  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);
});