const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const directory = path.resolve('build/vector-frames');
  await fs.mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve('preview.html')).href);
    await page.waitForFunction(() => window.WelcomeJay);
    const duration = await page.evaluate(() => { WelcomeJay.pause(); return WelcomeJay.duration; });
    const fps = 60, frames = Math.round(duration * fps);
    for (let frame = 0; frame < frames; frame++) {
      const encoded = await page.evaluate(time => {
        WelcomeJay.renderAt(time);
        return document.querySelector('canvas').toDataURL('image/png').split(',')[1];
      }, frame / fps);
      await fs.writeFile(path.join(directory, `${String(frame).padStart(6, '0')}.png`), Buffer.from(encoded, 'base64'));
      if (frame % 60 === 0) console.log(`Exported ${frame}/${frames}`);
    }
    await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ fps, frames, width: 3840, height: 2160, duration }));
    console.log(`Exported ${frames} 4K frames`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
