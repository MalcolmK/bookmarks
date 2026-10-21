const archiveFixture = [
  {
    name: 'E2E actieve groep',
    sections: [
      {
        name: 'E2E actieve sectie',
        links: [
          {
            label: 'E2E bestaande bookmark',
            url: 'https://example.test/actief',
            icon: 'icons/cgi-192x192.png'
          }
        ]
      }
    ]
  },
  {
    name: 'E2E herstelgroep',
    archivedAt: '2026-02-20T12:00:00.000Z',
    sections: [
      {
        name: 'E2E handleidingen',
        links: [
          {
            label: 'E2E herstelbare bookmark',
            url: 'https://example.test/herstelbaar',
            icon: 'icons/cgi-192x192.png'
          },
          {
            label: 'E2E tweede herstelbookmark',
            url: 'https://example.test/tweede-herstelbaar',
            icon: ''
          }
        ]
      },
      {
        name: 'E2E lege sectie',
        links: []
      }
    ]
  },
  {
    name: 'E2E bestaande groep',
    sections: [
      {
        name: 'E2E bestaande sectie',
        links: [
          {
            label: 'E2E bookmark die moet blijven',
            url: 'https://example.test/bestaande-groep',
            icon: 'icons/cgi-192x192.png'
          }
        ]
      }
    ]
  },
  {
    name: 'E2E bestaande groep',
    archivedAt: '2026-02-21T12:00:00.000Z',
    sections: [
      {
        name: 'E2E gearchiveerde sectie',
        links: [
          {
            label: 'E2E bookmark uit archief',
            url: 'https://example.test/archief',
            icon: 'icons/cgi-192x192.png'
          }
        ]
      }
    ]
  }
];

async function installArchiveFixture(page, fixture = archiveFixture) {
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

module.exports = { archiveFixture, installArchiveFixture };
