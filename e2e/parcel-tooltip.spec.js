import { test, expect } from '@playwright/test'

test.describe('Parcel hover tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.map-loading-overlay')).not.toBeVisible()
  })

  test('hovering over parcel shows tooltip', async ({ page }) => {
    const mapContainer = page.locator('.map-container')
    const box = await mapContainer.boundingBox()

    const tooltip = page.locator('.tooltip')
    const positions = [
      { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 },
      { x: box.x + box.width * 0.4, y: box.y + box.height * 0.4 },
      { x: box.x + box.width * 0.6, y: box.y + box.height * 0.6 },
      { x: box.x + box.width * 0.3, y: box.y + box.height * 0.5 },
      { x: box.x + box.width * 0.7, y: box.y + box.height * 0.5 },
    ]

    for (const pos of positions) {
      await page.mouse.move(pos.x, pos.y)
      try {
        await expect(tooltip).toBeVisible({ timeout: 2000 })
        await expect(tooltip).toContainText(/Address|Neighborhood|Zoning/)
        return
      } catch {
        continue
      }
    }

    throw new Error('Tooltip did not appear after hovering at multiple map positions')
  })
})
