(function () {
  'use strict';

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================
  const latestConfig = {
    maxResults: 150,
    // Máximo de posts a obtener
    initialDisplay: 4,
    // Posts mostrados al inicio
    batchSize: 4,
    // Posts añadidos al pulsar "Ver más"
    blockedTags: ['novedades'],
    // Etiquetas bloqueadas globalmente
    selectorContainer: '.latest-posts',
    selectorCards: '.latest-cards',
    selectorMoreButton: '.latest-more',
    imagePlaceholder: 'https://via.placeholder.com/400x200?text=Sin+Imagen',
    imagenAncho: 400,
    // Ancho deseado para las imágenes (px)
    imagenAlto: 700 // Alto deseado para las imágenes (px)
  };

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  async function initLatestPosts() {
    const containers = Array.from(document.querySelectorAll(latestConfig.selectorContainer));
    if (containers.length === 0) return;

    // El feed se descarga UNA sola vez para todos los widgets de la página
    // (misma idea que obtenerPaginasBlogger() en slideshow.bundle.js)
    const entries = await fetchPostsFeed();
    await Promise.all(containers.map(container => processContainer(container, entries)));
  }

  // ============================================================
  // OBTENER EL FEED DE POSTS (una sola petición para toda la página)
  // ============================================================
  async function fetchPostsFeed() {
    const feedUrl = `${window.location.origin}/feeds/posts/default?alt=json&max-results=${latestConfig.maxResults}&orderby=published&thumbs=1`;
    try {
      const response = await fetch(feedUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      return data.feed.entry || [];
    } catch (error) {
      console.error('Error al obtener el feed de posts:', error);
      return null; // null = error real, distinto de "sin resultados"
    }
  }

  // ============================================================
  // PROCESA UN CONTENEDOR
  // ============================================================
  async function processContainer(container, entries) {
    if (container.dataset.latestLoaded === 'true') return;
    container.dataset.latestLoaded = 'true';

    // Obtener la categoría desde el ancestro con clase 'section' (o el propio contenedor)
    const section = container.closest('.section') || container.parentElement;
    // Si el id de la sección es 'latest' o no existe, no se filtra por categoría
    const category = section && section.id && section.id.toLowerCase() !== 'latest' ? section.id : null;
    try {
      if (entries === null) {
        container.innerHTML = '<p>Error al cargar las publicaciones.</p>';
        return;
      }
      const posts = filterPosts(entries, category);
      if (posts.length === 0) {
        container.innerHTML = '<p>No hay publicaciones disponibles.</p>';
        return;
      }

      // Estado local del contenedor
      const state = {
        posts: posts,
        currentIndex: 0
      };
      const cardsContainer = container.querySelector(latestConfig.selectorCards);
      const moreButton = container.querySelector(latestConfig.selectorMoreButton);

      // Limpiar contenido previo (evita duplicados al recargar)
      cardsContainer.innerHTML = '';

      // Renderiza un lote de tarjetas usando un fragmento (minimiza reflows)
      function renderBatch(count) {
        const endIndex = Math.min(state.currentIndex + count, state.posts.length);
        const postsToShow = state.posts.slice(state.currentIndex, endIndex);
        state.currentIndex = endIndex;
        const fragment = document.createDocumentFragment();
        postsToShow.forEach(post => fragment.appendChild(createCard(post)));
        cardsContainer.appendChild(fragment);
        updateButtonVisibility(moreButton, state);
      }

      // Render inicial
      renderBatch(latestConfig.initialDisplay);

      // Evento del botón "Ver más"
      if (moreButton) {
        moreButton.addEventListener('click', () => renderBatch(latestConfig.batchSize));
      }
    } catch (error) {
      console.error('Error al procesar el contenedor de posts:', error);
      container.innerHTML = '<p>Error al cargar las publicaciones.</p>';
    }
  }

  // ============================================================
  // FILTRAR POSTS (sin red: solo procesa lo ya descargado en fetchPostsFeed)
  // ============================================================
  function filterPosts(entries, category) {
    const blockedSet = new Set(latestConfig.blockedTags);
    const filtered = [];
    for (const entry of entries) {
      const tags = entry.category ? entry.category.map(cat => cat.term) : [];
      if (tags.length === 0) continue;

      // Filtrar por etiquetas bloqueadas
      if (tags.some(tag => blockedSet.has(tag))) continue;

      // Filtrar por categoría (si se especifica)
      if (category && !tags.some(tag => tag.toLowerCase() === category.toLowerCase())) {
        continue;
      }
      filtered.push(entry);
    }
    return filtered;
  }

  // ============================================================
  // CREAR UNA TARJETA (con todas las etiquetas del post)
  // ============================================================
  function createCard(post) {
    const postUrl = getPostUrl(post);
    const title = post.title.$t;
    const thumbnail = obtenerImagenPost(post);

    // Obtener todas las etiquetas
    const allTags = post.category ? post.category.map(cat => cat.term) : [];

    // Crear la tarjeta
    const card = document.createElement('div');
    card.className = 'latest-card';

    // Enlace overlay (toda la tarjeta clickeable)
    const overlayLink = document.createElement('a');
    overlayLink.className = 'latest-card-overlay';
    overlayLink.href = postUrl;
    overlayLink.setAttribute('aria-label', title);

    // Imagen
    const image = document.createElement('img');
    image.src = thumbnail;
    image.alt = title;
    image.className = 'latest-card-image';
    image.loading = 'lazy'; // Carga diferida (igual que en slideshow)
    image.decoding = 'async'; // Decodificación fuera del hilo principal

    // Título
    const titleElement = document.createElement('h3');
    titleElement.className = 'latest-card-title';
    titleElement.textContent = title;

    // Contenedor de etiquetas (todas)
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'latest-card-tags';
    allTags.forEach(tag => {
      const tagLink = document.createElement('a');
      tagLink.className = 'latest-card-tag';
      tagLink.href = `/search/label/${encodeURIComponent(tag)}`;
      tagLink.textContent = tag;
      tagsContainer.appendChild(tagLink);
    });

    // Ensamblar
    card.appendChild(overlayLink);
    card.appendChild(image);
    card.appendChild(titleElement);
    card.appendChild(tagsContainer);
    return card;
  }

  // ============================================================
  // OBTENER LA IMAGEN DE UN POST SIN PETICIONES DE RED ADICIONALES
  // 1. Miniatura que ya trae el feed (media$thumbnail)
  // 2. Primera <img> dentro del contenido del post (también viene en el feed)
  // 3. Placeholder
  // ============================================================
  function obtenerImagenPost(post) {
    if (post.media$thumbnail && post.media$thumbnail.url) {
      return optimizarImagen(post.media$thumbnail.url);
    }
    const contenido = post.content && post.content.$t || post.summary && post.summary.$t || '';
    if (contenido) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(contenido, 'text/html');
      const img = doc.querySelector('img');
      if (img && img.src) {
        try {
          const url = new URL(img.src, window.location.origin).href;
          return optimizarImagen(url);
        } catch {
          // si la URL no es válida, cae al placeholder
        }
      }
    }
    return latestConfig.imagePlaceholder;
  }

  // ============================================================
  // REDIMENSIONAR IMAGEN DE BLOGGER SEGÚN LOS VALORES DE CONFIG
  // (misma técnica que optimizarImagen() en slideshow.bundle.js)
  // Ajusta latestConfig.imagenAncho / latestConfig.imagenAlto para cambiar el tamaño
  // ============================================================
  function optimizarImagen(url) {
    if (!url) return latestConfig.imagePlaceholder;
    try {
      const u = new URL(url);
      u.pathname = u.pathname.replace(/\/s\d+(?:-[^/]+)?\//i, `/w${latestConfig.imagenAncho}-h${latestConfig.imagenAlto}/`);
      return u.href;
    } catch {
      return url;
    }
  }

  // ============================================================
  // ACTUALIZAR VISIBILIDAD DEL BOTÓN "VER MÁS"
  // ============================================================
  function updateButtonVisibility(button, state) {
    if (!button) return;
    button.style.display = state.currentIndex >= state.posts.length ? 'none' : '';
  }

  // ============================================================
  // OBTENER URL DE LA PUBLICACIÓN
  // ============================================================
  function getPostUrl(entry) {
    const link = entry.link.find(l => l.rel === 'alternate');
    return link ? link.href : '#';
  }

  // ============================================================
  // ARRANQUE
  // ============================================================
  initLatestPosts();

})();
