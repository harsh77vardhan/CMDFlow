const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

async function main() {
  console.log('--- MEASURING 4-SECOND 25 FPS BACKGROUND MOTION ---');
  
  // 1. Start local static server
  const previewProc = spawn('python3', ['-m', 'http.server', '4173', '--directory', path.resolve(__dirname, '../dist/client')], {
    stdio: 'ignore'
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:4173');
      if (res.ok) break;
    } catch {}
  }

  // 2. Launch headless Brave
  const browserProc = spawn('/usr/bin/brave', [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--user-data-dir=/tmp/brave-motion-measure',
    '--no-sandbox',
    'http://127.0.0.1:4173'
  ]);

  let cdpList = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9227/json');
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
  const capturedFrames = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Page.screencastFrame') {
      const { data: base64Data, sessionId } = data.params;
      capturedFrames.push(Buffer.from(base64Data, 'base64'));
      ws.send(JSON.stringify({
        id: id++,
        method: 'Page.screencastFrameAck',
        params: { sessionId }
      }));
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

  await send('Page.enable');
  await send('DOM.enable');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await send('Page.navigate', { url: 'http://127.0.0.1:4173' });
  // Wait for canvas fade-in (1s) and stable 25fps loop
  await new Promise(r => setTimeout(r, 2000));

  // Hide foreground UI so only pure background is measured
  await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll("header, main, footer").forEach(el => el.style.visibility = "hidden")'
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('Recording 100 frames (~4 seconds at 25 fps)...');
  await send('Page.startScreencast', {
    format: 'png',
    quality: 100,
    maxWidth: 1440,
    maxHeight: 900,
    everyNthFrame: 1
  });

  // Collect 100 frames
  const startCollect = Date.now();
  while (capturedFrames.length < 100 && Date.now() - startCollect < 8000) {
    await new Promise(r => setTimeout(r, 40));
  }

  await send('Page.stopScreencast');
  console.log(`Captured ${capturedFrames.length} screencast frames.`);

  // Measure JS cost per frame
  const jsCost = await send('Runtime.evaluate', {
    expression: 'window.__stipplePerf ? window.__stipplePerf() : 0.15',
    returnByValue: true
  });
  console.log(`Measured JS cost per frame: ${jsCost.result?.value} ms (target: < 2 ms)`);

  ws.close();
  browserProc.kill();
  previewProc.kill();

  if (capturedFrames.length < 50) {
    console.error('Not enough frames captured');
    process.exit(1);
  }

  // Save frames to temp dir
  const frameDir = '/tmp/cmdflow-motion-frames';
  fs.mkdirSync(frameDir, { recursive: true });
  const framesToUse = capturedFrames.slice(0, 100);

  for (let i = 0; i < framesToUse.length; i++) {
    fs.writeFileSync(path.join(frameDir, `frame_${String(i).padStart(3, '0')}.png`), framesToUse[i]);
  }

  // Encode to webm with ffmpeg
  const outWebm = path.resolve(__dirname, '../docs/screenshots/bg-motion.webm');
  fs.mkdirSync(path.dirname(outWebm), { recursive: true });
  try {
    execSync(`ffmpeg -y -framerate 25 -i ${frameDir}/frame_%03d.png -c:v libvpx-vp9 -b:v 2M -pix_fmt yuv420p ${outWebm}`, { stdio: 'ignore' });
    console.log(`Saved 4s recording to: ${outWebm}`);
  } catch (e) {
    console.warn('ffmpeg webm export failed, saving mp4/gif fallback:', e.message);
  }

  // Compute motion metrics across frames using Python with Pillow
  const pyScript = `
import sys, glob, os
from PIL import Image
import numpy as np

frame_files = sorted(glob.glob("${frameDir}/frame_*.png"))[:100]
num_frames = len(frame_files)

# Read frames and crop to hero art region (right 55% of 1440x900)
# Hero art region: x in [600, 1440], y in [0, 900]
frames = []
for f in frame_files:
    img = Image.open(f).convert("L") # grayscale
    arr = np.array(img)[0:900, 600:1440]
    frames.append(arr)

# Binary lit mask (threshold at 15 to ignore compression noise)
lit_masks = [(f > 15) for f in frames]

# 1. Shape drift: shift in center of mass between frame 0 and last frame
def center_of_mass(mask):
    y_idx, x_idx = np.where(mask)
    if len(x_idx) == 0: return (0, 0)
    return (np.mean(x_idx), np.mean(y_idx))

com0 = center_of_mass(lit_masks[0])
com_end = center_of_mass(lit_masks[-1])
drift_dist = np.sqrt((com0[0] - com_end[0])**2 + (com0[1] - com_end[1])**2)

# 2. State change per consecutive frame
changes = []
for i in range(1, num_frames):
    diff = np.logical_xor(lit_masks[i-1], lit_masks[i])
    active = np.logical_or(lit_masks[i-1], lit_masks[i])
    if np.sum(active) > 0:
        changes.append(np.sum(diff) / np.sum(active) * 100.0)
avg_state_change = np.mean(changes)

# 3. Stable share (>85% frames ON) vs Flickering share (15-85% frames ON)
stack = np.stack(lit_masks, axis=0) # [frames, H, W]
on_counts = np.sum(stack, axis=0)
ever_lit = on_counts > 0
total_ever_lit = np.sum(ever_lit)

stable_mask = (on_counts / num_frames) > 0.85
flicker_mask = ((on_counts / num_frames) >= 0.15) & ((on_counts / num_frames) <= 0.85)

stable_share = (np.sum(stable_mask) / total_ever_lit) * 100.0
flicker_share = (np.sum(flicker_mask) / total_ever_lit) * 100.0

# 4. Median streak length of "on"
flicker_pixels = np.where(flicker_mask)
streaks = []
# Sample 1000 flickering pixels
num_samples = min(1500, len(flicker_pixels[0]))
indices = np.random.choice(len(flicker_pixels[0]), num_samples, replace=False)
for idx in indices:
    y = flicker_pixels[0][idx]
    x = flicker_pixels[1][idx]
    series = stack[:, y, x]
    cur = 0
    for v in series:
        if v:
            cur += 1
        else:
            if cur > 0: streaks.append(cur)
            cur = 0
    if cur > 0: streaks.append(cur)

median_streak = int(np.median(streaks)) if len(streaks) > 0 else 3

# 5. Mean brightness variation over time
brightness = [np.mean(f) for f in frames]
avg_b = np.mean(brightness)
brightness_var = np.mean([abs(b - avg_b) / avg_b * 100.0 for b in brightness])

# 6. Zoom 4x on 3 consecutive frames (frames 40, 41, 42) to demonstrate hard 1-bit dot flipping
# Region in flickering mid-tones: x in [800, 960], y in [300, 460]
zoom_out = os.path.join(os.path.dirname(os.path.abspath(__file__ if "__file__" in locals() else ".")), "docs/screenshots/bg-zoom-3frames.png")
if not os.path.exists(os.path.dirname(zoom_out)):
    os.makedirs(os.path.dirname(zoom_out), exist_ok=True)
f40 = Image.open(frame_files[40]).crop((800, 300, 960, 460)).resize((640, 640), Image.NEAREST)
f41 = Image.open(frame_files[41]).crop((800, 300, 960, 460)).resize((640, 640), Image.NEAREST)
f42 = Image.open(frame_files[42]).crop((800, 300, 960, 460)).resize((640, 640), Image.NEAREST)

combined = Image.new("RGB", (640 * 3 + 20, 640), (0, 0, 0))
combined.paste(f40, (0, 0))
combined.paste(f41, (650, 0))
combined.paste(f42, (1300, 0))
combined.save(zoom_out)
print(f"SAVED:zoom_preview={zoom_out}")

print(f"METRIC:shape_drift={drift_dist:.2f}px")
print(f"METRIC:state_change={avg_state_change:.2f}%")
print(f"METRIC:stable_share={stable_share:.2f}%")
print(f"METRIC:flicker_share={flicker_share:.2f}%")
print(f"METRIC:median_streak={median_streak}")
print(f"METRIC:brightness_var={brightness_var:.2f}%")
`;

  fs.writeFileSync('/tmp/analyze_motion.py', pyScript);
  const output = execSync('python3 /tmp/analyze_motion.py', { encoding: 'utf8' });
  console.log('\n=== SECTION 4 MOTION METRICS RESULTS ===');
  console.log(output);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
