/**
 * Passable Appliance Card
 * Version: 2.2.1
 * GitHub: https://github.com/GBear09/passable-appliance-card
 * 
 * Dynamic Universal Appliance Card for Home Assistant.
 * Restores 100% exact graphical layouts, SVGs, animations, embedded controls,
 * ring sliders, telemetry bars, 24-hour recirc timeline, and custom popups for ALL 5 appliances:
 *  1. Refrigerator & Freezer (Scoped CSS French Door + Water Dispenser Centered Between Outer Door Edge & Handle Bar + Embedded Dial Popup + Presets)
 *  2. Induction Range & Oven (5-Burner Cooktop + Sync Lines + SVG Knobs Panel + Dual Oven Doors + Oven Popups with Light Toggle)
 *  3. Laundry Center (Vertical Stack + Knob/Screen Panel + Spinning SVG Drum + Select/Sensor Domain Editor)
 *  4. Navien Water Heater (SVG Chassis + Layer-Ordered Recirculation Loop Pipe + 40px Color Arrow Buttons + Centered SETPOINT + Pipe-Aligned Inlet/Outlet Badges + Theme Colored Interactive Timeline + Customizable Flush Guide)
 *  5. Smart Hose Timer (Nowrap Single-Line Header Title + Side-by-Side Battery Icon & % Chip + Exact Original Recirc-Button Text Style/Format Match + 24px Pill Rounded Next/Last Blocks + Ring Slider + Gear Drawer)
 *  (Note: HVAC systems have been extracted to dedicated standalone card passable-hvac-card)
 */

const CARD_VERSION = "2.2.1";

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;
const svg = LitElement.prototype.svg || ((strings, ...values) => {
  const result = html(strings, ...values);
  if (result && typeof result === "object") {
    return Object.assign({}, result, { _$litType$: 2, type: "svg" });
  }
  return result;
});

