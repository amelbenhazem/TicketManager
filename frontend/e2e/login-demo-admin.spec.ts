import { test, expect } from '@playwright/test'

test('e2e: demo admin login redirects to /admin', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/login`)

  await page.getByLabel('Email').fill('demo@rfc.tn')
  await page.locator('#login-pass').fill('demo123')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: /Tableau de bord/i })).toBeVisible()
})

