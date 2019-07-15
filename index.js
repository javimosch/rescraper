const sequential = require('promise-sequential');

const PROCESS_TRIPADVISOR_LIST = true
const DEBUG = true
    //
const RESULT_PATH = './results.json'
    //
const puppeteer = require('puppeteer')
const sander = require('sander')
run()
async function run() {

    var result = {}
    if (await sander.exists(RESULT_PATH)) {
        result = JSON.parse((await sander.readFile(RESULT_PATH)).toString('utf-8'))
    }

    if (PROCESS_TRIPADVISOR_LIST) {

        await sequential(result.tripadvisorListPages.map((url, index) => {
            return () => (async function() {
                console.log('LIST', index)
                result.tripadvisorList = await require('./tripadvisor/list').scrapeItems(result.tripadvisorList, {
                    url
                })
                saveResultFile(result);
            })()
        }))


    } else {
        if (!(result.tripadvisorList && result.tripadvisorList.length > 0)) {
            throw new Error("TRIPADVISOR_LIST_REQUIRED")
        }
    }



    var filteredList = result.tripadvisorList.filter(filterItems)
    await sequential(filteredList.map((item, index) => {
        return (last) => processTripadvisorListItem(item, index, filteredList.length)
    }))

    function filterItems(item) {
        return !item.email
    }

    async function processTripadvisorListItem(item, curr, total) {
        let url = item.metadata.tripadvisor.detailsUrl;
        if (url.indexOf('www.trip') === -1) {
            url = 'https://www.tripadvisor.es' + url
        }
        item = await require('./tripadvisor/details.js').scrapeItem(url, item, {
            debug: DEBUG
        })
        await saveResultFile(result)
        console.log(`Loading ${curr+1}/${total}`)
    }

}

async function saveResultFile(data) {
    data.totalEmails = data.tripadvisorList.filter(tl => !!tl.email).length
    await sander.writeFile(RESULT_PATH, JSON.stringify(data, null, 4))
}