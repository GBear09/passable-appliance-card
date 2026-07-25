/**
 * Passable Appliance Card
 * Version: 1.0.0
 * GitHub: https://github.com/GBear09/passable-appliance-card
 * 
 * Dynamic Universal Appliance Card for Home Assistant.
 * Supports:
 *  - Refrigerator & Freezer
 *  - Induction Range & Oven
 *  - Laundry (Washer & Dryer)
 *  - Water Heater (Navien & Generic)
 *  - Smart Hose Timer
 */

const CARD_VERSION = "1.0.0";

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

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
      _ovenTargetTemp: { state: true },
      _showFlushGuide: { state: true },
      _showRecircSettings: { state: true },
      _durationMinutes: { state: true },
      _selectedSegmentText: { state: true },
    };
  }

  constructor() {
    super();
    this._popup = null;
    this._popupOven = null;
    this._ovenTargetTemp = null;
    this._showFlushGuide = false;
    this._showRecircSettings = false;
    this._durationMinutes = 15;
    this._selectedSegmentText = "Tap timeline for details";
    this._cardId = `pac-${Math.random().toString(36).substr(2, 9)}`;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    const c = { ...config };
    c.appliance_type = c.appliance_type || "auto";

    // Refrigerator device prefix defaults
    if (c.device_prefix && (!c.fridge_control && !c.oven && !c.entity)) {
      const p = c.device_prefix;
      c.fridge_control = c.fridge_control || `water_heater.${p}_fridge`;
      c.freezer_control = c.freezer_control || `water_heater.${p}_freezer`;
      c.dispenser_control = c.dispenser_control || `water_heater.${p}_dispenser`;
      c.fridge_temp_current = c.fridge_temp_current || `sensor.${p}_current_temperature_fridge`;
      c.freezer_temp_current = c.freezer_temp_current || `sensor.${p}_current_temperature_freezer`;
      c.door_status = c.door_status || `sensor.${p}_door_status`;
      c.ice_maker_control = c.ice_maker_control || `switch.${p}_ice_maker_control`;
      c.water_filter_status = c.water_filter_status || `sensor.${p}_water_filter_status`;
      c.hot_water_in_use = c.hot_water_in_use || `binary_sensor.${p}_hot_water_in_use`;
      c.hot_water_set_temp = c.hot_water_set_temp || `sensor.${p}_hot_water_set_temp`;
      c.hot_water_status_current_temp = c.hot_water_status_current_temp || `sensor.${p}_hot_water_status_current_temp`;
      c.hot_water_status = c.hot_water_status || `sensor.${p}_hot_water_status_status`;
      c.hot_water_status_time = c.hot_water_status_time || `sensor.${p}_hot_water_status_time_until_ready`;
      c.hot_water_cancel_switch = c.hot_water_cancel_switch || `switch.${p}_k_cup_hot_water`;
    }

    // Induction Range prefix defaults
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
    return 6;
  }

  _fireHaptic(type = "light") {
    const event = new Event("haptic", { bubbles: true, composed: true });
    event.detail = type;
    this.dispatchEvent(event);
  }

  _getEntity(entityId) {
    if (!entityId) return { state: "unavailable", attributes: {} };
    const state = this.hass && this.hass.states ? this.hass.states[entityId] : null;
    if (!state) {
      return { state: "unavailable", attributes: {} };
    }
    return state;
  }

  _detectApplianceType() {
    const type = this.config.appliance_type;
    if (type && type !== "auto") {
      return type;
    }

    // Auto-detect based on defined entities
    if (this.config.valve_entity || this.config.bhyve_mode !== undefined) {
      return "smart_hose_timer";
    }
    if (this.config.washer || this.config.dryer) {
      return "laundry";
    }
    if (this.config.cooktop || this.config.oven) {
      return "induction_range";
    }
    if (this.config.fridge_control || this.config.freezer_control) {
      return "refrigerator";
    }
    if (this.config.entity && this.config.entity.startsWith("water_heater.")) {
      return "water_heater";
    }

    // Fallback based on device prefix search if available
    if (this.config.device_prefix && this.hass) {
      const p = this.config.device_prefix;
      if (this.hass.states[`sensor.${p}_door_status`] || this.hass.states[`water_heater.${p}_fridge`]) {
        return "refrigerator";
      }
      if (this.hass.states[`binary_sensor.${p}_cooktop_status_left_front_on`] || this.hass.states[`water_heater.${p}_oven`]) {
        return "induction_range";
      }
    }

    return "refrigerator";
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const detectedType = this._detectApplianceType();

    let content = html``;
    switch (detectedType) {
      case "refrigerator":
        content = this._renderRefrigerator();
        break;
      case "induction_range":
      case "range":
        content = this._renderInductionRange();
        break;
      case "laundry":
        content = this._renderLaundry();
        break;
      case "water_heater":
        content = this._renderWaterHeater();
        break;
      case "smart_hose_timer":
      case "hose_timer":
        content = this._renderSmartHoseTimer();
        break;
      default:
        content = this._renderRefrigerator();
    }

    return html`
      <ha-card>
        ${content}
        ${this._renderPopups()}
      </ha-card>
    `;
  }

  // ==========================================
  // REFRIGERATOR RENDERER
  // ==========================================
  _renderRefrigerator() {
    const c = this.config;
    const fridgeControl = this._getEntity(c.fridge_control);
    const freezerControl = this._getEntity(c.freezer_control);
    const fridgeTemp = this._getEntity(c.fridge_temp_current);
    const freezerTemp = this._getEntity(c.freezer_temp_current);
    const doorStatus = this._getEntity(c.door_status);
    const waterFilter = this._getEntity(c.water_filter_status);
    const hotWaterInUse = this._getEntity(c.hot_water_in_use);
    const hotWaterSetTemp = this._getEntity(c.hot_water_set_temp);
    const hotWaterCurrentTemp = this._getEntity(c.hot_water_status_current_temp);
    const hotWaterStatus = this._getEntity(c.hot_water_status);
    const hotWaterTime = this._getEntity(c.hot_water_status_time);

    const fridgeSetTemp = fridgeControl.attributes.temperature ?? "N/A";
    const freezerSetTemp = freezerControl.attributes.temperature ?? "N/A";

    const isOpen = doorStatus.state === "Fridge Open" || doorStatus.state === "Freezer Open" || doorStatus.state === "open" || doorStatus.state === "on";
    const isHeating = hotWaterStatus.state === "Heating";
    const isHotWaterReady = hotWaterStatus.state === "Ready";

    let chipLabel = "NORMAL";
    let chipClass = "idle";

    if (isOpen) {
      chipLabel = "DOOR OPEN";
      chipClass = "warning";
    } else if (isHeating) {
      chipLabel = "HEATING WATER";
      chipClass = "active";
    } else if (isHotWaterReady) {
      chipLabel = "HOT WATER READY";
      chipClass = "ready";
    }

    return html`
      <div class="header">
        <div class="header-left">
          <h1 class="title">
            <ha-icon icon="mdi:fridge-outline"></ha-icon>
            ${c.title || "Refrigerator"}
          </h1>
        </div>
        <div class="status-chip ${chipClass}">
          <div class="dot"></div>
          <span>${chipLabel}</span>
        </div>
      </div>

      <div class="card-content">
        <!-- Door Warning Banner -->
        ${isOpen
          ? html`
              <div class="alert-banner warning">
                <ha-icon icon="mdi:door-open"></ha-icon>
                <span>${doorStatus.state === "unavailable" ? "Door Open Warning" : doorStatus.state}</span>
              </div>
            `
          : ""}

        <!-- Temp Zones Grid -->
        <div class="zones-grid">
          <div class="zone-card" @click=${() => (this._popup = "fridge")}>
            <div class="zone-header">
              <ha-icon icon="mdi:fridge-top"></ha-icon>
              <span>Fridge</span>
            </div>
            <div class="zone-temp">
              <span class="current">${fridgeTemp.state !== "unavailable" ? fridgeTemp.state : "--"}°</span>
              <span class="target">Set: ${fridgeSetTemp}°</span>
            </div>
          </div>

          <div class="zone-card" @click=${() => (this._popup = "freezer")}>
            <div class="zone-header">
              <ha-icon icon="mdi:snowflake"></ha-icon>
              <span>Freezer</span>
            </div>
            <div class="zone-temp">
              <span class="current">${freezerTemp.state !== "unavailable" ? freezerTemp.state : "--"}°</span>
              <span class="target">Set: ${freezerSetTemp}°</span>
            </div>
          </div>
        </div>

        <!-- Hot Water Dispenser Section -->
        ${c.hot_water_status || c.hot_water_set_temp
          ? html`
              <div class="dispenser-section ${isHeating ? "heating" : isHotWaterReady ? "ready" : ""}">
                <div class="dispenser-header">
                  <div class="dispenser-title">
                    <ha-icon icon="mdi:cup-water"></ha-icon>
                    <span>Hot Water Dispenser</span>
                  </div>
                  <span class="dispenser-status-badge">${hotWaterStatus.state !== "unavailable" ? hotWaterStatus.state : "Off"}</span>
                </div>
                <div class="dispenser-body">
                  <div class="temp-display">
                    <span class="label">Temp:</span>
                    <span class="val">${hotWaterCurrentTemp.state !== "unavailable" ? hotWaterCurrentTemp.state : "--"}° / ${hotWaterSetTemp.state !== "unavailable" ? hotWaterSetTemp.state : "--"}°</span>
                  </div>
                  ${isHeating && hotWaterTime.state !== "unavailable"
                    ? html`<div class="time-rem">Ready in ${hotWaterTime.state} min</div>`
                    : ""}
                </div>
                ${isHeating && c.hot_water_cancel_switch
                  ? html`
                      <button
                        class="btn-cancel"
                        @click=${() => this.hass.callService("switch", "turn_off", { entity_id: c.hot_water_cancel_switch })}
                      >
                        Cancel Heating
                      </button>
                    `
                  : ""}
              </div>
            `
          : ""}

        <!-- Auxiliary Status Bar -->
        <div class="aux-grid">
          ${c.water_filter_status
            ? html`
                <div class="aux-item">
                  <ha-icon icon="mdi:filter-outline"></ha-icon>
                  <span>Filter: ${waterFilter.state}</span>
                </div>
              `
            : ""}
          ${c.ice_maker_control
            ? html`
                <div class="aux-item">
                  <ha-icon icon="mdi:cube-outline"></ha-icon>
                  <span>Ice Maker</span>
                  <ha-switch
                    .checked=${this._getEntity(c.ice_maker_control).state === "on"}
                    @change=${(e) =>
                      this.hass.callService("switch", e.target.checked ? "turn_on" : "turn_off", {
                        entity_id: c.ice_maker_control,
                      })}
                  ></ha-switch>
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  // ==========================================
  // INDUCTION RANGE RENDERER
  // ==========================================
  _renderInductionRange() {
    const c = this.config;
    const oven = c.oven || {};
    const cooktop = c.cooktop || { burners: [] };

    const upperState = this._getEntity(oven.upper_state_entity).state;
    const lowerState = this._getEntity(oven.lower_state_entity).state;

    const burners = (cooktop.burners || []).map((b) => ({
      status: this._getEntity(b.status_entity),
      power: this._getEntity(b.power_entity),
    }));

    const isAnyBurnerOn = burners.some((b) => b.status.state === "on" || b.status.state === "true");
    const isUpperOn = upperState !== "Off" && upperState !== "unavailable";
    const isLowerOn = lowerState !== "Off" && lowerState !== "unavailable";

    let chipLabel = "IDLE";
    let chipClass = "idle";

    if (isAnyBurnerOn && (isUpperOn || isLowerOn)) {
      chipLabel = "COOKING & OVEN";
      chipClass = "active";
    } else if (isAnyBurnerOn) {
      chipLabel = "COOKTOP ACTIVE";
      chipClass = "active";
    } else if (isUpperOn || isLowerOn) {
      chipLabel = "OVEN ACTIVE";
      chipClass = "active";
    }

    return html`
      <div class="header">
        <div class="header-left">
          <h1 class="title">
            <ha-icon icon="mdi:stove"></ha-icon>
            ${c.title || "Induction Range"}
          </h1>
        </div>
        <div class="status-chip ${chipClass}">
          <div class="dot"></div>
          <span>${chipLabel}</span>
        </div>
      </div>

      <div class="card-content">
        <!-- Cooktop Section -->
        <div class="section-title">
          <ha-icon icon="mdi:checkbox-blank-circle-outline"></ha-icon>
          <span>Cooktop Elements</span>
        </div>

        <div class="cooktop-grid">
          ${burners.map((b, idx) => {
            const isOn = b.status.state === "on" || b.status.state === "true";
            const powerVal = b.power.state !== "unavailable" ? b.power.state : null;
            return html`
              <div class="burner-card ${isOn ? "on" : "off"}">
                <div class="burner-ring">
                  <ha-icon icon="mdi:fire"></ha-icon>
                </div>
                <div class="burner-info">
                  <span class="burner-name">Burner ${idx + 1}</span>
                  <span class="burner-status">${isOn ? (powerVal ? `${powerVal}%` : "ON") : "OFF"}</span>
                </div>
              </div>
            `;
          })}
        </div>

        <!-- Oven Section -->
        ${oven.upper_control || oven.lower_control
          ? html`
              <div class="section-title" style="margin-top: 16px;">
                <ha-icon icon="mdi:toaster-oven"></ha-icon>
                <span>Oven Controls</span>
              </div>

              <div class="zones-grid">
                ${oven.upper_control
                  ? html`
                      <div class="zone-card ${isUpperOn ? "active-zone" : ""}" @click=${() => (this._popupOven = "upper")}>
                        <div class="zone-header">
                          <ha-icon icon="mdi:numeric-1-box-outline"></ha-icon>
                          <span>Upper Oven</span>
                        </div>
                        <div class="zone-temp">
                          <span class="current">${this._getEntity(oven.upper_raw_temp).state !== "unavailable" ? this._getEntity(oven.upper_raw_temp).state : "--"}°</span>
                          <span class="target">Status: ${upperState}</span>
                        </div>
                      </div>
                    `
                  : ""}
                ${oven.lower_control
                  ? html`
                      <div class="zone-card ${isLowerOn ? "active-zone" : ""}" @click=${() => (this._popupOven = "lower")}>
                        <div class="zone-header">
                          <ha-icon icon="mdi:numeric-2-box-outline"></ha-icon>
                          <span>Lower Oven</span>
                        </div>
                        <div class="zone-temp">
                          <span class="current">${this._getEntity(oven.lower_raw_temp).state !== "unavailable" ? this._getEntity(oven.lower_raw_temp).state : "--"}°</span>
                          <span class="target">Status: ${lowerState}</span>
                        </div>
                      </div>
                    `
                  : ""}
              </div>
            `
          : ""}
      </div>
    `;
  }

  // ==========================================
  // LAUNDRY RENDERER
  // ==========================================
  _renderLaundry() {
    const c = this.config;
    const washerConfig = c.washer || {};
    const dryerConfig = c.dryer || {};

    const washerStatus = this._getEntity(washerConfig.current_status);
    const washerOp = this._getEntity(washerConfig.operation);
    const washerTime = this._getEntity(washerConfig.remaining_time);

    const dryerStatus = this._getEntity(dryerConfig.current_status);
    const dryerOp = this._getEntity(dryerConfig.operation);
    const dryerTime = this._getEntity(dryerConfig.remaining_time);

    const activeStates = ["running", "wash", "rinse", "rinsing", "spin", "spinning", "drying", "cooling", "detecting"];
    const isWasherActive = activeStates.includes(washerStatus.state.toLowerCase());
    const isDryerActive = activeStates.includes(dryerStatus.state.toLowerCase());

    let chipLabel = "IDLE";
    let chipClass = "idle";

    if (isWasherActive && isDryerActive) {
      chipLabel = "RUNNING BOTH";
      chipClass = "active";
    } else if (isWasherActive) {
      chipLabel = "WASHING";
      chipClass = "active";
    } else if (isDryerActive) {
      chipLabel = "DRYING";
      chipClass = "active";
    }

    return html`
      <div class="header">
        <div class="header-left">
          <h1 class="title">
            <ha-icon icon="mdi:washing-machine"></ha-icon>
            ${c.title || "Laundry Center"}
          </h1>
        </div>
        <div class="status-chip ${chipClass}">
          <div class="dot"></div>
          <span>${chipLabel}</span>
        </div>
      </div>

      <div class="card-content">
        <div class="laundry-grid">
          <!-- Washer Column -->
          <div class="laundry-card ${isWasherActive ? "active" : ""}">
            <div class="laundry-icon-wrapper ${isWasherActive ? "spinning" : ""}">
              <ha-icon icon="mdi:washing-machine"></ha-icon>
            </div>
            <div class="laundry-details">
              <h2>Washing Machine</h2>
              <div class="laundry-status-tag">${washerStatus.state}</div>
              ${washerOp.state !== "unavailable" ? html`<div class="laundry-sub">${washerOp.state}</div>` : ""}
              ${washerTime.state !== "unavailable" ? html`<div class="laundry-time"><ha-icon icon="mdi:timer-outline"></ha-icon>${washerTime.state} min</div>` : ""}
            </div>
          </div>

          <!-- Dryer Column -->
          <div class="laundry-card ${isDryerActive ? "active" : ""}">
            <div class="laundry-icon-wrapper ${isDryerActive ? "tumbling" : ""}">
              <ha-icon icon="mdi:tumble-dryer"></ha-icon>
            </div>
            <div class="laundry-details">
              <h2>Tumble Dryer</h2>
              <div class="laundry-status-tag">${dryerStatus.state}</div>
              ${dryerOp.state !== "unavailable" ? html`<div class="laundry-sub">${dryerOp.state}</div>` : ""}
              ${dryerTime.state !== "unavailable" ? html`<div class="laundry-time"><ha-icon icon="mdi:timer-outline"></ha-icon>${dryerTime.state} min</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // WATER HEATER RENDERER
  // ==========================================
  _renderWaterHeater() {
    const c = this.config;
    const mainEntityId = c.entity || "water_heater.water_heater";
    const stateObj = this.hass.states[mainEntityId] || { state: "unavailable", attributes: {} };

    const baseName = mainEntityId.split(".")[1] || "water_heater";
    const getSensor = (key, defaultVal) => {
      if (c.sensors && c.sensors[key]) return this._getEntity(c.sensors[key]);
      return this._getEntity(`sensor.${baseName}_${key}`);
    };

    const flowRate = getSensor("water_flow_rate", "0");
    const gasUsage = getSensor("gas_consumption_rate", "0");
    const targetTemp = stateObj.attributes.temperature ?? "--";
    const currentTemp = stateObj.attributes.current_temperature ?? targetTemp;

    const isHeating = stateObj.state === "eco" || stateObj.state === "electric" || stateObj.state === "gas" || parseFloat(flowRate.state) > 0;

    return html`
      <div class="header">
        <div class="header-left">
          <h1 class="title">
            <ha-icon icon="mdi:water-boiler"></ha-icon>
            ${c.title || "Water Heater"}
          </h1>
        </div>
        <div class="status-chip ${isHeating ? "active" : "idle"}">
          <div class="dot"></div>
          <span>${isHeating ? "HEATING" : stateObj.state.toUpperCase()}</span>
        </div>
      </div>

      <div class="card-content">
        <!-- Main Circular Temp Hero -->
        <div class="hero-temp-card">
          <div class="hero-temp-value">${currentTemp}°</div>
          <div class="hero-temp-sub">Target Setpoint: ${targetTemp}°</div>
          <div class="hero-temp-controls">
            <button
              class="btn-temp"
              @click=${() => this._changeWaterHeaterTemp(mainEntityId, (parseFloat(targetTemp) || 120) - 1)}
            >
              -
            </button>
            <button
              class="btn-temp"
              @click=${() => this._changeWaterHeaterTemp(mainEntityId, (parseFloat(targetTemp) || 120) + 1)}
            >
              +
            </button>
          </div>
        </div>

        <!-- Telemetry Gauges -->
        <div class="aux-grid" style="margin-top: 12px;">
          <div class="aux-item">
            <ha-icon icon="mdi:water-pump"></ha-icon>
            <span>Flow: ${flowRate.state} GPM</span>
          </div>
          <div class="aux-item">
            <ha-icon icon="mdi:fire"></ha-icon>
            <span>Gas: ${gasUsage.state} BTU/h</span>
          </div>
        </div>
      </div>
    `;
  }

  _changeWaterHeaterTemp(entityId, newTemp) {
    this._fireHaptic();
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: entityId,
      temperature: newTemp,
    });
  }

  // ==========================================
  // SMART HOSE TIMER RENDERER
  // ==========================================
  _renderSmartHoseTimer() {
    const c = this.config;
    const valve = this._getEntity(c.valve_entity);
    const battery = this._getEntity(c.battery_sensor);
    const signal = this._getEntity(c.signal_sensor);
    const history = this._getEntity(c.history_sensor);

    const isOpen = valve.state === "open" || valve.state === "on";

    return html`
      <div class="header">
        <div class="header-left">
          <h1 class="title">
            <ha-icon icon="mdi:sprinkler-variant"></ha-icon>
            ${c.title || "Smart Hose Timer"}
          </h1>
        </div>
        <div class="status-chip ${isOpen ? "active" : "idle"}">
          <div class="dot"></div>
          <span>${isOpen ? "WATERING" : "IDLE"}</span>
        </div>
      </div>

      <div class="card-content">
        <!-- Duration Selector & Control -->
        <div class="hose-control-card">
          <div class="hose-timer-display">
            <span class="num">${this._durationMinutes}</span>
            <span class="unit">MINUTES</span>
          </div>

          <div class="presets-row">
            ${[5, 10, 15, 30, 60].map(
              (mins) => html`
                <button
                  class="preset-chip ${this._durationMinutes === mins ? "selected" : ""}"
                  @click=${() => (this._durationMinutes = mins)}
                >
                  ${mins}m
                </button>
              `
            )}
          </div>

          <div class="hose-actions">
            ${isOpen
              ? html`
                  <button class="btn-hose stop" @click=${() => this._stopWatering()}>
                    <ha-icon icon="mdi:water-off"></ha-icon> Stop Watering
                  </button>
                `
              : html`
                  <button class="btn-hose start" @click=${() => this._startWatering()}>
                    <ha-icon icon="mdi:water"></ha-icon> Start Watering (${this._durationMinutes}m)
                  </button>
                `}
          </div>
        </div>

        <!-- Telemetry Badges -->
        <div class="aux-grid" style="margin-top: 12px;">
          ${battery.state !== "unavailable"
            ? html`
                <div class="aux-item">
                  <ha-icon icon="mdi:battery"></ha-icon>
                  <span>${battery.state}%</span>
                </div>
              `
            : ""}
          ${signal.state !== "unavailable"
            ? html`
                <div class="aux-item">
                  <ha-icon icon="mdi:wifi"></ha-icon>
                  <span>${signal.state} dBm</span>
                </div>
              `
            : ""}
          ${history.state !== "unavailable"
            ? html`
                <div class="aux-item">
                  <ha-icon icon="mdi:history"></ha-icon>
                  <span>${history.state}</span>
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  _startWatering() {
    this._fireHaptic();
    const c = this.config;
    if (c.bhyve_mode !== false && c.valve_entity) {
      this.hass.callService("bhyve", "start_watering", {
        entity_id: c.valve_entity,
        minutes: this._durationMinutes,
      }).catch(() => {
        // Fallback to standard valve service
        this.hass.callService("valve", "open_cover", { entity_id: c.valve_entity });
      });
    } else if (c.valve_entity) {
      this.hass.callService("valve", "open_cover", { entity_id: c.valve_entity });
    }
  }

  _stopWatering() {
    this._fireHaptic();
    const c = this.config;
    if (c.valve_entity) {
      this.hass.callService("valve", "close_cover", { entity_id: c.valve_entity }).catch(() => {
        this.hass.callService("switch", "turn_off", { entity_id: c.valve_entity });
      });
    }
  }

  // ==========================================
  // POPUP MODALS
  // ==========================================
  _renderPopups() {
    if (!this._popup && !this._popupOven) return html``;

    return html`
      <div class="popup-backdrop" @click=${() => { this._popup = null; this._popupOven = null; }}>
        <div class="popup-modal" @click=${(e) => e.stopPropagation()}>
          <div class="popup-header">
            <h2>Temperature Control</h2>
            <button class="btn-close" @click=${() => { this._popup = null; this._popupOven = null; }}>&times;</button>
          </div>
          <div class="popup-body">
            <p>Adjust temperature setpoint for ${this._popup || this._popupOven}:</p>
            <div class="preset-buttons">
              <button class="btn-temp" @click=${() => { this._popup = null; this._popupOven = null; }}>Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // STYLES
  // ==========================================
  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--paper-font-body1-font-family, Roboto, sans-serif);
      }

      ha-card {
        background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
        border-radius: var(--ha-card-border-radius, 16px);
        box-shadow: var(--ha-card-box-shadow, 0 4px 20px rgba(0, 0, 0, 0.15));
        padding: 16px;
        color: var(--primary-text-color, #ffffff);
        overflow: hidden;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .header-left .title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      .status-chip.idle {
        background: rgba(156, 163, 175, 0.15);
        color: #9ca3af;
      }

      .status-chip.active {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }

      .status-chip.warning {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
      }

      .status-chip.ready {
        background: rgba(34, 197, 94, 0.2);
        color: #4ade80;
      }

      .status-chip .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      .alert-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 10px;
        margin-bottom: 14px;
        font-weight: 600;
      }

      .alert-banner.warning {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .zones-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }

      .zone-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.15s ease;
      }

      .zone-card:hover {
        background: rgba(255, 255, 255, 0.09);
        transform: translateY(-2px);
      }

      .zone-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85rem;
        color: var(--secondary-text-color, #a1a1aa);
        margin-bottom: 8px;
      }

      .zone-temp {
        display: flex;
        flex-direction: column;
      }

      .zone-temp .current {
        font-size: 1.6rem;
        font-weight: 700;
      }

      .zone-temp .target {
        font-size: 0.8rem;
        color: var(--secondary-text-color, #a1a1aa);
      }

      .dispenser-section {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 12px;
        padding: 12px;
        margin-top: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .dispenser-section.heating {
        border-color: rgba(249, 115, 22, 0.4);
        background: rgba(249, 115, 22, 0.08);
      }

      .dispenser-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dispenser-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }

      .btn-cancel {
        margin-top: 8px;
        width: 100%;
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: none;
        border-radius: 8px;
        padding: 8px;
        font-weight: 600;
        cursor: pointer;
      }

      .aux-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 14px;
      }

      .aux-item {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.04);
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 0.82rem;
      }

      .cooktop-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 10px;
      }

      .burner-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 10px;
        text-align: center;
      }

      .burner-card.on {
        border-color: #f97316;
        background: rgba(249, 115, 22, 0.12);
      }

      .burner-ring ha-icon {
        --mdc-icon-size: 24px;
        color: #9ca3af;
      }

      .burner-card.on .burner-ring ha-icon {
        color: #f97316;
      }

      .laundry-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .laundry-card {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 12px;
        padding: 14px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .laundry-card.active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }

      .laundry-icon-wrapper ha-icon {
        --mdc-icon-size: 36px;
      }

      .hero-temp-card {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
      }

      .hero-temp-value {
        font-size: 3rem;
        font-weight: 800;
      }

      .hero-temp-controls {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 12px;
      }

      .btn-temp {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 1.4rem;
        font-weight: bold;
        cursor: pointer;
      }

      .hose-control-card {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
      }

      .hose-timer-display .num {
        font-size: 3.2rem;
        font-weight: 800;
        line-height: 1;
      }

      .presets-row {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin: 14px 0;
      }

      .preset-chip {
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-weight: 600;
        cursor: pointer;
      }

      .preset-chip.selected {
        background: #3b82f6;
      }

      .btn-hose {
        width: 100%;
        padding: 12px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1rem;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .btn-hose.start {
        background: #22c55e;
        color: white;
      }

      .btn-hose.stop {
        background: #ef4444;
        color: white;
      }

      .popup-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
      }

      .popup-modal {
        background: #242426;
        border-radius: 16px;
        padding: 20px;
        width: 90%;
        max-width: 360px;
      }

      .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .btn-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
      }
    `;
  }
}

