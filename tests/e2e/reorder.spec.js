const { test, expect } = require('@playwright/test');
const { installReorderFixture, reorderFixture } = require('./support/reorder-fixture');

const fixtureBookmarkNames = reorderFixture.flatMap(group =>
  group.sections.flatMap(section => section.links.map(link => link.label))
);

function getGroup(page, groupName) {
  return page.locator('#container > .group').filter({ hasText: groupName });
}

function getSection(group, sectionName) {
  return group.locator('.section').filter({ hasText: sectionName });
}

function getBookmarkEntry(section, bookmarkName) {
  return section.locator('.bookmark-entry').filter({ hasText: bookmarkName });
}

async function readGroupOrder(page) {
  return (await page.locator('#container > .group .group-title').allTextContents())
    .map(name => name.trim());
}

async function readSectionOrder(group) {
  return (await group.locator('.section-header h2').allTextContents())
    .map(name => name.trim());
}

async function readBookmarkOrder(section) {
  return (await section.locator('.bookmark-entry > .bookmark').allTextContents())
    .map(name => name.trim());
}

async function expectEveryFixtureBookmarkExactlyOnce(page) {
  const actualNames = await readAllBookmarkNames(page);
  expect(actualNames).toHaveLength(fixtureBookmarkNames.length);
  expect([...actualNames].sort()).toEqual([...fixtureBookmarkNames].sort());
}

async function readAllBookmarkNames(page) {
  return (await page.locator('#container .bookmark-entry > .bookmark').allTextContents())
    .map(name => name.trim());
}

async function startReorderMode(page) {
  const toggle = page.locator('#toggle-reorder-mode');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
}

async function moveDownWithKeyboard(handle) {
  await handle.focus();
  await handle.press('Space');
  await handle.press('ArrowDown');
  await handle.press('Space');
}

async function cancelMoveWithKeyboard(page, handle) {
  await handle.focus();
  await handle.press('Space');
  await handle.press('ArrowDown');
  await handle.press('Escape');

  await expect(handle).toBeFocused();
  await expect(page.locator('#container .is-drag-source, #container .is-drop-target'))
    .toHaveCount(0);
  await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
  expect(await page.evaluate(() => localStorage.getItem('bookmarks-data-draft-v1')))
    .toBeNull();
}

async function dragWithMouse(page, handle, target) {
  await handle.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const start = await handle.boundingBox();
  const destination = await target.boundingBox();
  expect(start).not.toBeNull();
  expect(destination).not.toBeNull();

  const startX = start.x + start.width / 2;
  const startY = start.y + start.height / 2;
  const destinationX = destination.x + destination.width / 2;
  const destinationY = destination.y + destination.height * 0.75;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 8, { steps: 2 });
  await page.mouse.move(destinationX, destinationY, { steps: 8 });
  await page.mouse.up();
}

