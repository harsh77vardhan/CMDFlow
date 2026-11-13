const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function main() {
  const browserProc = spawn('/usr/bin/brave', [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--user-data-dir=/tmp/brave-before-shots',
    '--no-sandbox',
    'https://cmdflow.cmdflow.workers.dev'
  ]);

  // Wait for browser CDP to be ready
  let connected = false;
  let cdpList = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9223/json');
      if (res.ok) {
        cdpList = await res.json();
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected || !cdpList) {
    console.error('Failed to connect to browser CDP on port 9223');
    browserProc.kill();
    process.exit(1);
  }

  const page = cdpList.find(p => p.type === 'page');
  if (!page) {
    console.error('No page target found');
    browserProc.kill();
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

  await new Promise(resolve => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async function takeScreenshot(filePath) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath}`);
  }

  await send('Page.enable');
  await send('DOM.enable');
  await send('Page.navigate', { url: 'https://cmdflow.cmdflow.workers.dev' });
  await new Promise(r => setTimeout(r, 2500));

  const outDir = path.resolve(__dirname, '../docs/screenshots');

  // 1440x900
  console.log('Capturing before-1440x900.png...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 800));
  await takeScreenshot(path.join(outDir, 'before-1440x900.png'));

  // 390x844
  console.log('Capturing before-390x844.png...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 800));
  await takeScreenshot(path.join(outDir, 'before-390x844.png'));

  ws.close();
  browserProc.kill();
  console.log('Before screenshots captured successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
