/*
    Scrape trip advisor pages follow the pagination next button
    it requires TA_URL env
*/
require('dotenv').config({ silent: true })
var taList = require('../tripadvisor/list')
taList.scrapeListPages()