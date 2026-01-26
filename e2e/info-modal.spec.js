import { test, expect } from '@playwright/test'

test.describe('Info Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.info-icon', { timeout: 30000 })
  })

  test('opens and closes info modal', async ({ page }) => {
    await page.click('.info-icon')
    await expect(page.locator('.info-modal')).toBeVisible()
    await expect(page.locator('.info-modal h3')).toHaveText('What is BYO Zoning?')

    await page.click('.info-modal .modal-save')
    await expect(page.locator('.info-modal')).not.toBeVisible()
  })
})
