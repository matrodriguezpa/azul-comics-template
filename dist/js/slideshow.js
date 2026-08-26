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
    if (contenedores.length === 0) return;

    // Cada contenedor (cada widget) se procesa por separado
    await Promise.all(Array.from(contenedores).map(procesarContenedorTarjetas));
  }

  // ============================================================
  // PROCESA UN ÚNICO CONTENEDOR DE TARJETAS (un widget PageList)
  // ============================================================
  async function procesarContenedorTarjetas(contenedorTarjetas) {
    // Evitar reprocesar el mismo contenedor si el script llega a ejecutarse
    // más de una vez (hay un <script> por cada widget PageList en la página)
    if (contenedorTarjetas.dataset.cmcCargado === 'true') return;
    contenedorTarjetas.dataset.cmcCargado = 'true';

    const tarjetas = Array.from(contenedorTarjetas.querySelectorAll(config.selectorTarjeta));
    await Promise.all(tarjetas.map(agregarImagenATarjeta));
  }

  // ============================================================
  // AGREGA LA IMAGEN A UNA TARJETA QUE YA EXISTE EN EL DOM
  // (el theme ya puso el <div class="card"> con su <a class="pages-link">
  // adentro; aquí solo le sumamos el <img>)
  // ============================================================
  async function agregarImagenATarjeta(tarjeta) {
    const enlace = tarjeta.querySelector(config.selectorEnlaceTarjeta);
    if (!enlace || !enlace.href) return;
    let urlImagen = config.sinImagen;
    try {
      urlImagen = (await obtenerImagenDePagina(enlace.href)) || config.sinImagen;
    } catch (error) {
      console.error(`Error al obtener la imagen de "${enlace.href}":`, error);
    }
    const img = document.createElement('img');
    img.className = 'imagenportadacmc';
    img.src = urlImagen;
    img.alt = enlace.textContent.trim();
    enlace.appendChild(img);
  }

  // ============================================================
  // OBTENER LA PRIMERA IMAGEN DE UNA PÁGINA (vía fetch) — sin cambios
  // ============================================================
  async function obtenerImagenDePagina(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Buscar meta og:image (prioridad)
      const metaOg = doc.querySelector('meta[property="og:image"]');
      if (metaOg && metaOg.content) {
        return metaOg.content;
      }

      // 2. Buscar la primera imagen del contenido
      const selectoresImagen = ['article img', '.post-body img', '.entry-content img', '.content img', 'main img'];
      for (const selector of selectoresImagen) {
        const img = doc.querySelector(selector);
        if (img && img.src) {
          if (img.src.startsWith('http://') || img.src.startsWith('https://')) {
            return img.src;
          } else {
            const baseUrl = new URL(url);
            return new URL(img.src, baseUrl.origin).href;
          }
        }
      }
      return null;
    } catch (error) {
      console.warn(`No se pudo obtener la imagen de ${url}:`, error);
      return null;
    }
  }
  cargarImagenesDeTarjetas();

})();
