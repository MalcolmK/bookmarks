const { test, expect } = require('@playwright/test');

const searchFixture = [
  {
    name: 'Alpha Group',
    sections: [
      {
        name: 'Operations',
        links: [
          { label: 'Alpha Portal', url: '/__test-target__/alpha-portal', icon: '' },
          { label: 'Portal Guide', url: '/__test-target__/portal-guide', icon: '' }
        ]
      },
      {
        name: 'Knowledge',
        links: [
          { label: 'Onboarding', url: '/__test-target__/onboarding', icon: '' }
        ]
      }
    ]
  },
  {
    name: 'Beta Group',
    sections: [
      {
        name: 'Operations',
        links: [
          { label: 'Release Notes', url: '/__test-target__/release-notes', icon: '' }
        ]
      }
    ]
  }
];

async function openBookmarksWithFixture(page) {
  await page.route('**/data.js', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `let bookmarksData = ${JSON.stringify(searchFixture)};`
    })
  );

  await page.goto('/');
}

function groupByName(page, name) {
  return page.locator('#container .group').filter({
    has: page.getByRole('heading', { name })
  });
}

test.describe('Zoeken in bookmarks', () => {
  test('zoekt op groepsnaam, sectienaam en bookmarknaam met synthetische gegevens', async ({ page }) => {
    await openBookmarksWithFixture(page);

    const search = page.getByRole('searchbox', { name: 'Zoek in je bookmarks' });
    const alphaGroup = groupByName(page, 'Alpha Group');
    const betaGroup = groupByName(page, 'Beta Group');

    await search.fill('Alpha Group');
    await expect(alphaGroup).toBeVisible();
    await expect(betaGroup).toBeHidden();

    await search.fill('Knowledge');
    await expect(alphaGroup).toBeVisible();
    await expect(
      alphaGroup.locator('.section').filter({ has: page.getByRole('heading', { name: 'Knowledge' }) })
    ).toBeVisible();
    await expect(
      alphaGroup.locator('.section').filter({ has: page.getByRole('heading', { name: 'Operations' }) })
    ).toBeHidden();
    await expect(betaGroup).toBeHidden();

    await search.fill('Release Notes');
    await expect(betaGroup).toBeVisible();
    await expect(alphaGroup).toBeHidden();
    await expect(page.getByRole('link', { name: 'Release Notes' })).toBeVisible();
  });

  test('combineert zoekwoorden met AND en toont geen resultaat als niet alle woorden passen', async ({ page }) => {
    await openBookmarksWithFixture(page);

    const search = page.getByRole('searchbox', { name: 'Zoek in je bookmarks' });
    const highlighted = page.locator('#container .bookmark.highlight');
    const alphaGroup = groupByName(page, 'Alpha Group');
    const betaGroup = groupByName(page, 'Beta Group');

    await search.fill('Beta Operations Release');
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted).toHaveText('Release Notes');
    await expect(betaGroup).toBeVisible();
    await expect(alphaGroup).toBeHidden();

    await search.fill('Alpha Release');
    await expect(highlighted).toHaveCount(0);
    await expect(alphaGroup).toBeHidden();
    await expect(betaGroup).toBeHidden();
  });

  test('wist de zoektekst en toont alle groepen opnieuw', async ({ page }) => {
    await openBookmarksWithFixture(page);

    const search = page.getByRole('searchbox', { name: 'Zoek in je bookmarks' });
    const clearButton = page.getByRole('button', { name: 'Zoektekst wissen' });
    const groups = page.locator('#container .group');
    const alphaGroup = groupByName(page, 'Alpha Group');
    const betaGroup = groupByName(page, 'Beta Group');

    await search.fill('Release Notes');
    await expect(clearButton).toBeVisible();
    await expect(betaGroup).toBeVisible();
    await expect(alphaGroup).toBeHidden();

    await clearButton.click();

    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    await expect(clearButton).toBeHidden();
    await expect(page.locator('#container .bookmark.highlight')).toHaveCount(0);
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0)).toBeVisible();
    await expect(groups.nth(1)).toBeVisible();
  });

  test('navigeert met pijltjestoetsen en opent het geselecteerde resultaat met Enter', async ({ page }) => {
    await openBookmarksWithFixture(page);

    const search = page.getByRole('searchbox', { name: 'Zoek in je bookmarks' });
    const highlighted = page.locator('#container .bookmark.highlight');
    const selectedResult = page.locator('#container .bookmark.enter-target');

    await search.fill('portal');
    await expect(highlighted).toHaveCount(2);
    await expect(selectedResult).toHaveText('Alpha Portal');

    await search.press('ArrowDown');
    await expect(selectedResult).toHaveText('Portal Guide');
    await expect(highlighted).toHaveCount(2);

    await search.press('ArrowUp');
    await expect(selectedResult).toHaveText('Alpha Portal');
    await search.press('ArrowDown');
    await expect(selectedResult).toHaveText('Portal Guide');

    await page.route('**/__test-target__/portal-guide', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Testbestemming</title><h1>Portal Guide geopend</h1>'
      });
    });

    await Promise.all([
      page.waitForURL('**/__test-target__/portal-guide'),
      search.press('Enter')
    ]);

    await expect(page.getByRole('heading', { name: 'Portal Guide geopend' })).toBeVisible();
  });
});
