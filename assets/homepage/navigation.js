// Anchor links work without JavaScript; this only marks the visible section.
const sectionLinks = [...document.querySelectorAll('.section-links a')];
const sections = sectionLinks.map(link => document.querySelector(link.hash));
let framePending = false;

function updateNavigation() {
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 140) current = section;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    current = sections[sections.length - 1];
  }
  for (const link of sectionLinks) {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  framePending = false;
}

function scheduleUpdate() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(updateNavigation);
}

window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate, { passive: true });
window.addEventListener('load', updateNavigation);
updateNavigation();
