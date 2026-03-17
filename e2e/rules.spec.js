import { test, expect } from '@playwright/test'

test.describe('Rule Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.map-loading-overlay')).not.toBeVisible()
  })

  test.describe('modal interactions', () => {
    test('opens and closes add rule modal', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      await expect(page.getByRole('heading', { name: 'Add Rule' })).toBeVisible()

      // Modal does not allow you to save without the a height filled in
      await expect(page.getByRole('button', { name: 'Save Rule' })).toBeDisabled()
      const modal = page.locator('.modal')
      await modal.getByLabel('Proposed height').fill('85')
      await expect(modal.getByRole('button', { name: 'Save Rule' })).toBeEnabled()

      await modal.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { name: 'Add Rule' })).not.toBeVisible()
    })
  })

  test.describe('adding rules', () => {
    test('global rule', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
      await modal.getByLabel('Proposed height').fill('85')
      await modal.getByRole('button', { name: 'Save Rule' }).click()
      await expect(modal).not.toBeVisible()

      const rulesSection = page.locator('.rules-section')
      await expect(rulesSection.locator('.rule-item')).toHaveCount(1)

      const ruleItem = rulesSection.locator('.rule-item').first()
      await expect(ruleItem).toContainText('85 ft')
    })

    test('adds rule with neighborhood filter', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await modal.getByLabel('Proposed height').fill('100')
      await modal.getByLabel('Neighborhood').selectOption('Mission')
      await modal.getByRole('button', { name: 'Save Rule' }).click()

      const ruleItem = page.locator('.rule-item').first()
      await expect(ruleItem).toContainText('Mission')
      await expect(ruleItem).toContainText('100 ft')
    })

    test('adds rule with zoning code filter', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await modal.getByLabel('Proposed height').fill('85')
      await modal.getByText('with zoning code').locator('..').getByRole('combobox').selectOption('RH-2')
      await modal.getByRole('button', { name: 'Save Rule' }).click()

      const ruleItem = page.locator('.rule-item').first()
      await expect(ruleItem).toContainText('RH-2')
      await expect(ruleItem).toContainText('85 ft')
    })

    test('adds rule with FZP height filter', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
      await modal.getByLabel('Proposed height').fill('120')
      await modal.getByText('and FZP height').locator('..').getByRole('combobox').selectOption('40 ft')
      await modal.getByRole('button', { name: 'Save Rule' }).click()
      await expect(modal).not.toBeVisible()

      const ruleItem = page.locator('.rule-item').first()
      await expect(ruleItem).toContainText('40ft FZP')
      await expect(ruleItem).toContainText('120 ft')
    })

    test('adds rule with transit distance filter', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
      await modal.getByLabel('Proposed height').fill('150')
      await modal.getByText('within').locator('..').getByRole('spinbutton').fill('1320')
      await modal.getByRole('button', { name: 'Save Rule' }).click()

      const ruleItem = page.locator('.rule-item').first()
      await expect(ruleItem).toContainText('within 1320ft of transit')
      await expect(ruleItem).toContainText('150 ft')
    })

    test('adds rule with all filters', async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await expect(modal.getByRole('heading', { name: 'Add Rule' })).toBeVisible()
      await modal.getByLabel('Proposed height').fill('130')
      await modal.getByLabel('Neighborhood').selectOption('Mission')
      await modal.getByText('with zoning code').locator('..').getByRole('combobox').selectOption('RH-2')
      await modal.getByText('and FZP height').locator('..').getByRole('combobox').selectOption('40 ft')
      await modal.getByText('within').locator('..').getByRole('spinbutton').fill('2640')
      await modal.getByRole('button', { name: 'Save Rule' }).click()

      const ruleItem = page.locator('.rule-item').first()
      await expect(ruleItem).toContainText('Mission')
      await expect(ruleItem).toContainText('RH-2')
      await expect(ruleItem).toContainText('40ft FZP')
      await expect(ruleItem).toContainText('within 2640ft of transit')
      await expect(ruleItem).toContainText('130 ft')
    })

    test('adds two separate rules', async ({ page }) => {
      const modal = page.locator('.modal')

      await page.getByRole('button', { name: '+ Add Rule' }).click()
      await modal.getByLabel('Proposed height').fill('85')
      await modal.getByLabel('Neighborhood').selectOption('Mission')
      await modal.getByRole('button', { name: 'Save Rule' }).click()

      await page.getByRole('button', { name: '+ Add Rule' }).click()
      await modal.getByLabel('Proposed height').fill('120')
      await modal.getByText('with zoning code').locator('..').getByRole('combobox').selectOption('RH-3')
      await modal.getByRole('button', { name: 'Save Rule' }).click()

      const ruleItems = page.locator('.rule-item')
      await expect(ruleItems).toHaveCount(2)

      const missionRule = ruleItems.filter({ hasText: 'Mission' })
      await expect(missionRule).toContainText('85 ft')

      const rh3Rule = ruleItems.filter({ hasText: 'RH-3' })
      await expect(rh3Rule).toContainText('120 ft')
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
  })

  test.describe("removing and editing a rule", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: '+ Add Rule' }).click()
      const modal = page.locator('.modal')
      await modal.getByLabel('Proposed height').fill('65')
      await modal.getByRole('button', { name: 'Save Rule' }).click()
      await expect(page.locator('.rule-item').filter({ hasText: '65 ft' })).toBeVisible()
      await expect(page.locator('.map-loading-overlay')).not.toBeVisible()
    })

    test('removing a rule', async ({ page }) => {
      const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })
      await ruleItem.getByRole('button', { name: '×' }).click()
      await expect(ruleItem).not.toBeVisible()
    })

    test('edits an existing rule', async ({ page }) => {
      const modal = page.locator('.modal')
      const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })

      await ruleItem.click()
      await expect(modal.getByRole('heading', { name: 'Edit Rule' })).toBeVisible()

      await modal.getByLabel('Proposed height').fill('120')
      await modal.getByRole('button', { name: 'Update Rule' }).click()

      await expect(page.locator('.rule-item').filter({ hasText: '120 ft' })).toBeVisible()
    })

    test('deleting all rules restores baseline projections', async ({ page }) => {
      const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
      const lowCell = yourPlanRow.locator('td').nth(1)
      await expect(lowCell).not.toHaveText('29,148')

      const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })
      await ruleItem.getByRole('button', { name: '×' }).click()
      await expect(ruleItem).not.toBeVisible()

      await expect(yourPlanRow.getByText('29,148')).toBeVisible()
    })

    test('editing rule updates projections', async ({ page }) => {
      const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
      const modal = page.locator('.modal')

      const lowCellBefore = await yourPlanRow.locator('td').nth(1).textContent()

      await page.locator('.rule-item').filter({ hasText: '65 ft' }).click()
      await expect(modal.getByRole('heading', { name: 'Edit Rule' })).toBeVisible()
      await modal.getByLabel('Proposed height').fill('200')
      await modal.getByRole('button', { name: 'Update Rule' }).click()

      await expect(page.locator('.rule-item').filter({ hasText: '200 ft' })).toBeVisible()

      const lowCellAfter = await yourPlanRow.locator('td').nth(1).textContent()
      expect(parseInt(lowCellAfter.replace(/,/g, ''))).toBeGreaterThan(parseInt(lowCellBefore.replace(/,/g, '')))
    })
  })
})
