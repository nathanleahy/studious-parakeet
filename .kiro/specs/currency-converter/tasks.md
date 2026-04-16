# Implementation Plan: Currency Converter

## Overview

The core converter is already implemented. These tasks focus on:
1. Wiring up a test framework (Vitest + fast-check + jsdom)
2. Writing property-based tests for all 6 correctness properties
3. Writing unit/example tests for the scenarios in the design testing strategy
4. Writing smoke/integration tests for routes and GOV.UK compliance
5. Patching the three known gaps in the implementation

All tests live under `protokit/test/`. Pure-function helpers are extracted from the IIFEs into testable modules.

---

## Tasks

- [ ] 1. Add test dependencies and configure Vitest
  - Add `vitest`, `@vitest/coverage-v8`, `fast-check`, `jsdom`, and `supertest` as dev-dependencies in `protokit/package.json`
  - Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts
  - Create `protokit/vitest.config.js` with `environment: 'jsdom'`, `globals: true`, and `testMatch: ['test/**/*.test.js']`
  - _Requirements: none — infrastructure only_

- [ ] 2. Extract pure helpers into testable modules
  - Create `protokit/app/assets/javascripts/currency-converter-helpers.js` exporting `formatAmount`, `getDateDaysAgo`, `CURRENCIES` (converter variant with `symbol`/`name`)
  - Create `protokit/app/assets/javascripts/print-page-helpers.js` exporting `formatAmount`, `generateRef`, `formatDate`, `CURRENCIES` (print variant with `name` only)
  - Update `currency-converter.js` and `print-page.js` to `require`/import from these modules so the IIFEs remain unchanged in browser behaviour
  - _Requirements: 3.2, 3.3, 5.2, 5.3_

- [ ] 3. Implement gap fix — immediate hiding on input clear (Requirement 8.3)
  - In `currency-converter.js` `onInput`, when `amountInput.value` is falsy (empty), call `clearTimeout(debounceTimer)` before the early `return` so hiding is instant with no timer pending
  - Add a guard: if `!amountInput.value.trim()`, hide results and chart immediately without queuing a debounce
  - _Requirements: 8.3_

- [ ] 4. Implement gap fix — zero/undefined rate row omission (Requirement 8.4)
  - Verify `renderResults` in `currency-converter.js` already contains `if (!rate) return`; if so, add an explicit `rate === 0` check: `if (!rate || rate === 0) return`
  - Add the same guard to the `print-page.js` table-building loop
  - _Requirements: 8.4_

- [ ] 5. Implement gap fix — malformed print URL params show dashes, not crash (Requirement 5.9)
  - In `print-page.js`, confirm the `try/catch` around `JSON.parse` defaults to `{}` on failure and that `print-amount` shows `—` when `amount` is `NaN`
  - Confirm `rate.toFixed(4)` in the table loop is guarded: if `rate` is not a finite number, render `—` instead
  - _Requirements: 5.9_

- [ ] 6. Write property-based tests — Property 1: Invalid amounts hide results
  - Create `protokit/test/pbt/property-1-invalid-amounts.test.js`
  - Set up a minimal jsdom fixture containing `#amount`, `#home-currency`, `#results`, `#chart-section`, `#error-banner`, `#error-message`, `#results-body`, `#rate-note`, `#print-link` elements
  - Use `fc.oneof(fc.constant(''), fc.float({ max: -0.01 }), fc.constant(NaN), fc.constant(Infinity))` to generate invalid values
  - Assert that after `onInput()` the `results` div has the `hidden` attribute and `error-banner` also has `hidden`
  - Tag: `// Feature: currency-converter, Property 1: Invalid amounts hide results`
  - _Requirements: 1.4, 8.1, 8.2_

  - [ ]* 6.1 Write property test for Property 1
    - **Property 1: Invalid amounts hide the results view**
    - **Validates: Requirements 1.4, 8.1, 8.2**

