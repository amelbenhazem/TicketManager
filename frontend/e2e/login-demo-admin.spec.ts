import { test, expect } from '@playwright/test'

/** Comptes créés par `npm run seed` dans backend (local / CI avec Mongo + seed). */
const SEED_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@rfc.com'
const SEED_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!'

test('e2e: admin seed login redirects to /admin', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/login`)

  await page.getByLabel('Email').fill(SEED_ADMIN_EMAIL)
  await page.locator('#login-pass').fill(SEED_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: /Tableau de bord/i })).toBeVisible()
})
