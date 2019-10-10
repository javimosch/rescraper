run()
async function run() {
    require('dotenv').config({ silent: true })
    const RESULT_PATH = './results.json'
    const {
        getPuppeteerPage,
        closePupeteerBrowser
    } = require('../utils/puppeteer')
    var taList = require('../tripadvisor/list')
    let page = await getPuppeteerPage()

    let url = process.env.TA_URL;
    let sander = require('sander')
    let json = JSON.parse((await sander.readFile(RESULT_PATH)).toString('utf-8'))
    if (json.tripadvisorListPages) {
        url = json.tripadvisorListPages[json.tripadvisorListPages.length - 1] || url
    }

    await taList.scrapeListPages(url, {
        page,
        cb: times => console.log('PAGINATE ', times)
    })
    await closePupeteerBrowser()
    console.log("EXIT")
    process.exit(0)
}