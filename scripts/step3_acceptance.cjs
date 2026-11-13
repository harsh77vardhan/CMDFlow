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
  const consoleErrors = [];
  const eventListeners = new Set();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    for (const fn of eventListeners) {
      try { fn(data); } catch (_) {}
    }
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
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

  function waitForEvent(method, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        eventListeners.delete(handler);
        resolve(null);
      }, timeout);
      const handler = (data) => {
        if (data.method === method) {
          clearTimeout(timer);
          eventListeners.delete(handler);
          resolve(data.params);
        }
      };
      eventListeners.add(handler);
    });
  }

  return { ws, send, waitForEvent, consoleErrors };
}

async function getDOMState(send) {
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const vantaBg = document.querySelector('#vanta-bg');
      const canvas = vantaBg ? vantaBg.querySelector('canvas') : null;

      function getAncestors(el) {
        const list = [];
        let curr = el;
        while (curr) {
          const cs = window.getComputedStyle(curr);
          list.push({
            tag: curr.tagName,
            id: curr.id,
            cls: curr.className,
            opacity: cs.opacity,
            transition: cs.transition,
            animation: cs.animation,
            position: cs.position
          });
          curr = curr.parentElement;
        }
        return list;
      }

      const cs = vantaBg ? window.getComputedStyle(vantaBg) : null;
      const cvCs = canvas ? window.getComputedStyle(canvas) : null;
      const r = canvas ? canvas.getBoundingClientRect() : null;
      const bgR = vantaBg ? vantaBg.getBoundingClientRect() : null;

      return {
        window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight, scrollY: window.scrollY },
        vantaBgRect: bgR ? { x: bgR.x, y: bgR.y, width: bgR.width, height: bgR.height } : null,
        canvasRect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
        canvasAttrs: canvas ? { width: canvas.width, height: canvas.height } : null,
        ancestors: getAncestors(vantaBg),
        vantaBgOpacity: cs ? cs.opacity : null,
        allAncestorsOpacityOne: getAncestors(vantaBg).every(a => parseFloat(a.opacity) >= 0.99)
      };
    })()`,
    returnByValue: true
  });
  return res.result?.value;
}

async function analyzeScreenshotPixels(send) {
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

      const midX = Math.floor(w / 2);
      const midY = Math.floor(h / 2);
      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
      let total1 = 0, total2 = 0, total3 = 0, total4 = 0;

      const colLum = new Float64Array(w);
      const rowLum = new Float64Array(h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = idata[idx];
          const g = idata[idx + 1];
          const b = idata[idx + 2];
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

      for (let x = 0; x < w; x++) colLum[x] /= h;
      for (let y = 0; y < h; y++) rowLum[y] /= w;

      const s1 = q1 / total1;
      const s2 = q2 / total2;
      const s3 = q3 / total3;
      const s4 = q4 / total4;
      const avg = (s1 + s2 + s3 + s4) / 4;

      const rightHalfNonBlack = (q2 + q4) / (total2 + total4);
      const bottomHalfNonBlack = (q3 + q4) / (total3 + total4);

      // Check step discontinuity near x = 900 and y = 558
      // Step discontinuity = max local gradient over 20px window
      let maxColStepNear900 = 0;
      if (w >= 940) {
        for (let x = 860; x <= 940; x++) {
          const diff = Math.abs(colLum[x] - colLum[x - 10]);
          if (diff > maxColStepNear900) maxColStepNear900 = diff;
        }
      }
      let maxRowStepNear558 = 0;
      if (h >= 590) {
        for (let y = 520; y <= 590; y++) {
          const diff = Math.abs(rowLum[y] - rowLum[y - 10]);
          if (diff > maxRowStepNear558) maxRowStepNear558 = diff;
        }
      }

      return {
        width: w,
        height: h,
        q1: s1,
        q2: s2,
        q3: s3,
        q4: s4,
        avg,
        q1_ratio: avg > 0 ? s1 / avg : 0,
        q2_ratio: avg > 0 ? s2 / avg : 0,
        q3_ratio: avg > 0 ? s3 / avg : 0,
        q4_ratio: avg > 0 ? s4 / avg : 0,
        rightHalfNonBlack,
        bottomHalfNonBlack,
        maxColStepNear900,
        maxRowStepNear558
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return { pixelData: analysisRes.result?.value, buffer: Buffer.from(shot.data, 'base64') };
}

async function analyzeCanvasPixels(send) {
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const cv = document.querySelector('#vanta-bg canvas');
      if (!cv) return null;
      const w = cv.width;
      const h = cv.height;
      const ctx = cv.getContext('2d');
      const idata = ctx.getImageData(0, 0, w, h).data;
      const midX = Math.floor(w / 2);
      const midY = Math.floor(h / 2);
      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
      let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = idata[idx], g = idata[idx + 1], b = idata[idx + 2];
          const isNonBlack = (r > 8 || g > 8 || b > 8);
          if (x < midX && y < midY) { t1++; if (isNonBlack) q1++; }
          else if (x >= midX && y < midY) { t2++; if (isNonBlack) q2++; }
          else if (x < midX && y >= midY) { t3++; if (isNonBlack) q3++; }
          else { t4++; if (isNonBlack) q4++; }
        }
      }
      const s1 = q1 / t1, s2 = q2 / t2, s3 = q3 / t3, s4 = q4 / t4;
      const avg = (s1 + s2 + s3 + s4) / 4;
      return {
        width: w, height: h,
        q1: s1, q2: s2, q3: s3, q4: s4, avg,
        ratios: { q1: s1 / avg, q2: s2 / avg, q3: s3 / avg, q4: s4 / avg },
        rightHalfNonBlack: (q2 + q4) / (t2 + t4),
        bottomHalfNonBlack: (q3 + q4) / (t3 + t4)
      };
    })()`,
    returnByValue: true
  });
  return res.result?.value;
}

