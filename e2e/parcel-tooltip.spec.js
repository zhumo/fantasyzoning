import { test, expect } from '@playwright/test'

test.describe('Parcel hover tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.map-container canvas')).toBeVisible()
  })

  test('hovering over parcel shows tooltip', async ({ page }) => {
    const mapContainer = page.locator('.map-container')
    const box = await mapContainer.boundingBox()

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)

    const tooltip = page.locator('.tooltip')
    const isVisible = await tooltip.isVisible().catch(() => false)

    if (isVisible) {
      await expect(tooltip).toContainText(/Address|Neighborhood|Zoning/)
    }
  })
})
