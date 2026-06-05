import { test, expect } from '@playwright/test'

const backendBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const SEED_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@rfc.com'
const SEED_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!'

test('e2e: client creates ticket -> admin gets notification in bell', async ({ page, request, browser, baseURL }) => {
  const stamp = Date.now()
  const adminEmail = `admin.e2e.${stamp}@ex.tn`
  const adminPassword = 'Adm1n!12345'
  const clientEmail = `client.e2e.${stamp}@ex.tn`
  const clientPassword = 'Passw0rd!123'
  const ticketTitle = `Ticket E2E ${stamp}`

  // 1) Setup via API: login as seed admin, create users for this run
  const adminLogin = await request.post(`${backendBaseURL}/auth/login`, {
    data: { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD },
  })
  expect(adminLogin.ok()).toBeTruthy()
  const adminLoginJson = await adminLogin.json()
  const adminToken = String(adminLoginJson.access_token || '')
  expect(adminToken.length).toBeGreaterThan(10)

  const createClient = await request.post(`${backendBaseURL}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      lastName: 'E2E',
      firstName: 'Client',
      email: clientEmail,
      password: clientPassword,
      role: 'client',
    },
  })
  expect(createClient.ok()).toBeTruthy()

  const createAdmin = await request.post(`${backendBaseURL}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      lastName: 'E2E',
      firstName: 'Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    },
  })
  expect(createAdmin.ok()).toBeTruthy()

  // 2) UI: login as client and create a ticket
  await page.goto(`${baseURL}/login`)
  await page.getByLabel('Email').fill(clientEmail)
  await page.locator('#login-pass').fill(clientPassword)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto(`${baseURL}/dashboard/tickets/new`)
  await page.getByLabel(/Titre du problème/i).fill(ticketTitle)
  await page.getByRole('button', { name: /Créer le ticket/i }).click()
  await expect(page).toHaveURL(/\/dashboard\/tickets$/)

  // 3) UI (new context): admin opens bell and sees the notification
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto(`${baseURL}/login`)
  await adminPage.getByLabel('Email').fill(adminEmail)
  await adminPage.locator('#login-pass').fill(adminPassword)
  await adminPage.getByRole('button', { name: 'Se connecter' }).click()
  await expect(adminPage).toHaveURL(/\/admin$/)

  // Open bell
  await adminPage.getByRole('button', { name: 'Notifications' }).click()
  await expect(adminPage.getByText(new RegExp(`Nouveau ticket: ${ticketTitle}`))).toBeVisible()

  await adminContext.close()
})

