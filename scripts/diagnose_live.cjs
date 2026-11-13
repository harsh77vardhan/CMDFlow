const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LIVE_URL = 'https://cmdflow.cmdflow.workers.dev';
const shotsDir = path.resolve(__dirname, '../docs/screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

function spawnBrave(port, dataDir) {
  return spawn('/usr/bin/brave', [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${dataDir}`,
    '--no-sandbox',
    'about:blank'
  ]);
}

async function connectCDP(port) {
  let cdpList = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) {
        cdpList = await res.json();
        break;
      }
    } catch {}
  }
  if (!cdpList) throw new Error(`Could not connect to CDP on port ${port}`);
  const page = cdpList.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  return { ws, send };
}

// Analyze PNG buffer for non-black pixel share in quadrants and edge discontinuity
function analyzeQuadrantsAndEdges(pngBuffer, width, height) {
  // Use a lightweight pure-JS PNG parser or raw RGB inspection
  // We can write PNG to disk and use node-canvas or pure-image or read with simple uncompressed/decode,
  // or use node script with an inline canvas in Brave!
}

async function captureDOMDiagnosis(send) {
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const vantaBg = document.querySelector('#vanta-bg');
      const canvas = vantaBg ? vantaBg.querySelector('canvas') : null;
      const mountHolder = canvas ? canvas.parentElement : null;

      function getAncestors(el) {
        const list = [];
        let curr = el;
        while (curr) {
          const cs = window.getComputedStyle(curr);
          list.push({
            tag: curr.tagName,
            id: curr.id,
            className: curr.className,
            opacity: cs.opacity,
            transition: cs.transition,
            animation: cs.animation,
            position: cs.position,
            zIndex: cs.zIndex
          });
          curr = curr.parentElement;
        }
        return list;
      }

      function getRect(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          id: el.id,
          cls: el.className,
          position: cs.position,
          width: r.width,
          height: r.height,
          top: r.top,
          left: r.left,
          styleWidth: el.style.width,
          styleHeight: el.style.height,
          csWidth: cs.width,
          csHeight: cs.height
        };
      }

      // Check for elements sitting above background with background color
      const obscuring = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el === vantaBg || vantaBg?.contains(el)) continue;
        const cs = window.getComputedStyle(el);
        const bg = cs.backgroundColor;
        const bgImg = cs.backgroundImage;
        if ((bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || (bgImg && bgImg !== 'none')) {
          const r = el.getBoundingClientRect();
          if (r.width > 50 && r.height > 50 && cs.position !== 'static') {
            obscuring.push({
              tag: el.tagName,
              id: el.id,
              cls: el.className,
              bg,
              bgImg: bgImg.slice(0, 80),
              rect: { top: r.top, left: r.left, width: r.width, height: r.height },
              zIndex: cs.zIndex
            });
          }
        }
      }

      // Check hero scrim specifically
      const heroCopy = document.querySelector('.hero-copy');
      let heroCopyBefore = null;
      if (heroCopy) {
        const ps = window.getComputedStyle(heroCopy, '::before');
        heroCopyBefore = {
          content: ps.content,
          background: ps.backgroundImage || ps.background,
          borderRadius: ps.borderRadius,
          position: ps.position,
          zIndex: ps.zIndex
        };
      }

      return {
        window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight, scrollY: window.scrollY },
        vantaBgRect: getRect(vantaBg),
        mountHolderRect: getRect(mountHolder),
        canvasRect: getRect(canvas),
        canvasAttrs: canvas ? { width: canvas.width, height: canvas.height } : null,
        ancestors: getAncestors(vantaBg),
        heroCopyBefore,
        obscuring: obscuring.slice(0, 10)
      };
    })()`,
    returnByValue: true
  });
  return res.result?.value;
}

// Compute quadrant non-black pixels directly inside browser page using a full-screen canvas snapshot
async function analyzeViewportPixels(send) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const dataUrl = 'data:image/png;base64,' + shot.data;
  const analysisRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const img = new Image();
      img.src = "${dataUrl}";
      await new Promise(r => img.onload = r);
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const w = cv.width;
      const h = cv.height;
      const idata = ctx.getImageData(0, 0, w, h).data;

      // 4 quadrants
      const midX = Math.floor(w / 2);
      const midY = Math.floor(h / 2);
      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
      let total1 = 0, total2 = 0, total3 = 0, total4 = 0;

      // Column and Row brightness profiles to detect step discontinuity
      const colLum = new Float64Array(w);
      const rowLum = new Float64Array(h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = idata[idx];
          const g = idata[idx + 1];
          const b = idata[idx + 2];
          // Non-black threshold: brightness > 8
          const isNonBlack = (r > 8 || g > 8 || b > 8);
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          colLum[x] += lum;
          rowLum[y] += lum;

          if (x < midX && y < midY) {
            total1++;
            if (isNonBlack) q1++;
          } else if (x >= midX && y < midY) {
            total2++;
            if (isNonBlack) q2++;
          } else if (x < midX && y >= midY) {
            total3++;
            if (isNonBlack) q3++;
          } else {
            total4++;
            if (isNonBlack) q4++;
          }
        }
      }

      // Normalize row and col luminosity
      for (let x = 0; x < w; x++) colLum[x] /= h;
      for (let y = 0; y < h; y++) rowLum[y] /= w;

      const share1 = q1 / total1;
      const share2 = q2 / total2;
      const share3 = q3 / total3;
      const share4 = q4 / total4;
      const avg = (share1 + share2 + share3 + share4) / 4;

      // Step discontinuity near x = 900 and y = 558
      // Sample difference in average luminosity across boundary [850..900] vs [900..950]
      const colStep900 = w > 950 ? (colLum[880] - colLum[920]) : 0;
      const rowStep558 = h > 600 ? (rowLum[540] - rowLum[580]) : 0;

      return {
        imageWidth: w,
        imageHeight: h,
        quadrants: {
          q1_topLeft: share1,
          q2_topRight: share2,
          q3_bottomLeft: share3,
          q4_bottomRight: share4,
          avg,
          q1_pct_of_avg: avg > 0 ? (share1 / avg) * 100 : 0,
          q2_pct_of_avg: avg > 0 ? (share2 / avg) * 100 : 0,
          q3_pct_of_avg: avg > 0 ? (share3 / avg) * 100 : 0,
          q4_pct_of_avg: avg > 0 ? (share4 / avg) * 100 : 0,
        },
        edgeDiscontinuity: {
          colStep900,
          rowStep558
        }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return { pixelData: analysisRes.result?.value, screenshotBuffer: Buffer.from(shot.data, 'base64') };
}

