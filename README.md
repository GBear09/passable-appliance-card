# Passable Appliance Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![version](https://img.shields.io/github/v/release/GBear09/passable-appliance-card)](https://github.com/GBear09/passable-appliance-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A dynamic, consolidated, universal custom card for Home Assistant supporting 6 different major home appliances & mechanical systems:

1. **🧊 Refrigerator & Freezer**: French door graphic layout with water dispenser cutout screen & lever, bottom freezer drawer, door open alerts, and bottom-sheet dispenser controls popup modal with hot water quick presets (Cocoa 150°, Tea 170°, Soup 185°), water filter indicator, and ice maker toggle switch.
2. **🍳 Induction Range & Oven**: 5-burner cooktop graphic layout with exact burner placement percentages, bridge sync lines, top oven control panel with SVG knobs & screen, upper/lower oven doors, and oven control popups with **Oven Light** toggle switch.
3. **🧺 Laundry Center**: Vertical stack washer & dryer cards with top control panel (knobs & time screen), spinning drum animation, cycle stage badges, and remaining time countdowns. Supports `sensor`, `select`, and `input_select` operation entities.
4. **💧 Tankless Water Heater (Navien)**: Vector SVG tankless unit graphic with inlet/outlet temperature badges, animated water flow lines, heating radial pulse animation, flow rate (GPM) & gas usage (BTU/h) progress bars, recirculation control button with last-run history, and a customizable **Flush & Descale Guide** modal window.
5. **🚿 Smart Hose Timer**: Circular arc ring timer dial slider (1–120 MIN), watering action button with timestamp, gear settings drawer, battery % status chip, and Next/Last watering telemetry cards.
6. **❄️🔥 HVAC Systems**: Dual heat pump system card (Downstairs & Upstairs) with real-time temperature, humidity, active preset, overshoot buffer indicators, air filter remaining life progress bars, and modal drawers for thermostat setpoints and filter replacement guides.

---

## 📸 Screenshots

| Refrigerator | Induction Range | Laundry Center | Water Heater | Hose Timer | HVAC Systems |
|---|---|---|---|---|---|
| French door graphic & dispenser modal | 5-burner cooktop & oven popups with light | Vertical stack & spinning drum | SVG tankless unit & flush guide | Ring dial slider & watering control | Dual heat pumps, overshoot & filter guide |

---

## 📦 Installation via HACS

1. Open **HACS** in your Home Assistant instance.
2. Click the three dots in the top-right corner and select **Custom repositories**.
3. Add Repository URL: `https://github.com/GBear09/passable-appliance-card`
4. Select Category: **Dashboard** (or **Lovelace**).
5. Click **Add**, find **Passable Appliance Card**, and click **Download**.
6. Hard refresh your browser (`Ctrl + Shift + R` or `Cmd + Shift + R`).

---

## ⚙️ Configuration Examples

### 1. HVAC Systems Example (Dual Heat Pumps & Helpers)
```yaml
type: custom:passable-appliance-card
appliance_type: hvac
title: HVAC Systems

# Downstairs Unit
downstairs_climate: climate.downstairs
downstairs_climate_hk: climate.downstairs_hk
downstairs_setpoint_preset: input_select.hvac_setpoint_preset_downstairs
downstairs_cool_overshoot: input_number.hvac_cool_overshoot_downstairs
downstairs_heat_overshoot: input_number.hvac_heat_overshoot_downstairs
downstairs_filter_hours: sensor.downstairs_hvac_filter_hours
downstairs_filter_life: input_number.downstairs_hvac_filter_life_limit

# Upstairs Unit
upstairs_climate: climate.upstairs
upstairs_climate_hk: climate.upstairs_hk
upstairs_setpoint_preset: input_select.hvac_setpoint_preset_upstairs
upstairs_cool_overshoot: input_number.hvac_cool_overshoot_upstairs
upstairs_heat_overshoot: input_number.hvac_heat_overshoot_upstairs
upstairs_filter_hours: sensor.upstairs_hvac_filter_hours
upstairs_filter_life: input_number.upstairs_hvac_filter_life_limit

# Global Helpers
global_setpoint_preset: input_select.hvac_setpoint_preset_global
```

### 2. Refrigerator Example
```yaml
type: custom:passable-appliance-card
appliance_type: refrigerator
title: Kitchen Refrigerator
fridge_control: water_heater.dt507030_fridge
freezer_control: water_heater.dt507030_freezer
dispenser_control: water_heater.dt507030_dispenser
fridge_temp_current: sensor.dt507030_current_temperature_fridge
freezer_temp_current: sensor.dt507030_current_temperature_freezer
door_status: sensor.dt507030_door_status
ice_maker_control: switch.dt507030_ice_maker_control
water_filter_status: sensor.dt507030_water_filter_status
hot_water_in_use: binary_sensor.dt507030_hot_water_in_use
hot_water_set_temp: sensor.dt507030_hot_water_set_temp
hot_water_current_temp: sensor.dt507030_hot_water_status_current_temp
hot_water_status: sensor.dt507030_hot_water_status_status
hot_water_status_time: sensor.dt507030_hot_water_status_time_until_ready
hot_water_cancel_switch: switch.dt507030_k_cup_hot_water
```

### 3. Tankless Water Heater Example (Customizable Flush Guide & Power Control)
```yaml
type: custom:passable-appliance-card
appliance_type: water_heater
title: Tankless Water Heater
entity: water_heater.navien_water_heater
power_entity: switch.water_heater_power
inlet_temp_sensor: sensor.navien_inlet_temperature
outlet_temp_sensor: sensor.navien_outlet_temperature
flow_rate_sensor: sensor.navien_water_flow_rate
gas_usage_sensor: sensor.navien_gas_consumption_rate
recirc_switch: switch.navien_recirculation
recirc_last_run: sensor.navien_recirc_last_run
recirc_duration: sensor.navien_recirc_duration

# Optional Flush Guide Customization
flush_procedure_title: "NPE-240A2 Flush Procedure"
flush_materials:
  - "4 Gallons White Vinegar (Food Grade)"
  - "Submersible Utility Pump"
  - "2 x Washing Machine Hoses"
  - "5 Gallon Bucket"
```

### 4. Induction Range & Oven Example
```yaml
type: custom:passable-appliance-card
appliance_type: induction_range
title: Induction Range
device_prefix: sqdr174020p
power_entity: switch.cooktop_power
upper_control: water_heater.sqdr174020p_oven
lower_control: water_heater.sqdr174020p_lower_oven
upper_light_entity: select.sqdr174020p_light
lower_light_entity: select.sqdr174020p_lower_oven_light
```

### 5. Laundry Center Example (LG ThinQ & Universal Stack with Power Toggles)
```yaml
type: custom:passable-appliance-card
appliance_type: laundry
title: Laundry Center
washer_power: switch.washer_power
washer_status: sensor.washer_current_status
washer_operation: select.washer_operation
washer_remaining_time: sensor.washer_remaining_time
dryer_power: switch.dryer_power
dryer_status: sensor.dryer_current_status
dryer_operation: select.dryer_operation
dryer_remaining_time: sensor.dryer_remaining_time
```

### 6. Smart Hose Timer Example
```yaml
type: custom:passable-appliance-card
appliance_type: smart_hose_timer
title: Smart Hose Timer
valve_entity: valve.pool_zone
battery_sensor: sensor.pool_battery_level
history_sensor: sensor.pool_zone_history
bhyve_mode: true
```

---

## 📄 License
MIT License. Created by GBear09.
