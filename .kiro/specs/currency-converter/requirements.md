# Requirements Document

## Introduction

The Currency Converter is a GOV.UK Prototype Kit service that allows users to convert a monetary amount from a chosen home currency into all other supported currencies using live exchange rates. The service fetches rates from the Frankfurter API (European Central Bank data), displays a results table with converted amounts, provides a 30-day exchange rate history chart per currency pair, and produces a printable conversion summary with a reference number and timestamp.

This document formalises the behaviour of the vibe-coded prototype and captures gaps and improvements worth addressing.

---

## Glossary

- **Converter**: The main currency converter page at `/currency-converter`
- **Amount_Input**: The numeric input field where the user enters the amount to convert
- **Home_Currency**: The base currency selected by the user from the supported currency list
- **Results_Table**: The GOV.UK-styled table displaying converted amounts for all currencies other than the Home_Currency
- **Chart**: The 30-day exchange rate history line chart rendered using Chart.js
- **Print_Page**: The printable conversion summary page at `/print`
- **Frankfurter_API**: The third-party exchange rate API at `https://api.frankfurter.dev`, sourcing data from the European Central Bank
- **Rate_Cache**: The in-memory per-base-currency cache of the most recently fetched exchange rates
- **Reference_Number**: A client-generated identifier in the format `GCC-<base36-timestamp>` displayed on the Print_Page
- **Supported_Currencies**: The fixed set of 10 currencies: GBP, USD, EUR, JPY, CAD, AUD, CHF, CNY, INR, MXN
- **Debounce_Timer**: A 300 ms delay applied to Amount_Input events before triggering a rate fetch or render
- **Error_Banner**: The GOV.UK error summary component displayed when an API call fails

---

## Requirements

### Requirement 1: Currency Input and Selection

**User Story:** As a user, I want to enter an amount and select a home currency, so that I can see how much that amount is worth in other currencies.

#### Acceptance Criteria

1. THE Converter SHALL display an Amount_Input field accepting non-negative numeric values.
2. THE Converter SHALL display a Home_Currency selector pre-populated with all Supported_Currencies, defaulting to GBP.
3. WHEN the user selects a Home_Currency, THE Converter SHALL update the currency symbol prefix displayed alongside the Amount_Input to match the selected currency.
4. WHEN the Amount_Input value is empty, zero, negative, or non-numeric, THE Converter SHALL hide the Results_Table and Chart without displaying an error.
5. WHEN the user changes the Home_Currency, THE Converter SHALL clear the Rate_Cache and hide the Chart.

---

### Requirement 2: Live Exchange Rate Fetching

**User Story:** As a user, I want the converter to use live exchange rates, so that the converted amounts reflect current market values.

#### Acceptance Criteria

1. WHEN a valid positive numeric amount is entered, THE Converter SHALL fetch the latest exchange rates from the Frankfurter_API for the selected Home_Currency within 300 ms of the user stopping input (Debounce_Timer).
2. WHILE a valid Rate_Cache exists for the current Home_Currency, THE Converter SHALL use the cached rates without making a new API request.
3. WHEN the Frankfurter_API returns a successful response, THE Converter SHALL update the Rate_Cache with the returned rates.
4. IF the Frankfurter_API request fails or returns a non-200 status, THEN THE Converter SHALL display the Error_Banner with the message "Could not load exchange rates. Please check your internet connection and try again."
5. WHEN a successful rate fetch occurs after a previous failure, THE Converter SHALL hide the Error_Banner.
6. THE Converter SHALL attribute rates to the European Central Bank via a visible note in the Results_Table.

---

### Requirement 3: Results Table Display

**User Story:** As a user, I want to see all converted amounts in a clear table, so that I can compare values across currencies at a glance.

#### Acceptance Criteria

1. WHEN exchange rates are available and the Amount_Input contains a valid positive value, THE Converter SHALL display the Results_Table showing one row per Supported_Currency excluding the Home_Currency.
2. THE Results_Table SHALL display each currency's ISO code, full name, and the converted amount formatted using `Intl.NumberFormat` with locale `en-GB`.
3. THE Converter SHALL format JPY converted amounts with zero decimal places and all other currencies with exactly two decimal places.
4. THE Results_Table SHALL include a "View chart" link on each row that triggers the Chart for that currency pair.
5. WHEN the Home_Currency changes, THE Converter SHALL re-render the Results_Table using rates fetched for the new Home_Currency.

---

### Requirement 4: 30-Day Exchange Rate History Chart

**User Story:** As a user, I want to view a 30-day rate history chart for a currency pair, so that I can understand recent exchange rate trends.