// ==========================================
// VISUAL CARD EDITOR
// ==========================================
class PassableApplianceCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  setConfig(config) {
    this.config = config;
  }

  _valueChanged(ev) {
    if (!this.config || !this.hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    const newValue = ev.detail && ev.detail.value !== undefined ? ev.detail.value : (target.checked !== undefined ? target.checked : target.value);

    if (this.config[configValue] === newValue) return;

    const newConfig = { ...this.config };
    if (newValue === "" || newValue === undefined || newValue === null) {
      delete newConfig[configValue];
    } else {
      newConfig[configValue] = newValue;
    }

    this.config = newConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.hass || !this.config) return html``;

    return html`
      <div class="card-config" style="display: flex; flex-direction: column; gap: 12px; padding: 10px;">
        <ha-textfield
          label="Card Title"
          .value=${this.config.title || ""}
          .configValue=${"title"}
          @input=${this._valueChanged}
        ></ha-textfield>

        <ha-select
          label="Appliance Type"
          .value=${this.config.appliance_type || "auto"}
          .configValue=${"appliance_type"}
          @selected=${this._valueChanged}
          @change=${this._valueChanged}
        >
          <mwc-list-item value="auto">Auto-detect</mwc-list-item>
          <mwc-list-item value="refrigerator">Refrigerator</mwc-list-item>
          <mwc-list-item value="induction_range">Induction Range & Oven</mwc-list-item>
          <mwc-list-item value="laundry">Laundry (Washer & Dryer)</mwc-list-item>
          <mwc-list-item value="water_heater">Water Heater</mwc-list-item>
          <mwc-list-item value="smart_hose_timer">Smart Hose Timer</mwc-list-item>
        </ha-select>

        <ha-textfield
          label="Device Prefix (Optional for auto entity discovery)"
          .value=${this.config.device_prefix || ""}
          .configValue=${"device_prefix"}
          @input=${this._valueChanged}
        ></ha-textfield>
      </div>
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
  description: "Dynamic universal appliance card supporting refrigerators, induction ranges, laundry, water heaters, and smart hose timers.",
});
