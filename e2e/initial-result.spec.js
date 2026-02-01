import { test, expect } from '@playwright/test'

test.describe('Header section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Your Plan shows default FZP values', async ({ page }) => {
    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    await expect(yourPlanRow.getByText('29,148')).toBeVisible()
    await expect(yourPlanRow.getByText('48,192')).toBeVisible()
  })
})