- [ ] 7. Write property-based tests — Property 2: Currency symbol prefix
  - Create `protokit/test/pbt/property-2-symbol-prefix.test.js`
  - Import `CURRENCIES` from `currency-converter-helpers.js`
  - Use `fc.constantFrom(...Object.keys(CURRENCIES))` to sample currency codes
  - Set up a DOM fixture with `#home-currency` select and `#currency-symbol` span
  - For each sampled code, set `homeCurrency.value = code`, call `onCurrencyChange()`, assert `currencySymbol.textContent === CURRENCIES[code].symbol`
  - Tag: `// Feature: currency-converter, Property 2: Currency symbol prefix matches selected currency`
  - _Requirements: 1.3_

  - [ ]* 7.1 Write property test for Property 2
    - **Property 2: Currency symbol prefix matches selected currency**
    - **Validates: Requirements 1.3**

- [ ] 8. Write property-based tests — Property 3: Results table row count and content
  - Create `protokit/test/pbt/property-3-results-rows.test.js`
  - Import `formatAmount`, `CURRENCIES` from `currency-converter-helpers.js`
  - Use `fc.float({ min: 0.01, max: 1_000_000 })` for amount, `fc.constantFrom(...Object.keys(CURRENCIES))` for base, `fc.dictionary(fc.constantFrom(...Object.keys(CURRENCIES)), fc.float({ min: 0 }))` for rates
  - Call `renderResults(amount, base, rates)` against a jsdom fixture
  - Assert row count equals the number of keys in `CURRENCIES` where `code !== base && rates[code] > 0`
  - Assert each rendered row contains the currency ISO code, full name, and a non-empty string
  - Tag: `// Feature: currency-converter, Property 3: Results table row count and content`
  - _Requirements: 3.1, 3.2, 3.4, 8.4_

  - [ ]* 8.1 Write property test for Property 3
    - **Property 3: Results table row count and content**
    - **Validates: Requirements 3.1, 3.2, 3.4, 8.4**

- [ ] 9. Write property-based tests — Property 4: Amount formatting decimal precision
  - Create `protokit/test/pbt/property-4-format-decimals.test.js`
  - Import `formatAmount` from `currency-converter-helpers.js` and from `print-page-helpers.js`
  - Use `fc.float({ min: 0.01, max: 1_000_000 })` for amount
  - For `JPY`: assert the returned string contains no decimal point character
  - For all other supported codes: assert the numeric portion ends with exactly two digits after the decimal separator
  - Run the same assertions against the print-page `formatAmount` to verify parity
  - Tag: `// Feature: currency-converter, Property 4: Amount formatting decimal precision`
  - _Requirements: 3.3, 8.5_

  - [ ]* 9.1 Write property test for Property 4
    - **Property 4: Amount formatting decimal precision**
    - **Validates: Requirements 3.3, 8.5**

- [ ] 10. Write property-based tests — Property 5: Print link encodes all conversion state
  - Create `protokit/test/pbt/property-5-print-link.test.js`
  - Import `CURRENCIES` from `currency-converter-helpers.js`
  - Use `fc.float({ min: 0.01, max: 1_000_000 })` for amount, `fc.constantFrom(...)` for base, non-empty rates dictionary
  - Set up a DOM fixture with `#print-link`, `#home-currency`, and module-level `cachedRates`/`lastAmount` state
  - After calling `updatePrintLink()`, parse `printLink.href`, verify `amount`, `base`, and `rates` query params exist, and that `JSON.parse(params.get('rates'))` round-trips without throwing
  - Tag: `// Feature: currency-converter, Property 5: Print link URL encodes all conversion state`
  - _Requirements: 5.1_

  - [ ]* 10.1 Write property test for Property 5
    - **Property 5: Print link URL encodes all conversion state**
    - **Validates: Requirements 5.1**

- [ ] 11. Write property-based tests — Property 6: Reference number format invariant
  - Create `protokit/test/pbt/property-6-ref-format.test.js`
  - Import `generateRef` from `print-page-helpers.js`
  - Use `fc.integer({ min: 0, max: 100 })` to call `generateRef()` N times
  - Assert every returned value matches `/^GCC-[A-Z0-9]+$/`
  - Tag: `// Feature: currency-converter, Property 6: Reference number format invariant`
  - _Requirements: 5.2_

  - [ ]* 11.1 Write property test for Property 6
    - **Property 6: Reference number format invariant**
    - **Validates: Requirements 5.2**