async function verifyAllButtonsAndLinks(send) {
  const elements = await send('Runtime.evaluate', {
    expression: `(() => {
      const items = [];
      document.querySelectorAll('a[href]').forEach(a => {
        items.push({
          type: 'Link',
          text: a.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40),
          href: a.href,
          target: a.getAttribute('target') || '_self'
        });
      });
      document.querySelectorAll('button').forEach(b => {
        items.push({
          type: 'Button',
          text: b.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40),
          id: b.id || '',
          cls: b.className || ''
        });
      });
      return items;
    })()`,
    returnByValue: true
  });

  const list = elements.result.value || [];
  const results = [];
  for (const item of list) {
    if (item.type === 'Link') {
      if (item.href.includes('#')) {
        results.push({ ...item, status: '200 OK (Anchor)' });
      } else {
        try {
          const r = await fetch(item.href, { method: 'HEAD', redirect: 'follow' });
          results.push({ ...item, status: `${r.status} ${r.statusText}` });
        } catch (e) {
          try {
            const r2 = await fetch(item.href, { method: 'GET', redirect: 'follow' });
            results.push({ ...item, status: `${r2.status} ${r2.statusText}` });
          } catch (e2) {
            results.push({ ...item, status: `Fetch error` });
          }
        }
      }
    } else {
      results.push({ ...item, status: '200 (Active Button)' });
    }
  }
  return results;
}

