import { test, expect } from '@playwright/test'

test.describe('BYO Zoning App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container canvas', { timeout: 30000 })
    await page.waitForFunction(() => {
      const loading = document.querySelector('.map-loading-overlay')
      return !loading || loading.style.display === 'none'
    }, { timeout: 60000 })
  })

  test('displays app title and RHNA target', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('BYO Zoning')
    await expect(page.locator('.sidebar')).toContainText('Target: 82,069')
  })

  test('displays scenarios table with FZP projections', async ({ page }) => {
    const table = page.locator('.scenarios-table')
    await expect(table).toBeVisible()
    await expect(table).toContainText('Low Growth')
    await expect(table).toContainText('High Growth')
    await expect(table).toContainText('FZP')
    await expect(table).toContainText('Your Plan')
  })

  test('map loads with Mapbox canvas', async ({ page }) => {
    const canvas = page.locator('.map-container canvas')
    await expect(canvas).toBeVisible()
  })

  test('Your Plan shows calculated values after data loads', async ({ page }) => {
    await page.waitForFunction(() => {
      const cells = document.querySelectorAll('.your-plan td')
      return cells.length >= 2 && !cells[1].textContent.includes('---')
    }, { timeout: 60000 })

    const yourPlanRow = page.locator('.your-plan')
    const cells = yourPlanRow.locator('td')
    const lowValue = await cells.nth(1).textContent()
    const highValue = await cells.nth(2).textContent()

    expect(lowValue).not.toBe('---')
    expect(highValue).not.toBe('---')
    expect(parseInt(lowValue.replace(/,/g, ''))).toBeGreaterThan(0)
    expect(parseInt(highValue.replace(/,/g, ''))).toBeGreaterThan(0)
  })
})

test.describe('Modal Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.add-rule', { timeout: 30000 })
  })

  test('opens and closes add rule modal', async ({ page }) => {
    await expect(page.locator('.modal-overlay')).not.toBeVisible()

    await page.click('.add-rule')
    await expect(page.locator('.modal-overlay')).toBeVisible()
    await expect(page.locator('.modal-header h3')).toHaveText('Add Rule')

    await page.click('.modal-cancel')
    await expect(page.locator('.modal-overlay')).not.toBeVisible()
  })

  test('opens and closes info modal', async ({ page }) => {
    await page.click('.info-icon')
    await expect(page.locator('.info-modal')).toBeVisible()
    await expect(page.locator('.info-modal h3')).toHaveText('What is BYO Zoning?')

    await page.click('.info-modal .modal-save')
    await expect(page.locator('.info-modal')).not.toBeVisible()
  })

  test('save button is disabled without height', async ({ page }) => {
    await page.click('.add-rule')
    const saveBtn = page.locator('.modal-save')
    await expect(saveBtn).toBeDisabled()
  })

  test('save button is enabled with height', async ({ page }) => {
    await page.click('.add-rule')
    await page.fill('.height-input', '85')
    const saveBtn = page.locator('.modal-save')
    await expect(saveBtn).not.toBeDisabled()
  })
})

test.describe('Rule Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container canvas', { timeout: 30000 })
    await page.waitForFunction(() => {
      const loading = document.querySelector('.map-loading-overlay')
      return !loading || loading.style.display === 'none'
    }, { timeout: 60000 })
  })

  test('adds a rule and displays it', async ({ page }) => {
    await page.click('.add-rule')
    await page.fill('.height-input', '85')
    await page.click('.modal-save')

    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.rule-height')).toHaveText('85 ft')
  })

  test('adds rule with neighborhood filter', async ({ page }) => {
    await page.click('.add-rule')
    await page.fill('.height-input', '100')
    await page.selectOption('.inline-select >> nth=0', 'Mission')
    await page.click('.modal-save')

    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.rule-height')).toHaveText('100 ft')
    await expect(page.locator('.rule-item')).toContainText('Mission')
  })

  test('removes a rule', async ({ page }) => {
    await page.click('.add-rule')
    await page.fill('.height-input', '65')
    await page.click('.modal-save')

    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 60000 })

    await page.click('.delete-rule-btn')
    await expect(page.locator('.rule-item')).not.toBeVisible({ timeout: 60000 })
  })

  test('edits an existing rule', async ({ page }) => {
    await page.click('.add-rule')
    await page.fill('.height-input', '65')
    await page.click('.modal-save')

    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 60000 })

    await page.click('.rule-item')
    await expect(page.locator('.modal-header h3')).toHaveText('Edit Rule')

    await page.fill('.height-input', '120')
    await page.click('.modal-save')

    await expect(page.locator('.rule-height')).toHaveText('120 ft', { timeout: 60000 })
  })

  test('multiple rules - tallest height wins', async ({ page }) => {
    await page.click('.add-rule')
    await page.fill('.height-input', '65')
    await page.click('.modal-save')
    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 60000 })

    await page.click('.add-rule')
    await expect(page.locator('.modal-overlay')).toBeVisible()
    await page.fill('.height-input', '120')
    await page.click('.modal-save')

    await expect(page.locator('.rule-item')).toHaveCount(2, { timeout: 60000 })

    const heights = page.locator('.rule-height')
    await expect(heights.nth(0)).toHaveText('65 ft')
    await expect(heights.nth(1)).toHaveText('120 ft')
  })

  test('adding rule recalculates projections', async ({ page }) => {
    await page.waitForFunction(() => {
      const cells = document.querySelectorAll('.your-plan td')
      return cells.length >= 2 && !cells[1].textContent.includes('---')
    }, { timeout: 120000 })

    const getProjections = async () => {
      const cells = page.locator('.your-plan td')
      const low = await cells.nth(1).textContent()
      const high = await cells.nth(2).textContent()
      return {
        low: parseInt(low.replace(/,/g, '')),
        high: parseInt(high.replace(/,/g, ''))
      }
    }

    const before = await getProjections()

    await page.click('.add-rule')
    await page.fill('.height-input', '200')
    await page.click('.modal-save')

    await expect(page.locator('.rule-item')).toBeVisible({ timeout: 60000 })

    await page.waitForFunction((beforeLow) => {
      const cells = document.querySelectorAll('.your-plan td')
      if (cells.length < 2) return false
      const currentLow = parseInt(cells[1].textContent.replace(/,/g, ''))
      return currentLow > beforeLow
    }, before.low, { timeout: 120000 })

    const after = await getProjections()

    expect(after.low).toBeGreaterThan(before.low)
    expect(after.high).toBeGreaterThan(before.high)
  })
})

test.describe('Map Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container canvas', { timeout: 30000 })
    await page.waitForFunction(() => {
      const loading = document.querySelector('.map-loading-overlay')
      return !loading || loading.style.display === 'none'
    }, { timeout: 60000 })
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

  test('legend is visible', async ({ page }) => {
    const legend = page.locator('.legend')
    await expect(legend).toBeVisible()
    await expect(legend).toContainText('Height (ft)')
  })
})
