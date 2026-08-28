(function () {
  'use strict';

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================
  const latestConfig = {
    maxResults: 150,
    // Máximo de posts a obtener
    initialDisplay: 3,
    // Posts mostrados al inicio
    batchSize: 5,
    // Posts añadidos al pulsar "Ver más"
    blockedTags: ['novedades'],
    // Etiquetas bloqueadas globalmente
    selectorContainer: '.latest-posts',
    selectorCards: '.latest-cards',
    selectorMoreButton: '.latest-more',
    imagePlaceholder: 'https://via.placeholder.com/400x200?text=Sin+Imagen'
  };

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  async function initLatestPosts() {
    const containers = Array.from(document.querySelectorAll(latestConfig.selectorContainer));
    if (containers.length === 0) return;
    await Promise.all(containers.map(processContainer));
  }

  // ============================================================
  // PROCESA UN CONTENEDOR
  // ============================================================
  async function processContainer(container) {
    if (container.dataset.latestLoaded === 'true') return;
    container.dataset.latestLoaded = 'true';

    // Obtener la categoría desde el ancestro con clase 'section' (o el propio contenedor)
    const section = container.closest('.section') || container.parentElement;
    // Si el id de la sección es 'latest' o no existe, no se filtra por categoría
    const category = section && section.id && section.id.toLowerCase() !== 'latest' ? section.id : null;
    try {
      const posts = await fetchAndFilterPosts(category);
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

      // Función para renderizar el siguiente lote
      function renderNext() {
        const endIndex = Math.min(state.currentIndex + latestConfig.initialDisplay, state.posts.length);
        const postsToShow = state.posts.slice(state.currentIndex, endIndex);
        state.currentIndex = endIndex;
        postsToShow.forEach(post => {
          const card = createCard(post);
          cardsContainer.appendChild(card);
        });
        updateButtonVisibility(moreButton, state);
      }

      // Función para cargar más al hacer clic
      function loadMore() {
        const endIndex = Math.min(state.currentIndex + latestConfig.batchSize, state.posts.length);
        const postsToShow = state.posts.slice(state.currentIndex, endIndex);
        state.currentIndex = endIndex;
        postsToShow.forEach(post => {
          const card = createCard(post);
          cardsContainer.appendChild(card);
        });
        updateButtonVisibility(moreButton, state);
      }

      // Render inicial
      renderNext();

      // Evento del botón "Ver más"
      moreButton.addEventListener('click', loadMore);
    } catch (error) {
      console.error('Error al cargar los posts:', error);
      container.innerHTML = '<p>Error al cargar las publicaciones.</p>';
    }
  }

  // ============================================================
  // OBTENER Y FILTRAR POSTS DESDE EL FEED
  // ============================================================
  async function fetchAndFilterPosts(category) {
    const feedUrl = `${window.location.origin}/feeds/posts/default?alt=json&max-results=${latestConfig.maxResults}&orderby=published&thumbs=1`;
    const response = await fetch(feedUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    const entries = data.feed.entry || [];
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

    // Obtener miniatura del feed
    let thumbnail = latestConfig.imagePlaceholder;
    if (post.media$thumbnail) {
      thumbnail = post.media$thumbnail.url.replace(/s72-c/, 's400');
    }

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

    // Si la imagen es el placeholder, intentar obtener la real desde la página
    if (thumbnail === latestConfig.imagePlaceholder && postUrl && postUrl !== '#') {
      fetchRealImage(postUrl, image);
    }

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
  // ACTUALIZAR VISIBILIDAD DEL BOTÓN "VER MÁS"
  // ============================================================
  function updateButtonVisibility(button, state) {
    if (!button) return;
    if (state.currentIndex >= state.posts.length) {
      button.style.display = 'none';
    } else {
      button.style.display = '';
    }
  }

  // ============================================================
  // OBTENER URL DE LA PUBLICACIÓN
  // ============================================================
  function getPostUrl(entry) {
    const link = entry.link.find(l => l.rel === 'alternate');
    return link ? link.href : '#';
  }

  // ============================================================
  // OBTENER IMAGEN REAL DESDE LA PÁGINA (igual que en slideshow)
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

  // ============================================================
  // ACTUALIZAR IMAGEN DE LA TARJETA CUANDO SE OBTIENE LA REAL
  // ============================================================
  async function fetchRealImage(postUrl, imgElement) {
    try {
      const realImage = await obtenerImagenDePagina(postUrl);
      if (realImage) {
        imgElement.src = realImage;
      }
    } catch (error) {
      // Si falla, se queda con el placeholder
      console.debug('Imagen no encontrada para', postUrl);
    }
  }

  // ============================================================
  // ARRANQUE
  // ============================================================
  initLatestPosts();

})();
