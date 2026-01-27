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
      await page.getByLabel('Height').fill('85')
      await expect(page.getByRole('button', { name: 'Save Rule' })).toBeEnabled()
    })
  })

  test('adds a rule and displays it', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await page.getByLabel('Height').fill('85')
    await page.getByRole('button', { name: 'Save Rule' }).click()

    await expect(page.getByText('85 ft')).toBeVisible()
  })

  test('adds rule with neighborhood filter', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await page.getByLabel('Height').fill('100')
    await page.getByLabel('Neighborhood').selectOption('Mission')
    await page.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '100 ft' })
    await expect(ruleItem).toBeVisible()
    await expect(ruleItem).toContainText('Mission')
  })

  test('removes a rule', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await page.getByLabel('Height').fill('65')
    await page.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })
    await expect(ruleItem).toBeVisible()

    await ruleItem.getByRole('button', { name: '×' }).click()
    await expect(ruleItem).not.toBeVisible()
  })

  test('edits an existing rule', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await page.getByLabel('Height').fill('65')
    await page.getByRole('button', { name: 'Save Rule' }).click()

    const ruleItem = page.locator('.rule-item').filter({ hasText: '65 ft' })
    await expect(ruleItem).toBeVisible()

    await ruleItem.click()
    await expect(page.getByRole('heading', { name: 'Edit Rule' })).toBeVisible()

    await page.getByLabel('Height').fill('120')
    await page.getByRole('button', { name: 'Update Rule' }).click()

    await expect(page.locator('.rule-item').filter({ hasText: '120 ft' })).toBeVisible()
  })

  test('adding rule recalculates projections', async ({ page }) => {
    const yourPlanRow = page.getByRole('row', { name: /Your Plan/ })
    await expect(yourPlanRow.getByText('29,148')).toBeVisible()

    await page.getByRole('button', { name: '+ Add Rule' }).click()
    await page.getByLabel('Height').fill('200')
    await page.getByRole('button', { name: 'Save Rule' }).click()

    await expect(page.locator('.rule-item').filter({ hasText: '200 ft' })).toBeVisible()

    const lowCell = yourPlanRow.locator('td').nth(1)
    await expect(lowCell).not.toHaveText('29,148')
  })
})
