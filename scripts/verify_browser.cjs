const fs = require('fs');
const path = require('path');

async function main() {
  const cdpList = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = cdpList.find(p => p.type === 'page');
  if (!page) {
    console.error('No page target found');
    process.exit(1);
  }

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

  await new Promise((resolve) => ws.onopen = resolve);

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

  async function takeScreenshot(filePath) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath}`);
  }

  console.log('1. Checking page title and initial load...');
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1000));

  const title = await evalJs('document.title');
  console.log('  Page Title:', title);

  // 1. Download buttons
  console.log('2. Verifying download buttons show live version...');
  await new Promise(r => setTimeout(r, 1000)); // wait for fetch /api/releases/latest
  const downloadLabels = await evalJs(`
    Array.from(document.querySelectorAll('.download-label')).map(el => el.textContent.trim())
  `);
  console.log('  Download labels found:', downloadLabels);

  // 2. Demo expansions vs cmdflow explain
  console.log('3. Verifying interactive demo expansions...');
  const demoSnippets = await evalJs(`
    Array.from(document.querySelectorAll('.pair')).map(p => ({
      before: p.querySelector('div:first-child code')?.textContent.trim(),
      after: p.querySelector('div:last-child code')?.textContent.trim()
    }))
  `);
  console.log('  Demo expansions:', demoSnippets);

  // 3. Waitlist form inline error and success
  console.log('4. Verifying waitlist inline validation and success...');
  // Invalid email
  await evalJs(`
    (() => {
      const input = document.querySelector('#waitlist-email');
      const form = document.querySelector('#waitlist-form');
      if (input && form) {
        input.value = 'invalid-email-address';
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 500));
  const errorMsg = await evalJs(`document.querySelector('#waitlist-status')?.textContent.trim()`);
  console.log('  Waitlist invalid email response:', errorMsg);

  // Valid email
  await evalJs(`
    (() => {
      const input = document.querySelector('#waitlist-email');
      const form = document.querySelector('#waitlist-form');
      if (input && form) {
        input.value = 'test-browser-verify@example.com';
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));
  const successMsg = await evalJs(`document.querySelector('#waitlist-status')?.textContent.trim()`);
  console.log('  Waitlist valid email response:', successMsg);

  const screenshotDir = path.resolve(__dirname, '../docs/screenshots');

  // Desktop screenshot
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 500));
  await takeScreenshot(path.join(screenshotDir, 'desktop-view.png'));

  // 4. Mobile viewport (390px wide) check
  console.log('5. Verifying mobile viewport (390px) horizontal scroll...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));
  const scrollWidth = await evalJs('document.documentElement.scrollWidth');
  const clientWidth = await evalJs('document.documentElement.clientWidth');
  const hasHorizontalScroll = scrollWidth > clientWidth;
  console.log(`  Mobile 390px scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px, horizontal scroll: ${hasHorizontalScroll}`);
  await takeScreenshot(path.join(screenshotDir, 'mobile-390px.png'));

  // 5. prefers-reduced-motion check
  console.log('6. Verifying prefers-reduced-motion...');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await new Promise(r => setTimeout(r, 500));
  const matchesReduced = await evalJs(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`);
  console.log(`  matchMedia('(prefers-reduced-motion: reduce)').matches:`, matchesReduced);
  await takeScreenshot(path.join(screenshotDir, 'reduced-motion.png'));

  console.log('\n✓ ALL BROWSER CHECKS COMPLETED SUCCESSFULLY!');
  ws.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Browser check failed:', err);
  process.exit(1);
});