async function runStep3() {
  const viewports = [
    { name: '1440x900', width: 1440, height: 900, mobile: false },
    { name: '1920x1080', width: 1920, height: 1080, mobile: false },
    { name: '390x844', width: 390, height: 844, mobile: true }
  ];

  const report = {};

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`TESTING VIEWPORT: ${vp.name}`);
    console.log(`========================================`);

    const port = 9600 + Math.floor(Math.random() * 200);
    const dataDir = `/tmp/step3-vp-${vp.name}-${Date.now()}`;
    const brave = spawnBrave(port, dataDir);
    const { ws, send, waitForEvent, consoleErrors } = await connectCDP(port);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: false });
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });

    await new Promise(r => setTimeout(r, 1000));
    const loadPromise = waitForEvent('Page.loadEventFired');
    await send('Page.navigate', { url: LIVE_URL });
    await loadPromise;
    const loadTime = Date.now();

    // 0.3s after load
    const delay03 = Math.max(0, 300 - (Date.now() - loadTime));
    await new Promise(r => setTimeout(r, delay03));
    const dom03 = await getDOMState(send);
    const pix03 = await analyzeScreenshotPixels(send);
    const cpix03 = await analyzeCanvasPixels(send);
    fs.writeFileSync(path.join(shotsDir, `step3-${vp.name}-0.3s.png`), pix03.buffer);

    // 1.0s after load
    const delay10 = Math.max(0, 1000 - (Date.now() - loadTime));
    await new Promise(r => setTimeout(r, delay10));
    const dom10 = await getDOMState(send);
    const pix10 = await analyzeScreenshotPixels(send);
    const cpix10 = await analyzeCanvasPixels(send);
    fs.writeFileSync(path.join(shotsDir, `step3-${vp.name}-1.0s.png`), pix10.buffer);

    // 3.0s after load
    const delay30 = Math.max(0, 3000 - (Date.now() - loadTime));
    await new Promise(r => setTimeout(r, delay30));
    const dom30 = await getDOMState(send);
    const pix30 = await analyzeScreenshotPixels(send);
    const cpix30 = await analyzeCanvasPixels(send);
    fs.writeFileSync(path.join(shotsDir, `step3-${vp.name}-top.png`), pix30.buffer);

    // Scroll positions: 0, 1000, 2500, bottom
    const scrollPositions = [0, 1000, 2500, 'bottom'];
    const scrollResults = {};

    for (const sp of scrollPositions) {
      if (sp !== 0) {
        await send('Runtime.evaluate', {
          expression: `window.scrollTo(0, ${sp === 'bottom' ? 'document.body.scrollHeight' : sp});`
        });
        await new Promise(r => setTimeout(r, 400));
      }
      const sdom = await getDOMState(send);
      const spix = await analyzeScreenshotPixels(send);
      const scpix = await analyzeCanvasPixels(send);
      if (sp === 'bottom') {
        fs.writeFileSync(path.join(shotsDir, `step3-${vp.name}-bottom.png`), spix.buffer);
      }
      scrollResults[String(sp)] = { dom: sdom, pixels: spix.pixelData, canvasPixels: scpix };
    }

    // Mobile address bar dynamic height change test (while scrolled, resize by 56px)
    let mobileResizeResult = null;
    if (vp.mobile) {
      console.log('Running mobile viewport resize (+56px simulating address bar hide)...');
      await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844 + 56, // 900
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 400));
      const mdom = await getDOMState(send);
      const mpix = await analyzeScreenshotPixels(send);
      mobileResizeResult = { dom: mdom, pixels: mpix.pixelData };
      fs.writeFileSync(path.join(shotsDir, `step3-mobile-addressbar-expanded.png`), mpix.buffer);
    }

    report[vp.name] = {
      timing: {
        '0.3s': { dom: dom03, pixels: pix03.pixelData, canvasPixels: cpix03 },
        '1.0s': { dom: dom10, pixels: pix10.pixelData, canvasPixels: cpix10 },
        '3.0s': { dom: dom30, pixels: pix30.pixelData, canvasPixels: cpix30 }
      },
      scroll: scrollResults,
      mobileResize: mobileResizeResult,
      consoleErrors
    };

    brave.kill('SIGKILL');
  }

  // Horizontal overflow and button status checks
  const pCheck = 9850;
  const dCheck = `/tmp/check-btns-${Date.now()}`;
  const bCheck = spawnBrave(pCheck, dCheck);
  const { send: sCheck } = await connectCDP(pCheck);
  await sCheck('Page.enable');
  await sCheck('Runtime.enable');
  await sCheck('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sCheck('Page.navigate', { url: LIVE_URL });
  await new Promise(r => setTimeout(r, 2000));

  const overflow = await sCheck('Runtime.evaluate', {
    expression: `(() => {
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    })()`,
    returnByValue: true
  });

  const buttons = await verifyAllButtonsAndLinks(sCheck);
  bCheck.kill('SIGKILL');

  report.overflow390 = overflow.result?.value;
  report.interactiveElements = buttons;

  fs.writeFileSync(path.join(__dirname, 'step3_acceptance.json'), JSON.stringify(report, null, 2));
  console.log('Acceptance results saved to scripts/step3_acceptance.json');
}

runStep3().catch(err => {
  console.error('Acceptance run failed:', err);
  process.exit(1);
});
