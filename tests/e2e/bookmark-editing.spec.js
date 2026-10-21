const { test, expect } = require('@playwright/test');

const editingFixture = [
  {
    name: 'Testgroep',
    sections: [
      {
        name: 'Testsectie',
        links: [
          { label: 'Bestaande bookmark', url: 'https://example.test/' }
        ]
      }
    ]
  }
];

async function openBookmarksWithFixture(page) {
  let fixtureRequestIntercepted = false;

  await page.route('**/data.js', route => {
    fixtureRequestIntercepted = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `let bookmarksData = ${JSON.stringify(editingFixture)};`
    });
  });

  await page.goto('/');
  expect(fixtureRequestIntercepted).toBe(true);
  await expect(page.getByRole('heading', { name: 'Testgroep' })).toBeVisible();
}

async function openAddBookmarkDialog(page) {
  const section = page.locator('#container .section').filter({
    has: page.getByRole('heading', { name: 'Testsectie' })
  });

  await section.locator('.section-menu > summary').click();
  await section.getByRole('button', { name: 'Bookmark toevoegen' }).click();

  const dialog = page.locator('#edit-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectNoDraftChange(page) {
  await expect(page.getByRole('link', { name: 'Bestaande bookmark' })).toHaveAttribute(
    'href',
    'https://example.test/'
  );
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
  await expect(page.locator('#export-data')).toBeHidden();
  await expect(page.locator('#discard-draft')).toBeHidden();

  const savedDraft = await page.evaluate(() =>
    localStorage.getItem('bookmarks-data-draft-v1')
  );
  expect(savedDraft).toBeNull();
}

test.describe('Bookmark wijzigen en annuleren', () => {
  test('voegt een bookmark toe en markeert de wijziging als concept', async ({ page }) => {
    await openBookmarksWithFixture(page);
    const dialog = await openAddBookmarkDialog(page);

    await dialog.getByLabel('Naam').fill('Nieuwe bookmark');
    await dialog.getByLabel('URL').fill('https://example.test/nieuw');
    await dialog.locator('#dialog-submit').click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('link', { name: 'Nieuwe bookmark' })).toHaveAttribute(
      'href',
      'https://example.test/nieuw'
    );
    await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
    await expect(page.locator('#export-data')).toBeVisible();
    await expect(page.locator('#discard-draft')).toBeVisible();

    const savedDraft = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('bookmarks-data-draft-v1'))
    );
    expect(savedDraft.base).toBe(JSON.stringify(editingFixture));
    expect(savedDraft.data[0].sections[0].links).toContainEqual({
      label: 'Nieuwe bookmark',
      url: 'https://example.test/nieuw'
    });
  });

  test('annuleert toevoegen zonder de lijst of conceptstatus te wijzigen', async ({ page }) => {
    await openBookmarksWithFixture(page);
    const dialog = await openAddBookmarkDialog(page);

    await dialog.getByLabel('Naam').fill('Niet toevoegen');
    await dialog.getByLabel('URL').fill('https://example.test/annuleren');
    await dialog.locator('#dialog-cancel').click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('link', { name: 'Bestaande bookmark' })).toHaveAttribute(
      'href',
      'https://example.test/'
    );
    await expect(page.getByRole('link', { name: 'Niet toevoegen' })).toHaveCount(0);
    await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
    await expect(page.locator('#export-data')).toBeHidden();
    await expect(page.locator('#discard-draft')).toBeHidden();
    const savedDraft = await page.evaluate(() =>
      localStorage.getItem('bookmarks-data-draft-v1')
    );
    expect(savedDraft).toBeNull();
  });

  test('wijst een lege bookmarknaam af', async ({ page }) => {
    await openBookmarksWithFixture(page);
    const dialog = await openAddBookmarkDialog(page);

    await dialog.getByLabel('URL').fill('https://example.test/zonder-naam');
    await dialog.locator('#dialog-submit').click();

    await expect(dialog).toBeVisible();
    await expect(page.getByRole('link', { name: 'zonder-naam' })).toHaveCount(0);
    await expectNoDraftChange(page);
    const nameIsInvalid = await dialog.getByLabel('Naam').evaluate(input => input.validity.valueMissing);
    expect(nameIsInvalid).toBe(true);
  });

  test('wijst een ongeldige URL af', async ({ page }) => {
    await openBookmarksWithFixture(page);
    const dialog = await openAddBookmarkDialog(page);

    await dialog.getByLabel('Naam').fill('Ongeldige URL');
    await dialog.getByLabel('URL').fill('dit-is-geen-url');
    await dialog.locator('#dialog-submit').click();

    await expect(dialog).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ongeldige URL' })).toHaveCount(0);
    await expectNoDraftChange(page);
    const urlIsInvalid = await dialog.getByLabel('URL').evaluate(input => input.validity.typeMismatch);
    expect(urlIsInvalid).toBe(true);
  });
});
