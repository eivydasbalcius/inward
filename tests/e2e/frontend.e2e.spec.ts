import { expect, test } from '@playwright/test'
import pg from 'pg'

// Requires seeded content: `pnpm seed`
const BASE = 'http://localhost:3000'
const PAGES = ['', '/book', '/about', '/services', '/services/individuali-sesija', '/prices', '/faq', '/blog', '/contact', '/privacy']

const E2E_EMAIL = `e2e-${Date.now()}@example.com`
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })

test.afterAll(async () => {
  await db.query("delete from bookings where client_email like 'e2e-%@example.com'")
  await db.end()
})

test.describe('Frontend', () => {
  test('root redirects to a locale', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveURL(/\/(lt|en)$/)
  })

  for (const locale of ['lt', 'en']) {
    test(`all public pages render server-side (${locale})`, async ({ request }) => {
      for (const path of PAGES) {
        const res = await request.get(`${BASE}/${locale}${path}`)
        expect(res.status(), `${locale}${path}`).toBe(200)
        const html = await res.text()
        expect(html).toContain(`<html lang="${locale}"`)
        expect(html).toMatch(/<h1[^>]*>(<[^>]+>)*[^<]+/)
      }
    })
  }

  test('Google connect endpoints require an admin login', async ({ request }) => {
    expect((await request.get(`${BASE}/api/google/oauth/start`, { maxRedirects: 0 })).status()).toBe(401)
    expect((await request.post(`${BASE}/api/google/disconnect`)).status()).toBe(401)
    // a callback with a forged state never connects anything
    const cb = await request.get(`${BASE}/api/google/oauth/callback?code=x&state=forged`, { maxRedirects: 0 })
    expect(cb.status()).toBe(302)
    expect(cb.headers().location).toContain('error=')
  })

  test('unknown service is 404', async ({ request }) => {
    expect((await request.get(`${BASE}/lt/services/does-not-exist`)).status()).toBe(404)
  })

  test('home CTA leads to the booking calendar', async ({ page }) => {
    await page.goto(`${BASE}/lt`)
    await page.locator('.hero .btn-primary').click()
    await expect(page).toHaveURL(/\/lt\/book$/)
    await expect(page.locator('.gcal-head .dh')).toHaveCount(7)
  })

  test('book a session end-to-end and the slot disappears', async ({ page }) => {
    await page.goto(`${BASE}/lt/book?service=individuali-sesija`)
    // move two weeks ahead so the test never takes a slot a real client might want tomorrow
    await page.getByRole('button', { name: 'Tolesnės dienos' }).click()
    await page.getByRole('button', { name: 'Tolesnės dienos' }).click()
    const chip = page.locator('.chip').first()
    await chip.waitFor()
    const label = (await chip.getAttribute('aria-label'))!
    await chip.click()

    const dialog = page.locator('dialog.event-dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Vardas ir pavardė').fill('E2E Testas')
    await dialog.getByLabel('El. paštas').fill(E2E_EMAIL)
    // submitting without consent is blocked by the browser
    await dialog.getByRole('button', { name: 'Rezervuoti laiką' }).click()
    await expect(dialog.locator('h3')).not.toHaveText('Laikas rezervuotas')
    await dialog.locator('input[name=consent]').check()
    await dialog.getByRole('button', { name: 'Rezervuoti laiką' }).click()
    await expect(dialog.locator('h3')).toHaveText('Laikas rezervuotas')
    const add = dialog.getByRole('link', { name: 'Pridėti į Google kalendorių' })
    await expect(add).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&.*dates=\d{8}T\d{6}Z%2F\d{8}T\d{6}Z/)
    await expect(add).toHaveAttribute('target', '_blank')

    const rows = await db.query('select status, source from bookings where client_email = $1', [E2E_EMAIL])
    expect(rows.rows).toEqual([{ status: 'confirmed', source: 'website' }])

    await dialog.getByRole('button', { name: 'Rezervuoti kitą laiką' }).click()
    await expect(page.locator(`.chip[aria-label="${label}"]`)).toHaveCount(0)
  })

  test('mobile shows a 3-day view and a bottom-sheet dialog', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(`${BASE}/lt/book`)
    await expect(page.locator('.gcal-head .dh')).toHaveCount(3)
    await page.getByRole('button', { name: 'Tolesnės dienos' }).click()
    await page.locator('.chip').first().click()
    await expect(page.locator('dialog.event-dialog')).toBeVisible()
    await page.waitForTimeout(400) // sheet slide-in animation
    const box = await page.locator('dialog.event-dialog').boundingBox()
    expect(Math.round(box!.x)).toBe(0)
    expect(Math.round(box!.width)).toBe(390)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })

  test('contact form submits', async ({ page }) => {
    await page.goto(`${BASE}/lt/contact`)
    await page.fill('input[name=name]', 'E2E testas')
    await page.fill('input[name=email]', 'e2e@example.com')
    await page.fill('textarea[name=message]', 'Bandomoji žinutė')
    await page.click('button[type=submit]')
    await expect(page.locator('.form-success')).toBeVisible()
  })

  test('contact form rejects an invalid email server-side', async ({ page }) => {
    await page.goto(`${BASE}/en/contact`)
    await page.fill('input[name=name]', 'E2E')
    await page.fill('textarea[name=message]', 'Hello there')
    // bypass browser validation to exercise the server action
    await page.locator('input[name=email]').evaluate((el: HTMLInputElement) => {
      el.type = 'text'
      el.value = 'not-an-email'
    })
    await page.click('button[type=submit]')
    await expect(page.locator('.form-error')).toBeVisible()
  })

  test('mobile menu opens and closes after navigation', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(`${BASE}/lt`)
    await expect(page.locator('.site-nav')).toBeHidden()
    await page.click('.mobile-menu summary')
    await page.click('.mobile-menu nav a[href="/lt/prices"]')
    await expect(page).toHaveURL(/\/lt\/prices$/)
    await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open', '')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
})
