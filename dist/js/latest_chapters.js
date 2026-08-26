var latest_chapters = (function () {
	'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var latest_chapters_bundle$1 = {};

	var hasRequiredLatest_chapters_bundle;
	function requireLatest_chapters_bundle() {
	  if (hasRequiredLatest_chapters_bundle) return latest_chapters_bundle$1;
	  hasRequiredLatest_chapters_bundle = 1;
	  // ============================================================
	  // CONFIGURACIÓN
	  // ============================================================
	  const chapterConfig = {
	    maxResults: 150,
	    initialDisplay: 15,
	    batchSize: 5,
	    selectorContainer: '.chapter-list',
	    selectorCards: '.chapter-cards',
	    selectorMoreButton: '.chapter-more',
	    selectorFirstButton: '.chapter-first',
	    selectorLatestButton: '.chapter-latest',
	    selectorSortButton: '.chapter-sort',
	    imagePlaceholder: 'https://via.placeholder.com/400x200?text=Sin+Imagen'
	  };

	  // ============================================================
	  // INICIALIZACIÓN
	  // ============================================================
	  async function initChapterList() {
	    const containers = Array.from(document.querySelectorAll(chapterConfig.selectorContainer));
	    if (containers.length === 0) return;
	    const container = containers[0];
	    if (container.dataset.chapterLoaded === 'true') return;
	    container.dataset.chapterLoaded = 'true';
	    const tag = getTagFromStaticPage();
	    if (!tag) {
	      container.innerHTML = '<p>No se pudo determinar la etiqueta para esta página.</p>';
	      return;
	    }
	    try {
	      const allPosts = await fetchPostsByTag(tag);
	      if (allPosts.length === 0) {
	        container.innerHTML = `<p>No hay capítulos con la etiqueta "${tag}".</p>`;
	        return;
	      }

	      // Ordenar todas las publicaciones por fecha (para referencia)
	      allPosts.sort((a, b) => new Date(b.published.$t) - new Date(a.published.$t));

	      // Estado global
	      const state = {
	        allPosts: allPosts,
	        sortOrder: 'desc',
	        // 'desc' o 'asc'
	        currentIndex: 0,
	        flatItems: [] // lista plana de elementos a mostrar
	      };

	      // Elementos del DOM
	      const cardsContainer = container.querySelector(chapterConfig.selectorCards);
	      const moreButton = container.querySelector(chapterConfig.selectorMoreButton);
	      const firstButton = container.querySelector(chapterConfig.selectorFirstButton);
	      const latestButton = container.querySelector(chapterConfig.selectorLatestButton);
	      const sortButton = container.querySelector(chapterConfig.selectorSortButton);
	      cardsContainer.innerHTML = '';

	      // ============ FUNCIONES DE ORDEN Y AGRUPACIÓN ============

	      function extractSectionNumber(tag) {
	        const patterns = [/^(\d+)\.\s*/, /\(\s*(\d+)\s*\)$/, /^(\d+)\s*[-–]\s*/];
	        for (const pattern of patterns) {
	          const match = tag.match(pattern);
	          if (match) return parseInt(match[1], 10);
	        }
	        return null;
	      }
	      function extractSectionName(tag) {
	        const cleaned = tag.replace(/^\d+\.\s*/, '').replace(/\s*\(\d+\)\s*$/, '').replace(/^\d+\s*[-–]\s*/, '');
	        return cleaned.trim() || tag;
	      }

	      // Construye la lista plana de elementos (encabezados y posts) según el orden actual
	      function buildFlatItems() {
	        const uncategorized = [];
	        const sectionMap = new Map();

	        // Clasificar posts
	        state.allPosts.forEach(post => {
	          const tags = post.category ? post.category.map(cat => cat.term) : [];
	          let sectionNumber = null;
	          let sectionTag = null;
	          for (const tag of tags) {
	            const num = extractSectionNumber(tag);
	            if (num !== null) {
	              sectionNumber = num;
	              sectionTag = tag;
	              break;
	            }
	          }
	          if (sectionNumber === null) {
	            // Sin sección: guardar en uncategorized
	            uncategorized.push(post);
	          } else {
	            const name = extractSectionName(sectionTag);
	            const key = `${sectionNumber}_${name}`;
	            if (!sectionMap.has(key)) {
	              sectionMap.set(key, {
	                number: sectionNumber,
	                name,
	                posts: []
	              });
	            }
	            sectionMap.get(key).posts.push(post);
	          }
	        });

	        // Ordenar uncategorized por fecha según sortOrder
	        uncategorized.sort((a, b) => {
	          const dateA = new Date(a.published.$t);
	          const dateB = new Date(b.published.$t);
	          return state.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
	        });

	        // Obtener secciones como array y ordenar por número según sortOrder
	        let sections = Array.from(sectionMap.values());
	        sections.sort((a, b) => {
	          return state.sortOrder === 'desc' ? b.number - a.number : a.number - b.number;
	        });

	        // Dentro de cada sección, ordenar posts por fecha según sortOrder
	        sections.forEach(section => {
	          section.posts.sort((a, b) => {
	            const dateA = new Date(a.published.$t);
	            const dateB = new Date(b.published.$t);
	            return state.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
	          });
	        });

	        // Construir flatItems: primero los uncategorized (sin encabezado), luego las secciones con encabezado
	        const flat = [];
	        // Añadir posts sin sección
	        uncategorized.forEach(post => {
	          flat.push({
	            type: 'post',
	            data: post
	          });
	        });
	        // Añadir secciones
	        sections.forEach(section => {
	          flat.push({
	            type: 'header',
	            data: section
	          });
	          section.posts.forEach(post => {
	            flat.push({
	              type: 'post',
	              data: post
	            });
	          });
	        });
	        return flat;
	      }

	      // ============ FUNCIONES DE RENDERIZADO ============

	      function createChapterCard(post) {
	        const postUrl = getPostUrl(post);
	        const title = post.title.$t;
	        let thumbnail = chapterConfig.imagePlaceholder;
	        if (post.media$thumbnail) {
	          thumbnail = post.media$thumbnail.url.replace(/s72-c/, 's400');
	        }
	        const card = document.createElement('div');
	        card.className = 'chapter-card';
	        const link = document.createElement('a');
	        link.className = 'chapter-card-link';
	        link.href = postUrl;
	        link.setAttribute('aria-label', title);
	        const image = document.createElement('img');
	        image.src = thumbnail;
	        image.alt = title;
	        image.className = 'chapter-card-image';
	        image.loading = 'lazy';
	        if (thumbnail === chapterConfig.imagePlaceholder && postUrl && postUrl !== '#') {
	          fetchRealImage(postUrl, image);
	        }
	        const titleElement = document.createElement('h3');
	        titleElement.className = 'chapter-card-title';
	        titleElement.textContent = title;
	        link.appendChild(image);
	        link.appendChild(titleElement);
	        card.appendChild(link);
	        return card;
	      }
	      function renderNext() {
	        const flat = state.flatItems;
	        const endIndex = Math.min(state.currentIndex + chapterConfig.initialDisplay, flat.length);
	        const itemsToShow = flat.slice(state.currentIndex, endIndex);
	        state.currentIndex = endIndex;
	        itemsToShow.forEach(item => {
	          if (item.type === 'header') {
	            const header = document.createElement('div');
	            header.className = 'chapter-section-header';
	            header.textContent = `${item.data.number}. ${item.data.name}`;
	            cardsContainer.appendChild(header);
	          } else {
	            const card = createChapterCard(item.data);
	            cardsContainer.appendChild(card);
	          }
	        });
	        updateButtonVisibility(moreButton, state, flat.length);
	      }

	      // ============ FUNCIONES DE CONTROL ============

	      function updateButtonVisibility(button, state, total) {
	        if (!button) return;
	        if (state.currentIndex >= total) {
	          button.style.display = 'none';
	        } else {
	          button.style.display = '';
	        }
	      }
	      function loadMore() {
	        renderNext();
	      }
	      function refreshView() {
	        state.flatItems = buildFlatItems();
	        state.currentIndex = 0;
	        cardsContainer.innerHTML = '';
	        renderNext();
	        sortButton.textContent = state.sortOrder === 'desc' ? 'Orden: más recientes' : 'Orden: primeros';
	      }

	      // ============ EVENTOS DE BOTONES ============

	      firstButton.addEventListener('click', () => {
	        const oldest = state.allPosts.reduce((a, b) => new Date(a.published.$t) < new Date(b.published.$t) ? a : b);
	        if (oldest) window.location.href = getPostUrl(oldest);
	      });
	      latestButton.addEventListener('click', () => {
	        const newest = state.allPosts.reduce((a, b) => new Date(a.published.$t) > new Date(b.published.$t) ? a : b);
	        if (newest) window.location.href = getPostUrl(newest);
	      });
	      sortButton.addEventListener('click', () => {
	        state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
	        refreshView();
	      });

	      // ============ INICIALIZACIÓN ============

	      state.flatItems = buildFlatItems();
	      renderNext();
	      moreButton.addEventListener('click', loadMore);
	      container._chapterState = state;
	    } catch (error) {
	      console.error('Error al cargar los capítulos:', error);
	      container.innerHTML = '<p>Error al cargar los capítulos.</p>';
	    }
	  }

	  // ============================================================
	  // FUNCIONES AUXILIARES (sin cambios)
	  // ============================================================

	  function getTagFromStaticPage() {
	    const path = window.location.pathname;
	    const match = path.match(/\/p\/([^/]+?)(?:\.html)?$/);
	    if (match && match[1]) {
	      let tag = decodeURIComponent(match[1]);
	      // Opcional: reemplazar guiones por espacios si se usan así en las etiquetas
	      // tag = tag.replace(/-/g, ' ');
	      return tag;
	    }
	    return null;
	  }
	  async function fetchPostsByTag(tag) {
	    const feedUrl = `${window.location.origin}/feeds/posts/default/-/${encodeURIComponent(tag)}?alt=json&max-results=${chapterConfig.maxResults}&orderby=published&thumbs=1`;
	    const response = await fetch(feedUrl);
	    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
	    const data = await response.json();
	    return data.feed.entry || [];
	  }
	  function getPostUrl(entry) {
	    const link = entry.link.find(l => l.rel === 'alternate');
	    return link ? link.href : '#';
	  }
	  async function obtenerImagenDePagina(url) {
	    try {
	      const response = await fetch(url);
	      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
	      const html = await response.text();
	      const parser = new DOMParser();
	      const doc = parser.parseFromString(html, 'text/html');
	      const metaOg = doc.querySelector('meta[property="og:image"]');
	      if (metaOg && metaOg.content) {
	        return metaOg.content;
	      }
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
	  async function fetchRealImage(postUrl, imgElement) {
	    try {
	      const realImage = await obtenerImagenDePagina(postUrl);
	      if (realImage) {
	        imgElement.src = realImage;
	      }
	    } catch (error) {
	      console.debug('Imagen no encontrada para', postUrl);
	    }
	  }

	  // ============================================================
	  // ARRANQUE
	  // ============================================================
	  initChapterList();
	  return latest_chapters_bundle$1;
	}

	var latest_chapters_bundleExports = requireLatest_chapters_bundle();
	var latest_chapters_bundle = /*@__PURE__*/getDefaultExportFromCjs(latest_chapters_bundleExports);

	return latest_chapters_bundle;

})();