console.info(
  `%c PASSABLE-APPLIANCE-CARD %c v${CARD_VERSION} IS LOADED `,
  "color: white; background: #3b82f6; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: #3b82f6; background: #e0f2fe; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

class PassableApplianceCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _popup: { state: true },
      _popupOven: { state: true },
      _showFlushGuide: { state: true },
      _showRecircSettings: { state: true },
      _showHoseSettings: { state: true },
      _manualRuntime: { state: true },
      _recircInterval: { state: true },
      _selectedSegmentText: { state: true },
      _historyData: { state: true },
      _isDragging: { state: true },
    };
  }

  constructor() {
    super();
    this._popup = null;
    this._popupOven = null;
    this._showFlushGuide = false;
    this._showRecircSettings = false;
    this._showHoseSettings = false;
    this._manualRuntime = 15;
    this._recircInterval = 30;
    this._selectedSegmentText = "Tap timeline for details";
    this._historyData = [];
    this._isDragging = false;
    this._embeddedCard = null;
    this._cardId = `pac-${Math.random().toString(36).substr(2, 9)}`;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    const c = { ...config };
    c.appliance_type = c.appliance_type || "auto";

    // Auto-populate refrigerator entities if device_prefix is provided
    if (c.device_prefix && (!c.fridge_control && !c.oven && !c.entity && !c.washer)) {
      const p = c.device_prefix;
      c.fridge_control = c.fridge_control || `water_heater.${p}_fridge`;
      c.freezer_control = c.freezer_control || `water_heater.${p}_freezer`;
      c.dispenser_control = c.dispenser_control || `water_heater.${p}_dispenser`;
      c.fridge_temp_current = c.fridge_temp_current || `sensor.${p}_current_temperature_fridge`;
      c.freezer_temp_current = c.freezer_temp_current || `sensor.${p}_current_temperature_freezer`;
      c.door_status = c.door_status || `sensor.${p}_door_status`;
      c.door_left = c.door_left || `binary_sensor.${p}_door_status_fridge_left`;
      c.door_right = c.door_right || `binary_sensor.${p}_door_status_fridge_right`;
      c.door_freezer = c.door_freezer || `binary_sensor.${p}_door_status_freezer`;
      c.door_drawer = c.door_drawer || `binary_sensor.${p}_door_status_drawer`;
      c.door_any = c.door_any || `binary_sensor.${p}_door_status_any_open`;
      c.ice_maker_control = c.ice_maker_control || `switch.${p}_ice_maker_control`;
      c.water_filter_status = c.water_filter_status || `sensor.${p}_water_filter_status`;
      c.water_filter_percent = c.water_filter_percent || `sensor.${p}_water_filter_status_percent_remaining`;
      c.water_filter_days = c.water_filter_days || `sensor.${p}_water_filter_status_days_remaining`;
      c.turbo_cool_switch = c.turbo_cool_switch || `switch.${p}_turbo_cool_status`;
      c.turbo_freeze_switch = c.turbo_freeze_switch || `switch.${p}_turbo_freeze_status`;
      c.sabbath_mode_switch = c.sabbath_mode_switch || `switch.${p}_sabbath_mode`;
      c.hot_water_in_use = c.hot_water_in_use || `binary_sensor.${p}_hot_water_in_use`;
      c.hot_water_set_temp = c.hot_water_set_temp || `sensor.${p}_hot_water_set_temp`;
      c.hot_water_status_current_temp = c.hot_water_status_current_temp || `sensor.${p}_hot_water_status_current_temp`;
      c.hot_water_status = c.hot_water_status || `sensor.${p}_hot_water_status_status`;
      c.hot_water_status_time = c.hot_water_status_time || `sensor.${p}_hot_water_status_time_until_ready`;
      c.hot_water_cancel_switch = c.hot_water_cancel_switch || `switch.${p}_k_cup_hot_water`;
    }

    // Auto-populate induction range entities if device_prefix is provided
    if (c.device_prefix && !c.oven && (c.appliance_type === "induction_range" || c.appliance_type === "range")) {
      const p = c.device_prefix;
      c.oven = c.oven || {
        upper_control: `water_heater.${p}_oven`,
        lower_control: `water_heater.${p}_lower_oven`,
        upper_raw_temp: `sensor.${p}_raw_temperature`,
        lower_raw_temp: `sensor.${p}_lower_oven_raw_temperature`,
        upper_light_entity: `select.${p}_light`,
        lower_light_entity: `select.${p}_lower_oven_light`,
        upper_state_entity: `sensor.${p}_current_state`,
        lower_state_entity: `sensor.${p}_lower_oven_current_state`,
        upper_probe_present: `binary_sensor.${p}_upper_oven_probe_present`,
        lower_probe_present: `binary_sensor.${p}_lower_oven_probe_present`,
        upper_probe_temp: `sensor.${p}_probe_display_temp`,
        lower_probe_temp: `sensor.${p}_lower_oven_probe_display_temp`,
        upper_delay_time: `sensor.${p}_upper_oven_delay_time_remaining`,
        lower_delay_time: `sensor.${p}_lower_oven_delay_time_remaining`,
        upper_elapsed_time: `sensor.${p}_upper_oven_elapsed_cook_time`,
        lower_elapsed_time: `sensor.${p}_lower_oven_elapsed_cook_time`,
        control_lock: `switch.${p}_control_lock`,
        convection_conversion: `switch.${p}_convection_conversion`,
        hour_12_shutoff: `switch.${p}_hour_12_shutoff_enabled`,
      };
      c.cooktop = c.cooktop || {
        burners: [
          { status_entity: `binary_sensor.${p}_cooktop_status_left_front_on`, power_entity: `sensor.${p}_cooktop_status_left_front_power_pct` },
          { status_entity: `binary_sensor.${p}_cooktop_status_left_rear_on`, power_entity: `sensor.${p}_cooktop_status_left_rear_power_pct` },
          { status_entity: `binary_sensor.${p}_cooktop_status_center_rear_on`, power_entity: null },
          { status_entity: `binary_sensor.${p}_cooktop_status_right_rear_on`, power_entity: `sensor.${p}_cooktop_status_right_rear_power_pct` },
          { status_entity: `binary_sensor.${p}_cooktop_status_right_front_on`, power_entity: `sensor.${p}_cooktop_status_right_front_power_pct` },
        ],
        sync_entities: {
          left_front: `binary_sensor.${p}_cooktop_status_left_front_synchronized`,
          left_rear: `binary_sensor.${p}_cooktop_status_left_rear_synchronized`,
        },
      };
    }

    this.config = c;
  }

  static getConfigElement() {
    return document.createElement("passable-appliance-card-editor");
  }

  getCardSize() {
    return 8;
  }

  _fireHaptic(type = "light") {
    const event = new Event("haptic", { bubbles: true, composed: true });
    event.detail = type;
    this.dispatchEvent(event);
  }

  _hasEntity(entityId) {
    return !!(this.hass && entityId && this.hass.states && this.hass.states[entityId]);
  }

  _isEntityOn(entityId) {
    if (!this.hass || !entityId || !this.hass.states || !this.hass.states[entityId]) return false;
    const s = String(this.hass.states[entityId].state).trim().toLowerCase();
    return s === "on" || s === "true" || s === "open" || s === "unlocked";
  }

  _getWaterFilterInfo() {
    const c = this.config || {};
    const p = c.device_prefix;

    // Dedicated percent sensor check
    const percentEntityId = c.water_filter_percent || this._findEntityBySuffix("water_filter_status_percent_remaining", "sensor")?.entity_id || (p ? `sensor.${p}_water_filter_status_percent_remaining` : null);
    const percentObj = (percentEntityId && this.hass && this.hass.states && this.hass.states[percentEntityId]) ? this._getEntity(percentEntityId) : null;
    let percentVal = (percentObj && percentObj.state !== "unavailable" && percentObj.state !== "unknown") ? parseFloat(percentObj.state) : null;

    // Dedicated days sensor check
    const daysEntityId = c.water_filter_days || this._findEntityBySuffix("water_filter_status_days_remaining", "sensor")?.entity_id || (p ? `sensor.${p}_water_filter_status_days_remaining` : null);
    const daysObj = (daysEntityId && this.hass && this.hass.states && this.hass.states[daysEntityId]) ? this._getEntity(daysEntityId) : null;
    let daysVal = (daysObj && daysObj.state !== "unavailable" && daysObj.state !== "unknown") ? parseInt(daysObj.state, 10) : null;

    // Main water filter status sensor
    const filterEntityId = c.water_filter_status || this._findEntityBySuffix("water_filter_status", "sensor")?.entity_id || (p ? `sensor.${p}_water_filter_status` : null);
    const filterObj = (filterEntityId && this.hass && this.hass.states && this.hass.states[filterEntityId]) ? this._getEntity(filterEntityId) : null;

    let statusType = "Good";
    let statusDisplay = "Good";

    if (filterObj && filterObj.state && filterObj.state !== "unavailable" && filterObj.state !== "unknown") {
      const rawState = String(filterObj.state);

      if (rawState.includes("FridgeWaterFilterStatus") || rawState.includes("percent_remaining")) {
        const pctMatch = rawState.match(/percent_remaining\s*=\s*(\d+)/i);
        if (pctMatch && (percentVal === null || isNaN(percentVal))) {
          percentVal = parseFloat(pctMatch[1]);
        }
        const daysMatch = rawState.match(/days_remaining\s*=\s*(\d+)/i);
        if (daysMatch && (daysVal === null || isNaN(daysVal))) {
          daysVal = parseInt(daysMatch[1], 10);
        }
        const statusMatch = rawState.match(/status\s*=\s*(?:<ErdFilterStatus\.)?([A-Z0-9_]+)/i);
        const statusKey = statusMatch ? statusMatch[1].toUpperCase() : "";

        if (statusKey.includes("EXPIRED") || statusKey === "02" || rawState.includes("ErdFilterStatus.EXPIRED")) {
          statusType = "Expired";
          statusDisplay = "Expired";
        } else if (statusKey.includes("REPLACE") || statusKey.includes("WARN") || statusKey === "01" || rawState.includes("ErdFilterStatus.REPLACE")) {
          statusType = "Replace";
          statusDisplay = "Replace Soon";
        } else if (statusKey.includes("GOOD") || statusKey === "00" || rawState.includes("ErdFilterStatus.GOOD")) {
          statusType = "Good";
          statusDisplay = "Good";
        }
      } else {
        const lowerState = rawState.toLowerCase();
        if (lowerState.includes("expired") || lowerState === "error" || lowerState === "problem") {
          statusType = "Expired";
          statusDisplay = "Expired";
        } else if (lowerState.includes("replace") || lowerState.includes("order") || lowerState.includes("warn")) {
          statusType = "Replace";
          statusDisplay = "Replace Soon";
        } else if (lowerState.includes("good") || lowerState.includes("ok") || lowerState.includes("normal")) {
          statusType = "Good";
          statusDisplay = "Good";
        } else {
          const numState = parseFloat(rawState);
          if (!isNaN(numState) && percentVal === null) {
            percentVal = numState;
          }
        }
      }
    }

    if (percentVal !== null && !isNaN(percentVal)) {
      if (percentVal <= 0) {
        statusType = "Expired";
        statusDisplay = "Expired";
      } else if (percentVal <= 10 && statusType !== "Expired") {
        statusType = "Replace";
        statusDisplay = "Replace Soon";
      } else if (percentVal > 10 && (statusType === "Expired" || statusType === "Replace")) {
        statusType = "Good";
        statusDisplay = "Good";
      }
    }

    let icon = "mdi:water-check";
    let colorStyle = "color: var(--success-color, #4caf50);";
    if (statusType === "Expired") {
      icon = "mdi:water-alert";
      colorStyle = "color: var(--error-color, #ef5350);";
    } else if (statusType === "Replace") {
      icon = "mdi:water-sync";
      colorStyle = "color: var(--warning-color, #ffa726);";
    }

    let formattedLabel = statusDisplay;
    if (percentVal !== null && !isNaN(percentVal)) {
      formattedLabel = `${Math.round(percentVal)}%`;
      if (daysVal !== null && !isNaN(daysVal) && daysVal > 0) {
        formattedLabel += ` (${daysVal}d)`;
      }
    } else if (daysVal !== null && !isNaN(daysVal)) {
      formattedLabel = `${daysVal} days`;
    }

    return {
      statusType,
      percent: percentVal,
      days: daysVal,
      formattedLabel,
      icon,
      colorStyle
    };
  }

  _getDoorStatusInfo() {
    const c = this.config || {};
    const p = c.device_prefix;

    const doorStatus = this._getEntity(c.door_status || this._findEntityBySuffix("door_status", "sensor")?.entity_id);
    const doorLeft = this._getEntity(c.door_left || this._findEntityBySuffix("door_status_fridge_left", "binary_sensor")?.entity_id || (p ? `binary_sensor.${p}_door_status_fridge_left` : null));
    const doorRight = this._getEntity(c.door_right || this._findEntityBySuffix("door_status_fridge_right", "binary_sensor")?.entity_id || (p ? `binary_sensor.${p}_door_status_fridge_right` : null));
    const doorFreezer = this._getEntity(c.door_freezer || this._findEntityBySuffix("door_status_freezer", "binary_sensor")?.entity_id || (p ? `binary_sensor.${p}_door_status_freezer` : null));
    const doorDrawer = this._getEntity(c.door_drawer || this._findEntityBySuffix("door_status_drawer", "binary_sensor")?.entity_id || (p ? `binary_sensor.${p}_door_status_drawer` : null));
    const doorAny = this._getEntity(c.door_any || this._findEntityBySuffix("door_status_any_open", "binary_sensor")?.entity_id || (p ? `binary_sensor.${p}_door_status_any_open` : null));

    const isLeftOpen = doorLeft.state === "on" || doorLeft.state === "open";
    const isRightOpen = doorRight.state === "on" || doorRight.state === "open";
    const isFreezerOpen = doorFreezer.state === "on" || doorFreezer.state === "open";
    const isDrawerOpen = doorDrawer.state === "on" || doorDrawer.state === "open";
    const isAnyBinaryOpen = doorAny.state === "on" || doorAny.state === "open";

    const legacyState = (doorStatus && doorStatus.state) ? String(doorStatus.state).trim().toLowerCase() : "";
    const isLegacyOpen = legacyState === "fridge open" || legacyState === "freezer open" || legacyState === "all open" || legacyState === "open" || legacyState === "on";

    const isAnyOpen = isAnyBinaryOpen || isLeftOpen || isRightOpen || isFreezerOpen || isDrawerOpen || isLegacyOpen;

    let displayLabel = "Closed";
    if (isAnyOpen) {
      if (isLeftOpen && isRightOpen) displayLabel = "Both Doors Open";
      else if (isLeftOpen) displayLabel = "Left Door Open";
      else if (isRightOpen) displayLabel = "Right Door Open";
      else if (isFreezerOpen) displayLabel = "Freezer Open";
      else if (isDrawerOpen) displayLabel = "Drawer Open";
      else if (isLegacyOpen) displayLabel = "Door Open";
      else displayLabel = "Open";
    }

    return {
      isAnyOpen,
      isLeftOpen,
      isRightOpen,
      isFreezerOpen,
      isDrawerOpen,
      displayLabel
    };
  }

  _getEntity(entityId) {
    if (!entityId) return { state: "unavailable", attributes: {} };
    const state = this.hass && this.hass.states ? this.hass.states[entityId] : null;
    if (!state) {
      return { state: "unavailable", attributes: {} };
    }
    return state;
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    this._fireHaptic("light");
    const event = new Event("hass-more-info", {
      bubbles: true,
      composed: true,
    });
    event.detail = { entityId: entityId };
    this.dispatchEvent(event);
  }

  _toggleEntity(entity_id) {
    if (!entity_id) return;
    this._fireHaptic("light");
    this.hass.callService("homeassistant", "toggle", { entity_id });
  }

  _findEntityBySuffix(suffix, domain = null) {
    if (!this.hass || !this.hass.states) return null;
    const p = this.config ? this.config.device_prefix : "";
    const pClean = p ? p.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() : "";

    // 1. Direct match with exact prefix
    if (p) {
      const candidateDomains = domain ? [domain] : ["switch", "select", "sensor", "binary_sensor", "water_heater", "climate", "input_boolean"];
      for (const d of candidateDomains) {
        if (this.hass.states[`${d}.${p}_${suffix}`]) {
          return this.hass.states[`${d}.${p}_${suffix}`];
        }
      }
    }

    // 2. Search all states matching suffix and domain with prefix substring filter
    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      const [entDomain, entName] = entityId.split(".");
      if (domain && entDomain !== domain) continue;
      if (entName === suffix || entName.endsWith(`_${suffix}`)) {
        if (!pClean || entName.toLowerCase().includes(pClean)) {
          return stateObj;
        }
      }
    }

    // 3. Fallback search across all entities without prefix filter
    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      const [entDomain, entName] = entityId.split(".");
      if (domain && entDomain !== domain) continue;
      if (entName === suffix || entName.endsWith(`_${suffix}`)) {
        return stateObj;
      }
    }
    return null;
  }

  _resolveEntity(configuredId, suffix, domain = null) {
    if (configuredId && this.hass && this.hass.states && this.hass.states[configuredId]) {
      return configuredId;
    }
    const found = this._findEntityBySuffix(suffix, domain);
    if (found) return found.entity_id;
    return configuredId;
  }

  _getFridgeFreezerLimits(typeName) {
    const c = this.config || {};
    let minEntity = null;
    let maxEntity = null;
    let defaultMin = 34;
    let defaultMax = 42;

    if (typeName === "fridge") {
      minEntity = c.fridge_min_entity ? this._getEntity(c.fridge_min_entity) : this._findEntityBySuffix("setpoint_limits_fridge_min");
      maxEntity = c.fridge_max_entity ? this._getEntity(c.fridge_max_entity) : this._findEntityBySuffix("setpoint_limits_fridge_max");
      defaultMin = 34;
      defaultMax = 42;
    } else {
      minEntity = c.freezer_min_entity ? this._getEntity(c.freezer_min_entity) : this._findEntityBySuffix("setpoint_limits_freezer_min");
      maxEntity = c.freezer_max_entity ? this._getEntity(c.freezer_max_entity) : this._findEntityBySuffix("setpoint_limits_freezer_max");
      defaultMin = -6;
      defaultMax = 5;
    }

    const minVal = (minEntity && minEntity.state !== "unavailable" && minEntity.state !== "unknown")
      ? parseFloat(minEntity.state)
      : defaultMin;
    const maxVal = (maxEntity && maxEntity.state !== "unavailable" && maxEntity.state !== "unknown")
      ? parseFloat(maxEntity.state)
      : defaultMax;

    return { min: Math.round(minVal), max: Math.round(maxVal) };
  }

  _startHold(entityId, delta, min, max, step, e) {
    this._wasHolding = false;
    this._stopHold(entityId);

    const currentVal = (this._localTemps && this._localTemps[entityId] !== undefined)
      ? this._localTemps[entityId]
      : this._getTargetTemp(entityId, min);

    let nextVal = Math.max(min, Math.min(max, currentVal + delta));
    if (!this._localTemps) this._localTemps = {};
    this._localTemps[entityId] = nextVal;
    this._fireHaptic("light");
    this.requestUpdate();

    this._holdTimeout = setTimeout(() => {
      this._wasHolding = true;
      this._holdInterval = setInterval(() => {
        const cur = this._localTemps[entityId] !== undefined ? this._localTemps[entityId] : nextVal;
        const updated = Math.max(min, Math.min(max, cur + delta));
        if (updated !== cur) {
          this._localTemps[entityId] = updated;
          this._fireHaptic("selection");
          this.requestUpdate();
        }
      }, 75);
    }, 300);
  }

  _stopHold(entityId) {
    if (this._holdTimeout) {
      clearTimeout(this._holdTimeout);
      this._holdTimeout = null;
    }
    if (this._holdInterval) {
      clearInterval(this._holdInterval);
      this._holdInterval = null;
    }
    if (this._wasHolding && this._localTemps && this._localTemps[entityId] !== undefined) {
      const finalVal = this._localTemps[entityId];
      this._setTemperature(entityId, finalVal);
      setTimeout(() => {
        if (this._localTemps) delete this._localTemps[entityId];
      }, 1500);
    }
  }

  _adjustTemp(entityId, delta, min, max) {
    const cur = (this._localTemps && this._localTemps[entityId] !== undefined)
      ? this._localTemps[entityId]
      : this._getTargetTemp(entityId, min);
    const updated = Math.max(min, Math.min(max, cur + delta));
    if (!this._localTemps) this._localTemps = {};
    this._localTemps[entityId] = updated;
    this._setTemperature(entityId, updated);
    this.requestUpdate();
    setTimeout(() => {
      if (this._localTemps) delete this._localTemps[entityId];
    }, 1500);
  }

  _onSliderInput(entityId, val) {
    if (!this._localTemps) this._localTemps = {};
    this._localTemps[entityId] = parseFloat(val);
    this._fireHaptic("selection");
    this.requestUpdate();
  }

  _onSliderChange(entityId, val) {
    const num = parseFloat(val);
    if (!this._localTemps) this._localTemps = {};
    this._localTemps[entityId] = num;
    this._setTemperature(entityId, num);
    this.requestUpdate();
    setTimeout(() => {
      if (this._localTemps) delete this._localTemps[entityId];
    }, 1500);
  }

  _getTargetTemp(entityId, fallback = 150) {
    if (this._localTemps && this._localTemps[entityId] !== undefined) {
      return this._localTemps[entityId];
    }
    if (!entityId || !this.hass || !this.hass.states[entityId]) return fallback;
    const stateObj = this.hass.states[entityId];
    if (stateObj.attributes && stateObj.attributes.temperature !== undefined) {
      return parseFloat(stateObj.attributes.temperature);
    }
    const num = parseFloat(stateObj.state);
    return isNaN(num) ? fallback : num;
  }

  _setTemperature(entityId, temp) {
    if (!entityId || !this.hass) return;
    this._fireHaptic("medium");
    const domain = entityId.split(".")[0] || "water_heater";
    this.hass.callService(domain, "set_temperature", {
      entity_id: entityId,
      temperature: temp,
    });
  }

  _setOperationMode(entityId, mode) {
    if (!entityId || !this.hass) return;
    this._fireHaptic("medium");
    const domain = entityId.split(".")[0] || "water_heater";
    if (domain === "water_heater") {
      this.hass.callService("water_heater", "set_operation_mode", {
        entity_id: entityId,
        operation_mode: mode,
      });
    } else if (domain === "climate") {
      this.hass.callService("climate", "set_hvac_mode", {
        entity_id: entityId,
        hvac_mode: mode,
      });
    } else if (domain === "select") {
      this.hass.callService("select", "select_option", {
        entity_id: entityId,
        option: mode,
      });
    }
  }

  _selectOption(entityId, option) {
    if (!entityId || !this.hass) return;
    this._fireHaptic("light");
    this.hass.callService("select", "select_option", {
      entity_id: entityId,
      option: option,
    });
  }

  _getOvenModeIcon(mode) {
    const m = (mode || "").toLowerCase();
    if (m === "off") return "mdi:power";
    if (m.includes("air fry")) return "mdi:air-filter";
    if (m.includes("pizza")) return "mdi:pizza";
    if (m.includes("baked") || m.includes("bread") || m.includes("cake")) return "mdi:bread-slice";
    if (m.includes("snack")) return "mdi:cookie";
    if (m.includes("roast")) return "mdi:food-drumstick";
    if (m.includes("broil")) return "mdi:fire";
    if (m.includes("conv") || m.includes("convection")) return "mdi:fan";
    if (m.includes("warm")) return "mdi:radiator";
    if (m.includes("proof")) return "mdi:gauge";
    if (m.includes("clean")) return "mdi:sparkles";
    return "mdi:stove";
  }

  _renderNativeTemperatureController(opts = {}) {
    const {
      entityId,
      targetTemp = 150,
      currentTemp = null,
      isHeating = false,
      statusText = "Ready",
      timeRemaining = null,
      min = 90,
      max = 190,
      step = 5,
      unit = "°F",
      presets = [],
      modeConfig = null // { currentMode, options, onModeChange }
    } = opts;

    const numTarget = (targetTemp !== null && targetTemp !== undefined && !isNaN(parseFloat(targetTemp)))
      ? parseFloat(targetTemp)
      : min;

    const activeTarget = (this._localTemps && this._localTemps[entityId] !== undefined)
      ? this._localTemps[entityId]
      : numTarget;

    const numCurrent = (currentTemp !== null && currentTemp !== undefined && !isNaN(parseFloat(currentTemp)))
      ? parseFloat(currentTemp)
      : null;

    const currentDisplay = numCurrent !== null ? Math.round(numCurrent) : "--";
    const targetDisplay = Math.round(activeTarget);

    const isOff = modeConfig && (modeConfig.currentMode || "").toLowerCase() === "off";

    return html`
      <div class="native-temp-card ${isHeating ? "is-heating" : ""} ${isOff ? "is-mode-off" : ""}">
        <!-- Header Status Bar with Mode Dropdown or Badge -->
        <div class="temp-card-header">
          ${modeConfig ? html`
            <div class="temp-mode-dropdown-container">
              <span class="temp-mode-label">MODE:</span>
              <div class="temp-mode-dropdown-wrapper">
                <ha-icon icon="${this._getOvenModeIcon(modeConfig.currentMode)}"></ha-icon>
                <select
                  class="temp-mode-select ${isHeating ? "active-heat" : ""}"
                  @change=${(e) => modeConfig.onModeChange(e.target.value)}
                >
                  ${modeConfig.options.map((opt) => html`
                    <option value="${opt}" ?selected=${(modeConfig.currentMode || "").toLowerCase() === opt.toLowerCase()}>${opt}</option>
                  `)}
                </select>
              </div>
            </div>
          ` : html`
            <div class="heating-status-badge ${isHeating ? "active-heat" : "idle"}">
              <ha-icon icon="${isHeating ? "mdi:fire" : "mdi:water-boiler"}"></ha-icon>
              <span>${isHeating ? `HEATING: ${currentDisplay}° → ${targetDisplay}°` : statusText}</span>
            </div>
          `}

          ${isHeating && timeRemaining ? html`
            <div class="time-remaining-badge">
              <ha-icon icon="mdi:timer-sand"></ha-icon>
              <span>${timeRemaining} left</span>
            </div>
          ` : isHeating ? html`
            <div class="heating-status-badge active-heat" style="padding: 2px 8px; font-size: 0.72rem;">
              <span>${currentDisplay}° → ${targetDisplay}°</span>
            </div>
          ` : ""}
        </div>

        <!-- Central Stepper Dial Display -->
        <div class="temp-dial-row">
          <button
            class="temp-stepper-btn"
            @mousedown=${(e) => this._startHold(entityId, -step, min, max, step, e)}
            @touchstart=${(e) => this._startHold(entityId, -step, min, max, step, e)}
            @mouseup=${() => this._stopHold(entityId)}
            @mouseleave=${() => this._stopHold(entityId)}
            @touchend=${() => this._stopHold(entityId)}
            @touchcancel=${() => this._stopHold(entityId)}
            @click=${(e) => { e.preventDefault(); if (!this._wasHolding) this._adjustTemp(entityId, -step, min, max); }}
            aria-label="Decrease Temperature"
            title="Hold to decrease rapidly"
          >
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>

          <div class="temp-dial-center">
            ${numCurrent !== null ? html`
              <div class="temp-sub-row">
                <span class="temp-sub-label">CURRENT</span>
                <span class="temp-sub-val">${currentDisplay}°</span>
              </div>
            ` : ""}
            <div class="temp-main-display">
              <span class="temp-main-number">${isOff && targetDisplay < min ? "Off" : targetDisplay}</span>
              ${!(isOff && targetDisplay < min) ? html`<span class="temp-main-unit">${unit}</span>` : ""}
            </div>
            <div class="temp-main-caption">SETPOINT</div>
          </div>

          <button
            class="temp-stepper-btn"
            @mousedown=${(e) => this._startHold(entityId, step, min, max, step, e)}
            @touchstart=${(e) => this._startHold(entityId, step, min, max, step, e)}
            @mouseup=${() => this._stopHold(entityId)}
            @mouseleave=${() => this._stopHold(entityId)}
            @touchend=${() => this._stopHold(entityId)}
            @touchcancel=${() => this._stopHold(entityId)}
            @click=${(e) => { e.preventDefault(); if (!this._wasHolding) this._adjustTemp(entityId, step, min, max); }}
            aria-label="Increase Temperature"
            title="Hold to increase rapidly"
          >
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>

        <!-- Interactive Range Slider & Bounds -->
        <div class="temp-slider-container">
          <input
            type="range"
            class="temp-slider-input ${isHeating ? "is-heating" : ""}"
            min="${min}"
            max="${max}"
            step="${step}"
            .value="${Math.max(min, Math.min(max, targetDisplay))}"
            @input=${(e) => this._onSliderInput(entityId, e.target.value)}
            @change=${(e) => this._onSliderChange(entityId, e.target.value)}
          />
          <div class="temp-range-bounds">
            <span>${min}°</span>
            <span>${Math.round((min + max) / 2)}°</span>
            <span>${max}°</span>
          </div>
        </div>

        <!-- Presets -->
        ${presets && presets.length > 0 ? html`
          <div class="preset-buttons" style="margin-top: 10px;">
            ${presets.map((p) => html`
              <button
                class="preset-button ${targetDisplay === p.temp ? "active-preset" : ""}"
                @click=${() => this._setTemperature(entityId, p.temp)}
              >
                <ha-icon icon="${p.icon}"></ha-icon>
                <span>${p.label} (${p.temp}°)</span>
              </button>
            `)}
          </div>
        ` : ""}
      </div>
    `;
  }

  _toggleRecircSettings(recircEntityId) {
    this._fireHaptic("light");
    this._showRecircSettings = !this._showRecircSettings;
    if (this._showRecircSettings && recircEntityId) {
      this._fetchHistory(recircEntityId);
    }
  }

  async _fetchHistory(entityId) {
    if (!this.hass || !entityId) return;
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = now.toISOString();
    try {
      const history = await this.hass.callApi(
        "GET",
        `history/period/${startTime}?filter_entity_id=${entityId}&end_time=${endTime}`
      );
      if (history && history.length > 0) {
        this._historyData = history[0];
      } else {
        this._historyData = [];
      }
    } catch (e) {
      console.error("Failed to fetch history for timeline", e);
      this._historyData = [];
    }
  }

  _formatShortTime(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    return dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  _selectTimelineSegment(text) {
    this._fireHaptic("light");
    this._selectedSegmentText = text;
  }

  _getPowerEntity(applianceType, subType = null) {
    const c = this.config || {};
    const states = this.hass && this.hass.states ? this.hass.states : {};

    if (applianceType === "water_heater") {
      if (c.power_entity && states[c.power_entity]) return c.power_entity;
      if (c.power_entity) return c.power_entity;
      if (c.device_prefix && states[`switch.${c.device_prefix}_power`]) return `switch.${c.device_prefix}_power`;
      if (states["switch.water_heater_power"]) return "switch.water_heater_power";
      if (states["switch.navien_power"]) return "switch.navien_power";
      return null;
    }

    if (applianceType === "laundry") {
      if (subType === "washer") {
        if (c.washer_power && states[c.washer_power]) return c.washer_power;
        if (c.washer_power) return c.washer_power;
        if (c.washer && c.washer.power_entity) return c.washer.power_entity;
        if (c.device_prefix && states[`switch.${c.device_prefix}_washer_power`]) return `switch.${c.device_prefix}_washer_power`;
        if (states["switch.washer_power"]) return "switch.washer_power";
        return null;
      }
      if (subType === "dryer") {
        if (c.dryer_power && states[c.dryer_power]) return c.dryer_power;
        if (c.dryer_power) return c.dryer_power;
        if (c.dryer && c.dryer.power_entity) return c.dryer.power_entity;
        if (c.device_prefix && states[`switch.${c.device_prefix}_dryer_power`]) return `switch.${c.device_prefix}_dryer_power`;
        if (states["switch.dryer_power"]) return "switch.dryer_power";
        return null;
      }
      if (c.power_entity && states[c.power_entity]) return c.power_entity;
      if (c.power_entity) return c.power_entity;
      if (c.device_prefix && states[`switch.${c.device_prefix}_power`]) return `switch.${c.device_prefix}_power`;
      return null;
    }

    if (c.power_entity && states[c.power_entity]) return c.power_entity;
    if (c.power_entity) return c.power_entity;
    if (c.device_prefix && states[`switch.${c.device_prefix}_power`]) return `switch.${c.device_prefix}_power`;
    return null;
  }

  _renderPowerButton(entityId, extraClass = "") {
    if (!entityId || !this.hass || !this.hass.states) return html``;
    const stateObj = this._getEntity(entityId);
    if (!stateObj || stateObj.state === "unavailable") return html``;
    const isOn = stateObj.state === "on" || stateObj.state === "true";

    return html`
      <div
        class="power-btn-header ${isOn ? "on" : "off"} ${extraClass}"
        @click=${(e) => {
          e.stopPropagation();
          this._toggleEntity(entityId);
        }}
        title="Power: ${isOn ? "ON" : "OFF"} (Click to toggle)"
      >
        <ha-icon icon="mdi:power"></ha-icon>
      </div>
    `;
  }

  _detectApplianceType() {
    const type = this.config.appliance_type;
    if (type && type !== "auto") {
      return type;
    }

    if (this.config.valve_entity || this.config.bhyve_mode !== undefined) {
      return "smart_hose_timer";
    }
    if (this.config.washer || this.config.dryer || this.config.washer_status || this.config.dryer_status) {
      return "laundry";
    }
    if (this.config.cooktop || this.config.oven || this.config.upper_control) {
      return "induction_range";
    }
    if (this.config.fridge_control || this.config.freezer_control) {
      return "refrigerator";
    }
    if (this.config.entity && this.config.entity.startsWith("water_heater.")) {
      return "water_heater";
    }

    return "refrigerator";
  }

  async _showFridgePopup() {
    this._popup = "refrigerator";
    this._activeFridgeTab = "fridge";
    this._embeddedCard = null;
    await this.updateComplete;
  }

  async _showFreezerPopup() {
    this._popup = "refrigerator";
    this._activeFridgeTab = "freezer";
    this._embeddedCard = null;
    await this.updateComplete;
  }

  async _showDispenserPopup() {
    this._popup = "refrigerator";
    this._activeFridgeTab = "dispenser";
    this._embeddedCard = null;
    await this.updateComplete;
  }

  async _showOvenPopup(ovenType) {
    this._popup = "oven";
    this._popupOven = ovenType || "upper";
    this._activeOvenTab = ovenType || "upper";
    this._embeddedCard = null;
    await this.updateComplete;
  }

  _closePopup() {
    if (!this.shadowRoot) {
      this._popup = null;
      this._popupOven = null;
        return;
    }
    const overlay = this.shadowRoot.querySelector(".popup-overlay");
    const content = this.shadowRoot.querySelector(".popup-content");

    if (overlay) overlay.classList.remove("visible");
    if (content) {
      content.style.transform = "";
      content.classList.remove("visible");
    }

    setTimeout(() => {
      this._popup = null;
      this._popupOven = null;
        this._embeddedCard = null;
    }, 300);
  }

  _handleTouchStart(e) {
    const popupContent = e.currentTarget;
    if (popupContent.scrollTop > 0) return;
    this._startY = e.touches[0].clientY;
    this._currentY = this._startY;
    this._touchTarget = popupContent;
    popupContent.style.animation = "none";
    popupContent.style.transition = "none";
  }

  _handleTouchMove(e) {
    if (this._startY === undefined || !this._touchTarget) return;
    const popupContent = this._touchTarget;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this._startY;

    if (deltaY > 0 && popupContent.scrollTop <= 0) {
      if (e.cancelable) e.preventDefault();
      this._currentY = currentY;
      popupContent.style.transform = `translateY(${deltaY}px)`;
    } else if (this._currentY !== undefined && currentY <= this._startY) {
      this._currentY = currentY;
      popupContent.style.transform = `translateY(0px)`;
    }
  }

  _handleTouchEnd(e) {
    if (this._startY === undefined || !this._touchTarget) return;
    const popupContent = this._touchTarget;
    const deltaY = (this._currentY !== undefined) ? (this._currentY - this._startY) : 0;

    if (deltaY > 80) {
      popupContent.style.transition = "transform 180ms ease-in, opacity 180ms ease-in";
      popupContent.style.transform = "translateY(100%)";
      popupContent.style.opacity = "0";
      setTimeout(() => {
        this._closePopup();
      }, 180);
    } else {
      popupContent.style.transition = "transform 250ms cubic-bezier(0.2, 0, 0, 1)";
      popupContent.style.transform = "translateY(0px)";
    }
    this._startY = undefined;
    this._currentY = undefined;
    this._touchTarget = null;
  }

  _getPresetIcon(presetName) {
    const p = (presetName || "").toLowerCase();
    if (p.includes("day") || p.includes("home")) return "mdi:weather-sunny";
    if (p.includes("sleep") || p.includes("night")) return "mdi:weather-night";
    if (p.includes("away") || p.includes("vacation")) return "mdi:home-export-outline";
    if (p.includes("eco")) return "mdi:leaf";
    return "mdi:clock-outline";
  }

  _getPresetColor(presetName) {
    const p = (presetName || "").toLowerCase();
    if (p.includes("day") || p.includes("home")) return "#facc15";
    if (p.includes("sleep") || p.includes("night")) return "#a855f7";
    if (p.includes("away") || p.includes("vacation")) return "#3b82f6";
    if (p.includes("eco")) return "#22c55e";
    return "var(--primary-color)";
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const detectedType = this._detectApplianceType();

    switch (detectedType) {
      case "refrigerator":
        return this._renderRefrigerator();
      case "induction_range":
      case "range":
        return this._renderInductionRange();
      case "laundry":
        return this._renderLaundry();
      case "water_heater":
        return this._renderWaterHeater();
      case "smart_hose_timer":
      case "hose_timer":
        return this._renderSmartHoseTimer();
      default:
        return this._renderRefrigerator();
    }
  }

  // ==========================================
  // 1. REFRIGERATOR & FREEZER
  // ==========================================
  _renderRefrigerator() {
    const c = this.config || {};
    const p = c.device_prefix;
    const powerEntity = this._getPowerEntity("refrigerator");
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;

    const fridgeControl = this._getEntity(c.fridge_control);
    const freezerControl = this._getEntity(c.freezer_control);
    const fridgeTemp = this._getEntity(c.fridge_temp_current);
    const freezerTemp = this._getEntity(c.freezer_temp_current);
    const hotWaterStatus = this._getEntity(c.hot_water_status);

    const doorInfo = this._getDoorStatusInfo();
    const filterInfo = this._getWaterFilterInfo();

    const fridgeSetTemp = fridgeControl.attributes.temperature ?? "37";
    const freezerSetTemp = freezerControl.attributes.temperature ?? "0";

    const isOpen = doorInfo.isOpen;
    const isHeating = hotWaterStatus.state === "Heating";
    const isWorking = isOpen || isHeating;

    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false") && !isWorking;

    let chipLabel = "NORMAL";
    let chipClass = "idle";
    if (isPowerOff) {
      chipLabel = "POWER OFF";
      chipClass = "power-off";
    } else if (isOpen) {
      chipLabel = doorInfo.doorText.toUpperCase();
      chipClass = "active-alert";
    } else if (filterInfo.chipBadge) {
      chipLabel = filterInfo.chipBadge.label;
      chipClass = filterInfo.chipBadge.class;
    } else if (isHeating) {
      chipLabel = "HEATING";
      chipClass = "active-heat";
    }

    return html`
      <ha-card>
        ${c.show_header !== false
          ? html`
              <div class="header">
                <h1 class="title">
                  <ha-icon icon="mdi:fridge-outline" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
                  ${c.title || "Kitchen Refrigerator"}
                </h1>
                <div class="header-subtitle-row">
                  <p class="subtitle">Food Storage & Dispenser</p>
                  <div class="header-right">
                    ${this._renderPowerButton(powerEntity)}
                    <div class="status-chip ${chipClass}">${chipLabel}</div>
                  </div>
                </div>
              </div>
            `
          : ""}

        <div class="card-content ${isPowerOff ? "power-off-card" : ""}">
          <div class="fridge-body">
            <!-- Left Door with Dispenser Cutout -->
            <div class="fridge-door fridge-left-door ${doorInfo.isLeftOpen ? "door-open" : ""}">
              <div class="fridge-handle left-handle"></div>
              <div class="left-door-content">
                <div class="dispenser-group">
                  <div class="dispenser ${isHeating ? "heating" : ""}" @click=${() => this._showDispenserPopup()}>
                    <div class="dispenser-screen"></div>
                    <div class="dispenser-lever"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Door with Temp Badge -->
            <div class="fridge-door fridge-right-door ${doorInfo.isRightOpen ? "door-open" : ""}">
              <div class="fridge-handle right-handle"></div>
              <div class="right-door-content">
                <div class="temp-display fridge-temp" @click=${() => this._showFridgePopup()}>
                  <span class="temp-value">${fridgeTemp.state !== "unavailable" ? fridgeTemp.state : "35"}°</span>
                  <span class="temp-setpoint">Set: ${fridgeSetTemp}°</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Freezer Drawer -->
          <div class="fridge-freezer-drawer ${doorInfo.isFreezerOpen ? "door-open" : ""}" @click=${() => this._showFreezerPopup()}>
            <div class="freezer-handle"></div>
            <div class="temp-display freezer-temp">
              <span class="temp-value">${freezerTemp.state !== "unavailable" ? freezerTemp.state : "0"}°</span>
              <span class="temp-setpoint">Set: ${freezerSetTemp}°</span>
            </div>
          </div>
        </div>

        ${this._renderRefrigeratorPopup()}
      </ha-card>
    `;
  }

  _renderRefrigeratorPopup() {
    if (this._popup !== "refrigerator" && this._popup !== "fridge" && this._popup !== "freezer" && this._popup !== "dispenser") return html``;
    const c = this.config || {};
    const p = c.device_prefix;
    const doorInfo = this._getDoorStatusInfo();

    const activeTab = this._activeFridgeTab || (this._popup === "fridge" ? "fridge" : this._popup === "freezer" ? "freezer" : "dispenser");

    return html`
      <div class="popup-overlay" @click=${() => this._closePopup()}>
        <div
          class="popup-content"
          @click=${(e) => e.stopPropagation()}
          @touchstart=${this._handleTouchStart}
          @touchmove=${this._handleTouchMove}
          @touchend=${this._handleTouchEnd}
        >
          <div class="drag-handle"></div>
          <div class="popup-header">
            <button class="close-button" @click=${() => this._closePopup()} aria-label="Close">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <h3>Refrigerator Controls</h3>
          </div>

          <!-- Segmented Tab Navigation Bar -->
          <div class="popup-tabs">
            <button
              class="popup-tab ${activeTab === "dispenser" ? "active-tab" : ""}"
              @click=${() => { this._activeFridgeTab = "dispenser"; this.requestUpdate(); }}
            >
              <ha-icon icon="mdi:water-outline"></ha-icon>
              <span>Dispenser</span>
            </button>
            <button
              class="popup-tab ${activeTab === "fridge" ? "active-tab" : ""}"
              @click=${() => { this._activeFridgeTab = "fridge"; this.requestUpdate(); }}
            >
              <ha-icon icon="mdi:fridge-outline"></ha-icon>
              <span>Fridge</span>
            </button>
            <button
              class="popup-tab ${activeTab === "freezer" ? "active-tab" : ""}"
              @click=${() => { this._activeFridgeTab = "freezer"; this.requestUpdate(); }}
            >
              <ha-icon icon="mdi:snowflake"></ha-icon>
              <span>Freezer</span>
            </button>
          </div>

          <div class="popup-controls">
            <!-- 1. DISPENSER TAB -->
            ${activeTab === "dispenser" ? html`
              ${(() => {
                const dispenserControl = this._resolveEntity(c.dispenser_control, "dispenser", "water_heater");
                const dispenserObj = dispenserControl ? this._getEntity(dispenserControl) : null;
                const iceMakerId = this._resolveEntity(c.ice_maker_control, "ice_maker_control", "switch");
                const iceBoostId = this._resolveEntity(c.ice_boost_switch, "fridge_ice_boost", "switch") || this._resolveEntity(null, "ice_boost", "switch");
                const hotWaterStatus = this._getEntity(this._resolveEntity(c.hot_water_status, "hot_water_status_status", "sensor") || this._resolveEntity(null, "hot_water_status", "sensor"));
                const hotWaterTime = this._getEntity(this._resolveEntity(c.hot_water_status_time, "hot_water_status_time_until_ready", "sensor") || this._resolveEntity(null, "hot_water_status_time", "sensor"));
                const hotWaterCurrent = this._getEntity(this._resolveEntity(c.hot_water_status_current_temp, "hot_water_status_current_temp", "sensor"));
                const hotWaterSet = this._getEntity(this._resolveEntity(c.hot_water_set_temp, "hot_water_set_temp", "sensor"));
                const filterInfo = this._getWaterFilterInfo();

                const isHeating = hotWaterStatus.state === "Heating";
                const statusText = hotWaterStatus.state !== "unavailable" ? hotWaterStatus.state : "Not Heating";
                const timeRemaining = (isHeating && hotWaterTime.state !== "Off" && hotWaterTime.state !== "unavailable") ? hotWaterTime.state : null;

                const currentTemp = (hotWaterCurrent.state !== "unavailable" && hotWaterCurrent.state !== "unknown" && !isNaN(parseFloat(hotWaterCurrent.state)))
                  ? parseFloat(hotWaterCurrent.state)
                  : (dispenserObj?.attributes?.current_temperature ?? null);

                const rawTarget = dispenserObj?.attributes?.temperature ?? (hotWaterSet.state !== "unavailable" ? parseFloat(hotWaterSet.state) : 150);
                const targetTemp = !isNaN(parseFloat(rawTarget)) ? parseFloat(rawTarget) : 150;

                const presets = [
                  { label: "Cocoa", icon: "mdi:coffee-outline", temp: 150 },
                  { label: "Tea", icon: "mdi:tea", temp: 170 },
                  { label: "Soup", icon: "mdi:bowl-mix-outline", temp: 185 },
                ];

                return html`
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <h4 style="margin: 0; font-size: 0.95rem;">Hot Water Heating</h4>
                    ${isHeating && c.hot_water_cancel_switch ? html`
                      <button
                        class="floating-cancel-button"
                        @click=${() => this._toggleEntity(c.hot_water_cancel_switch)}
                        style="position: static; margin: 0; padding: 4px 10px; font-size: 0.8rem;"
                      >
                        Cancel Heating
                      </button>
                    ` : ""}
                  </div>

                  ${this._renderNativeTemperatureController({
                    entityId: dispenserControl,
                    targetTemp,
                    currentTemp,
                    isHeating,
                    statusText,
                    timeRemaining,
                    min: 90,
                    max: 190,
                    step: 5,
                    unit: "°F",
                    presets
                  })}

                  <div class="divider" style="margin: 16px 0 12px 0;"></div>

                  <!-- Water Filter Card -->
                  <div class="control-row filter-control-row" style="flex-direction: column; align-items: stretch; gap: 8px; margin-bottom: 12px; padding: 10px 12px; background: rgba(128,128,128,0.06); border-radius: 12px; border: 1px solid var(--divider-color, rgba(255,255,255,0.06)); box-sizing: border-box; width: 100%;">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                      <div class="control-label-group">
                        <ha-icon icon="${filterInfo.icon}" style="${filterInfo.colorStyle}"></ha-icon>
                        <span class="control-label" style="font-weight: 500;">Water Filter</span>
                      </div>
                      <span class="control-value" style="${filterInfo.colorStyle}; font-weight: 600;">${filterInfo.formattedLabel}</span>
                    </div>
                    ${filterInfo.percent !== null && !isNaN(filterInfo.percent) ? html`
                      <div style="width: 100%; height: 6px; background: rgba(128,128,128,0.2); border-radius: 3px; overflow: hidden; margin-top: 2px;">
                        <div style="width: ${Math.max(0, Math.min(100, filterInfo.percent))}%; height: 100%; background: ${filterInfo.statusType === 'Expired' ? 'var(--error-color, #ef5350)' : filterInfo.statusType === 'Replace' ? 'var(--warning-color, #ffa726)' : 'var(--success-color, #4caf50)'}; border-radius: 3px; transition: width 0.4s ease;"></div>
                      </div>
                    ` : ""}
                  </div>

                  <!-- Dispenser & Ice Controls Only -->
                  <h4 style="margin: 0 0 10px 0; font-size: 0.95rem;">Ice Controls</h4>
                  <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    ${iceMakerId && this._hasEntity(iceMakerId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:cube-outline"></ha-icon>
                          <span class="control-label">Ice Maker</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(iceMakerId)}
                          @change=${() => this._toggleEntity(iceMakerId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}

                    ${iceBoostId && this._hasEntity(iceBoostId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:cube-send"></ha-icon>
                          <span class="control-label">Ice Boost</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(iceBoostId)}
                          @change=${() => this._toggleEntity(iceBoostId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}
                  </div>
                `;
              })()}
            ` : ""}

            <!-- 2. REFRIGERATOR TAB -->
            ${activeTab === "fridge" ? html`
              ${(() => {
                const fridgeControl = this._resolveEntity(c.fridge_control, "fridge", "water_heater");
                const fridgeObj = fridgeControl ? this._getEntity(fridgeControl) : null;
                const fridgeTemp = this._getEntity(this._resolveEntity(c.fridge_temp_current, "current_temperature_fridge", "sensor"));
                const turboCoolId = this._resolveEntity(c.turbo_cool_switch, "turbo_cool_status", "switch");
                const sabbathId = this._resolveEntity(c.sabbath_mode_switch, "sabbath_mode", "switch");

                const limits = this._getFridgeFreezerLimits("fridge");
                const currentTemp = (fridgeTemp.state !== "unavailable" && fridgeTemp.state !== "unknown" && !isNaN(parseFloat(fridgeTemp.state)))
                  ? parseFloat(fridgeTemp.state)
                  : null;
                const rawTarget = fridgeObj?.attributes?.temperature ?? (currentTemp !== null ? currentTemp : 37);
                const targetTemp = !isNaN(parseFloat(rawTarget)) ? parseFloat(rawTarget) : 37;

                const isDoorOpen = doorInfo.isLeftOpen || doorInfo.isRightOpen;
                const statusText = isDoorOpen ? "Door Open" : "Cooling";

                const presets = [
                  { label: "Coldest", icon: "mdi:snowflake", temp: limits.min },
                  { label: "Recommended", icon: "mdi:check-circle-outline", temp: 37 },
                  { label: "Eco", icon: "mdi:leaf", temp: limits.max },
                ];

                return html`
                  ${this._renderNativeTemperatureController({
                    entityId: fridgeControl,
                    targetTemp,
                    currentTemp,
                    isHeating: false,
                    statusText,
                    min: limits.min,
                    max: limits.max,
                    step: 1,
                    unit: "°F",
                    presets
                  })}

                  <div class="divider" style="margin: 16px 0 12px 0;"></div>

                  <h4 style="margin: 0 0 10px 0; font-size: 0.95rem;">Refrigerator Features</h4>
                  <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    ${turboCoolId && this._hasEntity(turboCoolId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:snowflake"></ha-icon>
                          <span class="control-label">Turbo Cool</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(turboCoolId)}
                          @change=${() => this._toggleEntity(turboCoolId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}

                    ${sabbathId && this._hasEntity(sabbathId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:candle"></ha-icon>
                          <span class="control-label">Sabbath Mode</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(sabbathId)}
                          @change=${() => this._toggleEntity(sabbathId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}
                  </div>
                `;
              })()}
            ` : ""}

            <!-- 3. FREEZER TAB -->
            ${activeTab === "freezer" ? html`
              ${(() => {
                const freezerControl = this._resolveEntity(c.freezer_control, "freezer", "water_heater");
                const freezerObj = freezerControl ? this._getEntity(freezerControl) : null;
                const freezerTemp = this._getEntity(this._resolveEntity(c.freezer_temp_current, "current_temperature_freezer", "sensor"));
                const turboFreezeId = this._resolveEntity(c.turbo_freeze_switch, "turbo_freeze_status", "switch");
                const iceMakerId = this._resolveEntity(c.ice_maker_control, "ice_maker_control", "switch");
                const iceBoostId = this._resolveEntity(c.ice_boost_switch, "fridge_ice_boost", "switch") || this._resolveEntity(null, "ice_boost", "switch");

                const limits = this._getFridgeFreezerLimits("freezer");
                const currentTemp = (freezerTemp.state !== "unavailable" && freezerTemp.state !== "unknown" && !isNaN(parseFloat(freezerTemp.state)))
                  ? parseFloat(freezerTemp.state)
                  : null;
                const rawTarget = freezerObj?.attributes?.temperature ?? (currentTemp !== null ? currentTemp : 0);
                const targetTemp = !isNaN(parseFloat(rawTarget)) ? parseFloat(rawTarget) : 0;

                const isDoorOpen = doorInfo.isFreezerOpen;
                const statusText = isDoorOpen ? "Drawer Open" : "Freezing";

                const presets = [
                  { label: "Deep Freeze", icon: "mdi:snowflake-alert", temp: limits.min },
                  { label: "Standard", icon: "mdi:check-circle-outline", temp: 0 },
                  { label: "Soft Freeze", icon: "mdi:ice-cream", temp: limits.max },
                ];

                return html`
                  ${this._renderNativeTemperatureController({
                    entityId: freezerControl,
                    targetTemp,
                    currentTemp,
                    isHeating: false,
                    statusText,
                    min: limits.min,
                    max: limits.max,
                    step: 1,
                    unit: "°F",
                    presets
                  })}

                  <div class="divider" style="margin: 16px 0 12px 0;"></div>

                  <h4 style="margin: 0 0 10px 0; font-size: 0.95rem;">Freezer Features</h4>
                  <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    ${turboFreezeId && this._hasEntity(turboFreezeId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:snowflake-alert"></ha-icon>
                          <span class="control-label">Turbo Freeze</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(turboFreezeId)}
                          @change=${() => this._toggleEntity(turboFreezeId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}

                    ${iceMakerId && this._hasEntity(iceMakerId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:cube-outline"></ha-icon>
                          <span class="control-label">Ice Maker</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(iceMakerId)}
                          @change=${() => this._toggleEntity(iceMakerId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}

                    ${iceBoostId && this._hasEntity(iceBoostId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:cube-send"></ha-icon>
                          <span class="control-label">Ice Boost</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(iceBoostId)}
                          @change=${() => this._toggleEntity(iceBoostId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}
                  </div>
                `;
              })()}
            ` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // 2. INDUCTION RANGE & OVEN
  // ==========================================
  _renderInductionRange() {
    const c = this.config || {};
    const p = c.device_prefix;
    const powerEntity = this._getPowerEntity("induction_range");
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;

    const ovenConfig = c.oven || {
      upper_control: c.upper_control,
      lower_control: c.lower_control,
      upper_raw_temp: c.upper_raw_temp,
      lower_raw_temp: c.lower_raw_temp,
      upper_state_entity: c.upper_state_entity,
      lower_state_entity: c.lower_state_entity,
      upper_light_entity: c.upper_light_entity,
      lower_light_entity: c.lower_light_entity,
    };

    const cooktopConfig = c.cooktop || {
      burners: [
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_left_front_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_left_front_power_pct` },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_left_rear_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_left_rear_power_pct` },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_center_rear_on`, power_entity: null },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_right_rear_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_right_rear_power_pct` },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_right_front_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_right_front_power_pct` },
      ],
      sync_entities: {
        left_front: `binary_sensor.${c.device_prefix}_cooktop_status_left_front_synchronized`,
        left_rear: `binary_sensor.${c.device_prefix}_cooktop_status_left_rear_synchronized`,
      },
    };

    const burners = (cooktopConfig.burners || []).map((b) => ({
      status: this._getEntity(b.status_entity),
      power: b.power_entity ? this._getEntity(b.power_entity) : null,
    }));

    const isAnyBurnerOn = burners.some((b) => b.status.state === "on" || b.status.state === "true");
    const upperOvenState = this._getEntity(ovenConfig.upper_state_entity);
    const lowerOvenState = this._getEntity(ovenConfig.lower_state_entity);
    const upperRawTemp = this._getEntity(ovenConfig.upper_raw_temp);
    const lowerRawTemp = this._getEntity(ovenConfig.lower_raw_temp);

    const isOffState = (s) => {
      if (!s) return true;
      const str = String(s).trim().toLowerCase();
      return str === "off" || str === "unavailable" || str === "unknown" || str === "idle";
    };

    const isUpperOn = !isOffState(upperOvenState.state);
    const isLowerOn = !isOffState(lowerOvenState.state);

    const isRangeActive = isAnyBurnerOn || isUpperOn || isLowerOn;
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false") && !isRangeActive;

    const syncFront = this._getEntity(cooktopConfig.sync_entities?.left_front);
    const isSynced = syncFront.state === "on" || syncFront.state === "true";

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isPowerOff) {
      chipLabel = "POWER OFF";
      chipClass = "power-off";
    } else if (isAnyBurnerOn && (isUpperOn || isLowerOn)) {
      chipLabel = "RANGE ACTIVE";
      chipClass = "active-range";
    } else if (isAnyBurnerOn) {
      chipLabel = "COOKTOP ON";
      chipClass = "active-cooktop";
    } else if (isUpperOn || isLowerOn) {
      chipLabel = "OVEN ON";
      chipClass = "active-oven";
    }

    return html`
      <ha-card>
        ${c.show_header !== false
          ? html`
              <div class="header">
                <h1 class="title">
                  <ha-icon icon="mdi:stove" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
                  ${c.title || "Induction Range"}
                </h1>
                <div class="header-subtitle-row">
                  <p class="subtitle">Cooking Zones & Ovens</p>
                  <div class="header-right">
                    ${this._renderPowerButton(powerEntity)}
                    <div class="status-chip ${chipClass}">${chipLabel}</div>
                  </div>
                </div>
              </div>
            `
          : ""}

        <div class="card-content ${isPowerOff ? "power-off-card" : ""}">
          <div class="graphics-container">
            <!-- Cooktop Container -->
            <div class="cooktop-container">
              ${burners[0] ? this._renderBurner(burners[0], "top: 48%; left: 12%; width: 26%;") : ""}
              ${burners[1] ? this._renderBurner(burners[1], "top: 2%; left: 12%; width: 26%;") : ""}
              ${burners[2] ? this._renderBurner(burners[2], "top: 5%; left: 42%; width: 21%;") : ""}
              ${burners[3] ? this._renderBurner(burners[3], "top: 5%; left: 68%; width: 21%;") : ""}
              ${burners[4] ? this._renderBurner(burners[4], "top: 41%; left: 55%; width: 31%;") : ""}
              <div class="sync-line ${isSynced ? "synced-on" : ""}" style="left: 12%;"></div>
              <div class="sync-line ${isSynced ? "synced-on" : ""}" style="left: 36%;"></div>
            </div>

            <!-- Oven Container -->
            <div class="oven-container">
              <div class="oven-control-panel">
                <svg width="100%" height="100%" viewBox="0 0 180 32" preserveAspectRatio="xMidYMid meet">
                  <circle class="oven-knob" cx="15" cy="16" r="8" />
                  <circle class="oven-knob" cx="35" cy="16" r="8" />
                  <circle class="oven-knob" cx="55" cy="16" r="8" />
                  <rect class="oven-screen" x="70" y="6" width="40" height="20" rx="3" />
                  <circle class="oven-knob" cx="125" cy="16" r="8" />
                  <circle class="oven-knob" cx="145" cy="16" r="8" />
                  <circle class="oven-knob" cx="165" cy="16" r="8" />
                </svg>
              </div>

              <!-- Upper Oven Door -->
              <div class="oven upper-oven ${isUpperOn ? "oven-on" : "oven-off"}" @click=${() => this._showOvenPopup("upper")}>
                <div class="oven-handle"></div>
                <div class="oven-info">
                  <span class="oven-state">${upperOvenState.state || "Off"}</span>
                  <span class="oven-temps">${upperRawTemp.state !== "unavailable" ? `${upperRawTemp.state}°` : "100°"}</span>
                </div>
              </div>

              <!-- Lower Oven Door -->
              <div class="oven lower-oven ${isLowerOn ? "oven-on" : "oven-off"}" @click=${() => this._showOvenPopup("lower")}>
                <div class="oven-handle"></div>
                <div class="oven-info">
                  <span class="oven-state">${lowerOvenState.state || "Off"}</span>
                  <span class="oven-temps">${lowerRawTemp.state !== "unavailable" ? `${lowerRawTemp.state}°` : "100°"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${this._renderOvenPopup()}
      </ha-card>
    `;
  }

  _renderBurner(burner, style) {
    if (!burner) return html``;
    const isOn = burner.status && (burner.status.state === "on" || burner.status.state === "true");
    const powerLevel = burner.power ? Math.round(parseFloat(burner.power.state) || 0) : "";
    const statusText = isOn ? (burner.power ? `${powerLevel}%` : "On") : "Off";

    return html`
      <div class="burner ${isOn ? "burner-on" : "burner-off"}" style="${style}" @click=${() => this._showMoreInfo(burner.status.entity_id)}>
        <span class="status-text">${statusText}</span>
      </div>
    `;
  }

  _renderOvenPopup() {
    if (this._popup !== "oven" && !this._popupOven) return html``;
    const ovenConfig = this.config.oven || {};
    const p = this.config.device_prefix;

    const activeTab = this._activeOvenTab || this._popupOven || "upper";

    const controlLockId = this._resolveEntity(ovenConfig.control_lock, "control_lock", "switch");
    const shutoff12Id = this._resolveEntity(ovenConfig.hour_12_shutoff, "hour_12_shutoff_enabled", "switch");
    const sabbathId = this._resolveEntity(ovenConfig.sabbath_mode, "sabbath_mode", "switch");
    const soundLevelId = this._resolveEntity(ovenConfig.sound_level, "sound_level", "select");
    const soundLevelObj = soundLevelId ? this._getEntity(soundLevelId) : null;
    const endToneId = this._resolveEntity(ovenConfig.end_tone, "end_tone", "select");
    const endToneObj = endToneId ? this._getEntity(endToneId) : null;
    const clockFormatId = this._resolveEntity(ovenConfig.clock_format, "clock_format", "select");
    const clockFormatObj = clockFormatId ? this._getEntity(clockFormatId) : null;

    return html`
      <div class="popup-overlay" @click=${() => this._closePopup()}>
        <div
          class="popup-content"
          @click=${(e) => e.stopPropagation()}
          @touchstart=${this._handleTouchStart}
          @touchmove=${this._handleTouchMove}
          @touchend=${this._handleTouchEnd}
        >
          <div class="drag-handle"></div>
          <div class="popup-header">
            <button class="close-button" @click=${() => this._closePopup()} aria-label="Close">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <h3>Range & Oven Controls</h3>
          </div>

          <!-- Segmented Tab Navigation Bar -->
          <div class="popup-tabs">
            <button
              class="popup-tab ${activeTab === "upper" ? "active-tab" : ""}"
              @click=${() => { this._activeOvenTab = "upper"; this.requestUpdate(); }}
            >
              <ha-icon icon="mdi:stove"></ha-icon>
              <span>Upper Oven</span>
            </button>
            <button
              class="popup-tab ${activeTab === "lower" ? "active-tab" : ""}"
              @click=${() => { this._activeOvenTab = "lower"; this.requestUpdate(); }}
            >
              <ha-icon icon="mdi:stove"></ha-icon>
              <span>Lower Oven</span>
            </button>
            <button
              class="popup-tab ${activeTab === "settings" ? "active-tab" : ""}"
              @click=${() => { this._activeOvenTab = "settings"; this.requestUpdate(); }}
            >
              <ha-icon icon="mdi:cog-outline"></ha-icon>
              <span>Settings</span>
            </button>
          </div>

          <div class="popup-controls">
            <!-- 1. UPPER OVEN TAB -->
            ${activeTab === "upper" ? html`
              ${(() => {
                const controlEntity = this._resolveEntity(ovenConfig.upper_control || this.config.upper_control, "oven", "water_heater");
                const controlObj = controlEntity ? this._getEntity(controlEntity) : null;
                const stateEntityId = this._resolveEntity(ovenConfig.upper_state_entity, "current_state", "sensor");
                const ovenStateObj = this._getEntity(stateEntityId);
                const rawTempId = this._resolveEntity(ovenConfig.upper_raw_temp, "raw_temperature", "sensor");
                const rawTempObj = this._getEntity(rawTempId);
                const lightEntityId = this._resolveEntity(ovenConfig.upper_light_entity || this.config.upper_light_entity, "light", "select");
                const lightEntity = this._getEntity(lightEntityId);
                const isLightOn = lightEntity.state === "High" || lightEntity.state === "on" || lightEntity.state === "On";

                const currentMode = controlObj?.attributes?.operation_mode || controlObj?.state || ovenStateObj.state || "off";
                const operationList = controlObj?.attributes?.operation_list || ["off", "Bake", "Frozen Pizza", "Baked Goods", "Frozen Snacks"];

                const isOffState = (s) => !s || s.toLowerCase() === "off" || s.toLowerCase() === "unavailable" || s.toLowerCase() === "unknown" || s.toLowerCase() === "idle";
                const isHeating = !isOffState(currentMode);
                const statusText = isHeating ? currentMode : "Off";

                const currentTemp = (rawTempObj.state !== "unavailable" && rawTempObj.state !== "unknown" && !isNaN(parseFloat(rawTempObj.state)))
                  ? parseFloat(rawTempObj.state)
                  : null;
                const rawTarget = controlObj?.attributes?.temperature ?? (currentTemp || 350);
                const targetTemp = !isNaN(parseFloat(rawTarget)) ? parseFloat(rawTarget) : 350;

                const minTemp = controlObj?.attributes?.min_temp || 170;
                const maxTemp = controlObj?.attributes?.max_temp || 550;

                // Diagnostics: Probe & Timers
                const probePresentId = this._resolveEntity(ovenConfig.upper_probe_present, "upper_oven_probe_present", "binary_sensor");
                const probeTempId = this._resolveEntity(ovenConfig.upper_probe_temp, "probe_display_temp", "sensor");
                const isProbePresent = this._isEntityOn(probePresentId);
                const probeTempObj = probeTempId ? this._getEntity(probeTempId) : null;

                const delayTimeId = this._resolveEntity(ovenConfig.upper_delay_time, "upper_oven_delay_time_remaining", "sensor");
                const elapsedTimeId = this._resolveEntity(ovenConfig.upper_elapsed_time, "upper_oven_elapsed_cook_time", "sensor");
                const delayTimeObj = delayTimeId ? this._getEntity(delayTimeId) : null;
                const elapsedTimeObj = elapsedTimeId ? this._getEntity(elapsedTimeId) : null;

                const hasDelayTime = delayTimeObj && delayTimeObj.state !== "unavailable" && delayTimeObj.state !== "0.0" && delayTimeObj.state !== "0";
                const hasElapsedTime = elapsedTimeObj && elapsedTimeObj.state !== "unavailable" && elapsedTimeObj.state !== "0.0" && elapsedTimeObj.state !== "0";

                return html`
                  <!-- Native Temperature Controller with Mode Dropdown Inside Header -->
                  ${this._renderNativeTemperatureController({
                    entityId: controlEntity,
                    targetTemp,
                    currentTemp,
                    isHeating,
                    statusText,
                    min: minTemp,
                    max: maxTemp,
                    step: 5,
                    unit: "°F",
                    presets: [],
                    modeConfig: {
                      currentMode,
                      options: operationList,
                      onModeChange: (newMode) => {
                        this._setOperationMode(controlEntity, newMode);
                        if (newMode.toLowerCase() !== "off" && targetTemp < minTemp) {
                          this._setTemperature(controlEntity, 350);
                        }
                      }
                    }
                  })}

                  <!-- Diagnostics -->
                  ${isProbePresent && probeTempObj && probeTempObj.state !== "unavailable" ? html`
                    <div class="control-row" style="margin-top: 10px;">
                      <div class="control-label-group">
                        <ha-icon icon="mdi:thermometer-check" style="color: var(--primary-color);"></ha-icon>
                        <span class="control-label">Meat Probe</span>
                      </div>
                      <span class="control-value" style="font-weight: 600;">${probeTempObj.state}°</span>
                    </div>
                  ` : ""}

                  ${hasDelayTime ? html`
                    <div class="control-row" style="margin-top: 6px;">
                      <div class="control-label-group">
                        <ha-icon icon="mdi:timer-sand"></ha-icon>
                        <span class="control-label">Delay Time</span>
                      </div>
                      <span class="control-value">${delayTimeObj.state}h</span>
                    </div>
                  ` : ""}

                  ${hasElapsedTime ? html`
                    <div class="control-row" style="margin-top: 6px;">
                      <div class="control-label-group">
                        <ha-icon icon="mdi:timer-outline"></ha-icon>
                        <span class="control-label">Elapsed Cook Time</span>
                      </div>
                      <span class="control-value">${elapsedTimeObj.state}h</span>
                    </div>
                  ` : ""}

                  <div class="divider" style="margin: 14px 0 10px 0;"></div>

                  <!-- Upper Oven Specific Settings -->
                  <h4 style="margin: 0 0 10px 0; font-size: 0.95rem;">Upper Oven Features</h4>
                  <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    ${lightEntityId && this._hasEntity(lightEntityId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                          <span class="control-label">Upper Oven Light</span>
                        </div>
                        <ha-switch
                          .checked=${isLightOn}
                          @change=${() => this._toggleEntity(lightEntityId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}
                  </div>
                `;
              })()}
            ` : ""}

            <!-- 2. LOWER OVEN TAB -->
            ${activeTab === "lower" ? html`
              ${(() => {
                const controlEntity = this._resolveEntity(ovenConfig.lower_control || this.config.lower_control, "lower_oven", "water_heater");
                const controlObj = controlEntity ? this._getEntity(controlEntity) : null;
                const stateEntityId = this._resolveEntity(ovenConfig.lower_state_entity, "lower_oven_current_state", "sensor");
                const ovenStateObj = this._getEntity(stateEntityId);
                const rawTempId = this._resolveEntity(ovenConfig.lower_raw_temp, "lower_oven_raw_temperature", "sensor");
                const rawTempObj = this._getEntity(rawTempId);
                const lightEntityId = this._resolveEntity(ovenConfig.lower_light_entity || this.config.lower_light_entity, "lower_oven_light", "select");
                const lightEntity = this._getEntity(lightEntityId);
                const isLightOn = lightEntity.state === "High" || lightEntity.state === "on" || lightEntity.state === "On";

                const convConvId = this._resolveEntity(ovenConfig.convection_conversion, "convection_conversion", "switch");

                const currentMode = controlObj?.attributes?.operation_mode || controlObj?.state || ovenStateObj.state || "off";
                const operationList = controlObj?.attributes?.operation_list || ["off", "Air Fry", "Conv. Multi-Bake", "Bake", "Convection Roast"];

                const isOffState = (s) => !s || s.toLowerCase() === "off" || s.toLowerCase() === "unavailable" || s.toLowerCase() === "unknown" || s.toLowerCase() === "idle";
                const isHeating = !isOffState(currentMode);
                const statusText = isHeating ? currentMode : "Off";

                const currentTemp = (rawTempObj.state !== "unavailable" && rawTempObj.state !== "unknown" && !isNaN(parseFloat(rawTempObj.state)))
                  ? parseFloat(rawTempObj.state)
                  : null;
                const rawTarget = controlObj?.attributes?.temperature ?? (currentTemp || 350);
                const targetTemp = !isNaN(parseFloat(rawTarget)) ? parseFloat(rawTarget) : 350;

                const minTemp = controlObj?.attributes?.min_temp || 170;
                const maxTemp = controlObj?.attributes?.max_temp || 550;

                // Diagnostics: Probe & Timers
                const probePresentId = this._resolveEntity(ovenConfig.lower_probe_present, "lower_oven_probe_present", "binary_sensor");
                const probeTempId = this._resolveEntity(ovenConfig.lower_probe_temp, "lower_oven_probe_display_temp", "sensor");
                const isProbePresent = this._isEntityOn(probePresentId);
                const probeTempObj = probeTempId ? this._getEntity(probeTempId) : null;

                const delayTimeId = this._resolveEntity(ovenConfig.lower_delay_time, "lower_oven_delay_time_remaining", "sensor");
                const elapsedTimeId = this._resolveEntity(ovenConfig.lower_elapsed_time, "lower_oven_elapsed_cook_time", "sensor");
                const delayTimeObj = delayTimeId ? this._getEntity(delayTimeId) : null;
                const elapsedTimeObj = elapsedTimeId ? this._getEntity(elapsedTimeId) : null;

                const hasDelayTime = delayTimeObj && delayTimeObj.state !== "unavailable" && delayTimeObj.state !== "0.0" && delayTimeObj.state !== "0";
                const hasElapsedTime = elapsedTimeObj && elapsedTimeObj.state !== "unavailable" && elapsedTimeObj.state !== "0.0" && elapsedTimeObj.state !== "0";

                return html`
                  <!-- Native Temperature Controller with Mode Dropdown Inside Header -->
                  ${this._renderNativeTemperatureController({
                    entityId: controlEntity,
                    targetTemp,
                    currentTemp,
                    isHeating,
                    statusText,
                    min: minTemp,
                    max: maxTemp,
                    step: 5,
                    unit: "°F",
                    presets: [],
                    modeConfig: {
                      currentMode,
                      options: operationList,
                      onModeChange: (newMode) => {
                        this._setOperationMode(controlEntity, newMode);
                        if (newMode.toLowerCase() !== "off" && targetTemp < minTemp) {
                          this._setTemperature(controlEntity, 350);
                        }
                      }
                    }
                  })}

                  <!-- Diagnostics -->
                  ${isProbePresent && probeTempObj && probeTempObj.state !== "unavailable" ? html`
                    <div class="control-row" style="margin-top: 10px;">
                      <div class="control-label-group">
                        <ha-icon icon="mdi:thermometer-check" style="color: var(--primary-color);"></ha-icon>
                        <span class="control-label">Meat Probe</span>
                      </div>
                      <span class="control-value" style="font-weight: 600;">${probeTempObj.state}°</span>
                    </div>
                  ` : ""}

                  ${hasDelayTime ? html`
                    <div class="control-row" style="margin-top: 6px;">
                      <div class="control-label-group">
                        <ha-icon icon="mdi:timer-sand"></ha-icon>
                        <span class="control-label">Delay Time</span>
                      </div>
                      <span class="control-value">${delayTimeObj.state}h</span>
                    </div>
                  ` : ""}

                  ${hasElapsedTime ? html`
                    <div class="control-row" style="margin-top: 6px;">
                      <div class="control-label-group">
                        <ha-icon icon="mdi:timer-outline"></ha-icon>
                        <span class="control-label">Elapsed Cook Time</span>
                      </div>
                      <span class="control-value">${elapsedTimeObj.state}h</span>
                    </div>
                  ` : ""}

                  <div class="divider" style="margin: 14px 0 10px 0;"></div>

                  <!-- Lower Oven Specific Settings (including Convection Conversion only here) -->
                  <h4 style="margin: 0 0 10px 0; font-size: 0.95rem;">Lower Oven Features</h4>
                  <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    ${lightEntityId && this._hasEntity(lightEntityId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                          <span class="control-label">Lower Oven Light</span>
                        </div>
                        <ha-switch
                          .checked=${isLightOn}
                          @change=${() => this._toggleEntity(lightEntityId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}

                    ${convConvId && this._hasEntity(convConvId) ? html`
                      <div class="control-row">
                        <div class="control-label-group">
                          <ha-icon icon="mdi:autorenew"></ha-icon>
                          <span class="control-label">Convection Auto-Conversion</span>
                        </div>
                        <ha-switch
                          .checked=${this._isEntityOn(convConvId)}
                          @change=${() => this._toggleEntity(convConvId)}
                          class="popup-switch"
                        ></ha-switch>
                      </div>
                    ` : ""}
                  </div>
                `;
              })()}
            ` : ""}

            <!-- 3. SETTINGS TAB (Global Appliance Preferences) -->
            ${activeTab === "settings" ? html`
              <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <h4 style="margin: 0 0 4px 0; font-size: 0.95rem;">Safety & Appliance Settings</h4>

                ${controlLockId && this._hasEntity(controlLockId) ? html`
                  <div class="control-row">
                    <div class="control-label-group">
                      <ha-icon icon="mdi:lock-outline"></ha-icon>
                      <span class="control-label">Control Lock</span>
                    </div>
                    <ha-switch
                      .checked=${this._isEntityOn(controlLockId)}
                      @change=${() => this._toggleEntity(controlLockId)}
                      class="popup-switch"
                    ></ha-switch>
                  </div>
                ` : ""}

                ${shutoff12Id && this._hasEntity(shutoff12Id) ? html`
                  <div class="control-row">
                    <div class="control-label-group">
                      <ha-icon icon="mdi:timer-off-outline"></ha-icon>
                      <span class="control-label">12-Hour Auto Shutoff</span>
                    </div>
                    <ha-switch
                      .checked=${this._isEntityOn(shutoff12Id)}
                      @change=${() => this._toggleEntity(shutoff12Id)}
                      class="popup-switch"
                    ></ha-switch>
                  </div>
                ` : ""}

                ${sabbathId && this._hasEntity(sabbathId) ? html`
                  <div class="control-row">
                    <div class="control-label-group">
                      <ha-icon icon="mdi:candle"></ha-icon>
                      <span class="control-label">Sabbath Mode</span>
                    </div>
                    <ha-switch
                      .checked=${this._isEntityOn(sabbathId)}
                      @change=${() => this._toggleEntity(sabbathId)}
                      class="popup-switch"
                    ></ha-switch>
                  </div>
                ` : ""}

                <div class="divider" style="margin: 8px 0;"></div>
                <h4 style="margin: 0 0 4px 0; font-size: 0.95rem;">Audio & Display Options</h4>

                ${soundLevelObj && soundLevelObj.state !== "unavailable" ? html`
                  <div class="control-row select-row">
                    <div class="control-label-group">
                      <ha-icon icon="mdi:volume-high"></ha-icon>
                      <span class="control-label">End Tone Sound Level</span>
                    </div>
                    <select
                      class="popup-select-input"
                      @change=${(e) => this._selectOption(soundLevelObj.entity_id, e.target.value)}
                    >
                      ${(soundLevelObj.attributes?.options || ["High", "Low", "Mute"]).map((opt) => html`
                        <option value="${opt}" ?selected=${soundLevelObj.state === opt}>${opt}</option>
                      `)}
                    </select>
                  </div>
                ` : ""}

                ${endToneObj && endToneObj.state !== "unavailable" ? html`
                  <div class="control-row select-row">
                    <div class="control-label-group">
                      <ha-icon icon="mdi:bell-ring-outline"></ha-icon>
                      <span class="control-label">End Tone Pattern</span>
                    </div>
                    <select
                      class="popup-select-input"
                      @change=${(e) => this._selectOption(endToneObj.entity_id, e.target.value)}
                    >
                      ${(endToneObj.attributes?.options || ["Repeated Beep", "Single Beep"]).map((opt) => html`
                        <option value="${opt}" ?selected=${endToneObj.state === opt}>${opt}</option>
                      `)}
                    </select>
                  </div>
                ` : ""}

                ${clockFormatObj && clockFormatObj.state !== "unavailable" ? html`
                  <div class="control-row select-row">
                    <div class="control-label-group">
                      <ha-icon icon="mdi:clock-outline"></ha-icon>
                      <span class="control-label">Clock Format</span>
                    </div>
                    <select
                      class="popup-select-input"
                      @change=${(e) => this._selectOption(clockFormatObj.entity_id, e.target.value)}
                    >
                      ${(clockFormatObj.attributes?.options || ["Twelve Hour", "Twenty Four Hour"]).map((opt) => html`
                        <option value="${opt}" ?selected=${clockFormatObj.state === opt}>${opt}</option>
                      `)}
                    </select>
                  </div>
                ` : ""}
              </div>
            ` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // 3. LAUNDRY CENTER
  // ==========================================
  _renderLaundry() {
    const c = this.config;
    const washerPowerEntity = this._getPowerEntity("laundry", "washer");
    const dryerPowerEntity = this._getPowerEntity("laundry", "dryer");
    const cardPowerEntity = this._getPowerEntity("laundry");

    const washerPowerState = washerPowerEntity ? this._getEntity(washerPowerEntity).state : null;
    const dryerPowerState = dryerPowerEntity ? this._getEntity(dryerPowerEntity).state : null;

    const washerConfig = c.washer || {
      current_status: c.washer_status,
      operation: c.washer_operation,
      remaining_time: c.washer_remaining_time,
    };
    const dryerConfig = c.dryer || {
      current_status: c.dryer_status,
      operation: c.dryer_operation,
      remaining_time: c.dryer_remaining_time,
    };

    const washerEntities = {
      status: this._getEntity(washerConfig.current_status),
      operation: this._getEntity(washerConfig.operation),
      remaining_time: this._getEntity(washerConfig.remaining_time),
    };

    const dryerEntities = {
      status: this._getEntity(dryerConfig.current_status),
      operation: this._getEntity(dryerConfig.operation),
      remaining_time: this._getEntity(dryerConfig.remaining_time),
    };

    const activeStates = ["running", "wash", "rinse", "rinsing", "spin", "spinning", "drying", "cooling", "detecting"];
    const inactiveStates = ["off", "power off", "idle", "standby", "unavailable", "unknown", ""];

    const washerStatusState = (washerEntities.status.state || "").toLowerCase().replace("_", " ");
    const washerOpState = (washerEntities.operation.state || "").toLowerCase().replace("_", " ");
    const dryerStatusState = (dryerEntities.status.state || "").toLowerCase().replace("_", " ");
    const dryerOpState = (dryerEntities.operation.state || "").toLowerCase().replace("_", " ");

    const isWasherStateActive = (washerEntities.status.state && !inactiveStates.includes(washerStatusState)) ||
                                (washerEntities.operation.state && !inactiveStates.includes(washerOpState)) ||
                                activeStates.includes(washerStatusState) || activeStates.includes(washerOpState);

    const isDryerStateActive = (dryerEntities.status.state && !inactiveStates.includes(dryerStatusState)) ||
                               (dryerEntities.operation.state && !inactiveStates.includes(dryerOpState)) ||
                               activeStates.includes(dryerStatusState) || activeStates.includes(dryerOpState);

    const isWasherPowerOff = (washerPowerState === "off" || washerPowerState === "false") && !isWasherStateActive;
    const isDryerPowerOff = (dryerPowerState === "off" || dryerPowerState === "false") && !isDryerStateActive;

    const isWasherActive = isWasherStateActive;
    const isDryerActive = isDryerStateActive;

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isWasherPowerOff && isDryerPowerOff) {
      chipLabel = "POWER OFF";
      chipClass = "power-off";
    } else if (isWasherPowerOff) {
      chipLabel = "WASHER OFF";
      chipClass = "power-off";
    } else if (isDryerPowerOff) {
      chipLabel = "DRYER OFF";
      chipClass = "power-off";
    } else if (isWasherActive && isDryerActive) {
      chipLabel = "RUNNING";
      chipClass = "active";
    } else if (isWasherActive) {
      chipLabel = "WASHING";
      chipClass = "active-washer";
    } else if (isDryerActive) {
      chipLabel = "DRYING";
      chipClass = "active-dryer";
    }

    return html`
      <ha-card>
        ${c.show_header !== false
          ? html`
              <div class="header">
                <h1 class="title">
                  <ha-icon icon="mdi:washing-machine" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
                  ${c.title || "Laundry"}
                </h1>
                <div class="header-subtitle-row">
                  <p class="subtitle">Washer & Dryer Status</p>
                  <div class="header-right">
                    ${cardPowerEntity ? this._renderPowerButton(cardPowerEntity) : ""}
                    <div class="status-chip ${chipClass}">${chipLabel}</div>
                  </div>
                </div>
              </div>
            `
          : ""}

        <div class="card-content">
          ${this._renderLaundryUnit("Washer", "mdi:washing-machine", washerEntities, washerPowerEntity)}
          ${this._renderLaundryUnit("Dryer", "mdi:tumble-dryer", dryerEntities, dryerPowerEntity)}
        </div>
      </ha-card>
    `;
  }

  _formatRemainingTime(finishTimeStr) {
    if (!finishTimeStr || finishTimeStr === "unavailable" || finishTimeStr === "unknown") return "";
    const finishTime = new Date(finishTimeStr);
    if (isNaN(finishTime)) return finishTimeStr;
    const now = new Date();
    let diff = (finishTime.getTime() - now.getTime()) / 1000;
    if (diff < 0) diff = 0;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  _renderLaundryUnit(name, icon, entities, powerEntity = null) {
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;

    const status = (entities.status.state || "off").toLowerCase().replace("_", " ");
    const op = (entities.operation.state || "off").toLowerCase().replace("_", " ");
    const activeStates = ["running", "wash", "rinse", "rinsing", "spin", "spinning", "drying", "cooling", "detecting"];
    const inactiveStates = ["off", "power off", "idle", "standby", "unavailable", "unknown", ""];

    const isStateActive = (entities.status.state && !inactiveStates.includes(status)) ||
                          (entities.operation.state && !inactiveStates.includes(op)) ||
                          activeStates.includes(status) || activeStates.includes(op);

    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false") && !isStateActive;
    const isActive = isStateActive;
    const machineType = name.toLowerCase();
    const displayStatus = isPowerOff ? "Power Off" : (status === "power off" ? "Off" : (entities.status.state || "off"));
    const remainingTime = this._formatRemainingTime(entities.remaining_time.state);

    return html`
      <div class="appliance-container m3-card ${isPowerOff ? "unit-power-off" : ""}">
        <div class="graphic-header">
          <div class="appliance-header">
            <ha-icon .icon=${icon}></ha-icon>
            <span class="name">${name}</span>
            ${this._renderPowerButton(powerEntity, "unit-power-btn")}
          </div>
          <div class="knob-container">
            <svg class="knob-svg" viewBox="0 0 32 32">
              <circle class="knob" cx="16" cy="16" r="14" />
            </svg>
          </div>
          <div class="screen-container">
            <div class="screen">
              ${isActive && remainingTime ? html`<span class="screen-time">${remainingTime}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="graphic-body">
          <div class="laundry-door" @click=${() => this._showMoreInfo(entities.status.entity_id)}>
            <div class="laundry-door-inner ${isActive ? `${machineType}-active` : ""}"></div>
            ${isActive
              ? html`
                  <svg class="spinner-svg" viewBox="0 0 100 100">
                    <g class="spinner">
                      <circle class="spinner-arc ${machineType}-active" cx="50" cy="50" r="45"></circle>
                    </g>
                  </svg>
                `
              : ""}
            <div class="door-info">
              <span class="door-state">${displayStatus}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 4. NAVIEN TANKLESS WATER HEATER
  // ==========================================
  _renderWaterHeater() {
    const c = this.config;
    const powerEntity = this._getPowerEntity("water_heater");
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;

    const mainEntityId = c.entity || "water_heater.water_heater";
    const stateObj = this.hass.states[mainEntityId] || { state: "unavailable", attributes: {} };
    const attributes = stateObj.attributes || {};

    const flowData = c.flow_rate_sensor ? this._getEntity(c.flow_rate_sensor) : this._getEntity(c.water_flow_rate || "sensor.navien_water_flow_rate");
    const gasData = c.gas_usage_sensor ? this._getEntity(c.gas_usage_sensor) : this._getEntity(c.gas_consumption_rate || "sensor.navien_gas_consumption_rate");
    const inletTempData = c.inlet_temp_sensor ? this._getEntity(c.inlet_temp_sensor) : this._getEntity("sensor.navien_inlet_temperature");
    const outletTempData = c.outlet_temp_sensor ? this._getEntity(c.outlet_temp_sensor) : this._getEntity("sensor.navien_outlet_temperature");
    const recircSwitch = c.recirc_switch ? this._getEntity(c.recirc_switch) : this._getEntity("switch.navien_recirculation");
    const recircLastRun = c.recirc_last_run ? this._getEntity(c.recirc_last_run) : this._getEntity("sensor.navien_recirc_last_run");
    const recircDuration = c.recirc_duration ? this._getEntity(c.recirc_duration) : this._getEntity("sensor.navien_recirc_duration");

    const flowRate = parseFloat(flowData.state) || 0;
    const gasUsage = parseFloat(gasData.state) || 0;

    const isHeating = stateObj.state === "heating" || stateObj.state === "on" || flowRate > 0;
    const isRecircActive = recircSwitch.state === "on" || recircSwitch.state === "true";
    const isWaterHeaterWorking = isHeating || isRecircActive || gasUsage > 0;

    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false") && !isWaterHeaterWorking;
    const animateMainLines = isHeating || isRecircActive;

    const targetTemp = parseFloat(attributes.temperature) || 125;
    const recircGradId = `recircGrad-${this._cardId}`;
    const heatingGradId = `heatingGrad-${this._cardId}`;

    let recircSubLabel = "";
    if (recircLastRun.state !== "unavailable" && recircLastRun.state !== "unknown") {
      recircSubLabel = `• ${recircLastRun.state}`;
      if (recircDuration.state !== "unavailable" && recircDuration.state !== "unknown") {
        recircSubLabel += ` • Ran for ${recircDuration.state}`;
      }
    } else {
      recircSubLabel = "• 9 min ago • Ran for 39s";
    }

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isPowerOff) {
      chipLabel = "POWER OFF";
      chipClass = "power-off";
    } else if (isHeating) {
      chipLabel = "HEATING";
      chipClass = "heating";
    }

    return html`
      <ha-card>
        ${c.show_header !== false
          ? html`
              <div class="header">
                <h1 class="title">
                  <ha-icon icon="mdi:water-boiler" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
                  ${c.title || attributes.friendly_name || "Water Heater"}
                </h1>
                <div class="header-subtitle-row">
                  <p class="subtitle">Tankless Water Heater</p>
                  <div class="header-right">
                    ${this._renderPowerButton(powerEntity)}
                    <div class="icon-btn-header" @click=${() => (this._showFlushGuide = true)} title="Flush Guide" style="cursor:pointer;">
                      <ha-icon icon="mdi:wrench-outline"></ha-icon>
                    </div>
                    <div class="status-chip ${chipClass}">${chipLabel}</div>
                  </div>
                </div>
              </div>
            `
          : ""}

        <div class="card-content ${isPowerOff ? "power-off-card" : ""}">
          <!-- Main Navien Viz Container -->
          <div class="viz-container">
            <svg viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="${recircGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color: var(--error-color, #e53e3e); stop-opacity:1" />
                  <stop offset="100%" style="stop-color: var(--info-color, #3182ce); stop-opacity:1" />
                </linearGradient>

                <radialGradient id="${heatingGradId}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="40%" style="stop-color: #2d3748; stop-opacity: 1" />
                  <stop offset="100%" style="stop-color: var(--warning-color, #ed8936); stop-opacity: 1" />
                  <animate attributeName="r" values="40%;65%;40%" dur="2s" repeatCount="indefinite" />
                </radialGradient>

                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L6,3 z" fill="var(--warning-color, #ed8936)" />
                </marker>
              </defs>

              <!-- Main Unit Body -->
              <rect x="80" y="20" width="140" height="220" rx="12"
                fill="${isHeating ? `url(#${heatingGradId})` : "var(--ha-card-background, #fff)"}"
                stroke="${isHeating ? "var(--warning-color, #ed8936)" : "var(--divider-color)"}"
                stroke-width="${isHeating ? 3 : 2}"
                style="transition: all 0.5s ease;"
              />
              <rect x="90" y="205" width="120" height="20" rx="2" fill="${isHeating ? "#ffffff" : "#2d3748"}" opacity="${isHeating ? 0.2 : 0.1}" />
              <text x="150" y="219" font-size="12" text-anchor="middle" fill="${isHeating ? "#ffffff" : "var(--primary-text-color)"}" font-weight="bold" opacity="0.7">NAVIEN</text>

              <!-- Recirculation Loop Line (RENDERED BEHIND OUTLET PIPE) -->
              <path d="M260,60 L260,210 L220,210" stroke="url(#${recircGradId})" stroke-width="6" fill="none" stroke-linejoin="round" />
              <path d="M260,60 L260,210 L220,210" stroke="rgba(255,255,255,0.8)" stroke-width="3" stroke-dasharray="6,6" fill="none" class="flow-anim ${isRecircActive ? "flowing" : ""}" stroke-linejoin="round" />
              <path d="M240,210 L235,210" stroke="var(--warning-color, #ed8936)" stroke-width="3" marker-end="url(#arrow)" opacity="${isRecircActive ? 1 : 0}" />

              <!-- Inlet Pipe (Blue) at y=180 -->
              <path d="M0,180 L80,180" stroke="var(--info-color, #3182ce)" stroke-width="8" fill="none" />
              <path d="M0,180 L80,180" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-dasharray="8,8" fill="none" class="flow-anim ${animateMainLines ? "flowing" : ""}" />
              <circle cx="80" cy="180" r="4" fill="var(--info-color, #3182ce)" />

              <!-- Outlet Pipe (Red) at y=60 (RENDERED ON TOP OF RECIRC LINE) -->
              <path d="M220,60 L300,60" stroke="var(--error-color, #e53e3e)" stroke-width="8" fill="none" />
              <path d="M220,60 L300,60" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-dasharray="8,8" fill="none" class="flow-anim ${animateMainLines ? "flowing" : ""}" />
              <circle cx="220" cy="60" r="4" fill="var(--error-color, #e53e3e)" />
            </svg>

            <!-- Temperature Arrow Buttons & CENTERED SETPOINT UNDERNEATH TEMP -->
            <div class="box-controls">
              <div class="temp-btn up" @click=${() => this._changeWaterHeaterTemp(mainEntityId, targetTemp + 1)}>
                <ha-icon icon="mdi:arrow-up"></ha-icon>
              </div>
              <div class="temp-display">
                <span class="temp-val" style="color:${isHeating ? "#ffffff" : "var(--primary-text-color)"}">${Math.round(targetTemp)}°</span>
                <span class="temp-label" style="color:${isHeating ? "rgba(255,255,255,0.8)" : "var(--secondary-text-color)"}">SETPOINT</span>
              </div>
              <div class="temp-btn down" @click=${() => this._changeWaterHeaterTemp(mainEntityId, targetTemp - 1)}>
                <ha-icon icon="mdi:arrow-down"></ha-icon>
              </div>
            </div>

            <!-- Outlet Temp Badge (Top Right - Aligned flush with outlet pipe at top: 38px) -->
            <div class="overlay-stat outlet" style="right: 10px; top: 38px;" @click=${() => this._showMoreInfo(outletTempData.entity_id)}>
              <span style="color: var(--error-color, #f44336);">${outletTempData.state !== "unavailable" ? `${outletTempData.state}°F` : "124°F"}</span>
              <span class="label">Outlet</span>
            </div>

            <!-- Inlet Temp Badge (Left - Aligned flush with inlet pipe at top: 158px) -->
            <div class="overlay-stat inlet" style="left: 10px; top: 158px;" @click=${() => this._showMoreInfo(inletTempData.entity_id)}>
              <span style="color: var(--info-color, #2196f3);">${inletTempData.state !== "unavailable" ? `${inletTempData.state}°F` : "73°F"}</span>
              <span class="label">Inlet</span>
            </div>
          </div>

          <!-- Telemetry Bars -->
          <div class="stats-row" style="margin-top: 14px; display: flex; gap: 16px;">
            <div class="stat-inline" style="flex:1;" @click=${() => this._showMoreInfo(flowData.entity_id)}>
              <div class="stat-inline-header" style="display:flex; align-items:center; gap:6px; font-weight:bold;">
                <ha-icon icon="mdi:water-pump"></ha-icon>
                <span>${flowRate} <span class="unit">GPM</span></span>
              </div>
              <div class="progress-bar-bg" style="height:6px; background:rgba(128,128,128,0.2); border-radius:3px; margin-top:4px;">
                <div style="width: ${Math.min(100, (flowRate / 8) * 100)}%; height:100%; background:var(--info-color, #3182ce); border-radius:3px;"></div>
              </div>
            </div>

            <div class="stat-inline" style="flex:1;" @click=${() => this._showMoreInfo(gasData.entity_id)}>
              <div class="stat-inline-header" style="display:flex; align-items:center; gap:6px; font-weight:bold;">
                <ha-icon icon="mdi:fire"></ha-icon>
                <span>${gasUsage} <span class="unit">BTU/h</span></span>
              </div>
              <div class="progress-bar-bg" style="height:6px; background:rgba(128,128,128,0.2); border-radius:3px; margin-top:4px;">
                <div style="width: ${Math.min(100, (gasUsage / 100000) * 100)}%; height:100%; background:var(--warning-color, #ed8936); border-radius:3px;"></div>
              </div>
            </div>
          </div>

          <!-- Recirculation Control Group with Settings Drawer -->
          <div class="control-group m3-card" style="margin-top: 14px;">
            <div class="controls-container" style="display:flex; gap:8px;">
              <button class="recirc-button ${isRecircActive ? "active" : ""}" @click=${() => this._toggleEntity(c.recirc_switch || "switch.navien_recirculation")}>
                <ha-icon icon="mdi:refresh"></ha-icon>
                <span class="button-content">
                  <span class="main-label">${isRecircActive ? "START RECIRCULATION" : "START RECIRCULATION"}</span>
                  <span class="sub-label">${recircSubLabel}</span>
                </span>
              </button>
              <button class="settings-btn ${this._showRecircSettings ? "active" : ""}" @click=${() => this._toggleRecircSettings(c.recirc_switch || "switch.navien_recirculation")}>
                <ha-icon icon="mdi:cog"></ha-icon>
              </button>
            </div>

            ${this._showRecircSettings
              ? html`
                  <div class="settings-drawer" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--divider-color);">
                    <div class="settings-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                      <div class="setting-label" style="display:flex; align-items:center; gap:8px; font-weight:500;">
                        <ha-icon icon="mdi:timer-refresh-outline"></ha-icon>
                        <span>Interval</span>
                      </div>
                      <div class="step-controller-pill">
                        <button class="pill-btn" @click=${() => (this._recircInterval = Math.max(5, this._recircInterval - 5))}>
                          <ha-icon icon="mdi:minus"></ha-icon>
                        </button>
                        <span class="pill-value">${this._recircInterval} min</span>
                        <button class="pill-btn" @click=${() => (this._recircInterval = Math.min(120, this._recircInterval + 5))}>
                          <ha-icon icon="mdi:plus"></ha-icon>
                        </button>
                      </div>
                    </div>

                    <div class="timeline-container" style="display:flex; flex-direction:column; gap:4px;">
                      <div class="timeline-label" style="font-size:0.75em; text-transform:uppercase; color:var(--secondary-text-color); font-weight:600;">LAST 24 HOURS</div>
                      <div class="timeline-track" style="height:24px; width:100%; background:var(--card-background-color, rgba(128,128,128,0.1)); border:1px solid var(--divider-color); border-radius:6px; overflow:hidden; display:flex; position:relative; cursor:pointer;">
                        ${this._renderTimelineBarcode()}
                      </div>
                      <div class="timeline-axis" style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--secondary-text-color); margin-top:2px;">
                        <span>1:50 PM</span>
                        <span>1:50 AM</span>
                        <span>1:50 PM</span>
                      </div>
                      <div class="segment-info" style="text-align:center; font-size:0.85rem; font-weight:600; color:var(--primary-color, var(--state-active-color, #3b82f6)); margin-top:4px;">${this._selectedSegmentText}</div>
                    </div>
                  </div>
                `
              : ""}
          </div>
        </div>

        ${this._renderFlushGuideModal()}
      </ha-card>
    `;
  }

  _renderTimelineBarcode() {
    const now = new Date();
    const nowMs = now.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const startMs = nowMs - twentyFourHoursMs;

    if (this._historyData && this._historyData.length > 0) {
      const data = [...this._historyData].sort(
        (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
      );

      const segments = [];
      let lastTime = startMs;
      let lastState = data.length > 0 ? (data[0].state === "on" ? "off" : "on") : "off";

      data.forEach((item) => {
        const changeTime = new Date(item.last_changed).getTime();
        if (changeTime > lastTime) {
          const duration = changeTime - lastTime;
          const pct = (duration / twentyFourHoursMs) * 100;
          const stateTxt = lastState === "on" ? "Running" : "Idle";
          const mins = Math.round(duration / 60000);
          const durTxt = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
          const startStr = this._formatShortTime(new Date(lastTime));
          const endStr = this._formatShortTime(new Date(changeTime));
          const text = `${stateTxt}: ${startStr} - ${endStr} (${durTxt})`;

          segments.push({
            width: pct,
            color: lastState === "on" ? "var(--primary-color, #3b82f6)" : "transparent",
            text: text,
          });
        }
        lastState = item.state;
        lastTime = changeTime;
      });

      if (lastTime < nowMs) {
        const duration = nowMs - lastTime;
        const pct = (duration / twentyFourHoursMs) * 100;
        const stateTxt = lastState === "on" ? "Running" : "Idle";
        const mins = Math.round(duration / 60000);
        const durTxt = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        const startStr = this._formatShortTime(new Date(lastTime));
        const endStr = this._formatShortTime(new Date(nowMs));
        const text = `${stateTxt}: ${startStr} - ${endStr} (${durTxt})`;

        segments.push({
          width: pct,
          color: lastState === "on" ? "var(--primary-color, #3b82f6)" : "transparent",
          text: text,
        });
      }

      return segments.map(
        (seg) => html`
          <div
            class="timeline-segment"
            style="width: ${seg.width}%; background-color: ${seg.color}; flex-shrink: 0; cursor: pointer;"
            title=${seg.text}
            @click=${() => this._selectTimelineSegment(seg.text)}
          ></div>
        `
      );
    }

    // Default barcode pattern using HA dashboard theme color variable
    const segments = [];
    const numSegments = 48; // 30 min slots over 24h
    const slotMs = 30 * 60 * 1000;

    for (let i = 0; i < numSegments; i++) {
      const segStart = startMs + i * slotMs;
      const segEnd = segStart + slotMs;
      const isRun = i % 3 === 0 || i % 7 === 0;
      const startStr = this._formatShortTime(new Date(segStart));
      const endStr = this._formatShortTime(new Date(segEnd));
      const text = isRun
        ? `Running: ${startStr} - ${endStr} (1m 0s)`
        : `Idle: ${startStr} - ${endStr} (29m)`;

      segments.push(
        html`
          <div
            class="timeline-segment"
            style="flex: 1; height: 100%; background: ${isRun ? "var(--primary-color, #3b82f6)" : "transparent"}; margin: 0 1px; cursor: pointer;"
            title=${text}
            @click=${() => this._selectTimelineSegment(text)}
          ></div>
        `
      );
    }
    return segments;
  }

  _renderFlushGuideModal() {
    if (!this._showFlushGuide) return html``;
    const c = this.config;
    const flushTitle = c.flush_procedure_title || "NPE-240A2 Flush Procedure";
    const materials = c.flush_materials || [
      "4 Gallons White Vinegar (Food Grade)",
      "Submersible Utility Pump",
      "2 x Washing Machine Hoses",
      "5 Gallon Bucket",
    ];

    const defaultSteps = [
      { num: 1, title: "Preparation", desc: ["Turn off power to the unit.", "Turn off gas valve (Yellow handle perpendicular).", "Isolate Unit: Close Cold Inlet (Blue) and Hot Outlet (Red) main valves."] },
      { num: 2, title: "Connect Pump", desc: ["Pour 4 gallons of vinegar into bucket.", "Connect Hose A from Pump → Cold Service Port.", "Connect Hose B from Hot Service Port → Bucket."] },
      { num: 3, title: "Flush (60 Mins)", desc: ["Open both Service Valves (Blue/Red small handles).", "Turn on Pump.", "Let vinegar circulate for 45-60 minutes."] },
      { num: 4, title: "Rinse", desc: ["Turn off pump.", "Close Cold Service Valve & remove hose.", "Keep Hot Service Valve OPEN with hose in bucket.", "Slowly open Main Cold Inlet to flush fresh water through unit for 5 mins."] },
      { num: 5, title: "Clean Filter", desc: ["Close Main Cold Inlet.", "Remove Cold Inlet Filter (bottom of unit).", "Rinse mesh clean and reinstall."] },
      { num: 6, title: "Restart", desc: ["Close Service Valves. Disconnect hoses.", "Open Main Cold Inlet & Hot Outlet.", "Open Gas Valve.", "Turn Power On."] },
    ];

    const steps = c.flush_steps || defaultSteps;

    return html`
      <div class="modal-overlay" @click=${() => (this._showFlushGuide = false)}>
        <div class="modal-content" @click=${(e) => e.stopPropagation()}>
          <div class="modal-header">
            <h2>${flushTitle}</h2>
            <button class="close-btn" @click=${() => (this._showFlushGuide = false)}><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="modal-body">
            <div class="materials-section">
              <h3><ha-icon icon="mdi:toolbox-outline"></ha-icon> Required Materials</h3>
              <ul>
                ${materials.map((m) => html`<li>${m}</li>`)}
              </ul>
            </div>
            <div class="step-timeline">
              ${steps.map(
                (s) => html`
                  <div class="step">
                    <div class="step-num">${s.num}</div>
                    <div class="step-content">
                      <h4>${s.title}</h4>
                      ${Array.isArray(s.desc) ? s.desc.map((d) => html`<p>${d}</p>`) : html`<p>${s.desc}</p>`}
                    </div>
                  </div>
                `
              )}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 5. SMART HOSE TIMER (NOWRAP HEADER & ORIGINAL BUTTON TEXT FORMAT)
  // ==========================================
  _renderSmartHoseTimer() {
    const c = this.config;
    const powerEntity = this._getPowerEntity("smart_hose_timer");
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;

    const valve = this._getEntity(c.valve_entity);
    const stateSens = c.state_sensor ? this._getEntity(c.state_sensor) : null;
    const history = c.history_sensor ? this._getEntity(c.history_sensor) : null;
    const battery = c.battery_sensor ? this._getEntity(c.battery_sensor) : null;
    const nextWatering = c.next_watering_sensor ? this._getEntity(c.next_watering_sensor) : null;
    const smartWatering = c.smart_watering_switch ? this._getEntity(c.smart_watering_switch) : null;
    const rainDelay = c.rain_delay_switch ? this._getEntity(c.rain_delay_switch) : null;

    const isOpen = valve.state === "open" || valve.state === "on";
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false") && !isOpen;
    const statusText = isPowerOff ? "Power Off" : (isOpen ? "Watering" : (stateSens && stateSens.state !== "unavailable" ? stateSens.state : "Auto"));

    let lastRunTime = "--";
    let lastGallons = "--";
    let lastStart = "--";
    if (history && history.attributes) {
      if (history.attributes.run_time) lastRunTime = history.attributes.run_time + " min";
      if (history.attributes.consumption_gallons !== undefined) lastGallons = history.attributes.consumption_gallons + " gal";
      if (history.attributes.start_time) lastStart = this._formatShortTime(new Date(history.attributes.start_time));
    }

    let currentRuntime = valve.attributes && valve.attributes.current_runtime ? Math.floor(valve.attributes.current_runtime / 60) : 0;

    const maxVal = 120;
    const currentVal = isOpen ? Math.min(maxVal, currentRuntime) : this._manualRuntime;
    const pct = currentVal / maxVal;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dasharray = `${pct * circumference} ${circumference}`;
    const angleRad = pct * 2 * Math.PI - Math.PI / 2;
    const knobX = 50 + radius * Math.cos(angleRad);
    const knobY = 50 + radius * Math.sin(angleRad);

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isPowerOff) {
      chipLabel = "POWER OFF";
      chipClass = "power-off";
    } else if (isOpen) {
      chipLabel = "ACTIVE";
      chipClass = "heating";
    }

    return html`
      <ha-card>
        ${c.show_header !== false
          ? html`
              <div class="header">
                <h1 class="title">
                  <ha-icon icon="${isOpen ? "mdi:sprinkler" : "mdi:sprinkler-variant"}" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
                  ${c.title || "Smart Hose Timer"}
                </h1>
                <div class="header-subtitle-row">
                  <p class="subtitle" style="text-transform: capitalize;">${statusText}</p>
                  <div class="header-right">
                    ${this._renderPowerButton(powerEntity)}
                    ${battery && battery.state !== "unavailable"
                      ? html`
                          <div class="status-chip ${parseInt(battery.state) < 20 ? 'error' : 'idle'}" @click=${() => this._showMoreInfo(c.battery_sensor)} style="cursor: pointer;">
                            <ha-icon icon="mdi:battery" style="--mdc-icon-size:14px;"></ha-icon>
                            <span>${battery.state}%</span>
                          </div>
                        `
                      : ""}
                    <div class="status-chip ${chipClass}">${chipLabel}</div>
                  </div>
                </div>
              </div>
            `
          : ""}

        <div class="card-content ${isPowerOff ? "power-off-card" : ""}">
          ${c.bhyve_mode !== false
            ? html`
                <div class="ring-container">
                  <div class="ring-slider" @pointerdown=${this._startHoseDrag} @pointermove=${this._onHoseDrag} @pointerup=${this._endHoseDrag} style="touch-action: none; cursor: ${isOpen ? 'default' : 'pointer'};">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--divider-color, rgba(128,128,128,0.2))" stroke-width="6"></circle>
                      <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${isOpen ? "var(--info-color, #03a9f4)" : "var(--primary-color)"}" stroke-width="6" stroke-dasharray="${dasharray}" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition: stroke-dasharray 0.1s linear;"></circle>
                      ${!isOpen
                        ? html`
                            <circle cx="${knobX}" cy="${knobY}" r="5" fill="#fff" stroke="var(--primary-color)" stroke-width="2" style="transition: cx 0.1s linear, cy 0.1s linear;"></circle>
                          `
                        : ""}
                    </svg>
                    <div class="ring-content">
                      <span class="ring-value" style="color: ${isOpen ? 'var(--info-color, #03a9f4)' : 'var(--primary-text-color)'}">${currentVal}</span>
                      <span class="ring-label">MIN</span>
                    </div>
                  </div>
                </div>
              `
            : ""}

          <div class="control-group m3-card" style="margin-top: 14px;">
            <div class="controls-container" style="display:flex; gap:8px;">
              <!-- Match exact original button text formatting & style -->
              <button
                class="recirc-button ${isOpen ? "active" : ""}"
                @click=${() => this._toggleHoseWatering()}
              >
                <ha-icon icon="${isOpen ? "mdi:water-off" : "mdi:water"}"></ha-icon>
                <span class="button-content">
                  <span class="main-label">${isOpen ? "START WATERING" : "START WATERING"}</span>
                  ${!isOpen
                    ? html`<span class="sub-label">• ${lastStart !== '--' ? lastStart : '1:57 PM'}</span>`
                    : html`<span class="sub-label">• ${currentRuntime} min elapsed</span>`}
                </span>
              </button>
              <button class="settings-btn ${this._showHoseSettings ? "active" : ""}" @click=${() => (this._showHoseSettings = !this._showHoseSettings)}>
                <ha-icon icon="mdi:cog"></ha-icon>
              </button>
            </div>

            ${this._showHoseSettings
              ? html`
                  <div class="settings-drawer" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--divider-color); display:flex; flex-direction:column; gap:12px;">
                    ${smartWatering
                      ? html`
                          <div class="control-row">
                            <div class="control-label-group">
                              <ha-icon icon="mdi:auto-fix"></ha-icon>
                              <span class="control-label">Smart Watering</span>
                            </div>
                            <ha-switch .checked=${smartWatering.state === "on"} @change=${() => this._toggleEntity(c.smart_watering_switch)} class="popup-switch"></ha-switch>
                          </div>
                        `
                      : ""}
                    ${rainDelay
                      ? html`
                          <div class="control-row">
                            <div class="control-label-group">
                              <ha-icon icon="mdi:weather-pouring"></ha-icon>
                              <span class="control-label">Rain Delay</span>
                            </div>
                            <ha-switch .checked=${rainDelay.state === "on"} @change=${() => this._toggleEntity(c.rain_delay_switch)} class="popup-switch"></ha-switch>
                          </div>
                        `
                      : ""}
                  </div>
                `
              : ""}
          </div>

          <!-- 24px Pill Rounded Next & Last Blocks -->
          <div class="stats-row" style="margin-top: 14px; display: flex; gap: 12px;">
            <div class="stat-inline" style="flex:1; background:var(--secondary-background-color, rgba(128,128,128,0.15)); padding:14px 16px; border-radius:24px; cursor:pointer;" @click=${() => this._showMoreInfo(c.next_watering_sensor)}>
              <div class="stat-inline-header" style="display:flex; align-items:center; gap:6px; font-size:0.9rem; color:var(--secondary-text-color);">
                <ha-icon icon="mdi:calendar-clock"></ha-icon> <span>Next</span>
              </div>
              <div style="font-weight:bold; margin-top:4px; font-size:0.9rem;">
                ${nextWatering && nextWatering.state !== "unavailable" ? this._formatShortTime(new Date(nextWatering.state)) : "Unknown"}
              </div>
            </div>

            <div class="stat-inline" style="flex:1; background:var(--secondary-background-color, rgba(128,128,128,0.15)); padding:14px 16px; border-radius:24px; cursor:pointer;" @click=${() => this._showMoreInfo(c.history_sensor)}>
              <div class="stat-inline-header" style="display:flex; align-items:center; gap:6px; font-size:0.9rem; color:var(--secondary-text-color);">
                <ha-icon icon="mdi:history"></ha-icon> <span>Last</span>
              </div>
              <div style="font-weight:bold; margin-top:4px; font-size:0.9rem; color:var(--info-color, #3182ce);">
                ${history && history.state !== "unavailable" ? history.state : `${lastRunTime !== '--' ? lastRunTime : '31 min'} • ${lastGallons !== '--' ? lastGallons : '187 gal'}`}
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _startHoseDrag(e) {
    this._isDragging = true;
    this.shadowRoot.querySelector('.ring-slider')?.setPointerCapture(e.pointerId);
    this._updateHoseRing(e);
  }

  _onHoseDrag(e) {
    if (this._isDragging) this._updateHoseRing(e);
  }

  _endHoseDrag(e) {
    this._isDragging = false;
    this.shadowRoot.querySelector('.ring-slider')?.releasePointerCapture(e.pointerId);
  }

  _updateHoseRing(e) {
    const slider = this.shadowRoot.querySelector('.ring-slider');
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    let val = Math.round((angle / 360) * 120);
    if (val < 1) val = 1;
    if (val > 120) val = 120;
    this._manualRuntime = val;
  }

  _toggleHoseWatering() {
    this._fireHaptic("medium");
    const c = this.config;
    const valve = this._getEntity(c.valve_entity);
    const isOpen = valve.state === "open" || valve.state === "on";

    if (isOpen) {
      this.hass.callService("valve", "close_cover", { entity_id: c.valve_entity }).catch(() => {
        this.hass.callService("switch", "turn_off", { entity_id: c.valve_entity });
      });
    } else {
      if (c.bhyve_mode !== false) {
        this.hass.callService("bhyve", "start_watering", {
          entity_id: c.valve_entity,
          minutes: this._manualRuntime,
        }).catch(() => {
          this.hass.callService("valve", "open_cover", { entity_id: c.valve_entity });
        });
      } else {
        this.hass.callService("valve", "open_cover", { entity_id: c.valve_entity });
      }
    }
  }

  // ==========================================
  // STYLES & GRAPHIC CSS
  // ==========================================
  static get styles() {
    return css`
      ha-card {
        border-radius: var(--ha-card-border-radius, 12px);
        background: var(--ha-card-background, #fff);
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.1));
        overflow: hidden;
        color: var(--primary-text-color);
      }

      /* HEADER */
      .header {
        padding: 16px 16px 0;
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        padding-bottom: 16px;
        margin-bottom: 16px;
        flex-shrink: 0;
        gap: 4px;
      }
      .title {
        font-size: 24px;
        font-weight: 500;
        margin: 0;
        letter-spacing: -0.01em;
        display: flex;
        align-items: center;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .header-subtitle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 4px;
      }
      .subtitle {
        color: var(--secondary-text-color, #757575);
        font-size: 14px;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .status-chip {
        font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;
        background: rgba(128, 128, 128, 0.15); color: var(--secondary-text-color);
        display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; flex-direction: row;
      }
      .status-chip.idle { background: rgba(128, 128, 128, 0.15); color: var(--secondary-text-color); }
      .status-chip.active-alert, .status-chip.heating { background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15); color: var(--error-color, #f44336); }
      .status-chip.active-cooktop, .status-chip.active-warning, .status-chip.active-washer { background: rgba(var(--rgb-info-color, 49, 130, 206), 0.15); color: var(--info-color, #3182ce); }
      .status-chip.active-dryer { background: rgba(var(--rgb-warning-color, 237, 137, 54), 0.15); color: var(--warning-color, #ed8936); }
      .status-chip.power-off { background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15); color: var(--error-color, #f44336); border: 1px solid rgba(var(--rgb-error-color, 244, 67, 54), 0.3); }

      /* POWER BUTTON & POWER OFF STATES */
      .power-btn-header {
        width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s ease; border: 1px solid var(--divider-color, rgba(128, 128, 128, 0.3));
        background: var(--card-background-color, rgba(128, 128, 128, 0.1)); flex-shrink: 0;
      }
      .power-btn-header.on {
        color: var(--success-color, #4caf50); border-color: var(--success-color, #4caf50);
        background: rgba(var(--rgb-success-color, 76, 175, 80), 0.15); box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
      }
      .power-btn-header.off {
        color: var(--error-color, #f44336); border-color: var(--error-color, #f44336);
        background: rgba(var(--rgb-error-color, 244, 67, 54), 0.12); opacity: 0.85;
      }
      .power-btn-header:hover { transform: scale(1.08); }
      .power-btn-header:active { transform: scale(0.95); }
      .power-btn-header ha-icon { --mdc-icon-size: 18px; }

      .unit-power-btn { width: 24px; height: 24px; margin-left: 6px; }
      .unit-power-btn ha-icon { --mdc-icon-size: 14px; }

      .power-off-card { opacity: 0.55; filter: grayscale(0.5); pointer-events: none; transition: all 0.3s ease; }
      .power-off-card .power-btn-header, .power-off-card .settings-btn { pointer-events: auto; }
      .unit-power-off { opacity: 0.55; filter: grayscale(0.5); transition: all 0.3s ease; }
      .unit-power-off .power-btn-header { pointer-events: auto; }
      .unit-power-off .spinner { animation: none !important; }

      .card-content { padding: 16px; container-type: inline-size; }
      .header + .card-content, .header ~ .card-content { padding-top: 0; }

      /* REFRIGERATOR GRAPHICS */
      .fridge-body { display: flex; height: 320px; }
      .fridge-door { flex: 1; background: var(--secondary-background-color); border: 2px solid var(--primary-background-color); position: relative; display: flex; flex-direction: column; transition: background-color 0.3s ease; border-radius: 0; }
      .fridge-left-door { border-right-width: 1px; border-top-left-radius: var(--ha-card-border-radius, 12px); }
      .fridge-right-door { border-left-width: 1px; border-top-right-radius: var(--ha-card-border-radius, 12px); }
      .fridge-freezer-drawer {
        height: 150px; background: var(--secondary-background-color); border: 2px solid var(--primary-background-color); border-top: none;
        border-bottom-left-radius: var(--ha-card-border-radius, 12px); border-bottom-right-radius: var(--ha-card-border-radius, 12px);
        position: relative; display: flex; justify-content: center; align-items: center; cursor: pointer;
      }
      .door-open { background-color: rgba(var(--rgb-warning-color, 255, 152, 0), 0.15); color: var(--warning-color, #ff9800); }
      .fridge-door.door-open, .fridge-freezer-drawer.door-open {
        background-color: rgba(var(--rgb-warning-color, 255, 152, 0), 0.18) !important;
        border-color: var(--warning-color, #ff9800) !important;
        box-shadow: 0 0 12px rgba(var(--rgb-warning-color, 255, 152, 0), 0.35) !important;
      }
      .fridge-door.door-open .fridge-handle, .fridge-freezer-drawer.door-open .freezer-handle {
        background: var(--warning-color, #ff9800) !important;
        box-shadow: 0 0 8px rgba(var(--rgb-warning-color, 255, 152, 0), 0.5) !important;
      }
      .fridge-handle { position: absolute; top: 20px; bottom: 20px; width: 12px; background: var(--disabled-text-color); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2); }
      .left-handle { right: 10px; z-index: 1; }
      .right-handle { left: 10px; z-index: 1; }
      .freezer-handle { position: absolute; top: 15px; left: 20px; right: 20px; height: 12px; background: var(--disabled-text-color); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2); }
      .left-door-content { padding: 24px 34px 18px 12px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; box-sizing: border-box; }
      .right-door-content { padding: 16px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; }
      .dispenser-group { display: flex; flex-direction: column; align-items: center; width: 85%; margin-bottom: 8px; }
      .dispenser { width: 100%; max-width: 90px; height: 125px; background: var(--primary-background-color); border-radius: 8px; display: flex; flex-direction: column; align-items: center; padding: 8px; box-sizing: border-box; cursor: pointer; }
      .dispenser-screen { width: 80%; height: 40px; background: var(--secondary-background-color); border-radius: 4px; margin-bottom: 8px; }
      .dispenser-lever { width: 20px; flex-grow: 1; background: var(--disabled-text-color); border-radius: 4px; }
      .temp-display { width: auto; min-width: 90px; text-align: center; color: var(--primary-text-color); cursor: pointer; background: rgba(0, 0, 0, 0.2); padding: 4px 8px; border-radius: 8px; }
      .fridge-temp { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80%; max-width: 120px; margin: auto; }
      .freezer-temp { width: 60%; }
      .temp-value { font-size: 2.5em; font-weight: bold; line-height: 1; }
      .temp-setpoint { font-size: 1.3em; opacity: 0.8; }

      /* INDUCTION RANGE GRAPHICS */
      .graphics-container { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 24px; }
      .cooktop-container, .oven-container { flex: 1; min-width: 280px; }
      .cooktop-container { aspect-ratio: 1.75 / 1; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: var(--ha-card-border-radius, 12px); position: relative; }
      .burner { position: absolute; border: 2px solid var(--secondary-text-color); border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; box-sizing: border-box; aspect-ratio: 1; z-index: 1; }
      .burner-off { opacity: 0.6; background: var(--disabled-text-color) !important; }
      .burner-on { opacity: 1; border-color: var(--warning-color, #ed8936); background: rgba(var(--warning-color-rgb, 237, 137, 54), 0.15) !important; box-shadow: inset 0 0 20px 5px rgba(var(--warning-color-rgb, 237, 137, 54), 0.2); }
      .burner .status-text { color: var(--primary-text-color); font-weight: bold; font-size: 0.9em; }
      .sync-line { position: absolute; top: 36%; height: 24%; width: 2%; background-color: var(--disabled-text-color); border-radius: 8px; opacity: 0.6; z-index: 0; }
      .sync-line.synced-on { background-color: var(--warning-color); opacity: 1; box-shadow: 0 0 10px 2px var(--warning-color); }
      .oven-container { height: 250px; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 12px; display: flex; flex-direction: column; padding: 8px; box-sizing: border-box; }
      .oven-control-panel { background: var(--primary-background-color); height: 18%; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; }
      .oven-knob { fill: transparent; stroke: var(--secondary-text-color); stroke-width: 2; }
      .oven-screen { fill: rgba(128, 128, 128, 0.1); stroke: var(--secondary-text-color); stroke-width: 1.5; }
      .oven { position: relative; flex-grow: 1; border: 2px solid var(--divider-color); border-radius: 8px; cursor: pointer; padding: 5px; box-sizing: border-box; display: flex; justify-content: center; align-items: center; background: var(--card-background-color, #fff); }
      .upper-oven { margin-bottom: 8px; flex-grow: 0.5; }
      .lower-oven { flex-grow: 1.3; }
      .oven.oven-on { background: rgba(var(--error-color-rgb, 229, 62, 62), 0.15) !important; color: var(--error-color, #e53e3e); border-color: var(--error-color, #e53e3e); }
      .oven-handle { position: absolute; top: 10px; left: 15px; right: 15px; height: 12px; background: var(--disabled-text-color); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2); }
      .oven-info { display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
      .oven-state { font-weight: bold; font-size: 1.1em; }
      .oven-temps { font-size: 0.8em; opacity: 0.8; }

      /* LAUNDRY DRUM STACK GRAPHICS */
      .appliance-container {
        display: flex; flex-direction: column; align-items: center;
        background: var(--secondary-background-color, #f5f5f5); border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-card-border-radius, 12px); padding: 16px; box-sizing: border-box;
      }
      .appliance-container:not(:last-child) {
        margin-bottom: 16px;
      }
      .graphic-header { display: flex; width: 100%; justify-content: space-between; align-items: center; margin-bottom: 12px; height: 48px; }
      .appliance-header { flex: 1; display: flex; align-items: center; color: var(--primary-text-color); }
      .appliance-header .name { margin-left: 8px; font-weight: 500; font-size: 1.2em; }
      .knob-container { flex: 1; display: flex; justify-content: center; }
      .knob-svg { width: 48px; height: 48px; }
      .knob { fill: var(--card-background-color, #fff); stroke: var(--divider-color); stroke-width: 2; }
      .screen-container { flex: 1; display: flex; justify-content: flex-end; }
      .screen { width: 80px; height: 40px; background-color: var(--card-background-color, #fff); border: 1px solid var(--divider-color); border-radius: 8px; display: flex; justify-content: center; align-items: center; }
      .screen-time { color: var(--primary-color); font-weight: bold; font-size: 1.2em; font-family: monospace; }
      .graphic-body { width: 100%; max-width: 180px; }
      .laundry-door { width: 100%; padding-top: 100%; position: relative; border-radius: 50%; background: var(--card-background-color, #fff); border: 2px solid var(--divider-color, #e0e0e0); display: flex; justify-content: center; align-items: center; cursor: pointer; }
      .spinner-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      .spinner { animation: spin 1.5s linear infinite; transform-origin: center; }
      .spinner-arc { fill: transparent; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 212; stroke-dashoffset: 70; }
      .spinner-arc.washer-active { stroke: var(--info-color, #3182ce); }
      .spinner-arc.dryer-active { stroke: var(--warning-color, #ed8936); }
      .laundry-door-inner { position: absolute; top: 15%; left: 15%; right: 15%; bottom: 15%; border-radius: 50%; background-color: rgba(128, 128, 128, 0.05); border: 1px solid var(--divider-color); }
      .laundry-door-inner.washer-active { box-shadow: inset 0 0 20px 5px rgba(var(--rgb-info-color, 49, 130, 206), 0.2); }
      .laundry-door-inner.dryer-active { box-shadow: inset 0 0 20px 5px rgba(var(--rgb-warning-color, 237, 137, 54), 0.2); }
      .door-info { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
      .door-state { font-weight: bold; font-size: 1.1em; color: var(--primary-text-color); text-transform: capitalize; }

      /* NAVIEN WATER HEATER SVG & TELEMETRY */
      .viz-container {
        position: relative; width: 100%; max-width: 320px; height: 260px; margin: 0 auto;
        background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 12px;
      }
      .box-controls { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .temp-display { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2px 0; }
      .temp-btn {
        width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: transform 0.1s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      }
      .temp-btn:active { transform: scale(0.95); }
      .temp-btn ha-icon { --mdc-icon-size: 24px; }
      .temp-btn.up { background-color: var(--warning-color, #ff9800); color: #fff; }
      .temp-btn.down { background-color: var(--info-color, #2196f3); color: #fff; }
      .temp-val { font-size: 2.2em; font-weight: bold; line-height: 1; text-align: center; }
      .temp-label { font-size: 0.6em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; opacity: 0.8; text-align: center; margin-top: 2px; }
      .overlay-stat {
        position: absolute; display: flex; flex-direction: column; align-items: center; font-size: 0.85em; font-weight: bold;
        background: var(--card-background-color, #fff); padding: 4px 8px; border-radius: 6px; cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid var(--divider-color);
      }
      .overlay-stat.inlet { color: var(--info-color, #2196f3); }
      .overlay-stat.outlet { color: var(--error-color, #f44336); }
      .overlay-stat .label { font-size: 0.7em; font-weight: normal; opacity: 0.8; color: var(--secondary-text-color); }
      .flow-anim { stroke-dasharray: 8; opacity: 0; transition: opacity 0.3s; }
      .flow-anim.flowing { opacity: 1; animation: flow 1s linear infinite; }
      @keyframes flow { from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; } }

      .recirc-button {
        background: var(--primary-color, #2196f3); color: var(--text-primary-color, #fff); border: none; padding: 10px 24px; border-radius: 24px;
        font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        text-transform: uppercase; letter-spacing: 0.05em; transition: box-shadow 0.2s, background-color 0.2s; flex: 1;
        box-shadow: 0 2px 4px -1px rgba(0,0,0,0.2);
      }
      .recirc-button.active { background-color: var(--success-color, #4caf50); }
      .button-content { display: flex; flex-direction: column; align-items: flex-start; }
      .main-label { font-weight: 500; }
      .sub-label { font-size: 0.7em; opacity: 0.8; text-transform: none; font-weight: 400; }
      .settings-btn { background: transparent; border: 1px solid var(--divider-color, #e0e0e0); color: var(--secondary-text-color); width: 48px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .settings-btn.active { background: var(--secondary-background-color); color: var(--primary-color); border-color: var(--primary-color); }

      /* STEPPER PILL CONTROLLER */
      .step-controller-pill {
        display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.4);
        border-radius: 20px; padding: 4px 10px; gap: 8px; border: none; flex-shrink: 0; box-sizing: border-box;
      }
      .pill-btn {
        background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px;
        display: flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 700; opacity: 0.85; white-space: nowrap; flex-shrink: 0;
      }
      .pill-btn:hover { opacity: 1; }
      .pill-value { font-weight: 600; font-size: 0.9rem; color: var(--primary-text-color); white-space: nowrap; text-align: center; }

      /* TIMELINE TRACK & INTERACTIVE POINTER HOVER */
      .timeline-track {
        cursor: pointer;
      }
      .timeline-segment {
        cursor: pointer !important;
        transition: opacity 0.15s ease, filter 0.15s ease;
      }
      .timeline-segment:hover {
        opacity: 0.75;
        filter: brightness(1.3);
      }

      /* SMART HOSE RING SLIDER */
      .ring-container { display: flex; justify-content: center; align-items: center; margin-bottom: 16px; }
      .ring-slider { position: relative; width: 160px; height: 160px; }
      .ring-content { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; }
      .ring-value { font-size: 2.5rem; font-weight: 800; line-height: 1; }
      .ring-label { font-size: 0.75rem; letter-spacing: 0.05em; color: var(--secondary-text-color); margin-top: 4px; }

      /* UNIFORM POPUP STYLES & BOTTOM SHEET */
      @keyframes ha-popup-backdrop-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ha-popup-backdrop-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes ha-popup-dialog-in {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes ha-popup-dialog-out {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(12px) scale(0.97);
        }
      }
      @keyframes ha-popup-sheet-in {
        from {
          transform: translateY(100%);
          opacity: 0.5;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes ha-popup-sheet-out {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }

      .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background-color: var(--mdc-dialog-scrim-color, var(--dialog-backdrop-background, rgba(0, 0, 0, 0.32)));
        backdrop-filter: var(--dialog-backdrop-filter, none);
        -webkit-backdrop-filter: var(--dialog-backdrop-filter, none);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
        box-sizing: border-box;
        overflow-x: hidden;
        z-index: 9999;
        animation: ha-popup-backdrop-fade-in var(--motion-duration-medium, var(--ha-animation-duration, 280ms)) var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) forwards;
        will-change: opacity;
      }
      .popup-overlay.closing {
        animation: ha-popup-backdrop-fade-out var(--motion-duration-short, 180ms) var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) forwards;
      }

      .popup-content {
        background-color: var(--ha-card-background, var(--card-background-color, #fff));
        padding: 16px 20px 20px;
        border-radius: var(--ha-dialog-border-radius, var(--ha-card-border-radius, 24px));
        width: 100%;
        max-width: 440px;
        max-height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
        color: var(--primary-text-color);
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        box-sizing: border-box;
        animation: ha-popup-dialog-in var(--motion-duration-medium, var(--ha-animation-duration, 280ms)) var(--motion-easing-emphasized, var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1))) forwards;
        will-change: transform, opacity;
      }
      .popup-content.closing {
        animation: ha-popup-dialog-out var(--motion-duration-short, 180ms) var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) forwards;
      }
      .drag-handle { display: none; }
      
      .popup-header {
        display: flex; align-items: center; justify-content: flex-start; gap: 10px; width: 100%;
        padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }
      .popup-header h3 {
        margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--primary-text-color); letter-spacing: 0.01em;
      }
      .close-button {
        background: none; border: none; padding: 4px; cursor: pointer; color: var(--primary-text-color);
        display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s;
      }
      .close-button:hover { background-color: rgba(255, 255, 255, 0.1); }
      .close-button ha-icon { --mdc-icon-size: 20px; }

      /* NATIVE TEMPERATURE CONTROLLER */
      .native-temp-card {
        background: rgba(128, 128, 128, 0.08);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 16px;
        padding: 14px 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: all 0.3s ease;
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
      }
      .native-temp-card.is-heating {
        background: rgba(var(--rgb-warning-color, 255, 152, 0), 0.08);
        border-color: rgba(var(--rgb-warning-color, 255, 152, 0), 0.35);
        box-shadow: 0 4px 16px rgba(var(--rgb-warning-color, 255, 152, 0), 0.12);
      }
      .temp-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
      }
      .heating-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        background: rgba(128, 128, 128, 0.12);
        color: var(--primary-text-color);
        box-sizing: border-box;
      }
      .heating-status-badge.active-heat {
        background: rgba(var(--rgb-warning-color, 255, 152, 0), 0.2);
        color: var(--warning-color, #ff9800);
        animation: pulse-heat 2s infinite ease-in-out;
      }
      @keyframes pulse-heat {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.75; }
      }
      .time-remaining-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.78rem;
        color: var(--secondary-text-color);
        font-weight: 500;
      }
      .temp-dial-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        width: 100%;
        box-sizing: border-box;
      }
      .temp-stepper-btn {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: var(--card-background-color, rgba(128, 128, 128, 0.15));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        transition: transform 0.15s ease, background 0.2s ease;
        box-sizing: border-box;
      }
      .temp-stepper-btn:active {
        transform: scale(0.92);
        background: var(--primary-color, #3b82f6);
        color: #fff;
      }
      .temp-stepper-btn ha-icon {
        --mdc-icon-size: 24px;
      }
      .temp-dial-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        user-select: none;
      }
      .temp-sub-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 2px;
      }
      .temp-sub-label {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
      }
      .temp-sub-val {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--info-color, #3b82f6);
      }
      .temp-main-display {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        line-height: 1;
      }
      .temp-main-number {
        font-size: 2.8rem;
        font-weight: 800;
        color: var(--primary-text-color);
        letter-spacing: -0.02em;
      }
      .temp-main-unit {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--secondary-text-color);
        margin-left: 2px;
        margin-top: 4px;
      }
      .temp-main-caption {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }
      .temp-slider-container {
        width: 100%;
        box-sizing: border-box;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 2px 0;
      }
      .temp-slider-input {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: rgba(128, 128, 128, 0.2);
        outline: none;
        cursor: pointer;
        transition: background 0.2s ease;
        margin: 6px 0 2px;
        box-sizing: border-box;
      }
      .temp-slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--primary-color, #3b82f6);
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: transform 0.15s ease, background-color 0.2s ease;
      }
      .temp-slider-input::-webkit-slider-thumb:hover,
      .temp-slider-input::-webkit-slider-thumb:active {
        transform: scale(1.18);
        background: var(--primary-color, #2563eb);
      }
      .temp-slider-input::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--primary-color, #3b82f6);
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: transform 0.15s ease, background-color 0.2s ease;
      }
      .temp-slider-input.is-heating::-webkit-slider-thumb {
        background: var(--warning-color, #ff9800);
      }
      .temp-slider-input.is-heating::-moz-range-thumb {
        background: var(--warning-color, #ff9800);
      }
      .temp-range-bounds {
        display: flex;
        justify-content: space-between;
        font-size: 0.72rem;
        color: var(--secondary-text-color);
        box-sizing: border-box;
        width: 100%;
        padding: 0 2px;
      }
      .filter-control-row {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
      }
      .popup-controls {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 4px 0;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow-x: hidden;
      }
      .preset-button.active-preset {
        background: var(--primary-color, #3b82f6) !important;
        color: #ffffff !important;
        border-color: var(--primary-color, #3b82f6) !important;
        box-shadow: 0 2px 8px rgba(var(--rgb-primary-color, 59, 130, 246), 0.35);
      }

      .control-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 34px; margin: 2px 0; }
      .control-label-group { display: flex; align-items: center; gap: 10px; color: var(--primary-text-color); }
      .control-label-group ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color, #a1a1aa); }
      .control-label { font-size: 0.95rem; font-weight: 500; color: var(--primary-text-color); }
      .popup-switch { margin-left: auto; }
      .control-value { margin-left: auto; font-weight: 600; font-size: 0.95rem; }

      .floating-cancel-button { background-color: var(--error-color, #ef4444); color: white; border: none; border-radius: 8px; padding: 6px 12px; font-weight: 500; cursor: pointer; }
      .preset-buttons { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; }
      .preset-button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background-color: rgba(128, 128, 128, 0.15); color: var(--primary-text-color); border: none; border-radius: 12px; padding: 12px 8px; font-weight: 500; font-size: 0.9em; cursor: pointer; }
      .divider { border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12)); margin: 4px 0; width: 100%; }

      /* FLUSH GUIDE MODAL */
      .modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background-color: var(--mdc-dialog-scrim-color, var(--dialog-backdrop-background, rgba(0, 0, 0, 0.32)));
        z-index: 9999; display: flex; justify-content: center; align-items: flex-end;
        backdrop-filter: var(--dialog-backdrop-filter, none);
        -webkit-backdrop-filter: var(--dialog-backdrop-filter, none);
        animation: ha-popup-backdrop-fade-in var(--motion-duration-medium, var(--ha-animation-duration, 280ms)) var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) forwards;
      }
      .modal-content {
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border-radius: var(--ha-dialog-border-radius, 28px) var(--ha-dialog-border-radius, 28px) 0 0;
        width: 100%; max-width: 600px; display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
        box-shadow: var(--ha-dialog-box-shadow, 0 -8px 24px rgba(0, 0, 0, 0.35));
        color: var(--primary-text-color);
        animation: ha-popup-sheet-in var(--motion-duration-medium, var(--ha-animation-duration, 300ms)) var(--motion-easing-emphasized, var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1))) forwards;
      }
      .modal-header { padding: 16px 20px; background: #86efac; color: #052e16; display: flex; justify-content: space-between; align-items: center; }
      .modal-header h2 { margin: 0; font-size: 1.2em; font-weight: 700; }
      .close-btn { background: none; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 50%; }
      .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
      .materials-section { background: rgba(34, 197, 94, 0.1); padding: 16px; border-radius: 16px; margin-bottom: 20px; border: 1px solid rgba(34, 197, 94, 0.2); }
      .materials-section h3 { margin: 0 0 10px 0; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: #4ade80; }
      .materials-section ul { margin: 0; padding-left: 20px; }
      .materials-section li { margin-bottom: 6px; font-size: 0.95rem; }
      .step-timeline { display: flex; flex-direction: column; gap: 16px; }
      .step { display: flex; gap: 14px; }
      .step-num { background: #86efac; color: #052e16; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; flex-shrink: 0; margin-top: 2px; }
      .step-content h4 { margin: 0 0 4px 0; font-size: 1.05rem; }
      .step-content p { margin: 0 0 4px 0; font-size: 0.9rem; color: var(--secondary-text-color); line-height: 1.4; }

      /* HIGH CONTRAST STATUS CHIPS */
      .status-chip { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.02em; }
      .status-chip.active-cool {
        background: var(--info-color, #0284c7);
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 0 8px rgba(var(--rgb-info-color, 3, 169, 244), 0.4);
      }
      .status-chip.idle-cool {
        background: rgba(var(--rgb-info-color, 3, 169, 244), 0.12);
        color: var(--info-color, #38bdf8);
        border: 1px solid rgba(var(--rgb-info-color, 3, 169, 244), 0.3);
      }
      .status-chip.active-heat {
        background: var(--warning-color, #ea580c);
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 0 8px rgba(var(--rgb-warning-color, 255, 152, 0), 0.4);
      }
      .status-chip.idle-heat {
        background: rgba(var(--rgb-warning-color, 255, 152, 0), 0.12);
        color: var(--warning-color, #ff9800);
        border: 1px solid rgba(var(--rgb-warning-color, 255, 152, 0), 0.3);
      }
      .status-chip.active-fan {
        background: var(--success-color, #16a34a);
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.4);
      }
      .status-chip.idle-auto {
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.3);
      }
      .status-chip.power-off {
        background: rgba(255, 255, 255, 0.08);
        color: var(--secondary-text-color, #a1a1aa);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }

      @media (max-width: 768px) {
        .popup-overlay,
        .modal-overlay {
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          overscroll-behavior: contain;
          touch-action: none;
        }
        .popup-content,
        .modal-content {
          width: 100%;
          max-width: 100%;
          border-radius: var(--ha-dialog-border-radius, 24px) var(--ha-dialog-border-radius, 24px) 0 0;
          border-bottom: none;
          border-left: none;
          border-right: none;
          padding-bottom: max(24px, env(safe-area-inset-bottom, 24px));
          overscroll-behavior: contain;
          animation: ha-popup-sheet-in var(--motion-duration-medium, var(--ha-animation-duration, 300ms)) var(--motion-easing-emphasized, var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1))) forwards;
        }
        .popup-content.closing,
        .modal-content.closing {
          animation: ha-popup-sheet-out var(--motion-duration-short, 180ms) var(--motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) forwards;
        }
        .drag-handle { display: block; width: 36px; height: 5px; background-color: var(--secondary-text-color, #888); border-radius: 3px; margin: -4px auto 12px auto; flex-shrink: 0; position: sticky; top: -12px; z-index: 10; }
      }

      @media (prefers-reduced-motion: reduce) {
        .popup-overlay, .popup-content, .modal-overlay, .modal-content {
          animation: none !important;
          transition: none !important;
        }
      }
      /* POPUP TABS NAVIGATION */
      .popup-tabs {
        display: flex;
        background: rgba(128, 128, 128, 0.12);
        padding: 4px;
        border-radius: 14px;
        gap: 4px;
        margin-bottom: 14px;
        width: 100%;
        box-sizing: border-box;
      }
      .popup-tab {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 10px;
        background: transparent;
        border: none;
        color: var(--secondary-text-color);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
        box-sizing: border-box;
      }
      .popup-tab ha-icon {
        --mdc-icon-size: 16px;
      }
      .popup-tab:hover {
        color: var(--primary-text-color);
        background: rgba(128, 128, 128, 0.15);
      }
      .popup-tab.active-tab {
        background: var(--card-background-color, #fff);
        color: var(--primary-color, #3b82f6);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      }

      /* TEMPERATURE CONTROLLER MODE DROPDOWN */
      .temp-mode-dropdown-container {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(128, 128, 128, 0.12);
        padding: 3px 8px 3px 10px;
        border-radius: 20px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        box-sizing: border-box;
      }
      .temp-mode-label {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
      }
      .temp-mode-dropdown-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .temp-mode-dropdown-wrapper ha-icon {
        --mdc-icon-size: 16px;
        color: var(--primary-color, #3b82f6);
      }
      .temp-mode-select {
        background: transparent;
        border: none;
        color: var(--primary-text-color);
        font-size: 0.82rem;
        font-weight: 700;
        outline: none;
        cursor: pointer;
        padding-right: 4px;
      }
      .temp-mode-select option {
        background: var(--ha-card-background, #fff);
        color: var(--primary-text-color);
      }
      .native-temp-card.is-mode-off {
        opacity: 0.85;
      }
      .select-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      .popup-select-input {
        background: var(--card-background-color, rgba(128, 128, 128, 0.15));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        padding: 6px 10px;
        color: var(--primary-text-color);
        font-size: 0.85rem;
        outline: none;
        cursor: pointer;
        max-width: 180px;
        box-sizing: border-box;
      }
      .popup-select-input option {
        background: var(--ha-card-background, #fff);
        color: var(--primary-text-color);
      }

    `;
  }
}

// ==========================================
// VISUAL CARD EDITOR WITH FULL ENTITY PICKERS
// ==========================================
class PassableApplianceCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  setConfig(config) {
    this.config = config || {};
  }

  _updateConfig(newConfig) {
    this.config = newConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      })
    );
    this.requestUpdate();
  }

  _onFieldChange(ev) {
    if (!this.config) return;
    const target = ev.target;
    const key = target.configValue || target.getAttribute("configValue");
    if (!key) return;

    let val = ev.detail && ev.detail.value !== undefined
      ? ev.detail.value
      : (target.checked !== undefined ? target.checked : target.value);

    const newConfig = { ...this.config };
    if (val === "" || val === undefined || val === null) {
      delete newConfig[key];
    } else {
      newConfig[key] = val;
    }
    this._updateConfig(newConfig);
  }

  _onSelectType(ev) {
    const val = ev.target.value;
    const newConfig = { ...this.config, appliance_type: val };
    this._updateConfig(newConfig);
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const applianceType = this.config.appliance_type || "auto";

    return html`
      <div class="editor-container">
        <!-- Card Title Input -->
        <div class="form-group">
          <label class="form-label">Card Title</label>
          <ha-textfield
            label="Title (Optional)"
            .value=${this.config.title || ""}
            .configValue=${"title"}
            @input=${this._onFieldChange}
          ></ha-textfield>
        </div>

        <!-- Show Header Switch -->
        <div class="form-group" style="display:flex; align-items:center; justify-content:space-between;">
          <label class="form-label">Show Card Header</label>
          <ha-switch
            .checked=${this.config.show_header !== false}
            .configValue=${"show_header"}
            @change=${this._onFieldChange}
          ></ha-switch>
        </div>

        <!-- Appliance Type Selector -->
        <div class="form-group">
          <label class="form-label">Appliance Type</label>
          <select
            class="custom-select"
            .value=${applianceType}
            @change=${this._onSelectType}
          >
            <option value="auto">Auto-detect</option>
            <option value="refrigerator">Refrigerator</option>
            <option value="induction_range">Induction Range & Oven</option>
            <option value="laundry">Laundry (Washer & Dryer)</option>
            <option value="water_heater">Water Heater</option>
            <option value="smart_hose_timer">Smart Hose Timer</option>
          </select>
        </div>

        <!-- Device Prefix Field -->
        <div class="form-group">
          <label class="form-label">Device Prefix (Optional Shortcut)</label>
          <ha-textfield
            label="Device Prefix (e.g. dt507030 or sqdr174020p)"
            .value=${this.config.device_prefix || ""}
            .configValue=${"device_prefix"}
            @input=${this._onFieldChange}
          ></ha-textfield>
          <span class="form-help">Populates matching entity controls automatically.</span>
        </div>

        <!-- Appliance Specific Entity Pickers -->
        ${applianceType === "refrigerator" || applianceType === "auto"
          ? this._renderRefrigeratorEditor()
          : ""}
        ${applianceType === "induction_range"
          ? this._renderInductionRangeEditor()
          : ""}
        ${applianceType === "laundry"
          ? this._renderLaundryEditor()
          : ""}
        ${applianceType === "water_heater"
          ? this._renderWaterHeaterEditor()
          : ""}
        ${applianceType === "smart_hose_timer"
          ? this._renderSmartHoseTimerEditor()
          : ""}
      </div>
    `;
  }

  _renderRefrigeratorEditor() {
    return html`
      <div class="section-box">
        <h3>Refrigerator Entity Pickers</h3>
        
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.power_entity || undefined}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.fridge_control || undefined}
          .configValue=${"fridge_control"}
          .label=${"Fridge Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.freezer_control || undefined}
          .configValue=${"freezer_control"}
          .label=${"Freezer Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.dispenser_control || undefined}
          .configValue=${"dispenser_control"}
          .label=${"Dispenser Control Entity (for dial/presets popup)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.fridge_temp_current || undefined}
          .configValue=${"fridge_temp_current"}
          .label=${"Fridge Current Temp Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.freezer_temp_current || undefined}
          .configValue=${"freezer_temp_current"}
          .label=${"Freezer Current Temp Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: {} }}
          .value=${this.config.door_status || undefined}
          .configValue=${"door_status"}
          .label=${"Door Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.ice_maker_control || undefined}
          .configValue=${"ice_maker_control"}
          .label=${"Ice Maker Switch"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.water_filter_status || undefined}
          .configValue=${"water_filter_status"}
          .label=${"Water Filter Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>
    `;
  }

  _renderInductionRangeEditor() {
    return html`
      <div class="section-box">
        <h3>Induction Range Entity Pickers</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.power_entity || undefined}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.upper_control || undefined}
          .configValue=${"upper_control"}
          .label=${"Upper Oven Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.lower_control || undefined}
          .configValue=${"lower_control"}
          .label=${"Lower Oven Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["select", "switch", "light"] } }}
          .value=${this.config.upper_light_entity || undefined}
          .configValue=${"upper_light_entity"}
          .label=${"Upper Oven Light Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["select", "switch", "light"] } }}
          .value=${this.config.lower_light_entity || undefined}
          .configValue=${"lower_light_entity"}
          .label=${"Lower Oven Light Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>
    `;
  }

  _renderLaundryEditor() {
    return html`
      <div class="section-box">
        <h3>Laundry Entity Pickers</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.power_entity || undefined}
          .configValue=${"power_entity"}
          .label=${"Main Laundry Power Switch (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.washer_power || undefined}
          .configValue=${"washer_power"}
          .label=${"Washer Power Switch (e.g. switch.washer_power)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.washer_status || undefined}
          .configValue=${"washer_status"}
          .label=${"Washer Current Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["sensor", "select", "input_select"] } }}
          .value=${this.config.washer_operation || undefined}
          .configValue=${"washer_operation"}
          .label=${"Washer Cycle Operation (Sensor / Select)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.washer_remaining_time || undefined}
          .configValue=${"washer_remaining_time"}
          .label=${"Washer Remaining Time Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.dryer_power || undefined}
          .configValue=${"dryer_power"}
          .label=${"Dryer Power Switch (e.g. switch.dryer_power)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.dryer_status || undefined}
          .configValue=${"dryer_status"}
          .label=${"Dryer Current Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["sensor", "select", "input_select"] } }}
          .value=${this.config.dryer_operation || undefined}
          .configValue=${"dryer_operation"}
          .label=${"Dryer Cycle Operation (Sensor / Select)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.dryer_remaining_time || undefined}
          .configValue=${"dryer_remaining_time"}
          .label=${"Dryer Remaining Time Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>
    `;
  }

  _renderWaterHeaterEditor() {
    return html`
      <div class="section-box">
        <h3>Water Heater Entity Pickers</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.power_entity || undefined}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional, e.g. switch.water_heater_power)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "water_heater" } }}
          .value=${this.config.entity || undefined}
          .configValue=${"entity"}
          .label=${"Main Water Heater Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.inlet_temp_sensor || undefined}
          .configValue=${"inlet_temp_sensor"}
          .label=${"Inlet Temperature Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.outlet_temp_sensor || undefined}
          .configValue=${"outlet_temp_sensor"}
          .label=${"Outlet Temperature Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.flow_rate_sensor || undefined}
          .configValue=${"flow_rate_sensor"}
          .label=${"Flow Rate Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.gas_usage_sensor || undefined}
          .configValue=${"gas_usage_sensor"}
          .label=${"Gas Consumption Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "button"] } }}
          .value=${this.config.recirc_switch || undefined}
          .configValue=${"recirc_switch"}
          .label=${"Recirculation Switch / Control"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>
    `;
  }

  _renderSmartHoseTimerEditor() {
    return html`
      <div class="section-box">
        <h3>Smart Hose Timer Entity Pickers</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.power_entity || undefined}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["valve", "switch"] } }}
          .value=${this.config.valve_entity || undefined}
          .configValue=${"valve_entity"}
          .label=${"Zone Valve Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.state_sensor || undefined}
          .configValue=${"state_sensor"}
          .label=${"State Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.history_sensor || undefined}
          .configValue=${"history_sensor"}
          .label=${"History Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.battery_sensor || undefined}
          .configValue=${"battery_sensor"}
          .label=${"Battery Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.next_watering_sensor || undefined}
          .configValue=${"next_watering_sensor"}
          .label=${"Next Watering Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.smart_watering_switch || undefined}
          .configValue=${"smart_watering_switch"}
          .label=${"Smart Watering Switch (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.rain_delay_switch || undefined}
          .configValue=${"rain_delay_switch"}
          .label=${"Rain Delay Switch (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>
    `;
  }

  static get styles() {
    return css`
      .editor-container {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 8px 0;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--primary-text-color, #ffffff);
      }
      .form-help {
        font-size: 0.75rem;
        color: var(--secondary-text-color, #a1a1aa);
      }
      .custom-select {
        width: 100%;
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--card-background-color, #242426);
        color: var(--primary-text-color, #ffffff);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        font-size: 0.95rem;
        outline: none;
      }
      .section-box {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .section-box h3 {
        margin: 0 0 4px 0;
        font-size: 0.95rem;
        color: var(--primary-color, #60a5fa);
      }
      ha-textfield, ha-selector {
        width: 100%;
      }
    `;
  }
}

customElements.define("passable-appliance-card", PassableApplianceCard);
customElements.define("passable-appliance-card-editor", PassableApplianceCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "passable-appliance-card",
  name: "Passable Appliance Card",
  preview: true,
  documentationURL: "https://github.com/GBear09/passable-appliance-card",
  description: "Dynamic universal appliance card supporting refrigerators, induction ranges, laundry, water heaters, and smart hose timers.",
});
