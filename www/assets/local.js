// Compléments locaux : diaporama d'accueil et déclenchement des animations d'apparition Wix.
(function () {
  // Diaporama
  document.querySelectorAll('.cr-slideshow').forEach(function (box) {
    var slides = box.querySelectorAll('.cr-slide');
    if (slides.length < 2) return;
    var i = 0;
    setInterval(function () {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, 5000);
  });

  // Animations d'entrée : le CSS Wix les laisse en pause tant que data-motion-enter n'est pas "done".
  var animated = [];
  document.querySelectorAll('[id^="comp-"], [id^="mediai"]').forEach(function (el) {
    if (getComputedStyle(el).animationName !== 'none') animated.push(el);
  });
  if (!('IntersectionObserver' in window)) {
    animated.forEach(function (el) { el.setAttribute('data-motion-enter', 'done'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.style.animationPlayState = 'running';
      el.addEventListener('animationend', function () { el.setAttribute('data-motion-enter', 'done'); }, { once: true });
      io.unobserve(el);
    });
  }, { threshold: 0.1 });
  animated.forEach(function (el) { io.observe(el); });
})();
