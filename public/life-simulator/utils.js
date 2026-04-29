function showToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
    background:var(--bg3); border:1px solid var(--accent);
    color:var(--text); padding:10px 20px; border-radius:8px;
    font-size:0.85rem; z-index:9999; animation:fadeIn 0.3s ease;
    box-shadow: 0 4px 20px var(--glow);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${Math.random() * 15 + 10}s;
      animation-delay:${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.showToast = showToast;
window.LifeSimulator.initParticles = initParticles;
