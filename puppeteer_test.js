/* eslint-disable */
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });

    try {
        // we need to set a cookie if there's login, but wait we are just going to the page
        // Actually we don't have the login cookie, so it might redirect to /login
        await page.goto('http://localhost:3000/phase-1', { waitUntil: 'networkidle0' });

        // Attempt to log in if redirected
        if (page.url().includes('/login')) {
            console.log('Redirected to login. Mocking auth is hard here unless we know the test user.');
        }
    } catch (err) {
        console.error('PUPPETEER ERROR:', err);
    } finally {
        await browser.close();
    }
})();
