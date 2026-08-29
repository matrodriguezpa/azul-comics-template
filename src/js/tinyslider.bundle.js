// Tiny Slider
import { tns } from 'tiny-slider/src/tiny-slider';

var slider = tns({
    container: '#rewind',
    rewind: true,
    items: 4,
    slideBy: 'page',
    autoplay: true,
    swipeAngle: false,
    speed: 400,
    // Deshabilitar controles de navegación
    //controls: false,

    // Deshabilitar paginación
    nav: false,

    // Deshabilitar botón de autoplay
    //autoplayButton: false,

    // Opcional: deshabilitar el control de autoplay completamente
    autoplayHoverPause: false,
    autoplayButtonOutput: false,

    responsive: {
    0: {
      items: 3
    },
    //768: {
    //  items: 3
    //},
    1024: {
      items: 4
    }
  }

});
