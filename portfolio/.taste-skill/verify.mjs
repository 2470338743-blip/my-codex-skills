import {Browser} from '/workspace/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFileSync} from 'node:fs';
const root = process.env.TEST_URL || new URL('../index.html', import.meta.url).href;
const browser = await Browser.launch();
const checks = [];
function check(condition, description) {
  if (!condition) throw new Error(description);
  checks.push(description);
}
try {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({width, height:900});
    await page.goto(root);
    check(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    check(await page.eval(() => [...document.querySelectorAll('img[src]')].filter(i => i.complete).every(i => i.naturalWidth > 0)), `${width}: loaded image assets are valid`);
    for (const id of ['cycling','dragon','bobi','looking','quiet']) {
      await page.eval(id => document.querySelector(`[data-select="${id}"]`).click(), id);
      check(await page.eval(id => document.querySelector('.stage-art').dataset.project === id && document.querySelector(`[data-select="${id}"]`).getAttribute('aria-pressed') === 'true', id), `${width}: preview ${id}`);
      await page.eval(id => document.querySelector(`#${id} h3 a`).click(), id);
      check(await page.eval(id => document.querySelector('dialog').open && document.querySelector('#download-art').getAttribute('href') === document.querySelector(`#${id} .project-picture`).getAttribute('href') && document.activeElement.id === 'close-viewer', id), `${width}: modal and download ${id}`);
      await page.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
      await page.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
      await page.eval(() => new Promise(resolve => setTimeout(resolve, 100)));
      check(await page.eval(id => !document.querySelector('dialog').open && !document.body.classList.contains('viewer-open') && document.activeElement === document.querySelector(`#${id} h3 a`), id), `${width}: Escape restores focus ${id}`);
    }
    await page.eval(() => document.querySelector('#bobi h3 a').click());
    await page.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Tab', code:'Tab', windowsVirtualKeyCode:9, modifiers:8});
    await page.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Tab', code:'Tab', windowsVirtualKeyCode:9, modifiers:8});
    check(await page.eval(() => document.activeElement.id === 'download-art'), `${width}: modal traps keyboard focus`);
    await page.eval(() => document.querySelector('#close-viewer').click());
    check(page.consoleErrors.length === 0, `${width}: no JavaScript errors`);
    await page.close();
  }
  const reduced = await browser.newPage({width:390,height:844,reducedMotion:true});
  await reduced.goto(root);
  await reduced.eval(() => scrollTo(0, document.body.scrollHeight/2));
  check(await reduced.eval(() => document.getAnimations().filter(a => a.playState === 'running').length === 0), 'Reduced motion: no running animations');
  await reduced.eval(() => document.querySelector('#looking h3 a').click());
  check(await reduced.eval(() => document.querySelector('dialog').open), 'Reduced motion: viewer remains usable');
  await reduced.close();
  const fallback = await browser.newPage({width:390,height:844});
  await fallback.send('Emulation.setScriptExecutionDisabled', {value:true});
  await fallback.goto(root);
  check(await fallback.eval(() => document.querySelectorAll('article.project a[href$=".png"]').length === 10 && document.querySelector('.stage-controls').hidden && [...document.querySelectorAll('article.project')].every(el => getComputedStyle(el).opacity === '1')), 'No JavaScript: all five project images and links remain available');
  check(await fallback.eval(() => document.fonts.check('16px "Portfolio Serif"')), 'Bundled font loads without external font requests');
  await fallback.close();
  writeFileSync(new URL('verification.json', import.meta.url), JSON.stringify({passed:checks.length, checks},null,2));
  console.log(`${checks.length} browser assertions passed.`);
} finally {await browser.close();}
