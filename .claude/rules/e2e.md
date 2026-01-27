# E2E Testing Guidelines

## Use User-Facing Locators

Prefer semantic locators over CSS selectors:

```javascript
// Good - tests what users see
await page.getByRole('button', { name: 'Save Rule' }).click()
await page.getByLabel('Height').fill('85')
await page.getByRole('heading', { name: 'Add Rule' })

// Avoid - tied to CSS implementation
await page.click('.modal-save')
await page.locator('.height-input').fill('85')
```

Locator priority (per Playwright docs):
1. `getByRole()` - buttons, links, headings, etc.
2. `getByLabel()` - form inputs (requires `aria-label` or `<label>`)
3. `getByPlaceholder()` - if no label exists
4. `getByText()` - visible text content
5. `getByTestId()` - last resort fallback

For form inputs, add `aria-label` attributes to make them accessible and testable.

## Playwright Auto-Waits

Playwright assertions auto-retry until timeout. Configure the global timeout in `playwright.config.js`:

```javascript
export default defineConfig({
  expect: { timeout: 60000 },  // Global assertion timeout
})
```

This eliminates inline timeouts:

```javascript
// Good - uses global timeout
await expect(page.getByText('29,148')).toBeVisible()

// Avoid - inline timeouts
await expect(page.getByText('29,148')).toBeVisible({ timeout: 60000 })
```

For apps with long data loading or calculations, set a generous global timeout rather than repeating timeouts per-assertion.

## Scope Assertions Tightly

When testing specific elements, scope to their container:

```javascript
// Good - scoped to specific rule
const ruleItem = page.locator('.rule-item').filter({ hasText: '85 ft' })
await expect(ruleItem).toContainText('Mission')

// Avoid - ambiguous if multiple rules exist
await expect(page.locator('.rule-item')).toContainText('Mission')
```

## Test Behavior, Not Implementation

E2E tests verify user-visible behavior. Unit tests cover:
- Business logic (e.g., "tallest height wins" calculation)
- Data transformations
- Edge cases

E2E tests cover:
- User workflows (add rule, edit rule, delete rule)
- Integration between components
- Visual feedback (modals open/close, values update)
