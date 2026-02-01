import { test, expect } from '@playwright/test'

test.describe('On load behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('map loads data before interaction', async ({ page }) => {
    // CLAUDE: What is this testing for?
    await expect(page.locator('.map-loading-overlay')).not.toBeVisible()
    await expect(page.locator('.map-container canvas')).toBeVisible()
  })

  test('Your Plan shows default FZP values', async ({ page }) => {

    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    await expect(yourPlanRow.getByText('29,148')).toBeVisible()
    await expect(yourPlanRow.getByText('48,192')).toBeVisible()
  })
})

