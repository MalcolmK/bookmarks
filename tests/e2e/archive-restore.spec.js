const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const { archiveFixture, installArchiveFixture } = require('./support/archive-fixture');

test('herstelt een gearchiveerde groep zonder naamconflict', async ({ page }, testInfo) => {
  const fixture = await installArchiveFixture(page);
  await page.goto('/');

  expect(fixture.wasIntercepted()).toBe(true);

  await page.locator('#open-archive').click();

  const archivedCards = page.locator('#archive-container .archive-group-card');
  const archivedGroup = archivedCards.filter({
    has: page.getByRole('heading', { name: 'E2E herstelgroep' })
  });
  await expect(archivedGroup).toHaveCount(1);
  await archivedGroup.locator('.archive-restore-button').click();

  await expect(page.locator('#restore-conflict-dialog')).toBeHidden();
  await expect(
    archivedCards.filter({
      has: page.getByRole('heading', { name: 'E2E herstelgroep' })
    })
  ).toHaveCount(0);
  await expect(archivedCards).toHaveCount(1);

  await page.locator('#archive-back').click();

  const restoredGroup = page.locator('#container .group').filter({
    has: page.getByRole('heading', { name: 'E2E herstelgroep' })
  });
  await expect(restoredGroup).toHaveCount(1);
  await expect(restoredGroup).toBeVisible();
  await expect(restoredGroup.locator('.section')).toHaveCount(2);
  await expect(
    restoredGroup.getByRole('heading', { name: 'E2E handleidingen' })
  ).toBeVisible();
  await expect(
    restoredGroup.getByRole('heading', { name: 'E2E lege sectie' })
  ).toBeVisible();

  const restoredBookmark = restoredGroup.getByRole('link', {
    name: 'E2E herstelbare bookmark'
  });
  await expect(restoredBookmark).toHaveAttribute(
    'href',
    'https://example.test/herstelbaar'
  );
  await expect(restoredBookmark.locator('.bookmark-icon')).toHaveAttribute(
    'src',
    'icons/cgi-192x192.png'
  );
  await expect(
    restoredGroup.getByRole('link', { name: 'E2E tweede herstelbookmark' })
  ).toHaveAttribute('href', 'https://example.test/tweede-herstelbaar');

  const existingGroup = page.locator('#container .group').filter({
    has: page.getByRole('heading', { name: 'E2E actieve groep' })
  });
  await expect(existingGroup).toBeVisible();
  await expect(
    existingGroup.getByRole('link', { name: 'E2E bestaande bookmark' })
  ).toHaveAttribute('href', 'https://example.test/actief');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-data').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('data.js');
  const downloadedFile = testInfo.outputPath('restored-data.js');
  await download.saveAs(downloadedFile);

  const expectedData = JSON.parse(JSON.stringify(archiveFixture));
  const restoredIndex = expectedData.findIndex(group => group.name === 'E2E herstelgroep');
  expect(restoredIndex).toBeGreaterThanOrEqual(0);
  const [expectedRestoredGroup] = expectedData.splice(restoredIndex, 1);
  delete expectedRestoredGroup.archivedAt;
  expectedData.push(expectedRestoredGroup);

  const downloadedSource = await readFile(downloadedFile, 'utf8');
  expect(downloadedSource).toBe(
    `let bookmarksData = ${JSON.stringify(expectedData, null, 4)};\n`
  );
});

