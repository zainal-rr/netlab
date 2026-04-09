// ============================================
// NetLab — Animated Canvas Background
// Falling leaves + network node pulse
// ============================================

(function () {
  const canvas = document.getElementById('netlab-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  // ── Nodes (network graph) ──────────────────
  const NODE_COUNT = 28;
  const nodes = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1.5 + Math.random() * 2,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.015 + Math.random() * 0.02,
    });
  }

  // ── Leaves ────────────────────────────────
  const LEAF_COUNT = 18;
  const LEAF_CHARS = ['🍂', '🍁', '🌿'];
  const leaves = [];

  for (let i = 0; i < LEAF_COUNT; i++) {
    leaves.push(makeLeaf(true));
  }

  function makeLeaf(initial = false) {
    return {
      x: Math.random() * window.innerWidth,
      y: initial ? Math.random() * window.innerHeight : -40,
      vy: 0.3 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      size: 10 + Math.random() * 10,
      char: LEAF_CHARS[Math.floor(Math.random() * LEAF_CHARS.length)],
      opacity: 0.08 + Math.random() * 0.12,
    };
  }

  // ── Draw ──────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nodes + edges
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Move
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += n.pulseSpeed;

      // Wrap
      if (n.x < -50) n.x = canvas.width + 50;
      if (n.x > canvas.width + 50) n.x = -50;
      if (n.y < -50) n.y = canvas.height + 50;
      if (n.y > canvas.height + 50) n.y = -50;

      // Edges to nearby nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const dx = n.x - m.x;
        const dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.18;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = `rgba(224, 120, 64, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Node dot
      const pulseFactor = 0.6 + 0.4 * Math.sin(n.pulse);
      const alpha = 0.25 + 0.35 * pulseFactor;
      const glowR = n.r * (1 + 0.8 * pulseFactor);

      // Outer glow
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR * 4);
      grad.addColorStop(0, `rgba(224,120,64,${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(224,120,64,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224,120,64,${alpha + 0.2})`;
      ctx.fill();
    }

    // Leaves
    ctx.save();
    for (const leaf of leaves) {
      leaf.x  += leaf.vx;
      leaf.y  += leaf.vy;
      leaf.rot += leaf.rotSpeed;

      if (leaf.y > canvas.height + 50) {
        Object.assign(leaf, makeLeaf(false));
      }

      ctx.save();
      ctx.globalAlpha = leaf.opacity;
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.font = `${leaf.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(leaf.char, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    requestAnimationFrame(draw);
  }

  draw();
})();
