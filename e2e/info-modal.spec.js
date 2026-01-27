import { test, expect } from '@playwright/test'

test.describe('Info Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('opens and closes info modal', async ({ page }) => {
    await page.getByRole('button', { name: '?' }).click()
    await expect(page.getByRole('heading', { name: 'What is BYO Zoning?' })).toBeVisible()

    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(page.getByRole('heading', { name: 'What is BYO Zoning?' })).not.toBeVisible()
  })
})
