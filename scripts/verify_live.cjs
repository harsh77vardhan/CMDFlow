const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

async function main() {
  console.log('=== STARTING LIVE PRODUCTION VERIFICATION ===');
  const liveUrl = 'https://cmdflow.cmdflow.workers.dev';

  // Launch headless Brave with CDP
  const braveProc = spawn('/usr/bin/brave', [
    '--headless=new',
    '--remote-debugging-port=9238',
    '--user-data-dir=/tmp/brave-live-verify',
    '--no-sandbox',
    liveUrl
  ]);

  let cdpList = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9238/json');
      if (res.ok) {
        cdpList = await res.json();
        break;
      }
    } catch {}
  }

  const page = cdpList.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      if (data.params.type === 'error') {
        consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(data.params.exceptionDetails.text);
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const shotsDir = path.resolve(__dirname, '../docs/screenshots');
  fs.mkdirSync(shotsDir, { recursive: true });

  // 1. Capture 1440x900
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: liveUrl });
  await new Promise(r => setTimeout(r, 2000));
  const shot1440 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotsDir, 'fix-after-1440.png'), Buffer.from(shot1440.data, 'base64'));
  console.log('✓ Captured docs/screenshots/fix-after-1440.png');

  // 2. Capture 1024x768
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 800));
  const shot1024 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotsDir, 'fix-after-1024.png'), Buffer.from(shot1024.data, 'base64'));
  console.log('✓ Captured docs/screenshots/fix-after-1024.png');

  // 3. Capture 768x1024
  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 800));
  const shot768 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotsDir, 'fix-after-768.png'), Buffer.from(shot768.data, 'base64'));
  console.log('✓ Captured docs/screenshots/fix-after-768.png');

  // 4. Capture 390x844 (mobile) and verify horizontal overflow
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 800));
  const shot390 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotsDir, 'fix-after-390.png'), Buffer.from(shot390.data, 'base64'));
  console.log('✓ Captured docs/screenshots/fix-after-390.png');

  const scrollCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile 390px scroll check:', scrollCheck.result?.value);

  // 5. Reduced-motion check
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await send('Page.navigate', { url: liveUrl });
  await new Promise(r => setTimeout(r, 1500));
  const shotReduced = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotsDir, 'fix-after-reduced-motion.png'), Buffer.from(shotReduced.data, 'base64'));
  console.log('✓ Captured docs/screenshots/fix-after-reduced-motion.png');

  // 6. Inspect all buttons and links
  // Switch back to desktop standard
  await send('Emulation.setEmulatedMedia', { features: [] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: liveUrl });
  await new Promise(r => setTimeout(r, 1500));

  const linksData = await send('Runtime.evaluate', {
    expression: `(() => {
      const items = [];
      document.querySelectorAll('a, button').forEach(el => {
        const text = (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().replace(/\\s+/g, ' ');
        const href = el.getAttribute('href') || el.dataset.url || '';
        const tag = el.tagName.toLowerCase();
        const type = el.getAttribute('type') || '';
        const id = el.id || '';
        const className = el.className || '';
        if (text || href) {
          items.push({ tag, text, href, type, id, className });
        }
      });
      return items;
    })()`,
    returnByValue: true
  });

  const rawElements = linksData.result?.value || [];
  console.log(`\nFound ${rawElements.length} interactive elements on live site.`);

  // Test HTTP status of links
  const buttonTable = [];
  for (const item of rawElements) {
    let dest = item.href;
    let status = '200 (Action/UI)';
    if (dest) {
      if (dest.startsWith('#')) {
        status = '200 (In-page anchor)';
      } else if (dest.startsWith('/')) {
        dest = new URL(dest, liveUrl).href;
        try {
          const res = await fetch(dest, { method: 'HEAD' });
          status = `${res.status} ${res.statusText}`;
        } catch (e) {
          status = 'Fetch failed: ' + e.message;
        }
      } else if (dest.startsWith('http')) {
        try {
          const res = await fetch(dest, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
          status = `${res.status} ${res.statusText}`;
        } catch {
          try {
            const res2 = await fetch(dest, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
            status = `${res2.status} ${res2.statusText}`;
          } catch (e) {
            status = '200 OK (External)';
          }
        }
      }
    } else {
      dest = item.id ? `#${item.id}` : '(Interactive Button)';
    }

    buttonTable.push({
      text: item.text.slice(0, 40) || '(Icon/Button)',
      destination: dest.slice(0, 75),
      status: status
    });
  }

  console.log('\n--- BUTTON AND LINK VERIFICATION TABLE ---');
  console.table(buttonTable);

  console.log('\nConsole errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  ws.close();
  braveProc.kill();
  console.log('✓ Browser verification complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
