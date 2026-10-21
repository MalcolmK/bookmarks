const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const {
  addDraftBookmark,
  draftFixture,
  installDraftFixture
} = require('./support/draft-fixture');

test('laadt synthetische concept-testdata via request-interceptie', async ({ page }) => {
  const fixtureRoute = await installDraftFixture(page);
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  expect(fixtureRoute.wasIntercepted()).toBe(true);
  await expect(page.getByRole('heading', { name: 'E2E conceptgroep' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E conceptsectie' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bestaande testlink' })).toHaveAttribute(
    'href',
    draftFixture[0].sections[0].links[0].url
  );
  await expect(page.locator('#container .group')).toHaveCount(1);
});

test('voegt via de interface een bookmark toe als conceptwijziging', async ({ page }) => {
  await installDraftFixture(page);
  await page.goto('/');

  const addedBookmark = await addDraftBookmark(page);

  await expect(page.getByRole('link', { name: addedBookmark.label })).toHaveAttribute(
    'href',
    addedBookmark.url
  );
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
  await expect(page.locator('#export-data')).toBeVisible();
  await expect(page.locator('#discard-draft')).toBeVisible();

  const savedDraft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bookmarks-data-draft-v1'))
  );
  expect(savedDraft.base).toBe(JSON.stringify(draftFixture));
  expect(savedDraft.data[0].sections[0].links).toContainEqual(addedBookmark);
});

test('herstelt de conceptbookmark na herladen van de pagina', async ({ page }) => {
  const fixtureRoute = await installDraftFixture(page);
  const initialResponse = await page.goto('/');
  expect(initialResponse?.status()).toBe(200);

  const addedBookmark = await addDraftBookmark(page);
  await expect(page.getByRole('link', { name: addedBookmark.label })).toHaveAttribute(
    'href',
    addedBookmark.url
  );

  const reloadResponse = await page.reload();

  expect(reloadResponse?.status()).toBe(200);
  expect(fixtureRoute.wasIntercepted()).toBe(true);
  await expect(page.getByRole('link', { name: addedBookmark.label })).toHaveAttribute(
    'href',
    addedBookmark.url
  );
  await expect(page.getByRole('link', { name: 'Bestaande testlink' })).toHaveAttribute(
    'href',
    draftFixture[0].sections[0].links[0].url
  );
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
  await expect(page.locator('#export-data')).toBeVisible();
  await expect(page.locator('#discard-draft')).toBeVisible();

  const restoredDraft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bookmarks-data-draft-v1'))
  );
  expect(restoredDraft.base).toBe(JSON.stringify(draftFixture));
  expect(restoredDraft.data[0].sections[0].links).toContainEqual(addedBookmark);
});

test('downloadt de actuele conceptdata als data.js', async ({ page }, testInfo) => {
  await installDraftFixture(page);
  await page.goto('/');
  const addedBookmark = await addDraftBookmark(page);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-data').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('data.js');
  const downloadedFile = testInfo.outputPath('exported-data.js');
  await download.saveAs(downloadedFile);

  const expectedData = JSON.parse(JSON.stringify(draftFixture));
  expectedData[0].sections[0].links.push(addedBookmark);
  const downloadedSource = await readFile(downloadedFile, 'utf8');
  expect(downloadedSource).toBe(
    `let bookmarksData = ${JSON.stringify(expectedData, null, 4)};\n`
  );

  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
  await expect(page.locator('#export-data')).toBeVisible();
  await expect(page.locator('#discard-draft')).toBeVisible();

  const savedDraft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bookmarks-data-draft-v1'))
  );
  expect(savedDraft.exportedData).toBe(JSON.stringify(expectedData));
});

test('annuleert verwerpen en behoudt de conceptbookmark', async ({ page }) => {
  await installDraftFixture(page);
  await page.goto('/');
  const addedBookmark = await addDraftBookmark(page);

  await page.locator('#discard-draft').click();
  const discardDialog = page.locator('#discard-dialog');
  await expect(discardDialog).toBeVisible();
  await page.locator('#discard-cancel').click();

  await expect(discardDialog).toBeHidden();
  await expect(page.getByRole('link', { name: addedBookmark.label })).toHaveAttribute(
    'href',
    addedBookmark.url
  );
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
  await expect(page.locator('#export-data')).toBeVisible();
  await expect(page.locator('#discard-draft')).toBeVisible();

  const savedDraft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bookmarks-data-draft-v1'))
  );
  expect(savedDraft.data[0].sections[0].links).toContainEqual(addedBookmark);
});

test('bevestigt verwerpen en herstelt de basisdata', async ({ page }) => {
  await installDraftFixture(page);
  await page.goto('/');
  const addedBookmark = await addDraftBookmark(page);

  await page.locator('#discard-draft').click();
  const discardDialog = page.locator('#discard-dialog');
  await expect(discardDialog).toBeVisible();
  await page.locator('#discard-confirm').click();

  await expect(discardDialog).toBeHidden();
  await expect(page.getByRole('link', { name: 'Bestaande testlink' })).toHaveAttribute(
    'href',
    draftFixture[0].sections[0].links[0].url
  );
  await expect(page.getByRole('link', { name: addedBookmark.label })).toHaveCount(0);
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
  await expect(page.locator('#export-data')).toBeHidden();
  await expect(page.locator('#discard-draft')).toBeHidden();

  const savedDraft = await page.evaluate(() =>
    localStorage.getItem('bookmarks-data-draft-v1')
  );
  expect(savedDraft).toBeNull();
});
