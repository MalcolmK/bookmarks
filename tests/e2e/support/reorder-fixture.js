const reorderFixture = [
  {
    name: 'E2E groep Alpha',
    sections: [
      {
        name: 'E2E sectie A1',
        links: [
          { label: 'E2E bookmark A1-1', url: 'https://example.test/a1-1' },
          { label: 'E2E bookmark A1-2', url: 'https://example.test/a1-2' }
        ]
      },
      {
        name: 'E2E sectie A2',
        links: [
          { label: 'E2E bookmark A2-1', url: 'https://example.test/a2-1' },
          { label: 'E2E bookmark A2-2', url: 'https://example.test/a2-2' }
        ]
      }
    ]
  },
  {
    name: 'E2E groep Beta',
    sections: [
      {
        name: 'E2E sectie B1',
        links: [
          { label: 'E2E bookmark B1-1', url: 'https://example.test/b1-1' },
          { label: 'E2E bookmark B1-2', url: 'https://example.test/b1-2' }
        ]
      }
    ]
  }
];

async function installReorderFixture(page) {
  let intercepted = false;

  await page.route('**/data.js', route => {
    intercepted = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `let bookmarksData = ${JSON.stringify(reorderFixture)};`
    });
  });

  return {
    wasIntercepted: () => intercepted
  };
}

module.exports = { installReorderFixture, reorderFixture };
