const { chromium } = require('playwright');

async function capture(options = {}) {
  const {
    url = 'http://localhost',
    screenshotPath = '/tmp/moveit_pro_ui.png',
    waitMs = 3000,
    action = null,
  } = options;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Collect toast messages / errors
  const toasts = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      toasts.push(`[console.error] ${msg.text()}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(waitMs);

  // Capture any visible toast/alert elements
  const toastTexts = await page.evaluate(() => {
    const elements = [];
    // Look for common toast/notification patterns
    document.querySelectorAll('[class*="toast"], [class*="Toast"], [class*="alert"], [class*="Alert"], [class*="notification"], [class*="Notification"], [class*="snackbar"], [class*="Snackbar"], [role="alert"]').forEach(el => {
      if (el.textContent.trim()) {
        elements.push(el.textContent.trim());
      }
    });
    return elements;
  });
  toasts.push(...toastTexts.map(t => `[ui-toast] ${t}`));

  // Execute action if provided
  if (action === 'screenshot-only') {
    // Just take the screenshot
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(JSON.stringify({ screenshotPath, toasts }, null, 2));

  await browser.close();
}

// Parse CLI args
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url') options.url = args[++i];
  if (args[i] === '--output') options.screenshotPath = args[++i];
  if (args[i] === '--wait') options.waitMs = parseInt(args[++i]);
}

capture(options).catch(err => {
  console.error('Capture failed:', err.message);
  process.exit(1);
});