test('hernoemt een groep bij naamconflict zonder de bestaande groep te overschrijven', async ({ page }) => {
  const fixture = await installArchiveFixture(page);
  await page.goto('/');

  expect(fixture.wasIntercepted()).toBe(true);

  await page.locator('#open-archive').click();

  const archivedCards = page.locator('#archive-container .archive-group-card');
  const archivedDuplicate = archivedCards.filter({
    has: page.getByRole('heading', { name: 'E2E bestaande groep' })
  });
  await expect(archivedDuplicate).toHaveCount(1);
  await archivedDuplicate.locator('.archive-restore-button').click();

  const dialog = page.locator('#restore-conflict-dialog');
  const nameInput = page.locator('#restore-conflict-name');
  const status = page.locator('#restore-conflict-status');
  await expect(dialog).toBeVisible();
  await expect(nameInput).toHaveValue(/E2E bestaande groep/);
  await expect(nameInput).toBeFocused();

  await nameInput.fill('  E2E BESTAANDE GROEP  ');
  await dialog.locator('button[type="submit"]').click();

  await expect(dialog).toBeVisible();
  await expect(status).not.toBeEmpty();
  await expect(nameInput).toBeFocused();
  await expect(archivedDuplicate).toHaveCount(1);

  await nameInput.fill('E2E bestaande groep hersteld');
  await dialog.locator('button[type="submit"]').click();

  await expect(dialog).toBeHidden();
  await expect(archivedCards).toHaveCount(1);
  await expect(
    archivedCards.filter({
      has: page.getByRole('heading', { name: 'E2E bestaande groep' })
    })
  ).toHaveCount(0);

  await page.locator('#archive-back').click();

  const originalGroup = page.locator('#container .group').filter({
    has: page.getByRole('heading', {
      name: 'E2E bestaande groep',
      exact: true
    })
  });
  await expect(originalGroup).toHaveCount(1);
  await expect(
    originalGroup.getByRole('link', { name: 'E2E bookmark die moet blijven' })
  ).toHaveAttribute('href', 'https://example.test/bestaande-groep');

  const restoredGroup = page.locator('#container .group').filter({
    has: page.getByRole('heading', { name: 'E2E bestaande groep hersteld' })
  });
  await expect(restoredGroup).toHaveCount(1);
  await expect(restoredGroup).toBeVisible();
  await expect(
    restoredGroup.getByRole('heading', { name: 'E2E gearchiveerde sectie' })
  ).toBeVisible();
  await expect(
    restoredGroup.getByRole('link', { name: 'E2E bookmark uit archief' })
  ).toHaveAttribute('href', 'https://example.test/archief');
});

test('annuleert herstellen bij naamconflict en behoudt beide groepen', async ({ page }) => {
  const fixture = await installArchiveFixture(page);
  await page.goto('/');

  expect(fixture.wasIntercepted()).toBe(true);

  await page.locator('#open-archive').click();

  const archivedCards = page.locator('#archive-container .archive-group-card');
  const archivedDuplicate = archivedCards.filter({
    has: page.getByRole('heading', { name: 'E2E bestaande groep' })
  });
  const restoreButton = archivedDuplicate.locator('.archive-restore-button');
  await expect(archivedDuplicate).toHaveCount(1);
  await restoreButton.click();

  const dialog = page.locator('#restore-conflict-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#restore-conflict-name')).toBeFocused();
  await page.locator('#restore-conflict-cancel').click();

  await expect(dialog).toBeHidden();
  await expect(restoreButton).toBeFocused();
  await expect(archivedCards).toHaveCount(2);
  await expect(archivedDuplicate).toHaveCount(1);

  const archivedSection = archivedDuplicate.locator('.archive-section').first();
  if (!(await archivedSection.evaluate(section => section.open))) {
    await archivedSection.locator('summary').click();
  }
  await expect(archivedSection.getByText('E2E bookmark uit archief')).toBeVisible();

  await page.locator('#archive-back').click();

  const originalGroup = page.locator('#container .group').filter({
    has: page.getByRole('heading', {
      name: 'E2E bestaande groep',
      exact: true
    })
  });
  await expect(page.locator('#container .group')).toHaveCount(2);
  await expect(originalGroup).toBeVisible();
  await expect(
    originalGroup.getByRole('link', { name: 'E2E bookmark die moet blijven' })
  ).toHaveAttribute('href', 'https://example.test/bestaande-groep');
});
