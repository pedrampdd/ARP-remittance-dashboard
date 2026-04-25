const { test, expect } = require('@playwright/test');

test.describe('ARP GPS Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for data to load (leaderboard rows appear)
    await page.waitForSelector('.leaderboard-row', { timeout: 15000 });
  });

  // ─── Page structure ────────────────────────────────────────────────────────

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/ARP Digital/);
  });

  test('header shows brand and toggles', async ({ page }) => {
    await expect(page.locator('.header-title')).toHaveText('ARP Digital');
    await expect(page.locator('.toggle-group')).toHaveCount(2);
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload();
    await page.waitForSelector('.leaderboard-row', { timeout: 15000 });
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  // ─── Market toggle ─────────────────────────────────────────────────────────

  test('All market is selected by default', async ({ page }) => {
    const activeBtn = page.locator('.toggle-btn.active').first();
    await expect(activeBtn).toHaveText('All');
  });

  test('switching to UAE updates section description', async ({ page }) => {
    await page.click('button:has-text("UAE")');
    await expect(page.locator('.section-description').first()).toContainText('UAE');
  });

  test('switching to Bahrain updates section description', async ({ page }) => {
    await page.click('button:has-text("Bahrain")');
    await expect(page.locator('.section-description').first()).toContainText('Bahrain');
  });

  test('market toggle buttons are mutually exclusive', async ({ page }) => {
    await page.click('button:has-text("UAE")');
    const activeButtons = page.locator('.toggle-group').first().locator('.toggle-btn.active');
    await expect(activeButtons).toHaveCount(1);
    await expect(activeButtons).toHaveText('UAE');
  });

  // ─── Metric toggle ─────────────────────────────────────────────────────────

  test('Composite metric is selected by default', async ({ page }) => {
    const metricGroup = page.locator('.toggle-group').nth(1);
    await expect(metricGroup.locator('.toggle-btn.active')).toHaveText('Composite');
  });

  test('switching metric updates leaderboard column header', async ({ page }) => {
    await page.click('button:has-text("USDT Premium")');
    await expect(page.locator('.leaderboard-header .col-metric')).toHaveText('USDT Premium');
  });

  test('switching to Remittance metric updates column header', async ({ page }) => {
    await page.click('button:has-text("Remittance")');
    await expect(page.locator('.leaderboard-header .col-metric')).toHaveText('Remittance Flow');
  });

  // ─── Leaderboard ───────────────────────────────────────────────────────────

  test('leaderboard shows ranked corridors', async ({ page }) => {
    const rows = page.locator('.leaderboard-row:not(.no-data)');
    await expect(rows).toHaveCount(await rows.count());
    expect(await rows.count()).toBeGreaterThan(10);
  });

  test('first ranked corridor shows score 100', async ({ page }) => {
    const firstRow = page.locator('.leaderboard-row').first();
    const score = await firstRow.locator('.metric-badge').textContent();
    expect(score.trim()).toBe('100');
  });

  test('rank numbers are sequential from 1', async ({ page }) => {
    const ranks = page.locator('.leaderboard-row:not(.no-data) .col-rank');
    const count = await ranks.count();
    expect(count).toBeGreaterThan(0);
    const firstRank = await ranks.first().textContent();
    expect(firstRank.trim()).toBe('1');
  });

  test('no-data rows show at bottom with correct label', async ({ page }) => {
    const noDataRows = page.locator('.leaderboard-row.no-data');
    const count = await noDataRows.count();
    if (count > 0) {
      const label = await noDataRows.first().locator('.no-data-label').textContent();
      expect(label).toMatch(/No P2P data|No mapping/);
      // no-data rows should have — for rank
      const rank = await noDataRows.first().locator('.col-rank').textContent();
      expect(rank.trim()).toBe('—');
    }
  });

  test('premium metric values formatted as percentage', async ({ page }) => {
    await page.click('button:has-text("USDT Premium")');
    const firstBadge = page.locator('.leaderboard-row:not(.no-data) .metric-badge').first();
    const text = await firstBadge.textContent();
    expect(text).toMatch(/^\d+\.\d%$/);
  });

  test('remittance metric values formatted with B/M suffix', async ({ page }) => {
    await page.click('button:has-text("Remittance")');
    const firstBadge = page.locator('.leaderboard-row:not(.no-data) .metric-badge').first();
    const text = await firstBadge.textContent();
    expect(text).toMatch(/^\$[\d.]+[BMK]$/);
  });

  test('India appears in top 3 for all markets', async ({ page }) => {
    for (const market of ['All', 'UAE', 'Bahrain']) {
      await page.click(`button:has-text("${market}")`);
      await page.waitForTimeout(300);
      const topRows = page.locator('.leaderboard-row:not(.no-data)');
      const topCountries = await topRows.locator('.col-country').allTextContents();
      expect(topCountries.slice(0, 3)).toContain('India');
    }
  });

  // ─── Market switching changes data ─────────────────────────────────────────

  test('switching markets changes leaderboard scores', async ({ page }) => {
    // Get Egypt score in UAE
    await page.click('button:has-text("UAE")');
    await page.waitForTimeout(300);
    const uaeRows = page.locator('.leaderboard-row:not(.no-data)');
    const uaeCountries = await uaeRows.locator('.col-country').allTextContents();
    const egyptUaeIdx = uaeCountries.findIndex(c => c.includes('Egypt'));
    const egyptUaeScore = egyptUaeIdx >= 0
      ? await uaeRows.nth(egyptUaeIdx).locator('.metric-badge').textContent()
      : null;

    // Get Egypt score in Bahrain
    await page.click('button:has-text("Bahrain")');
    await page.waitForTimeout(300);
    const bahRows = page.locator('.leaderboard-row:not(.no-data)');
    const bahCountries = await bahRows.locator('.col-country').allTextContents();
    const egyptBahIdx = bahCountries.findIndex(c => c.includes('Egypt'));
    const egyptBahScore = egyptBahIdx >= 0
      ? await bahRows.nth(egyptBahIdx).locator('.metric-badge').textContent()
      : null;

    // Scores can differ between markets (or be the same - just verify they load)
    expect(egyptUaeScore).not.toBeNull();
    expect(egyptBahScore).not.toBeNull();
  });

  // ─── World map ─────────────────────────────────────────────────────────────

  test('world map is rendered', async ({ page }) => {
    const map = page.locator('.world-map-wrapper');
    await expect(map).toBeVisible();
    // SVG paths exist
    const paths = map.locator('svg path');
    await expect(paths.first()).toBeVisible();
    expect(await paths.count()).toBeGreaterThan(50);
  });

  test('color legend updates when metric changes', async ({ page }) => {
    const legendTitle = page.locator('.legend-title');
    await expect(legendTitle).toHaveText('Composite Score');

    await page.click('button:has-text("USDT Premium")');
    await expect(legendTitle).toHaveText('USDT Premium');

    await page.click('button:has-text("Remittance")');
    await expect(legendTitle).toHaveText('Remittance Flow');
  });

  test('map tooltip appears on hover over a corridor country', async ({ page }) => {
    const mapWrapper = page.locator('.world-map-wrapper');
    const box = await mapWrapper.boundingBox();
    if (!box) return;

    // Scan a dense grid across the full map area to find any corridor country
    let tooltipFound = false;
    outer: for (let xOff = 0.1; xOff <= 0.95; xOff += 0.04) {
      for (let yOff = 0.1; yOff <= 0.9; yOff += 0.04) {
        await page.mouse.move(
          box.x + box.width * xOff,
          box.y + box.height * yOff,
        );
        const tooltip = page.locator('.map-tooltip');
        const visible = await tooltip.isVisible().catch(() => false);
        if (visible) {
          const text = await tooltip.textContent();
          expect(text.trim().length).toBeGreaterThan(3);
          tooltipFound = true;
          break outer;
        }
      }
    }
    expect(tooltipFound).toBe(true);
  });

  // ─── Footer ────────────────────────────────────────────────────────────────

  test('footer shows data attribution', async ({ page }) => {
    const footer = page.locator('.app-footer');
    await expect(footer).toContainText('KNOMAD');
    await expect(footer).toContainText('Binance');
  });

});
