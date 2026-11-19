// Responsive audit for the logged-in app. Run against the local dev servers:
//
//   playwright-cli open
//   playwright-cli --raw run-code --filename=scripts/mobile-audit.js
//
// For each route and width it reports: horizontal page overflow (must be 0),
// the number of <h1> (must be 1), nested <button>s (must be 0) and, below
// 768px, controls smaller than 40px (touch targets should be 44px).
// Set EMAIL / PASSWORD to a user of your LOCAL database before running.
// playwright-cli evaluates this file as a single function expression, so it
// has no imports and must not end with a semicolon.
async (page) => {
  const BASE = 'http://localhost:5173';
  const EMAIL = 'mobile-qa@local.test';
  const PASSWORD = 'QaMobile123!';
  const WIDTHS = [360, 390, 768, 1024, 1280];
  const ROUTES = [
    '/',
    '/transactions/add',
    '/transactions/budget',
    '/plans/savings',
    '/plans/accounts',
    '/plans/scheduled-payments',
    '/graphics/categories',
    '/settings/currency',
    '/settings/accounts',
    '/settings/categories',
    '/settings/cards',
    '/profile',
  ];

  const errors = new Set();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.add(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) =>
    errors.add('PAGEERROR ' + String(e).slice(0, 200)),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), {
    timeout: 15000,
  });

  const problems = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ROUTES) {
      await page.goto(BASE + route);
      await page.waitForTimeout(1200);
      const r = await page.evaluate((w) => {
        const de = document.documentElement;
        const small = [];
        if (w < 768) {
          const sel = 'button, a[href], [role="button"], [role="combobox"]';
          for (const el of document.querySelectorAll(sel)) {
            const b = el.getBoundingClientRect();
            if (!b.width || !b.height) continue;
            if (b.width < 40 || b.height < 40) {
              const name = (
                el.getAttribute('aria-label') ||
                el.textContent ||
                ''
              )
                .trim()
                .slice(0, 24);
              small.push(
                `${name} (${Math.round(b.width)}x${Math.round(b.height)})`,
              );
            }
          }
        }
        return {
          overflow: de.scrollWidth - de.clientWidth,
          h1: document.querySelectorAll('h1').length,
          nested: [...document.querySelectorAll('button')].filter((b) =>
            b.parentElement?.closest('button'),
          ).length,
          small,
        };
      }, width);
      if (r.overflow > 0 || r.h1 !== 1 || r.nested > 0 || r.small.length) {
        problems.push({ width, route, ...r });
      }
    }
  }

  return JSON.stringify({ problems, consoleErrors: [...errors] }, null, 2);
}
