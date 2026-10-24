const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const output = path.resolve('build/verification-v2');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    for (const [name, viewport, ratio] of [['desktop', { width: 1440, height: 900 }, 2], ['mobile', { width: 390, height: 844 }, 3], ['retina', { width: 2560, height: 1440 }, 2]]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: ratio, colorScheme: 'dark' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve('preview.html')).href);
      await page.waitForFunction(() => window.WelcomeJay?.time > .1);
      const meta = await page.evaluate(() => { WelcomeJay.pause(); return { duration: WelcomeJay.duration, playbackRate: WelcomeJay.playbackRate, dimensions: WelcomeJay.dimensions }; });
      assert.equal(meta.duration, 12.75);
      assert.equal(meta.playbackRate, 0.8);
      assert.equal(meta.dimensions.pixelWidth, viewport.width * ratio);
      assert.equal(meta.dimensions.pixelHeight, viewport.height * ratio);
      const counts = [];
      for (const time of [2, 3, 3.6, 5.15, 5.9, 6.9, 7.4, 7.8, 8.25, 8.8, 9.6, 10.2]) {
        const sample = await page.evaluate(time => {
          WelcomeJay.renderAt(time / WelcomeJay.playbackRate);
          const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let count = 0;
          const hues = new Set();
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i+1], b = data[i+2];
            if (Math.max(r,g,b) > 80) {
              count++;
              if (Math.max(r,g,b) - Math.min(r,g,b) > 70) hues.add([r,g,b].map(v => Math.floor(v/64)).join(','));
            }
          }
          return { count, hues: hues.size, stage: WelcomeJay.stage };
        }, time);
        assert.ok(sample.count > 300, `${name} ${time}: canvas is blank`);
        if (time === 5.15 || time === 8.8) assert.ok(sample.hues > 12, `${name} ${time}: rainbow palette is missing`);
        counts.push(sample);
        await page.screenshot({ path: path.join(output, `${name}-${time}.png`) });
      }
      const pause = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        WelcomeJay.renderAt(2.8 / WelcomeJay.playbackRate); const first = canvas.toDataURL();
        WelcomeJay.renderAt(3.2 / WelcomeJay.playbackRate); const second = canvas.toDataURL();
        const stage = WelcomeJay.stage;
        WelcomeJay.renderAt(3.6 / WelcomeJay.playbackRate); const third = canvas.toDataURL();
        return { unchanged: first === second, jayStarts: third !== second, stage };
      });
      assert.ok(pause.unchanged && pause.jayStarts && pause.stage === 'pause', `${name}: welcome must pause before Jay starts`);
      const framing = await page.evaluate(() => {
        WelcomeJay.renderAt(WelcomeJay.duration);
        const source = document.querySelector('canvas');
        const probe = document.createElement('canvas');
        probe.width = 800; probe.height = Math.round(800*source.height/source.width);
        const context = probe.getContext('2d'); context.drawImage(source,0,0,probe.width,probe.height);
        const {data} = context.getImageData(0,0,probe.width,probe.height);
        let left=probe.width,top=probe.height,right=0,bottom=0;
        for (let y=0;y<probe.height;y++) for (let x=0;x<probe.width;x++) {
          const p=(y*probe.width+x)*4;
          if (Math.max(data[p],data[p+1],data[p+2]) > 80) {
            left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
          }
        }
        return {left,top,right,bottom,width:probe.width,height:probe.height};
      });
      assert.ok(framing.left > 20 && framing.top > 20 && framing.right < framing.width-20 && framing.bottom < framing.height-20, `${name}: the final zoom must keep the entire knot in frame`);
      const continuity = await page.evaluate(() => {
        const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
        function differenceAt(time) {
          WelcomeJay.renderAt((time - 1/120) / WelcomeJay.playbackRate);
          const before = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          WelcomeJay.renderAt((time + 1/120) / WelcomeJay.playbackRate);
          const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let difference = 0;
          for (let i = 0; i < before.length; i += 16) difference += Math.abs(before[i] - after[i]) + Math.abs(before[i+1] - after[i+1]) + Math.abs(before[i+2] - after[i+2]);
          return difference / (before.length/16*765);
        }
        return [2.72,3.27,5,5.3,6.65,6.95,7,7.15,7.8,8.5,8.55,8.65,8.7,8.95].map(time => {
          return { time, difference: differenceAt(time), nearby: Math.max(differenceAt(time - .05), differenceAt(time + .05)) };
        });
      });
      for (const sample of continuity) assert.ok(sample.difference < sample.nearby * 1.5 + .0004, `${name}: discontinuous stage transition ${JSON.stringify(sample)}`);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ viewport: name, meta, samples: counts, pause, framing, continuity, errors }));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
