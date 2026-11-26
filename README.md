# Passable Appliance Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![version](https://img.shields.io/github/v/release/GBear09/passable-appliance-card)](https://github.com/GBear09/passable-appliance-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A unified custom Lovelace card for Home Assistant aligned with the Passable card design system (`passable-hvac-card`, `passable-vehicle-card`, and `passable-lighting-card`), supporting 5 major appliance platforms in both rich graphical **Full** mode and compact **Summary / Hub** mode:

1. **Café `CYE22TP2MIS1` French-Door Refrigerator**: Interactive doors, copper-cuffed Café handles, Keurig K-Cup hot water dispenser, ice bucket fullness, water filter gauge, Turbo Cool/Freeze, and Sabbath mode.
2. **Café `CHS950P2M1S1` Induction Range & Double Oven**: 5-zone ceramic cooktop with SyncBurners bridge, 6-knob bezel, Upper/Lower convection & Air Fry oven controls, `select.*_light` toggle, timers, and probe telemetry.
3. **LG ThinQ `F3L2CYU__` & `RV13B6BSD` Laundry Center**: Front-load drum animation, finish ETA, progress %, Remote Start readiness, delayed start stepper, Tub Clean cycle counter, and error/notification events.
4. **Navien `NPE-240A2` Condensing Tankless Water Heater**: Animated piping & burner modulation, HotButton® recirculation + live 24h HA history timeline, error codes, and Annual Flush Guide.
5. **Orbit B-hyve `HT25-0000` Smart Hose Timer**: Rotary 1–120 min dial, native `valve` & `bhyve.start_watering` controls, Smart Watering, Rain Delay, and parsed run history.

---

## Configuration Examples

### Consolidated Multi-Appliance Summary Hub (`display_mode: summary`)

```yaml
type: custom:passable-appliance-card
display_mode: summary
layout: hero
show_header: false
show_summary_strip: true
show_footer_strip: true
auto_discover_span: true
appliances:
  - appliance_type: refrigerator
    title: Refrigerator
  - appliance_type: induction_range
    title: Induction Range
  - appliance_type: laundry
    title: Washer & Dryer
  - appliance_type: water_heater
    title: Water Heater
  - appliance_type: smart_hose_timer
    title: Pool Hose Timer
```

### Full Graphical Single-Appliance Card (`display_mode: full`, default)

```yaml
type: custom:passable-appliance-card
appliance_type: refrigerator
title: Kitchen Refrigerator
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
