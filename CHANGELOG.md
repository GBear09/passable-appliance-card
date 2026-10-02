# Changelog

All notable changes to **Passable Appliance Card** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.2] - 2026-10-02

### Changed
- **Popup & Tab Harmonization**: Aligned active tabs (`.popup-tab.active-tab`) to use filled `var(--primary-color)` with dynamic high-contrast text (`var(--text-primary-color, var(--primary-text-color))`), matching the Passable vehicle card and HVAC card.
- **Theme-Adaptive Steppers & Modals**: Updated `.step-controller-pill` to theme-adaptive variables (`var(--secondary-background-color)`, `var(--divider-color)`), and updated `.modal-header` and `.step-num` to `var(--primary-color)` and adaptive text.

## [2.2.1] - 2026-10-02

### Changed
- **Light Theme Safety**: Replaced hardcoded dark charcoal `#1c1c1e` fallbacks across `.popup-content`, `.modal-content`, active popup tabs, and custom select dropdowns with light-theme-adaptive tokens (`var(--card-background-color, #fff)`).
- **Registry Metadata**: Standardized `window.customCards` configuration with `documentationURL`.

## [2.2.0] - 2026-09-20

### Added
- Smart hose timer controls, Navien flush timeline, and 5-burner induction cooktop support.
