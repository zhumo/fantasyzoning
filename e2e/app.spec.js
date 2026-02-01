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

test.describe('Rule Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('modal interactions', () => {
    test('opens and closes add rule modal', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      await expect(page.getByRole('heading', { name: 'Add Rule' })).toBeVisible()

      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { name: 'Add Rule' })).not.toBeVisible()
    })

    test('save button is disabled without height', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      await expect(page.getByRole('button', { name: 'Save Rule' })).toBeDisabled()
    })

    test('save button is enabled with height', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await modal.getByLabel('Proposed height').fill('85')
      await expect(modal.getByRole('button', { name: 'Save Rule' })).toBeEnabled()
    })
  })

  test('adds a rule and displays it', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Proposed height').fill('85')
    await modal.getByRole('button', { name: 'Save Rule' }).click()

    await expect(page.getByText('85 ft')).toBeVisible()
  })

  test('adds rule with neighborhood filter', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Proposed height').fill('100')
    await modal.getByLabel('Neighborhood').selectOption('Mission')
    await modal.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '100 ft' })
    await expect(ruleItem).toBeVisible()
    await expect(ruleItem).toContainText('Mission')
  })

  test('removes a rule', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Proposed height').fill('65')
    await modal.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })
    await expect(ruleItem).toBeVisible()

    await ruleItem.getByRole('button', { name: '×' }).click()
    await expect(ruleItem).not.toBeVisible()
  })

  test('edits an existing rule', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Proposed height').fill('65')
    await modal.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })
    await expect(ruleItem).toBeVisible()

    await ruleItem.click()
    await expect(modal.getByRole('heading', { name: 'Edit Rule' })).toBeVisible()

    await modal.getByLabel('Proposed height').fill('120')
    await modal.getByRole('button', { name: 'Update Rule' }).click()

    await expect(page.locator('.rule-item').filter({ hasText: '120 ft' })).toBeVisible()
  })

  test('adding rule recalculates projections', async ({ page }) => {
    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    await expect(yourPlanRow.getByText('29,148')).toBeVisible()

    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Proposed height').fill('200')
    await modal.getByRole('button', { name: 'Save Rule' }).click()

    await expect(page.locator('.rule-item').filter({ hasText: '200 ft' })).toBeVisible()

    const lowCell = yourPlanRow.locator('td').nth(1)
    await expect(lowCell).not.toHaveText('29,148')
  })

  test('adds rule with all filters', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
    await modal.getByLabel('Proposed height').fill('130')
    await modal.getByLabel('Neighborhood').selectOption('Mission')
    await modal.getByLabel('Zoning code').selectOption('RH-2')
    await modal.getByLabel('FZP height').selectOption('40 ft')
    await modal.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '130 ft' })
    await expect(ruleItem).toBeVisible()
    await expect(ruleItem).toContainText('Mission')
    await expect(ruleItem).toContainText('RH-2')
    await expect(ruleItem).toContainText('40ft FZP')
  })

  test('tallest height wins when rules overlap', async ({ page }) => {
    const modal = page.locator('.modal')

    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
    await modal.getByLabel('Proposed height').fill('85')
    await modal.getByLabel('Neighborhood').selectOption('Mission')
    await modal.getByRole('button', { name: 'Save Rule' }).click()
    await expect(page.locator('.rule-item').filter({ hasText: '85 ft' })).toBeVisible()

    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
    await modal.getByLabel('Proposed height').fill('130')
    await modal.getByLabel('Neighborhood').selectOption('Mission')
    await modal.getByRole('button', { name: 'Save Rule' }).click()
    await expect(page.locator('.rule-item').filter({ hasText: '130 ft' })).toBeVisible()

    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    const lowCell = yourPlanRow.locator('td').nth(1)
    const lowCellAfterBoth = await lowCell.textContent()

    await page.locator('.rule-item').filter({ hasText: '130 ft' }).getByRole('button', { name: '×' }).click()
    await expect(page.locator('.rule-item').filter({ hasText: '130 ft' })).not.toBeVisible()

    await expect(lowCell).not.toHaveText(lowCellAfterBoth)
    const lowCellAfterRemove = await lowCell.textContent()
    expect(parseInt(lowCellAfterRemove.replace(/,/g, ''))).toBeLessThan(parseInt(lowCellAfterBoth.replace(/,/g, '')))
  })

  test('deleting all rules restores baseline projections', async ({ page }) => {
    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    await expect(yourPlanRow.getByText('29,148')).toBeVisible()

    await page.getByRole('button', { name: '+ Add Rule' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Proposed height').fill('200')
    await modal.getByRole('button', { name: 'Save Rule' }).click()
    const ruleItem = page.locator('.rule-item').filter({ hasText: '200 ft' })
    await expect(ruleItem).toBeVisible()

    const lowCellAfterAdd = yourPlanRow.locator('td').nth(1)
    await expect(lowCellAfterAdd).not.toHaveText('29,148')

    await ruleItem.getByRole('button', { name: '×' }).click()
    await expect(ruleItem).not.toBeVisible()

    await expect(yourPlanRow.getByText('29,148')).toBeVisible()
  })

  test('map loads data before interaction', async ({ page }) => {
    await expect(page.locator('.map-loading-overlay')).not.toBeVisible()
    await expect(page.locator('.map-container canvas')).toBeVisible()
  })

  test('editing rule updates projections', async ({ page }) => {
    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    await expect(yourPlanRow.getByText('29,148')).toBeVisible()

    const modal = page.locator('.modal')

    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await modal.getByLabel('Proposed height').fill('85')
    await modal.getByRole('button', { name: 'Save Rule' }).click()
    await expect(page.locator('.rule-item').filter({ hasText: '85 ft' })).toBeVisible()

    const lowCellAfterAdd = await yourPlanRow.locator('td').nth(1).textContent()

    await page.locator('.rule-item').filter({ hasText: '85 ft' }).click()
    await expect(modal.getByRole('heading', { name: 'Edit Rule' })).toBeVisible()
    await modal.getByLabel('Proposed height').fill('200')
    await modal.getByRole('button', { name: 'Update Rule' }).click()

    await expect(page.locator('.rule-item').filter({ hasText: '200 ft' })).toBeVisible()

    const lowCellAfterEdit = await yourPlanRow.locator('td').nth(1).textContent()
    expect(parseInt(lowCellAfterEdit.replace(/,/g, ''))).toBeGreaterThan(parseInt(lowCellAfterAdd.replace(/,/g, '')))
  })
})
