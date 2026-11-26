# Changelog

All notable changes to **Passable Appliance Card** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.1] - 2026-11-26

### Fixed
- **Freezer, Oven & K-Cup Setpoint Accuracy**: Fixed `_getTargetTemp()` rejecting `0°F` and negative freezer setpoints (`-6°F` to `0°F`), added dedicated `_getFridgeSetpoints()` (falling back cleanly to `sensor.*_temperature_setting_freezer`/`fridge`), and fixed `"Off"` ovens (`attributes.temperature = 0`) and idle Keurig K-Cup dispensers showing phantom `170°` / `90°` setpoints.
- **Additional Parameter Consistency Fixes**: Fixed missing burner labels (`Element undefined`) when dashboard YAML omits `label`, displayed active oven setpoints alongside cavity temps on the main range doors & LCD, fixed summary `rings` mode oven selection, surfaced active Navien `RECIRCULATING` chip + `timer.water_heater_recirc_cooldown` + `sensor.water_heater_power`, initialized Smart Hose manual runtime from `manual_preset_runtime`, and removed fake `"35° / 0°"` unavailable fallback.
- **Induction Cooktop Geometry & SyncBridge**: Rebuilt the Café `CHS950P2M1S1` stovetop as a proportional `<svg viewBox="0 0 360 224">` eliminating overlapping burners and aligning symmetric `SyncBurners` bridge lines cleanly tangent to the left elements, plus upgraded the 6-knob oven control bezel with live status readout.

### Changed
- **Passable Dropdown Controls**: Replaced cluttered pill rows with unified Passable dropdown selectors (`.passable-select-row`) for Oven Modes, Smart Hose Modes, Sound/Tone settings, and Multi-Appliance Hub switching, alongside 3-column quick temp presets and icon transport buttons for LG ThinQ Laundry.

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
