import { test, expect } from '@playwright/test';

test.describe('Config Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Save Current Config button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Current Config' })).toBeVisible();
  });

  test('clicking Save Current Config shows save form', async ({ page }) => {
    await page.getByRole('button', { name: 'Save Current Config' }).click();

    // Save form should appear with name input and Save button
    await expect(page.getByPlaceholder('Config name...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('enter a name and save config', async ({ page }) => {
    // First fill in some config values
    await page.getByPlaceholder('e.g. https://idp.example.com').fill('https://test-idp.com');

    // Click save button
    await page.getByRole('button', { name: 'Save Current Config' }).click();

    // Enter config name
    await page.getByPlaceholder('Config name...').fill('My Test Config');

    // Click Save
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Config should appear in the list
    await expect(page.getByText('My Test Config')).toBeVisible();
    await expect(page.getByText('active', { exact: true })).toBeVisible();
  });

  test('click saved config to load and verify it restores', async ({ page }) => {
    // Save a config first
    await page.getByPlaceholder('e.g. https://idp.example.com').fill('https://test-idp.com');
    await page.getByRole('button', { name: 'Save Current Config' }).click();
    await page.getByPlaceholder('Config name...').fill('Restore Test');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Clear the input
    await page.getByPlaceholder('e.g. https://idp.example.com').fill('');

    // Click the saved config to load it
    await page.getByRole('button', { name: 'Restore Test' }).click();

    // Verify the config was restored
    await expect(page.getByPlaceholder('e.g. https://idp.example.com')).toHaveValue('https://test-idp.com');
  });

  test('delete a config removes it from the list', async ({ page }) => {
    // Save a config
    await page.getByRole('button', { name: 'Save Current Config' }).click();
    await page.getByPlaceholder('Config name...').fill('Delete Me');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Verify it exists
    await expect(page.getByText('Delete Me')).toBeVisible();

    // Click the delete button (the X next to the config name)
    await page.getByTitle('Delete').click();

    // Config should be removed
    await expect(page.getByText('Delete Me')).not.toBeVisible();
    await expect(page.getByText('No saved configurations yet.')).toBeVisible();
  });

  test('Share Config via URL generates a URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Share Config via URL' }).click();

    // Share URL section should appear
    await expect(page.getByText(/share url/i)).toBeVisible();

    // URL input should contain the share URL
    const shareInput = page.locator('input[readonly]').last();
    await expect(shareInput).toBeVisible();
    const url = await shareInput.inputValue();
    expect(url).toContain('config=');

    // Copy button should be visible
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();

    // Close button should work
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText(/share url/i)).not.toBeVisible();
  });

  test('Export All button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export All' })).toBeVisible();
  });

  test('Import button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  });

  test('Saved Configurations heading is visible', async ({ page }) => {
    await expect(page.getByText('Saved Configurations', { exact: true })).toBeVisible();
  });

  test('no saved configs shows empty message', async ({ page }) => {
    await expect(page.getByText('No saved configurations yet.')).toBeVisible();
  });
});
