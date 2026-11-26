# Changelog

All notable changes to **Passable Appliance Card** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-11-26

### Added
- **Summary & Multi-Appliance Hub Mode**: Added `display_mode: "summary"` supporting both single appliances and consolidated `appliances: [...]` hubs with summary strip, model-accurate SVG thumbnails, `hero`/`rings` layouts, expandable telemetry trays, quick footer chips, and a swipeable 3-tab Command Center popup with unit switching.
- **SPAN Panel Power Auto-Discovery**: Automatically discovers SPAN Panel power (`W`), current (`A`), and net energy (`kWh`) sensors for the Refrigerator, Induction Range, and Dryer.
- **LG ThinQ Laundry Command Center**: Added an interactive 3-tab Laundry popup (`Washer`, `Dryer`, `Care & Power`) with `select.*_operation` cycle controls, Remote Start readiness guard, `number.washer_delayed_start` stepper, finish ETA countdown, and `sensor.washer_cycles` Tub Clean reminder (`>= 30` cycles).
- **Missing Hardware Telemetry**: Exposed Refrigerator ice bucket status & bidirectional K-Cup toggle, Oven remote-enabled/timers/cooktop syncs, Navien burner modulation % + cumulative gas + live `input_number.water_heater_recirc_interval` + error codes, and Orbit B-hyve device mode + fault detection.

### Fixed
- **Oven Light Toggle Bug**: Fixed `select.*_light` toggling using `select.select_option` (`Off` / `High`) instead of `homeassistant.toggle`.
- **Smart Hose Valve Services & History**: Fixed valve service calls to `valve.open_valve` / `valve.close_valve`, fixed `STOP WATERING` active button label, and parsed `pool_zone_history` `run_time` / `consumption_gallons` attributes instead of hardcoded fallbacks.
- **Navien Fake Timeline Removal**: Replaced placeholder barcodes and static timestamps with real HA 24-hour history for `switch.water_heater_hot_button`.
- **Performance & Scroll Lock**: Added `shouldUpdate` entity filtering, local `ha-panel-lovelace` Lit extraction, and popup scroll-lock.

## [2.2.2] - 2026-10-02

### Changed
- **Popup & Tab Harmonization**: Aligned active tabs and theme-adaptive steppers with `passable-vehicle-card` and `passable-hvac-card`.
