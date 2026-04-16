//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your routes here

// Redirect root to the currency converter
router.get('/', function (req, res) {
  res.redirect('/currency-converter')
})

router.get('/currency-converter', function (req, res) {
  res.render('currency-converter')
})

router.get('/print', function (req, res) {
  res.render('print')
})
