const puppeteer = require('puppeteer')
var browser = null
async function getPuppeteerPage() {
    await closePupeteerBrowser()
    browser = await puppeteer.launch({ headless: true })
    return await browser.newPage()
}
async function closePupeteerBrowser() {
    if (browser !== null) {
        await browser.close()
    }
}

module.exports = {
    getPuppeteerPage,
    closePupeteerBrowser
}