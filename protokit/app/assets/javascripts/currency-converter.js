(function () {
  'use strict'

  var CURRENCIES = {
    GBP: { name: 'British Pound',    symbol: '£' },
    USD: { name: 'US Dollar',        symbol: '$' },
    EUR: { name: 'Euro',             symbol: '€' },
    JPY: { name: 'Japanese Yen',     symbol: '¥' },
    CAD: { name: 'Canadian Dollar',  symbol: 'CA$' },
    AUD: { name: 'Australian Dollar',symbol: 'A$' },
    CHF: { name: 'Swiss Franc',      symbol: 'Fr' },
    CNY: { name: 'Chinese Yuan',     symbol: '¥' },
    INR: { name: 'Indian Rupee',     symbol: '₹' },
    MXN: { name: 'Mexican Peso',     symbol: 'MX$' }
  }

  var amountInput    = document.getElementById('amount')
  var homeCurrency   = document.getElementById('home-currency')
  var currencySymbol = document.getElementById('currency-symbol')
  var resultsDiv     = document.getElementById('results')
  var resultsBody    = document.getElementById('results-body')
  var rateNote       = document.getElementById('rate-note')
  var errorBanner    = document.getElementById('error-banner')
  var errorMessage   = document.getElementById('error-message')

  var cachedRates    = null
  var cachedBase     = null
  var debounceTimer  = null

  function showError (msg) {
    errorMessage.textContent = msg
    errorBanner.removeAttribute('hidden')
    resultsDiv.setAttribute('hidden', '')
  }

  function hideError () {
    errorBanner.setAttribute('hidden', '')
  }

  function formatAmount (amount, currency) {
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2
      }).format(amount)
    } catch (e) {
      return amount.toFixed(2) + ' ' + currency
    }
  }

  function renderResults (amount, base, rates) {
    resultsBody.innerHTML = ''

    Object.keys(CURRENCIES).forEach(function (code) {
      if (code === base) return

      var rate = rates[code]
      if (!rate) return

      var converted = amount * rate
      var row = document.createElement('tr')
      row.className = 'govuk-table__row'
      row.innerHTML =
        '<td class="govuk-table__cell">' +
          '<strong>' + code + '</strong> – ' + CURRENCIES[code].name +
        '</td>' +
        '<td class="govuk-table__cell govuk-table__cell--numeric">' +
          formatAmount(converted, code) +
        '</td>'
      resultsBody.appendChild(row)
    })

    rateNote.textContent = 'Rates based on 1 ' + base + ' = shown values. Source: European Central Bank via Frankfurter API.'
    resultsDiv.removeAttribute('hidden')
  }

  function fetchRatesAndRender (amount, base) {
    if (cachedRates && cachedBase === base) {
      renderResults(amount, base, cachedRates)
      return
    }

    fetch('https://api.frankfurter.dev/v1/latest?from=' + base)
      .then(function (response) {
        if (!response.ok) throw new Error('Could not fetch rates (status ' + response.status + ')')
        return response.json()
      })
      .then(function (data) {
        cachedRates = data.rates
        cachedBase  = base
        renderResults(amount, base, cachedRates)
        hideError()
      })
      .catch(function (err) {
        showError('Could not load exchange rates. Please check your internet connection and try again.')
        console.error(err)
      })
  }

  function onInput () {
    var amount = parseFloat(amountInput.value)
    var base   = homeCurrency.value

    if (!amountInput.value || isNaN(amount) || amount < 0) {
      resultsDiv.setAttribute('hidden', '')
      hideError()
      return
    }

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(function () {
      fetchRatesAndRender(amount, base)
    }, 300)
  }

  function onCurrencyChange () {
    // Update the prefix symbol
    var base = homeCurrency.value
    currencySymbol.textContent = CURRENCIES[base] ? CURRENCIES[base].symbol : base

    // Bust the cache so we re-fetch for the new base
    cachedRates = null
    cachedBase  = null

    onInput()
  }

  amountInput.addEventListener('input', onInput)
  homeCurrency.addEventListener('change', onCurrencyChange)

})()
