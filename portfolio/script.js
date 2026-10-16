(() => {
  'use strict';
  const projects = Object.fromEntries([...document.querySelectorAll('article.project')].map(article => {
    const img = article.querySelector('img');
    return [article.id, {src: img.getAttribute('src'), alt: img.alt, title: article.querySelector('h3 a').childNodes[0].textContent.trim(), medium: article.querySelector('.medium').textContent}];
  }));
  const stage = document.querySelector('.stage-art');
  const stageImage = document.querySelector('#stage-image');
  const dialog = document.querySelector('#art-viewer');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)');
  let active = 'cycling';
  let opener;
  let currentAnimation;
  function select(id) {
    if (!projects[id] || id === active) return;
    const project = projects[id];
    active = id;
    stage.dataset.project = id;
    stage.href = project.src;
    stage.setAttribute('aria-label', `查看 ${project.title} 大图`);
    stageImage.src = project.src;
    stageImage.alt = project.alt;
    document.querySelector('#stage-title').textContent = project.title;
    document.querySelector('#stage-medium').textContent = project.medium;
    document.querySelectorAll('[data-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.select === id)));
    document.querySelectorAll('article.project').forEach(article => article.classList.toggle('is-selected', article.id === id));
    currentAnimation?.cancel();
    if (motionOK.matches) currentAnimation = stageImage.animate([{opacity: .2, transform: 'scale(.985)'}, {opacity: 1, transform:'scale(1)'}], {duration:380, easing:'ease-out'});
  }
  document.querySelector('.stage-controls').hidden = false;
  document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => select(button.dataset.select)));
  document.querySelectorAll('article.project').forEach(article => {
    article.addEventListener('pointerenter', event => {if (event.pointerType === 'mouse') select(article.id);});
    article.addEventListener('focusin', () => select(article.id));
  });
  function close() { dialog.close(); }
  document.querySelector('#close-viewer').addEventListener('click', close);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const first = document.querySelector('#close-viewer');
    const last = document.querySelector('#download-art');
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    document.querySelector('#viewer-image').removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => {if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  }});
  document.querySelectorAll('[data-viewer]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || !dialog.showModal) return;
    const project = projects[link.dataset.project];
    if (!project) return;
    event.preventDefault();
    opener = link;
    select(link.dataset.project);
    document.querySelector('#viewer-title').textContent = project.title;
    document.querySelector('#viewer-description').textContent = project.medium;
    const image = document.querySelector('#viewer-image');
    image.src = project.src; image.alt = project.alt;
    document.querySelector('#download-art').href = project.src;
    document.body.classList.add('viewer-open');
    dialog.showModal();
    document.querySelector('#close-viewer').focus();
  }));
  // Animate only after observation: the document stays readable without JavaScript.
  if ('IntersectionObserver' in window && Element.prototype.animate) {
    const pieces = document.querySelectorAll('.brand, .site-header nav a, .intro h1, .intro-description, .intro .button, .intro-note, .section-heading h2, .section-heading p, .project-picture, .project-copy h3, .project-copy p, .about h2, .letter p, .signoff, .contact h2, .contact p, .contact figure, .contact-links a, .footer-copy h2, .footer-copy nav a');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (!motionOK.matches) return;
        const el = entry.target;
        const isPicture = el.matches('.project-picture, .contact figure');
        const isRow = el.matches('.project-copy h3, .contact-links a, .footer-copy nav a');
        // Rotate the contact artwork as a whole; never redraw its image.
        const base = el.matches('.contact figure') ? 'rotate(-5deg)' : '';
        const start = isPicture ? `${base} scale(.97)` : isRow ? 'translateX(18px)' : 'translateY(22px)';
        el.animate([{opacity:.35, transform:start}, {opacity:1, transform:base || 'none'}], {
          duration: isPicture ? 1000 : 800,
          delay: Number(el.dataset.motionOrder || 0) * 70,
          easing:'cubic-bezier(.22,1,.36,1)',
        });
      });
    }, {threshold:.12});
    pieces.forEach((el, index) => {el.dataset.motionOrder = index % 3; observer.observe(el);});
    motionOK.addEventListener('change', () => {
      if (!motionOK.matches) document.getAnimations().forEach(animation => animation.cancel());
    });
  }
})();
