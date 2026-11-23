import { test, expect } from '@playwright/test';

test('shared cafe survives refresh and closes without losing filters', async ({ page }) => {
  await page.goto('/?cafe=162&beans=1');
  const dialog = page.getByRole('dialog', { name: 'Cups', exact: true });
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'סגור', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => new URL(page.url()).searchParams.has('cafe')).toBe(false);
  await expect.poll(() => new URL(page.url()).searchParams.get('beans')).toBe('1');
});

test('public page opens interactive map and browser Back returns', async ({ page }) => {
  await page.goto('/cafe/162');
  await page.getByRole('link', { name: /פתח במפה האינטראקטיבית/ }).click();
  await expect(page.getByRole('dialog', { name: 'Cups', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/cafe\/162$/);
});

for (const id of ['19', '38', '42', '115', '136', '142', '143']) {
  test(`non-public listing ${id} has no public hours or map actions`, async ({ page }) => {
    await page.goto(`/cafe/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'שעות פתיחה' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /פתח במפה האינטראקטיבית|^נווט$/ })).toHaveCount(0);
  });
}

test('mobile list and map toggle preserves the beans filter', async ({ page }) => {
  await page.goto('/?beans=1');
  await page.getByRole('button', { name: 'מפה', exact: true }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('beans')).toBe('1');
  await page.getByRole('button', { name: 'רשימת בתי קפה', exact: true }).click();
  await expect(page.getByRole('button', { name: 'מפה', exact: true })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('beans')).toBe('1');
});
