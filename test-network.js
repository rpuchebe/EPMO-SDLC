const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('response', response => {
        const status = response.status();
        if ((status >= 300) && (status !== 304)) {
            console.log(`Failed network request: ${status} ${response.url()}`);
        }
    });
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.log('ERROR:', err.message));
    
    await page.goto('http://localhost:3000/phase-1', {waitUntil: 'networkidle0'});
    
    // Click Incident Management tab
    const tabs = await page.$$('button');
    for (const tab of tabs) {
        const text = await page.evaluate(el => el.textContent, tab);
        if (text && text.includes('Incident Management')) {
            console.log('Clicking Incident Management Tab');
            await tab.click();
            break;
        }
    }

    await new Promise(r => setTimeout(r, 6000));
    await browser.close();
})();
