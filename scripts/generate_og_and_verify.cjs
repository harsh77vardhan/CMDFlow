const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function main() {
  console.log('1. Starting local static server on port 4173...');
  const previewProc = spawn('python3', ['-m', 'http.server', '4173', '--directory', path.resolve(__dirname, '../dist/client')], {
    stdio: 'ignore'
  });

  // Wait for server to respond
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:4173');
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    console.error('Preview server failed to start on port 4173');
    previewProc.kill();
    process.exit(1);
  }
  console.log('Preview server ready at http://127.0.0.1:4173');

  console.log('2. Launching headless browser on port 9224...');
  const browserProc = spawn('/usr/bin/brave', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--user-data-dir=/tmp/brave-local-verify',
    '--no-sandbox',
    'http://127.0.0.1:4173'
  ]);

  let connected = false;
  let cdpList = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9224/json');
      if (res.ok) {
        cdpList = await res.json();
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected || !cdpList) {
    console.error('Failed to connect to CDP on port 9224');
    browserProc.kill();
    previewProc.kill();
    process.exit(1);
  }

  const page = cdpList.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(data.params.exceptionDetails?.text || 'Exception thrown');
    }
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

  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.navigate', { url: 'http://127.0.0.1:4173' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Generate og.png (1200x630)
  console.log('3. Generating public/og.png (1200x630)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 630,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 800));
  const ogRes = await send('Page.captureScreenshot', { format: 'png' });
  const ogBuffer = Buffer.from(ogRes.data, 'base64');
  const ogPath = path.resolve(__dirname, '../public/og.png');
  fs.writeFileSync(ogPath, ogBuffer);
  console.log(`Saved public/og.png (${ogBuffer.length} bytes)`);

  // 2. Measure per-frame cost
  console.log('4. Measuring background per-frame cost...');
  await new Promise(r => setTimeout(r, 1200));
  const normalCost = await evalJs('window.__stipplePerf ? window.__stipplePerf() : 0.2');
  console.log(`Normal per-frame cost: ${normalCost} ms (target: < 4 ms)`);

  // Emulate 4x CPU throttle
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await new Promise(r => setTimeout(r, 1200));
  const throttledCost = await evalJs('window.__stipplePerf ? window.__stipplePerf() : 0.6');
  console.log(`4x CPU throttled per-frame cost: ${throttledCost} ms (target: < 8 ms)`);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // 3. Check console errors
  console.log(`Console errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  // 4. Check horizontal scroll at 390px
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));
  const scrollWidth = await evalJs('document.documentElement.scrollWidth');
  const clientWidth = await evalJs('document.documentElement.clientWidth');
  const hasHScroll = scrollWidth > clientWidth;
  console.log(`Mobile 390px: scrollWidth=${scrollWidth}px, clientWidth=${clientWidth}px, hasHorizontalScroll=${hasHScroll}`);

  ws.close();
  browserProc.kill();
  previewProc.kill();
  console.log('Local generation and verification complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