- [ ] 12. Checkpoint — run all property tests
  - Run `npm test` in `protokit/`, confirm all 6 PBT suites pass with ≥ 100 iterations each
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Write unit/example tests — converter business logic
  - Create `protokit/test/unit/currency-converter.test.js`
  - Cache hit: mock `fetch`; enter an amount, change nothing, enter a second amount — assert `fetch` called exactly once
  - Cache miss: mock `fetch`; change `home-currency` select, enter an amount — assert `fetch` called a second time
  - Debounce: use fake timers; advance < 300 ms, assert `fetch` not called; advance to ≥ 300 ms, assert `fetch` called once
  - Error banner: mock `fetch` returning `{ ok: false, status: 500 }`; assert `#error-banner` does not have `hidden`; mock success on next fetch, assert `#error-banner` has `hidden`
  - Chart lifecycle: click "View chart", then click "Hide chart" — assert `chartInstance` is `null` after hiding; change currency — assert chart hidden and instance destroyed
  - Input cleared immediately: set `amountInput.value = '100'`, trigger input, advance timer by 100 ms; then set `amountInput.value = ''`, trigger input without advancing timer — assert `#results` has `hidden` immediately
  - _Requirements: 1.4, 2.1, 2.2, 2.4, 2.5, 4.5, 4.6, 8.3_

  - [ ]* 13.1 Write unit tests for converter business logic
    - Test cache hit/miss, debounce, error banner, chart lifecycle, and immediate clear
    - _Requirements: 1.4, 2.1, 2.2, 2.4, 2.5, 4.5, 4.6, 8.3_

- [ ] 14. Write unit/example tests — print page
  - Create `protokit/test/unit/print-page.test.js`
  - Auto-print: use fake timers; after page load, advance 600 ms — assert `window.print` was called exactly once
  - Malformed `rates` param: set `window.location.search = '?amount=100&base=GBP&rates=NOT_JSON'`; assert no error thrown and `#print-table-body` is empty or shows dashes
  - `formatDate` output: assert `formatDate(new Date('2025-01-15T12:00:00Z'))` contains `"2025"` and `"January"` and `"Wednesday"`
  - _Requirements: 5.3, 5.7, 5.9_

  - [ ]* 14.1 Write unit tests for print page
    - Test auto-print timer, malformed rates param, and formatDate output
    - _Requirements: 5.3, 5.7, 5.9_

- [ ] 15. Write smoke/integration tests — routes and GOV.UK compliance
  - Create `protokit/test/integration/routes.test.js` using `supertest`
  - `GET /` → assert 302 redirect to `/currency-converter`
  - `GET /currency-converter` → assert 200
  - `GET /print` → assert 200
  - `GET /currency-converter` HTML → assert `role="alert"` present on error summary element
  - `GET /currency-converter` HTML → assert all 10 currency option values (`GBP`, `USD`, `EUR`, `JPY`, `CAD`, `AUD`, `CHF`, `CNY`, `INR`, `MXN`) present; `GBP` option has `selected`
  - `GET /currency-converter` HTML → assert "European Central Bank" text present
  - `GET /print` HTML → assert disclaimer text "for reference only" present
  - _Requirements: 6.1, 6.2, 6.3, 7.2, 1.2, 2.6, 5.8_

  - [ ]* 15.1 Write smoke/integration tests for routes and GOV.UK compliance
    - Test HTTP status codes, role attributes, currency options, and disclaimer text
    - _Requirements: 6.1, 6.2, 6.3, 7.2, 1.2, 2.6, 5.8_

- [ ] 16. Final checkpoint — full test suite green
  - Run `npm test` in `protokit/`, ensure all suites pass (unit, PBT, integration)
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All PBT tasks use **fast-check** with a minimum of 100 iterations
- Each property test is tagged with `// Feature: currency-converter, Property N: <title>`
- Tasks 3–5 fix the three known implementation gaps before tests run against them
- `supertest` is used for integration/route tests without starting a live server
