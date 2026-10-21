const { test, expect } = require('@playwright/test');
const { installArchiveFixture } = require('./support/archive-fixture');

test('vindt een gearchiveerde groep en keert terug naar de groepen', async ({ page }) => {
  const fixture = await installArchiveFixture(page);
  await page.goto('/');

  expect(fixture.wasIntercepted()).toBe(true);

  const activeGroup = page.locator('#container .group').filter({
    has: page.getByRole('heading', { name: 'E2E actieve groep' })
  });
  await expect(activeGroup).toBeVisible();

  await page.locator('#open-archive').click();

  const archiveView = page.locator('#archive-view');
  const archiveCards = page.locator('#archive-container .archive-group-card');
  await expect(archiveView).toBeVisible();
  await expect(page.locator('#container')).toBeHidden();
  await expect(page.locator('#archive-heading')).toBeFocused();
  await expect(archiveCards).toHaveCount(2);

  const archivedGroup = archiveCards.filter({
    has: page.getByRole('heading', { name: 'E2E herstelgroep' })
  });
  await expect(archivedGroup).toHaveCount(1);
  await expect(archivedGroup.locator('h3')).toHaveText('E2E herstelgroep');
  await expect(archivedGroup.locator('.archive-section')).toHaveCount(2);
  await expect(
    archivedGroup.locator('.archive-section').nth(0).locator('summary')
  ).toContainText('E2E handleidingen');
  await expect(
    archivedGroup.locator('.archive-section').nth(1).locator('summary')
  ).toContainText('E2E lege sectie');
  await expect(
    archiveCards.filter({ hasText: 'E2E actieve groep' })
  ).toHaveCount(0);

  const firstSection = archivedGroup.locator('.archive-section').first();
  if (!(await firstSection.evaluate(section => section.open))) {
    await firstSection.locator('summary').click();
  }
  await expect(firstSection.getByText('E2E herstelbare bookmark')).toBeVisible();
  await expect(firstSection.getByText('E2E tweede herstelbookmark')).toBeVisible();

  await page.locator('#archive-back').click();

  await expect(archiveView).toBeHidden();
  await expect(page.locator('#container')).toBeVisible();
  await expect(activeGroup).toBeVisible();
  await expect(page.locator('#open-archive')).toBeFocused();
});
