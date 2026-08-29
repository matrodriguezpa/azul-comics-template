(function () {
  'use strict';

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================
  const config = {
    verImagen: true,
    // ¿Agregar imagen a la tarjeta?
    sinImagen: 'https://drive.google.com/thumbnail?id=1URK0fkJycdOiKxmN8hHKelMbRLnkjOkM',
    // Imagen por defecto
    imagenAncho: 400,
    imagenAlto: 800,
    selectorContenedorTarjetas: '.posts-container',
    // Un contenedor por cada widget PageList
    selectorTarjeta: '.card-slider',
    // Cada tarjeta, ya generada por el theme
    selectorEnlaceTarjeta: '.pages-link' // El <a> dentro de la tarjeta: da título y URL
  };

  // ============================================================
  // FUNCIÓN PRINCIPAL: recorre TODOS los contenedores de tarjetas de la
  // página y les agrega la imagen a las tarjetas que el theme ya generó
  // ============================================================
  async function cargarImagenesDeTarjetas() {
    const contenedores = document.querySelectorAll(config.selectorContenedorTarjetas);
    if (contenedores.length === 0 || false) return;

    // Descargamos el feed UNA sola vez para todos los sliders.
    const paginas = await obtenerPaginasBlogger();
    await Promise.all(Array.from(contenedores).map(contenedor => procesarContenedorTarjetas(contenedor, paginas)));
  }

  // ============================================================
  // PROCESA UN ÚNICO CONTENEDOR DE TARJETAS (un widget PageList)
  // ============================================================
  async function procesarContenedorTarjetas(contenedorTarjetas, paginas) {
    if (contenedorTarjetas.dataset.cmcCargado === 'true') return;
    contenedorTarjetas.dataset.cmcCargado = 'true';
    const tarjetas = Array.from(contenedorTarjetas.querySelectorAll(config.selectorTarjeta));
    await Promise.all(tarjetas.map(tarjeta => agregarImagenATarjeta(tarjeta, paginas)));
  }

  // ============================================================
  // AGREGA LA IMAGEN A UNA TARJETA QUE YA EXISTE EN EL DOM
  // (el theme ya puso el <div class="card"> con su <a class="pages-link">
  // adentro; aquí solo le sumamos el <img>)
  // ============================================================
  async function agregarImagenATarjeta(tarjeta, paginas) {
    const enlace = tarjeta.querySelector(config.selectorEnlaceTarjeta);
    if (!enlace || !enlace.href) return;
    let urlImagen = config.sinImagen;
    const pagina = paginas.find(p => normalizarRuta(p.url) === normalizarRuta(enlace.href));
    if (pagina?.imagen) {
      urlImagen = optimizarImagen(pagina.imagen);
    }

    // Evitar imágenes duplicadas
    if (enlace.querySelector('.imagenportadacmc')) return;
    const img = document.createElement('img');
    img.className = 'imagenportadacmc';
    img.src = urlImagen;
    img.alt = enlace.textContent.trim();

    // Mejora de rendimiento
    img.loading = 'lazy';
    img.decoding = 'async';
    enlace.appendChild(img);
  }

  // ============================================================
  // OBTENER LA PRIMERA IMAGEN DE UNA PÁGINA (vía fetch) — sin cambios
  // ============================================================
  // ============================================================
  // OBTENER TODAS LAS PÁGINAS DE BLOGGER — UNA SOLA PETICIÓN
  // ============================================================
  async function obtenerPaginasBlogger() {
    const feedUrl = `${window.location.origin}/feeds/pages/default?alt=json&max-results=150`;
    try {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      const entries = data.feed?.entry || [];
      return entries.map(entry => {
        const alternate = entry.link?.find(link => link.rel === 'alternate');
        const contenido = entry.content?.$t || entry.summary?.$t || '';
        let imagen = null;
        if (contenido) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(contenido, 'text/html');

          // Primera imagen del contenido
          const img = doc.querySelector('img');
          if (img?.src) {
            imagen = new URL(img.src, window.location.origin).href;
          }
        }
        return {
          url: alternate?.href || '',
          imagen
        };
      });
    } catch (error) {
      console.error('No se pudieron obtener las páginas de Blogger:', error);
      return [];
    }
  }

  // ============================================================
  // NORMALIZAR URL PARA COMPARAR PÁGINAS
  // ============================================================
  function normalizarRuta(url) {
    try {
      const u = new URL(url);
      return u.pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      return '';
    }
  }

  // ============================================================
  // OPTIMIZAR IMAGEN DE BLOGGER
  // Objetivo: aprox. 400 x 800 px (proporción 1:2)
  // ============================================================
  function optimizarImagen(url) {
    if (!url) return config.sinImagen;
    try {
      const u = new URL(url);
      u.pathname = u.pathname.replace(/\/s\d+(?:-[^/]+)?\//i, `/w${config.imagenAncho}-h${config.imagenAlto}/`);
      return u.href;
    } catch {
      return url;
    }
  }
  cargarImagenesDeTarjetas();

})();