#### Acceptance Criteria

1. WHEN the user selects "View chart" for a currency, THE Converter SHALL fetch 30 days of daily exchange rate data from the Frankfurter_API for the Home_Currency to target currency pair.
2. WHEN the history data is returned successfully, THE Converter SHALL render a line Chart labelled with the currency pair and date range.
3. THE Chart SHALL display dates on the x-axis and exchange rate values on the y-axis, with a maximum of 8 x-axis tick labels.
4. WHEN the user selects "View chart", THE Converter SHALL scroll the Chart into view smoothly.
5. WHEN the user activates the "Hide chart" link, THE Converter SHALL hide the Chart and destroy the Chart instance.
6. WHEN the Home_Currency changes, THE Converter SHALL hide the Chart and destroy any existing Chart instance.
7. IF the history API request fails, THEN THE Converter SHALL hide the Chart section without displaying an additional error message.

---

### Requirement 5: Print Summary Page

**User Story:** As a user, I want to print a summary of my conversion, so that I have a physical or saved record of the rates at the time of conversion.

#### Acceptance Criteria

1. WHEN the Results_Table is visible, THE Converter SHALL display a "Print this conversion" button that links to the Print_Page with the amount, Home_Currency, and current rates encoded as URL query parameters.
2. THE Print_Page SHALL display a Reference_Number in the format `GCC-<base36-timestamp>` generated at page load time.
3. THE Print_Page SHALL display the date and time of printing formatted as a full weekday, day, month, year, hour, and minute in the `en-GB` locale.
4. THE Print_Page SHALL display the entered amount formatted with the Home_Currency symbol and the Home_Currency code and full name.
5. THE Print_Page SHALL display a conversion table with one row per currency present in the rates query parameter, showing the ISO code, full name, exchange rate to 4 decimal places, and converted amount.
6. THE Print_Page SHALL attribute the rate source as "European Central Bank via Frankfurter API".
7. WHEN the Print_Page has loaded, THE Print_Page SHALL automatically open the browser print dialog after a 600 ms delay.
8. THE Print_Page SHALL display a disclaimer stating the document is for reference only and must not be used for financial or legal decisions.
9. IF the rates query parameter is absent or malformed, THEN THE Print_Page SHALL display placeholder dashes in place of conversion data rather than throwing a JavaScript error.

---

### Requirement 6: Routing and Navigation

**User Story:** As a user, I want consistent navigation between pages, so that I can move through the service without confusion.

#### Acceptance Criteria

1. WHEN a user navigates to `/`, THE Converter SHALL redirect the user to `/currency-converter`.
2. THE Converter SHALL be accessible at the route `/currency-converter`.
3. THE Print_Page SHALL be accessible at the route `/print`.
4. THE Print_Page SHALL display a "Back to converter" link that returns the user to `/currency-converter`.

---

### Requirement 7: GOV.UK Design System Compliance

**User Story:** As a service owner, I want the prototype to follow GOV.UK Design System patterns, so that it is consistent with government service standards.

#### Acceptance Criteria

1. THE Converter SHALL use GOV.UK Frontend components for all form elements, tables, error summaries, and typography.
2. THE Converter SHALL display the Error_Banner using the GOV.UK error summary component with `role="alert"` so that screen readers announce errors immediately.
3. THE Print_Page SHALL include a GOV.UK warning text component on screen and a plain-text disclaimer in the print stylesheet version.
4. THE Converter SHALL use the GDS Transport font stack for all Chart axis labels.
5. WHERE the GOV.UK Prototype Kit rebrand option is enabled, THE Converter SHALL apply the rebranded GOV.UK Frontend styles.

---

### Requirement 8: Input Validation and Edge Cases

**User Story:** As a user, I want the service to handle unexpected inputs gracefully, so that I am not shown broken or misleading output.

#### Acceptance Criteria

1. IF the Amount_Input contains a negative number, THEN THE Converter SHALL hide the Results_Table without displaying an error.
2. IF the Amount_Input contains a value that cannot be parsed as a finite number, THEN THE Converter SHALL hide the Results_Table without displaying an error.
3. WHEN the Amount_Input is cleared, THE Converter SHALL hide the Results_Table and Chart immediately without waiting for the Debounce_Timer to expire.
4. IF the Frankfurter_API returns a rate of zero or undefined for a currency, THEN THE Converter SHALL omit that currency row from the Results_Table.
5. IF the `Intl.NumberFormat` API is unavailable or throws for a given currency code, THEN THE Converter SHALL fall back to displaying the amount formatted to two decimal places followed by the ISO currency code.
