const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ colorScheme });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const url = pathToFileURL(path.resolve('preview.html'));
      url.searchParams.set('time', '6.4');
      await page.goto(url.href);
      await page.waitForFunction(() => window.WelcomeJay);
      async function sample() {
        return page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          return {
            appearance: WelcomeJay.appearance,
            time: WelcomeJay.time,
            pixel: Array.from(canvas.getContext('2d').getImageData(0, 0, 1, 1).data),
            background: getComputedStyle(document.body).backgroundColor,
            frame: canvas.toDataURL()
          };
        });
      }
      const expectedPixel = mode => mode === 'light' ? [255, 255, 255, 255] : [24, 24, 24, 255];
      const expectedCSS = mode => mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(24, 24, 24)';
      const first = await sample();
      assert.equal(first.appearance, colorScheme);
      assert.deepEqual(first.pixel, expectedPixel(colorScheme));
      assert.equal(first.background, expectedCSS(colorScheme));
      await page.waitForTimeout(150);
      assert.equal((await sample()).frame, first.frame, 'Fixed-time previews must stay paused');
      const other = colorScheme === 'light' ? 'dark' : 'light';
      await page.emulateMedia({ colorScheme: other });
      await page.waitForFunction(mode => WelcomeJay.appearance === mode, other);
      const switched = await sample();
      assert.equal(switched.time, first.time, 'Appearance switching must preserve playback position');
      assert.deepEqual(switched.pixel, expectedPixel(other));
      assert.equal(switched.background, expectedCSS(other));
      assert.notEqual(switched.frame, first.frame);
      url.searchParams.set('appearance', colorScheme);
      await page.goto(url.href);
      await page.waitForFunction(() => window.WelcomeJay);
      assert.equal((await sample()).appearance, colorScheme, 'Explicit appearance must override the system');
      await page.emulateMedia({ colorScheme });
      await page.emulateMedia({ colorScheme: other });
      await page.waitForTimeout(150);
      assert.equal((await sample()).appearance, colorScheme, 'Explicit appearance must remain fixed');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: light/dark backgrounds; live appearance switching; paused frame stability; appearance override; no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
