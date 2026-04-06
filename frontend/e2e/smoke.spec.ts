import { test, expect } from '@playwright/test'

test('smoke: login page loads', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/login`)
  await expect(page.getByText(/TicketManager/i)).toBeVisible()
})

