(function () {
  'use strict'

  var CURRENCIES = {
    GBP: 'British Pound',
    USD: 'US Dollar',
    EUR: 'Euro',
    JPY: 'Japanese Yen',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    MXN: 'Mexican Peso'
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

  function generateRef () {
    return 'GCC-' + Date.now().toString(36).toUpperCase()
  }

  function formatDate (d) {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  var params = new URLSearchParams(window.location.search)
  var amount = parseFloat(params.get('amount'))
  var base   = params.get('base') || 'GBP'
  var rates  = {}

  try { rates = JSON.parse(params.get('rates') || '{}') } catch (e) {}

  // Populate summary
  document.getElementById('print-ref').textContent    = generateRef()
  document.getElementById('print-date').textContent   = formatDate(new Date())
  document.getElementById('print-amount').textContent = isNaN(amount) ? '—' : formatAmount(amount, base)
  document.getElementById('print-base').textContent   = base + (CURRENCIES[base] ? ' – ' + CURRENCIES[base] : '')

  // Populate table
  var tbody = document.getElementById('print-table-body')
  Object.keys(rates).forEach(function (code) {
    if (!CURRENCIES[code]) return
    var rate      = rates[code]
    var converted = amount * rate
    var row = document.createElement('tr')
    row.className = 'govuk-table__row'
    row.innerHTML =
      '<td class="govuk-table__cell"><strong>' + code + '</strong> – ' + CURRENCIES[code] + '</td>' +
      '<td class="govuk-table__cell govuk-table__cell--numeric">' + rate.toFixed(4) + '</td>' +
      '<td class="govuk-table__cell govuk-table__cell--numeric">' + formatAmount(converted, code) + '</td>'
    tbody.appendChild(row)
  })

  // Auto-trigger print dialog
  window.addEventListener('load', function () {
    setTimeout(function () {
      window.print()
    }, 600)
  })

})()
