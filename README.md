# Passable Appliance Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/default)
[![version](https://img.shields.io/badge/version-v1.0.1-blue.svg)](https://github.com/GBear09/passable-appliance-card/releases)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A dynamic, universal Home Assistant Lovelace dashboard card for monitoring and controlling your household appliances.

The **Passable Appliance Card** automatically adapts its layout and features based on your configured appliance or explicit type selection.

---

## 🚀 Features

Supports 5 primary appliance types out of the box:

- 🧊 **Refrigerator & Freezer**: Dual-zone temperature control, door-open alert banners, ice maker toggles, water filter status gauges, and hot water dispenser heating status & cancellation.
- 🍳 **Induction Range & Oven**: Active 5-burner cooktop element status grid, power level %, dual-oven (Upper & Lower) control, setpoints, and heating state badges.
- 🧺 **Laundry Center (Washer & Dryer)**: Real-time cycle states, operation stage tracking, remaining time countdowns, active spin/wash animations, and status chips.
- 💧 **Water Heater (Navien & Generic)**: Circular temperature adjustment, hot water flow rate (GPM), gas usage rate (BTU/h), recirculation toggles, and operational status.
- 🚿 **Smart Hose Timer**: Duration selector chips (5m to 60m), start/stop watering controls (B-hyve & standard valves), battery %, signal strength, and watering history.

---

## 📦 Installation

### Option 1: HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Paste the repository URL: `https://github.com/GBear09/passable-appliance-card`
4. Select **Dashboard** as the Category and click **Add**.
5. Click **Explore & Download Repositories**, search for **Passable Appliance Card**, and click **Download**.
6. Reload your browser resources.

### Option 2: Manual Installation

1. Download `passable-appliance-card.js` from the [latest release](https://github.com/GBear09/passable-appliance-card/releases).
2. Copy `passable-appliance-card.js` to your Home Assistant `www` folder (`/config/www/passable-appliance-card.js`).
3. Add the resource reference in **Settings -> Dashboards -> Resources**:
   - **Url**: `/local/passable-appliance-card.js?v=1.0.1`
   - **Resource Type**: `JavaScript Module`

---

## 🛠 Configuration Examples

### 1. Refrigerator Example (Auto-discovery via Prefix)

```yaml
type: custom:passable-appliance-card
title: Kitchen Refrigerator
appliance_type: refrigerator
device_prefix: lg_fridge
```

### 2. Induction Range & Oven Example

```yaml
type: custom:passable-appliance-card
title: Induction Cooktop & Range
appliance_type: induction_range
device_prefix: ge_profile_range
```

### 3. Laundry Center Example

```yaml
type: custom:passable-appliance-card
title: Laundry Room
appliance_type: laundry
washer_status: sensor.washer_run_state
washer_operation: sensor.washer_wash_cycle
washer_remaining_time: sensor.washer_initial_time_remaining
dryer_status: sensor.dryer_run_state
dryer_operation: sensor.dryer_dry_cycle
dryer_remaining_time: sensor.dryer_initial_time_remaining
```

### 4. Water Heater Example

```yaml
type: custom:passable-appliance-card
title: Navien Tankless Water Heater
appliance_type: water_heater
entity: water_heater.navien_water_heater
```

### 5. Smart Hose Timer Example

```yaml
type: custom:passable-appliance-card
title: Garden Hose Timer
appliance_type: smart_hose_timer
valve_entity: valve.front_lawn_hose
battery_sensor: sensor.front_lawn_hose_battery
signal_sensor: sensor.front_lawn_hose_rssi
bhyve_mode: true
```

---

## ⚙️ Configuration Reference

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | Must be `custom:passable-appliance-card` |
| `title` | string | Optional | Card title heading |
| `appliance_type` | string | `auto` | Appliance layout mode: `auto`, `refrigerator`, `induction_range`, `laundry`, `water_heater`, `smart_hose_timer` |
| `device_prefix` | string | Optional | Shared prefix string for entity auto-discovery |
| `entity` | string | Optional | Primary entity ID (e.g. `water_heater.xxx`) |
| `valve_entity` | string | Optional | Valve entity ID for hose timer |
| `bhyve_mode` | boolean | `true` | Enable B-hyve specific watering service integration |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
