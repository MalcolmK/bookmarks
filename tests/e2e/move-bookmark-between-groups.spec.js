const { test, expect } = require('@playwright/test');
const {
  installMoveBookmarkFixture,
  moveBookmarkNoTargetFixture
} = require('./support/move-bookmark-fixture');

const bookmarkLabel = 'E2E te verplaatsen bookmark';

function getGroup(page, groupName) {
  return page.locator('#container .group').filter({
    has: page.getByRole('heading', { name: groupName })
  });
}

async function openMoveBookmarkDialog(page, testFixture) {
  const fixture = await installMoveBookmarkFixture(page, testFixture);
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  expect(fixture.wasIntercepted()).toBe(true);

  const bookmarkEntry = page.locator('#container .bookmark-entry').filter({
    has: page.getByRole('link', { name: bookmarkLabel })
  });
  await bookmarkEntry.getByRole('button', {
    name: /^(Acties voor bookmark|Actions for bookmark) “E2E te verplaatsen bookmark”$/
  }).click();
  await page.getByRole('menuitem', {
    name: /^(Naar andere groep verplaatsen|Move to another group)$/
  }).click();

  const dialog = page.locator('#edit-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test('laadt de geïsoleerde fixture voor verplaatsen tussen groepen', async ({ page }) => {
  const fixture = await installMoveBookmarkFixture(page);
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  expect(fixture.wasIntercepted()).toBe(true);

  await expect(page.getByRole('heading', { name: 'E2E bron-groep' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E bronsectie' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'E2E te verplaatsen bookmark' }))
    .toHaveAttribute('href', 'https://example.test/verplaatsen');
  await expect(page.getByRole('heading', { name: 'E2E doel-groep' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E doelsectie' })).toBeVisible();
});

test('verplaatst een bookmark en behoudt de inhoud in de doelsectie', async ({ page }) => {
  const dialog = await openMoveBookmarkDialog(page);

  await dialog.getByLabel(/^(Doelgroep|Destination group)$/).selectOption({ label: 'E2E doel-groep' });
  await dialog.getByLabel(/^(Doelsectie|Destination section)$/).selectOption({ label: 'E2E doelsectie' });
  await dialog.getByRole('button', { name: /^(Verplaatsen|Move)$/ }).click();

  await expect(dialog).toBeHidden();

  const sourceGroup = getGroup(page, 'E2E bron-groep');
  const targetGroup = getGroup(page, 'E2E doel-groep');

  await expect(sourceGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(0);
  await expect(targetGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(1);
  await expect(targetGroup.getByRole('link', { name: bookmarkLabel }))
    .toHaveAttribute('href', 'https://example.test/verplaatsen');
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
  await expect(page.locator('#export-data')).toBeVisible();
  await expect(page.locator('#discard-draft')).toBeVisible();

  const savedDraft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bookmarks-data-draft-v1'))
  );
  expect(savedDraft.data[0].sections[0].links).toEqual([]);
  expect(savedDraft.data[1].sections[0].links).toEqual([
    { label: bookmarkLabel, url: 'https://example.test/verplaatsen' }
  ]);
});

test('annuleert verplaatsen zonder de bookmark of conceptstatus te wijzigen', async ({ page }) => {
  const dialog = await openMoveBookmarkDialog(page);

  await dialog.getByLabel(/^(Doelgroep|Destination group)$/).selectOption({ label: 'E2E doel-groep' });
  await dialog.getByLabel(/^(Doelsectie|Destination section)$/).selectOption({ label: 'E2E doelsectie' });
  await dialog.getByRole('button', { name: /^(Annuleren|Cancel)$/ }).click();

  await expect(dialog).toBeHidden();

  const sourceGroup = getGroup(page, 'E2E bron-groep');
  const targetGroup = getGroup(page, 'E2E doel-groep');

  await expect(sourceGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(1);
  await expect(sourceGroup.getByRole('link', { name: bookmarkLabel }))
    .toHaveAttribute('href', 'https://example.test/verplaatsen');
  await expect(targetGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(0);
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
  await expect(page.locator('#export-data')).toBeHidden();
  await expect(page.locator('#discard-draft')).toBeHidden();

  const savedDraft = await page.evaluate(() =>
    localStorage.getItem('bookmarks-data-draft-v1')
  );
  expect(savedDraft).toBeNull();
});

test('blokkeert verplaatsen als er geen groep met een sectie als doel bestaat', async ({ page }) => {
  const dialog = await openMoveBookmarkDialog(page, moveBookmarkNoTargetFixture);

  await expect(dialog.getByLabel(/^(Doelgroep|Destination group)$/)).toBeDisabled();
  await expect(dialog.getByRole('button', { name: /^(Verplaatsen|Move)$/ })).toBeDisabled();
  await expect(dialog.locator('#form-status')).toHaveText(
    /^(Er is geen andere actieve groep met een bestaande sectie beschikbaar als bestemming\.|There is no other active group with an existing section available as a destination\.)$/
  );

  const sourceGroup = getGroup(page, 'E2E bron-groep');
  await expect(sourceGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(1);
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
  await expect(page.locator('#export-data')).toBeHidden();
  await expect(page.locator('#discard-draft')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('bookmarks-data-draft-v1'))).toBeNull();
});

test('voorkomt verplaatsen als er geen doelsectie is gekozen', async ({ page }) => {
  const dialog = await openMoveBookmarkDialog(page);

  await dialog.getByLabel(/^(Doelgroep|Destination group)$/).selectOption({ label: 'E2E doel-groep' });
  const targetSection = dialog.getByLabel(/^(Doelsectie|Destination section)$/);
  await expect(targetSection).toHaveValue('');
  expect(await targetSection.evaluate(element => element.validity.valueMissing)).toBe(true);
  await dialog.getByRole('button', { name: /^(Verplaatsen|Move)$/ }).click();

  await expect(dialog).toBeVisible();
  await expect(targetSection).toHaveValue('');

  const sourceGroup = getGroup(page, 'E2E bron-groep');
  const targetGroup = getGroup(page, 'E2E doel-groep');
  await expect(sourceGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(1);
  await expect(targetGroup.getByRole('link', { name: bookmarkLabel })).toHaveCount(0);
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
  await expect(page.locator('#export-data')).toBeHidden();
  await expect(page.locator('#discard-draft')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('bookmarks-data-draft-v1'))).toBeNull();
});
