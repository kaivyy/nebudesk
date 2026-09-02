const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/search?q=kucing');
  const title = await page.title();
  const content = await page.content();
  console.log('Title:', title);
  console.log('Length:', content.length);
  if (content.includes('kucing')) console.log('Has kucing!');
  if (content.includes('captcha')) console.log('CAPTCHA DETECTED');
  await browser.close();
})();
