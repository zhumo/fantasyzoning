import { test, expect } from '@playwright/test'

test.describe('Parcel hover tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.map-loading-overlay')).not.toBeVisible()
  })

  test('hovering over parcel shows tooltip with parcel info', async ({ page }) => {
    const canvas = page.locator('.map-container canvas')
    const tooltip = page.locator('.tooltip')
    const box = await canvas.boundingBox()

    // Mapbox renders parcels on canvas - try multiple positions to find one
    // Map centers on SF at zoom 12, these ratios target the dense downtown area
    const positions = [
      { x: 0.55, y: 0.35 },
      { x: 0.6, y: 0.4 },
      { x: 0.5, y: 0.4 },
      { x: 0.65, y: 0.45 },
      { x: 0.55, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.45, y: 0.45 },
    ]

    for (const pos of positions) {
      await page.mouse.move(box.x + box.width * pos.x, box.y + box.height * pos.y)

      try {
        await expect(tooltip).toBeVisible({ timeout: 2000 })
        await expect(tooltip).toContainText('Address')
        await expect(tooltip).toContainText('Zoning')
        return
      } catch {
        continue
      }
    }

    throw new Error('Tooltip did not appear at any tested position')
  })
})
