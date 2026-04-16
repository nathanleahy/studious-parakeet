(function () {
  'use strict'

  var CURRENCIES = {
    GBP: { name: 'British Pound',     symbol: '£' },
    USD: { name: 'US Dollar',         symbol: '$' },
    EUR: { name: 'Euro',              symbol: '€' },
    JPY: { name: 'Japanese Yen',      symbol: '¥' },
    CAD: { name: 'Canadian Dollar',   symbol: 'CA$' },
    AUD: { name: 'Australian Dollar', symbol: 'A$' },
    CHF: { name: 'Swiss Franc',       symbol: 'Fr' },
    CNY: { name: 'Chinese Yuan',      symbol: '¥' },
    INR: { name: 'Indian Rupee',      symbol: '₹' },
    MXN: { name: 'Mexican Peso',      symbol: 'MX$' }
  }

  var amountInput    = document.getElementById('amount')
  var homeCurrency   = document.getElementById('home-currency')
  var currencySymbol = document.getElementById('currency-symbol')
  var resultsDiv     = document.getElementById('results')
  var resultsBody    = document.getElementById('results-body')
  var rateNote       = document.getElementById('rate-note')
  var errorBanner    = document.getElementById('error-banner')
  var errorMessage   = document.getElementById('error-message')
  var chartSection   = document.getElementById('chart-section')
  var chartTitle     = document.getElementById('chart-title')
  var chartCanvas    = document.getElementById('fx-chart')
  var closeChart     = document.getElementById('close-chart')
  var printLink      = document.getElementById('print-link')

  var cachedRates    = null
  var cachedBase     = null
  var debounceTimer  = null
  var chartInstance  = null
  var lastAmount     = 0
  var lastResults    = []

  // ── Helpers ──────────────────────────────────────────────────────────────

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

  function getDateDaysAgo (days) {
    var d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  // ── Print link ────────────────────────────────────────────────────────────

  function updatePrintLink () {
    var params = new URLSearchParams({
      amount: lastAmount,
      base: homeCurrency.value,
      rates: JSON.stringify(cachedRates || {})
    })
    printLink.href = '/print?' + params.toString()
  }

  // ── Chart ─────────────────────────────────────────────────────────────────

  function showChartForCurrency (targetCode) {
    var base = homeCurrency.value
    var fromDate = getDateDaysAgo(30)
    var today = new Date().toISOString().split('T')[0]

    chartTitle.textContent = base + ' to ' + targetCode + ' — 30-day rate history'
    chartSection.removeAttribute('hidden')
    chartSection.scrollIntoView({ behavior: 'smooth', block: 'start' })

    fetch('https://api.frankfurter.dev/v1/' + fromDate + '..' + today + '?from=' + base + '&to=' + targetCode)
      .then(function (r) {
        if (!r.ok) throw new Error('History fetch failed')
        return r.json()
      })
      .then(function (data) {
        var labels = Object.keys(data.rates).sort()
        var values = labels.map(function (d) { return data.rates[d][targetCode] })

        if (chartInstance) chartInstance.destroy()

        chartInstance = new Chart(chartCanvas, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: '1 ' + base + ' in ' + targetCode,
              data: values,
              borderColor: '#1d70b8',
              backgroundColor: 'rgba(29,112,184,0.08)',
              borderWidth: 2,
              pointRadius: 2,
              fill: true,
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return '1 ' + base + ' = ' + ctx.parsed.y.toFixed(4) + ' ' + targetCode
                  }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  maxTicksLimit: 8,
                  font: { family: 'GDS Transport, Arial, sans-serif', size: 12 }
                }
              },
              y: {
                ticks: {
                  font: { family: 'GDS Transport, Arial, sans-serif', size: 12 }
                }
              }
            }
          }
        })
      })
      .catch(function () {
        chartSection.setAttribute('hidden', '')
      })
  }

  closeChart.addEventListener('click', function (e) {
    e.preventDefault()
    chartSection.setAttribute('hidden', '')
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  })

  // ── Results table ─────────────────────────────────────────────────────────

  function renderResults (amount, base, rates) {
    resultsBody.innerHTML = ''
    lastResults = []

    Object.keys(CURRENCIES).forEach(function (code) {
      if (code === base) return
      var rate = rates[code]
      if (!rate) return

      lastResults.push({ code: code, rate: rate, converted: amount * rate })

      var row = document.createElement('tr')
      row.className = 'govuk-table__row'
      row.innerHTML =
        '<td class="govuk-table__cell">' +
          '<strong>' + code + '</strong> – ' + CURRENCIES[code].name +
        '</td>' +
        '<td class="govuk-table__cell govuk-table__cell--numeric">' +
          formatAmount(amount * rate, code) +
        '</td>' +
        '<td class="govuk-table__cell govuk-table__cell--numeric">' +
          '<a href="#chart-section" class="govuk-link chart-trigger" data-code="' + code + '">View chart</a>' +
        '</td>'
      resultsBody.appendChild(row)
    })

    rateNote.textContent = 'Rates as of today. Source: European Central Bank via Frankfurter API.'
    resultsDiv.removeAttribute('hidden')
    updatePrintLink()
  }

  resultsBody.addEventListener('click', function (e) {
    var trigger = e.target.closest('.chart-trigger')
    if (!trigger) return
    e.preventDefault()
    showChartForCurrency(trigger.dataset.code)
  })

  // ── Fetch & render ────────────────────────────────────────────────────────

  function fetchRatesAndRender (amount, base) {
    lastAmount = amount
    if (cachedRates && cachedBase === base) {
      renderResults(amount, base, cachedRates)
      return
    }

    fetch('https://api.frankfurter.dev/v1/latest?from=' + base)
      .then(function (response) {
        if (!response.ok) throw new Error('Status ' + response.status)
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
      chartSection.setAttribute('hidden', '')
      hideError()
      return
    }

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(function () {
      fetchRatesAndRender(amount, base)
    }, 300)
  }

  function onCurrencyChange () {
    var base = homeCurrency.value
    currencySymbol.textContent = CURRENCIES[base] ? CURRENCIES[base].symbol : base
    cachedRates = null
    cachedBase  = null
    chartSection.setAttribute('hidden', '')
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    onInput()
  }

  amountInput.addEventListener('input', onInput)
  homeCurrency.addEventListener('change', onCurrencyChange)

})()
