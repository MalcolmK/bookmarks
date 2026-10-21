const moveBookmarkFixture = [
  {
    name: 'E2E bron-groep',
    sections: [
      {
        name: 'E2E bronsectie',
        links: [
          { label: 'E2E te verplaatsen bookmark', url: 'https://example.test/verplaatsen' }
        ]
      }
    ]
  },
  {
    name: 'E2E doel-groep',
    sections: [
      {
        name: 'E2E doelsectie',
        links: []
      }
    ]
  }
];

const moveBookmarkNoTargetFixture = [
  moveBookmarkFixture[0],
  {
    name: 'E2E groep zonder secties',
    sections: []
  }
];

async function installMoveBookmarkFixture(page, fixture = moveBookmarkFixture) {
  let intercepted = false;

  await page.route('**/data.js', route => {
    intercepted = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `let bookmarksData = ${JSON.stringify(fixture)};`
    });
  });

  return {
    wasIntercepted: () => intercepted
  };
}

module.exports = {
  installMoveBookmarkFixture,
  moveBookmarkFixture,
  moveBookmarkNoTargetFixture
};