async function runDiagnosis() {
  const viewports = [
    { name: '1440x900', width: 1440, height: 900, mobile: false },
    { name: '1920x1080', width: 1920, height: 1080, mobile: false },
    { name: '390x844', width: 390, height: 844, mobile: true }
  ];

  const fullReport = {};

  for (let vp of viewports) {
    console.log(`\n========================================`);
    console.log(`DIAGNOSING VIEWPORT: ${vp.name}`);
    console.log(`========================================`);

    const port = 9550 + Math.floor(Math.random() * 100);
    const dataDir = `/tmp/diag-${vp.name}-${Date.now()}`;
    const brave = spawnBrave(port, dataDir);
    const { send } = await connectCDP(port);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });

    // Settle browser
    await new Promise(r => setTimeout(r, 1000));
    const navStart = Date.now();
    await send('Page.navigate', { url: LIVE_URL });

    const timingSamples = {};

    // 0.3s sample
    const delay03 = Math.max(0, 300 - (Date.now() - navStart));
    await new Promise(r => setTimeout(r, delay03));
    const diag03 = await captureDOMDiagnosis(send);
    const pix03 = await analyzeViewportPixels(send);
    fs.writeFileSync(path.join(shotsDir, `diag-before-${vp.name}-0.3s.png`), pix03.screenshotBuffer);
    timingSamples['0.3s'] = { dom: diag03, pixels: pix03.pixelData };

    // 1.0s sample
    const delay10 = Math.max(0, 1000 - (Date.now() - navStart));
    await new Promise(r => setTimeout(r, delay10));
    const diag10 = await captureDOMDiagnosis(send);
    const pix10 = await analyzeViewportPixels(send);
    fs.writeFileSync(path.join(shotsDir, `diag-before-${vp.name}-1.0s.png`), pix10.screenshotBuffer);
    timingSamples['1.0s'] = { dom: diag10, pixels: pix10.pixelData };

    // 3.0s sample
    const delay30 = Math.max(0, 3000 - (Date.now() - navStart));
    await new Promise(r => setTimeout(r, delay30));
    const diag30 = await captureDOMDiagnosis(send);
    const pix30 = await analyzeViewportPixels(send);
    fs.writeFileSync(path.join(shotsDir, `diag-before-${vp.name}-3.0s.png`), pix30.screenshotBuffer);
    timingSamples['3.0s'] = { dom: diag30, pixels: pix30.pixelData };

    // Scroll samples (at 3s+)
    const scrollSamples = {};
    const scrollTargets = [1000, 2500, 'bottom'];

    for (const st of scrollTargets) {
      await send('Runtime.evaluate', {
        expression: `window.scrollTo(0, ${st === 'bottom' ? 'document.body.scrollHeight' : st});`
      });
      await new Promise(r => setTimeout(r, 300));
      const sdiag = await captureDOMDiagnosis(send);
      const spix = await analyzeViewportPixels(send);
      fs.writeFileSync(path.join(shotsDir, `diag-before-${vp.name}-scroll-${st}.png`), spix.screenshotBuffer);
      scrollSamples[String(st)] = { dom: sdiag, pixels: spix.pixelData };
    }

    fullReport[vp.name] = {
      timing: timingSamples,
      scroll: scrollSamples
    };

    brave.kill('SIGKILL');
  }

  fs.writeFileSync(path.join(__dirname, 'step1_diagnosis.json'), JSON.stringify(fullReport, null, 2));
  console.log('Diagnosis written to scripts/step1_diagnosis.json');
}

runDiagnosis().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