test.describe('Volgorde wijzigen', () => {
  test('laadt de geïsoleerde herschikfixture in de juiste beginvolgorde', async ({ page }) => {
    const fixture = await installReorderFixture(page);
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    expect(fixture.wasIntercepted()).toBe(true);
    expect(await readGroupOrder(page)).toEqual(reorderFixture.map(group => group.name));

    for (const expectedGroup of reorderFixture) {
      const group = getGroup(page, expectedGroup.name);
      await expect(group).toHaveCount(1);
      expect(await readSectionOrder(group)).toEqual(
        expectedGroup.sections.map(section => section.name)
      );

      for (const expectedSection of expectedGroup.sections) {
        const section = getSection(group, expectedSection.name);
        await expect(section).toHaveCount(1);
        expect(await readBookmarkOrder(section)).toEqual(
          expectedSection.links.map(link => link.label)
        );
      }
    }

    for (const bookmarkName of fixtureBookmarkNames) {
      await expect(page.getByRole('link', { name: bookmarkName })).toBeVisible();
    }
  });

  test('herschikt bookmarks met het toetsenbord binnen dezelfde sectie', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const group = getGroup(page, 'E2E groep Alpha');
    const section = getSection(group, 'E2E sectie A1');
    const handle = getBookmarkEntry(section, 'E2E bookmark A1-1')
      .locator('.drag-handle[data-drag-type="bookmark"]');
    await expect(handle).toBeVisible();
    await moveDownWithKeyboard(handle);

    expect(await readBookmarkOrder(section)).toEqual([
      'E2E bookmark A1-2',
      'E2E bookmark A1-1'
    ]);
    expect(await readBookmarkOrder(getSection(group, 'E2E sectie A2'))).toEqual([
      'E2E bookmark A2-1',
      'E2E bookmark A2-2'
    ]);
    expect(await readBookmarkOrder(getSection(getGroup(page, 'E2E groep Beta'), 'E2E sectie B1')))
      .toEqual(['E2E bookmark B1-1', 'E2E bookmark B1-2']);
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('herschikt secties met het toetsenbord binnen dezelfde groep', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const group = getGroup(page, 'E2E groep Alpha');
    const handle = getSection(group, 'E2E sectie A1')
      .locator('.drag-handle[data-drag-type="section"]');
    await expect(handle).toBeVisible();
    await moveDownWithKeyboard(handle);

    expect(await readSectionOrder(group)).toEqual(['E2E sectie A2', 'E2E sectie A1']);
    expect(await readSectionOrder(getGroup(page, 'E2E groep Beta'))).toEqual(['E2E sectie B1']);
    expect(await readBookmarkOrder(getSection(group, 'E2E sectie A1'))).toEqual([
      'E2E bookmark A1-1',
      'E2E bookmark A1-2'
    ]);
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('herschikt groepen met het toetsenbord', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const handle = getGroup(page, 'E2E groep Alpha')
      .locator('.drag-handle[data-drag-type="group"]');
    await expect(handle).toBeVisible();
    await moveDownWithKeyboard(handle);

    expect(await readGroupOrder(page)).toEqual(['E2E groep Beta', 'E2E groep Alpha']);
    expect(await readSectionOrder(getGroup(page, 'E2E groep Alpha'))).toEqual([
      'E2E sectie A1',
      'E2E sectie A2'
    ]);
    expect(await readBookmarkOrder(getSection(getGroup(page, 'E2E groep Alpha'), 'E2E sectie A1')))
      .toEqual(['E2E bookmark A1-1', 'E2E bookmark A1-2']);
    expect(await readSectionOrder(getGroup(page, 'E2E groep Beta'))).toEqual(['E2E sectie B1']);
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('annuleert bookmarkverplaatsing met Escape en herstelt de beginvolgorde', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const section = getSection(getGroup(page, 'E2E groep Alpha'), 'E2E sectie A1');
    const handle = getBookmarkEntry(section, 'E2E bookmark A1-1')
      .locator('.drag-handle[data-drag-type="bookmark"]');
    await cancelMoveWithKeyboard(page, handle);

    expect(await readBookmarkOrder(section)).toEqual([
      'E2E bookmark A1-1',
      'E2E bookmark A1-2'
    ]);
    await expect(page.locator('#toggle-reorder-mode')).toHaveAttribute('aria-pressed', 'true');
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('annuleert sectieverplaatsing met Escape en herstelt de beginvolgorde', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const group = getGroup(page, 'E2E groep Alpha');
    const handle = getSection(group, 'E2E sectie A1')
      .locator('.drag-handle[data-drag-type="section"]');
    await cancelMoveWithKeyboard(page, handle);

    expect(await readSectionOrder(group)).toEqual(['E2E sectie A1', 'E2E sectie A2']);
    await expect(page.locator('#toggle-reorder-mode')).toHaveAttribute('aria-pressed', 'true');
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('annuleert groepsverplaatsing met Escape en herstelt de beginvolgorde', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const handle = getGroup(page, 'E2E groep Alpha')
      .locator('.drag-handle[data-drag-type="group"]');
    await cancelMoveWithKeyboard(page, handle);

    expect(await readGroupOrder(page)).toEqual(['E2E groep Alpha', 'E2E groep Beta']);
    await expect(page.locator('#toggle-reorder-mode')).toHaveAttribute('aria-pressed', 'true');
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('herschikt een bookmark met de aanwijzer binnen dezelfde sectie', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const section = getSection(getGroup(page, 'E2E groep Alpha'), 'E2E sectie A1');
    const source = getBookmarkEntry(section, 'E2E bookmark A1-1');
    const handle = source.locator('.drag-handle[data-drag-type="bookmark"]');
    const target = getBookmarkEntry(section, 'E2E bookmark A1-2');
    await dragWithMouse(page, handle, target);

    expect(await readBookmarkOrder(section)).toEqual([
      'E2E bookmark A1-2',
      'E2E bookmark A1-1'
    ]);
    expect(await readBookmarkOrder(
      getSection(getGroup(page, 'E2E groep Alpha'), 'E2E sectie A2')
    )).toEqual(['E2E bookmark A2-1', 'E2E bookmark A2-2']);
    await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'dirty');
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('weigert een bookmark naar een andere sectie te slepen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const group = getGroup(page, 'E2E groep Alpha');
    const sourceSection = getSection(group, 'E2E sectie A1');
    const targetSection = getSection(group, 'E2E sectie A2');
    await dragWithMouse(
      page,
      getBookmarkEntry(sourceSection, 'E2E bookmark A1-1')
        .locator('.drag-handle[data-drag-type="bookmark"]'),
      getBookmarkEntry(targetSection, 'E2E bookmark A2-1')
    );

    expect(await readBookmarkOrder(sourceSection)).toEqual([
      'E2E bookmark A1-1',
      'E2E bookmark A1-2'
    ]);
    expect(await readBookmarkOrder(targetSection)).toEqual([
      'E2E bookmark A2-1',
      'E2E bookmark A2-2'
    ]);
    await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
    expect(await page.evaluate(() => localStorage.getItem('bookmarks-data-draft-v1')))
      .toBeNull();
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('weigert een bookmark naar een andere groep te slepen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const sourceSection = getSection(getGroup(page, 'E2E groep Alpha'), 'E2E sectie A1');
    const targetSection = getSection(getGroup(page, 'E2E groep Beta'), 'E2E sectie B1');
    await dragWithMouse(
      page,
      getBookmarkEntry(sourceSection, 'E2E bookmark A1-1')
        .locator('.drag-handle[data-drag-type="bookmark"]'),
      getBookmarkEntry(targetSection, 'E2E bookmark B1-1')
    );

    expect(await readBookmarkOrder(sourceSection)).toEqual([
      'E2E bookmark A1-1',
      'E2E bookmark A1-2'
    ]);
    expect(await readBookmarkOrder(targetSection)).toEqual([
      'E2E bookmark B1-1',
      'E2E bookmark B1-2'
    ]);
    await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
    expect(await page.evaluate(() => localStorage.getItem('bookmarks-data-draft-v1')))
      .toBeNull();
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('weigert een sectie naar een andere groep te slepen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await installReorderFixture(page);
    await page.goto('/');
    await startReorderMode(page);

    const sourceGroup = getGroup(page, 'E2E groep Alpha');
    const targetGroup = getGroup(page, 'E2E groep Beta');
    await dragWithMouse(
      page,
      getSection(sourceGroup, 'E2E sectie A1')
        .locator('.drag-handle[data-drag-type="section"]'),
      getSection(targetGroup, 'E2E sectie B1')
    );

    expect(await readSectionOrder(sourceGroup)).toEqual(['E2E sectie A1', 'E2E sectie A2']);
    expect(await readSectionOrder(targetGroup)).toEqual(['E2E sectie B1']);
    expect(await readBookmarkOrder(getSection(sourceGroup, 'E2E sectie A1'))).toEqual([
      'E2E bookmark A1-1',
      'E2E bookmark A1-2'
    ]);
    await expect(page.locator('#export-status')).toHaveAttribute('data-state', 'clean');
    expect(await page.evaluate(() => localStorage.getItem('bookmarks-data-draft-v1')))
      .toBeNull();
    await expectEveryFixtureBookmarkExactlyOnce(page);
  });

  test('toont verplaatshandles alleen in verplaatsmodus en niet tijdens zoeken', async ({ page }) => {
    await installReorderFixture(page);
    await page.goto('/');

    const toggle = page.locator('#toggle-reorder-mode');
    const allHandles = page.locator('#container .drag-handle');
    const visibleHandles = page.locator('#container .drag-handle:not([hidden])');
    const usableHandles = page.locator(
      '#container .drag-handle:not([hidden]):not(:disabled)'
    );
    const search = page.locator('#search');

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await allHandles.count()).toBeGreaterThan(0);
    await expect(visibleHandles).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(usableHandles).not.toHaveCount(0);

    await search.fill('E2E bookmark A1-1');
    await expect(page.getByRole('link', { name: 'E2E bookmark A1-1' })).toBeVisible();
    await expect(visibleHandles).toHaveCount(0);

    await search.fill('');
    await expect(usableHandles).not.toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(visibleHandles).toHaveCount(0);
  });
});
