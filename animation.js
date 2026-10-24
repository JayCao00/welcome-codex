/* Knot proportions adapted from Bootstrap Icons. See THIRD_PARTY_NOTICES.md. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const sceneDuration = 10.2, playbackRate = 0.8;
  const duration = Number((sceneDuration / playbackRate).toFixed(3));
  const appearanceMedia = matchMedia('(prefers-color-scheme: dark)');
  const themes = {
    light: {
      background: '#ffffff',
      // Keep the rainbow vivid on white, with clear orange/yellow and saturated greens.
      palette: ['#ff315d', '#ff861c', '#f2bf00', '#28c578', '#00b6d3', '#4e7cff', '#a15af2', '#ee51b0', '#ff6258'],
      reflection: '#ffffff', shine: .08
    },
    dark: {
      background: '#181818',
      palette: ['#ff516b', '#ff943c', '#ffdb36', '#65d99b', '#23c5dc', '#6487f4', '#ac6ce8', '#ed74b5', '#ff776b'],
      reflection: '#d8f5ff', shine: .16
    }
  };
  // The optional query is for inspecting both themes without changing macOS settings.
  const requestedAppearance = new URLSearchParams(location.search).get('appearance');
  const appearanceOverride = ['light', 'dark'].includes(requestedAppearance) ? requestedAppearance : null;
  let appearance = appearanceOverride || (appearanceMedia.matches ? 'dark' : 'light');
  let theme = themes[appearance], palette = theme.palette;
  document.documentElement.dataset.appearance = appearance;
  let materialTime = 0;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const glide = v => { const t = clamp(v); return t*t*t*(t*(6*t-15)+10); };
  const phase = (t, a, b) => clamp((t - a) / (b - a));
  const xy = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

  class Pen {
    constructor(x, y) { this.points = [[x, y]]; }
    c(x1, y1, x2, y2, x, y) {
      const [ax, ay] = this.points.at(-1);
      for (let i = 1; i <= 48; i++) {
        const t = i / 48, s = 1 - t;
        this.points.push([s*s*s*ax + 3*s*s*t*x1 + 3*s*t*t*x2 + t*t*t*x,
          s*s*s*ay + 3*s*s*t*y1 + 3*s*t*t*y2 + t*t*t*y]);
      }
      return this;
    }
  }
  // Clear letter counters and two distinct m shoulders keep the script legible.
  const welcome = new Pen(3, 48)
    .c(-3, 61, -10, 91, 2, 91).c(12, 91, 23, 65, 29, 47)
    .c(23, 66, 17, 91, 30, 91).c(47, 91, 65, 60, 64, 46)
    .c(62, 41, 57, 44, 59, 52).c(62, 66, 70, 71, 79, 62)
    .c(119, 34, 121, 57, 82, 74).c(63, 92, 95, 105, 120, 81)
    .c(149, 55, 186, -7, 171, -3).c(149, 3, 127, 63, 132, 84)
    .c(137, 98, 150, 92, 166, 77)
    .c(191, 46, 210, 43, 202, 56).c(177, 43, 163, 94, 189, 94)
    .c(206, 94, 220, 77, 230, 66)
    .c(254, 37, 273, 50, 256, 78).c(234, 115, 212, 88, 232, 60)
    .c(249, 38, 266, 49, 260, 68).c(263, 83, 276, 79, 288, 61)
    .c(299, 42, 304, 43, 298, 61).c(292, 76, 288, 87, 289, 91)
    .c(300, 73, 324, 41, 329, 52).c(330, 60, 312, 85, 317, 91)
    .c(329, 73, 351, 43, 357, 53).c(361, 65, 336, 90, 350, 92)
    .c(362, 94, 373, 80, 384, 67)
    .c(416, 40, 430, 49, 396, 70).c(370, 86, 395, 105, 429, 80);
  const jay = new Pen(500, 12)
    .c(517, -3, 548, -6, 550, 9).c(555, 37, 537, 98, 514, 115)
    .c(491, 132, 470, 117, 480, 104).c(494, 87, 519, 112, 555, 75)
    .c(583, 43, 598, 44, 592, 58).c(563, 42, 546, 107, 573, 88)
    .c(590, 76, 599, 52, 596, 57).c(579, 101, 600, 99, 618, 73)
    .c(634, 45, 632, 44, 626, 61).c(610, 97, 628, 100, 645, 77)
    .c(661, 56, 663, 43, 660, 53).c(651, 95, 633, 131, 614, 138)
    .c(585, 148, 619, 110, 654, 94).c(682, 81, 700, 86, 724, 75);

  const toScene = points => points.map(([x, y]) => [202 + x * 1.65, 356 + y * 1.65]);
  const title = [toScene(welcome.points), toScene(jay.points)];
  const end = title[1].at(-1);
  const wave = new Pen(...end)
    .c(1490, 445, 1530, 270, 1622, 315)
    .c(1735, 370, 1772, 605, 1890, 548)
    .c(2030, 480, 2130, 414, 2250, 420);

  function measure(points) {
    let length = 0;
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i][0] - points[i-1][0], points[i][1] - points[i-1][1]);
      lengths.push(length);
    }
    return { points, lengths, length };
  }
  const words = title.map(measure), ribbon = measure(wave.points);
  function pointAt(line, progress) {
    const distance = clamp(progress) * line.length;
    let i = line.lengths.findIndex(v => v >= distance);
    if (i <= 0) return line.points[0];
    return xy(line.points[i-1], line.points[i], (distance - line.lengths[i-1]) / (line.lengths[i] - line.lengths[i-1]));
  }
  function pathRange(line, from = 0, to = 1) {
    const p = new Path2D(), start = pointAt(line, from);
    p.moveTo(...start);
    for (let i = 1; i < line.points.length; i++) {
      const fraction = line.lengths[i] / line.length;
      if (fraction > from && fraction < to) p.lineTo(...line.points[i]);
    }
    p.lineTo(...pointAt(line, to));
    return p;
  }
  function rainbow(x1, y1, x2, y2) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    palette.forEach((color, i) => gradient.addColorStop(i / (palette.length - 1), color));
    return gradient;
  }
  function reflectionInk(context) {
    const glintX = 800+Math.sin(materialTime*.8)*340;
    const reflection = context.createLinearGradient(glintX-180,260,glintX+180,640);
    reflection.addColorStop(0,'#ffffff00');
    reflection.addColorStop(.44,'#ffffff00');
    reflection.addColorStop(.58,theme.reflection);
    reflection.addColorStop(.78,'#ffffff00');
    reflection.addColorStop(1,'#ffffff00');
    return reflection;
  }
  function stroke(path, color, width = 12, context = ctx) {
    context.save();
    context.lineCap = 'round'; context.lineJoin = 'round';
    context.strokeStyle = color; context.lineWidth = width; context.stroke(path);
    context.globalAlpha = theme.shine; context.strokeStyle = reflectionInk(context);
    context.stroke(path);
    context.restore();
  }
  const cx = 800, cy = 450, markSize = 302;
  // Close every contour explicitly: fill() closes implicitly, stroke() does not.
  // Absolute moves keep each contour in place when the preceding one closes.
  const silhouette = new Path2D("M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716ZM8.852 14.952a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996ZM2.322 12.202a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098ZM1.473 5.262A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094ZM12.689 7.833L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445ZM14.049 5.819l-.097 -.057 -3.226 -1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664ZM5.503 8.575L4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455ZM6.245 6.998l1.758 -1 1.762 1v2l-1.755 1-1.762-1z");
  const inkLayer = document.createElement('canvas'), clipLayer = document.createElement('canvas');
  const inkContext = inkLayer.getContext('2d'), clipContext = clipLayer.getContext('2d');
  function roundedLine(points) {
    const pen = new Pen(...points[0]);
    for (let i = 0; i < points.length-1; i++) {
      const a = points[Math.max(0,i-1)], b = points[i];
      const c = points[i+1], d = points[Math.min(points.length-1,i+2)];
      pen.c(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,
        c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,...c);
    }
    return measure(pen.points);
  }
  const samples = 192;
  const root = [610,420];
  const petals = window.WelcomeJayKnot.map(points => {
    const final = roundedLine(points.map(([x,y]) => [cx+(x-8)*markSize/16,cy+(y-8)*markSize/16]));
    return measure(Array.from({length:samples+1},(_,i)=>pointAt(final,i/samples)));
  });
  function paintFlow(leads,body,ink,width) {
    for (const layer of [inkLayer,clipLayer]) {
      if (layer.width !== canvas.width || layer.height !== canvas.height) {
        layer.width = canvas.width; layer.height = canvas.height;
      }
    }
    const transform = ctx.getTransform();
    for (const context of [inkContext,clipContext]) {
      context.setTransform(1,0,0,1,0,0);
      context.clearRect(0,0,canvas.width,canvas.height);
      context.setTransform(transform);
    }
    inkContext.strokeStyle = '#fff'; inkContext.lineWidth = 24;
    inkContext.lineCap = 'round'; inkContext.lineJoin = 'round'; inkContext.stroke(body);
    clipContext.translate(cx-markSize/2,cy-markSize/2);
    clipContext.scale(markSize/16,markSize/16);
    clipContext.fillStyle = '#fff'; clipContext.fill(silhouette);
    clipContext.globalCompositeOperation = 'destination-out';
    clipContext.strokeStyle = '#fff'; clipContext.lineWidth = .35;
    clipContext.lineJoin = 'round'; clipContext.stroke(silhouette);
    clipContext.globalCompositeOperation = 'source-over';
    inkContext.setTransform(1,0,0,1,0,0);
    inkContext.globalCompositeOperation = 'destination-in';
    inkContext.drawImage(clipLayer,0,0);
    inkContext.globalCompositeOperation = 'source-over';
    inkContext.setTransform(transform);
    inkContext.strokeStyle = '#fff'; inkContext.lineWidth = width; inkContext.stroke(leads);
    // Color the union once. A shared junction cannot accumulate paint layers.
    inkContext.globalCompositeOperation = 'source-in';
    inkContext.fillStyle = ink; inkContext.fillRect(-4000,-4000,8000,8000);
    inkContext.globalCompositeOperation = 'source-atop';
    inkContext.globalAlpha = theme.shine; inkContext.fillStyle = reflectionInk(inkContext);
    inkContext.fillRect(-4000,-4000,8000,8000);
    inkContext.globalAlpha = 1; inkContext.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(inkLayer,0,0); ctx.restore();
  }
  function flowingKnot(t,pan) {
    const spread = glide(phase(t,6.65,7.15));
    const grow = glide(phase(t,7,8.65));
    const absorb = glide(phase(t,6.95,7.8));
    const zoom = 1+.75*glide(phase(t,8.95,10.2));
    ctx.save(); ctx.translate(cx,cy); ctx.scale(zoom,zoom); ctx.translate(-cx,-cy);
    const colorShift = glide(phase(t,6.65,7.3));
    const ink = ctx.createLinearGradient(cx-markSize/2,cy-80,cx+markSize/2,cy+80);
    const initial = palette.at(-1).slice(1).match(/../g).map(v=>parseInt(v,16));
    palette.forEach((color,i) => {
      const rgb = color.slice(1).match(/../g).map((v,j)=>Math.round(mix(initial[j],parseInt(v,16),colorShift)));
      ink.addColorStop(i/(palette.length-1),`rgb(${rgb.join(',')})`);
    });
    const leads = new Path2D(), body = new Path2D();
    petals.forEach((petal,i) => {
      const points = petal.points;
      const entry = points[0], next = points[1];
      const tangentLength = Math.hypot(next[0]-entry[0],next[1]-entry[1]);
      const tangent = tangentLength ? [(next[0]-entry[0])/tangentLength,(next[1]-entry[1])/tangentLength] : [1,0];
      const pull = Math.min(90,Math.hypot(entry[0]-root[0],entry[1]-root[1])*.4);
      const bridge = measure(new Pen(...root).c(root[0]+pull,root[1],
        entry[0]-tangent[0]*pull,entry[1]-tangent[1]*pull,...entry).points);
      const leadLength = ribbon.length+bridge.length;
      const head = ribbon.length+bridge.length*spread+petal.length*grow;
      const lead = measure([...ribbon.points.map(([x,y])=>[x-pan,y]),...bridge.points.slice(1)]);
      if (absorb < 1) leads.addPath(pathRange(lead,absorb,Math.min(1,head/leadLength)));
      if (head > leadLength) body.addPath(pathRange(petal,0,(head-leadLength)/petal.length));
    });
    const width = mix(12,16,glide(phase(t,6.65,7.15)));
    paintFlow(leads,body,ink,width);
    ctx.restore();
  }

  let viewport = { width: 1, height: 1, ratio: 1 };
  function resize() {
    viewport = { width: innerWidth, height: innerHeight, ratio: Math.max(1, devicePixelRatio || 1) };
    canvas.width = Math.round(viewport.width * viewport.ratio);
    canvas.height = Math.round(viewport.height * viewport.ratio);
    render(currentTime);
  }
  function render(time) {
    const elapsed = clamp(time, 0, duration);
    const t = elapsed * playbackRate;
    materialTime = t < 2.72 ? t : t < 3.27 ? 2.72 : t-.55;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const fit = Math.min(viewport.width / 1600, viewport.height / 900);
    const ratio = viewport.ratio;
    ctx.setTransform(fit*ratio, 0, 0, fit*ratio, (viewport.width - 1600*fit)/2*ratio, (viewport.height - 900*fit)/2*ratio);
    const pan = 1640 * glide(phase(t, 5.3, 6.65));
    const waveProgress = glide(phase(t, 5.3, 6.65));
    ctx.save(); ctx.translate(-pan, 0);
    const ink = rainbow(202, 390, 1398, 500);
    const writing = [phase(t,.2,2.72),phase(t,3.27,5)];
    for (let i = 0; i < words.length; i++) {
      if (writing[i] && t < 6.65) stroke(pathRange(words[i],0,writing[i]),ink);
    }
    if (waveProgress && t < 6.65) stroke(pathRange(ribbon, 0, waveProgress), ink);
    ctx.restore();
    if (t >= 6.65) flowingKnot(t,pan);
    currentTime = elapsed;
    canvas.dataset.time = elapsed.toFixed(3);
    canvas.dataset.appearance = appearance;
    canvas.dataset.stage = t < 2.72 ? 'welcome' : t < 3.27 ? 'pause' : t < 5 ? 'jay' : t < 5.3 ? 'title' : t < 6.65 ? 'ribbon' : t < 8.7 ? 'forming' : t < 8.95 ? 'mark' : 'zoom';
  }
  let currentTime = 0, playing = true, start = performance.now(), frame = 0, notified = false;
  function tick(now) {
    if (playing) {
      const time = (now - start) / 1000;
      render(Math.min(time, duration));
      if (time >= duration && !notified) {
        notified = true;
        if (window.webkit?.messageHandlers?.boot) {
          playing = false;
          window.webkit.messageHandlers.boot.postMessage('complete');
        }
      }
      if (time > duration + .8 && !window.webkit?.messageHandlers?.boot) {
        start = now; notified = false;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  window.WelcomeJay = Object.freeze({
    duration, sceneDuration, playbackRate,
    pause() { playing = false; },
    play() { start = performance.now() - currentTime*1000; playing = true; notified = false; },
    renderAt(time) { playing = false; render(time); },
    get time() { return currentTime; },
    get stage() { return canvas.dataset.stage; },
    get appearance() { return appearance; },
    get dimensions() { return { ...viewport, pixelWidth: canvas.width, pixelHeight: canvas.height }; }
  });
  addEventListener('resize', resize);
  appearanceMedia.addEventListener('change', () => {
    if (appearanceOverride) return;
    appearance = appearanceMedia.matches ? 'dark' : 'light';
    theme = themes[appearance]; palette = theme.palette;
    document.documentElement.dataset.appearance = appearance;
    render(currentTime);
  });
  addEventListener('pagehide', () => cancelAnimationFrame(frame));
  addEventListener('keydown', event => {
    if (event.code === 'Space') { event.preventDefault(); if (playing) window.WelcomeJay.pause(); else window.WelcomeJay.play(); }
  });
  resize();
  const reviewTime = new URLSearchParams(location.search).get('time');
  if (reviewTime !== null && reviewTime.trim() !== '' && Number.isFinite(Number(reviewTime))) {
    playing = false; render(Number(reviewTime));
  }
  requestAnimationFrame(tick);
  window.webkit?.messageHandlers?.boot?.postMessage('ready');
})();
