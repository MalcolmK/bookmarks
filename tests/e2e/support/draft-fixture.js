const draftFixture = [
  {
    name: 'E2E conceptgroep',
    sections: [
      {
        name: 'E2E conceptsectie',
        links: [
          { label: 'Bestaande testlink', url: 'https://example.test/bestaand' }
        ]
      }
    ]
  }
];

async function installDraftFixture(page) {
  let intercepted = false;

  await page.route('**/data.js', route => {
    intercepted = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `let bookmarksData = ${JSON.stringify(draftFixture)};`
    });
  });

  return {
    wasIntercepted: () => intercepted
  };
}

async function addDraftBookmark(page, label = 'E2E conceptlink', url = 'https://example.test/concept') {
  const section = page.locator('#container .section').filter({
    has: page.getByRole('heading', { name: 'E2E conceptsectie' })
  });

  await section.locator('.section-menu > summary').click();
  await section.getByRole('button', { name: /^(Bookmark toevoegen|Add bookmark)$/ }).click();

  const dialog = page.locator('#edit-dialog');
  await dialog.getByLabel(/^(Naam|Name)$/).fill(label);
  await dialog.getByLabel('URL').fill(url);
  await dialog.locator('#dialog-submit').click();
  await dialog.waitFor({ state: 'hidden' });

  return { label, url };
}

module.exports = { addDraftBookmark, draftFixture, installDraftFixture };
