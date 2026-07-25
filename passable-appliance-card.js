/**
 * Passable Appliance Card
 * Version: 1.0.2
 * GitHub: https://github.com/GBear09/passable-appliance-card
 * 
 * Dynamic Universal Appliance Card for Home Assistant.
 * Fully retains exact graphic layouts, SVGs, and visual designs of:
 *  - Refrigerator & Freezer (French Door & Freezer Drawer)
 *  - Induction Range & Oven (5-Burner Cooktop & Dual Oven Doors)
 *  - Laundry (Washer & Dryer Stack)
 *  - Water Heater (Navien Unit & Gauges)
 *  - Smart Hose Timer (Duration Ring & Controls)
 */

const CARD_VERSION = "1.0.2";

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
      _durationMinutes: { state: true },
    };
  }

  constructor() {
    super();
    this._popup = null;
    this._popupOven = null;
    this._ovenTargetTemp = null;
    this._durationMinutes = 15;
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

  _showMoreInfo(entityId) {
    if (!entityId) return;
    const event = new Event("hass-more-info", {
      bubbles: true,
      composed: true,
    });
    event.detail = { entityId: entityId };
    this.dispatchEvent(event);
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
  // REFRIGERATOR (French Door + Drawer Layout)
  // ==========================================
  _renderRefrigerator() {
    const c = this.config;
    const fridgeControl = this._getEntity(c.fridge_control);
    const freezerControl = this._getEntity(c.freezer_control);
    const fridgeTemp = this._getEntity(c.fridge_temp_current);
    const freezerTemp = this._getEntity(c.freezer_temp_current);
    const doorStatus = this._getEntity(c.door_status);
    const waterFilter = this._getEntity(c.water_filter_status);
    const hotWaterStatus = this._getEntity(c.hot_water_status);

    const fridgeSetTemp = fridgeControl.attributes.temperature ?? "N/A";
    const freezerSetTemp = freezerControl.attributes.temperature ?? "N/A";

    const isOpen = doorStatus.state === "Fridge Open" || doorStatus.state === "Freezer Open" || doorStatus.state === "open" || doorStatus.state === "on";
    const isHeating = hotWaterStatus.state === "Heating";

    let chipLabel = "NORMAL";
    let chipClass = "idle";

    if (isOpen) {
      chipLabel = "DOOR OPEN";
      chipClass = "active-alert";
    } else if (waterFilter.state === "Expired") {
      chipLabel = "FILTER EXPIRED";
      chipClass = "active-alert";
    } else if (isHeating) {
      chipLabel = "HEATING";
      chipClass = "active-heat";
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon icon="mdi:fridge-outline" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
              ${c.title || "Kitchen Refrigerator"}
            </h1>
            <p class="subtitle">Food Storage & Dispenser</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${chipClass}">${chipLabel}</div>
          </div>
        </div>

        <div class="card-content">
          <div class="fridge-body">
            <!-- Left Door with Dispenser -->
            <div class="door left-door ${doorStatus.state === "Fridge Open" ? "door-open" : ""}">
              <div class="fridge-handle"></div>
              <div class="left-door-content">
                <div class="dispenser-group">
                  <div class="dispenser" @click=${() => (this._popup = "dispenser")}>
                    <div class="dispenser-screen"></div>
                    <div class="dispenser-lever"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Door with Temp Badge -->
            <div class="door right-door ${doorStatus.state === "Fridge Open" ? "door-open" : ""}">
              <div class="fridge-handle"></div>
              <div class="right-door-content">
                <div class="temp-display fridge-temp" @click=${() => this._showMoreInfo(c.fridge_control)}>
                  <span class="temp-value">${fridgeTemp.state !== "unavailable" ? fridgeTemp.state : "--"}°</span>
                  <span class="temp-setpoint">Set: ${fridgeSetTemp}°</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Freezer Drawer -->
          <div class="freezer-drawer ${doorStatus.state === "Freezer Open" ? "door-open" : ""}" @click=${() => this._showMoreInfo(c.freezer_control)}>
            <div class="freezer-handle"></div>
            <div class="temp-display freezer-temp">
              <span class="temp-value">${freezerTemp.state !== "unavailable" ? freezerTemp.state : "--"}°</span>
              <span class="temp-setpoint">Set: ${freezerSetTemp}°</span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  // ==========================================
  // INDUCTION RANGE (5-Burner Cooktop + Oven)
  // ==========================================
  _renderInductionRange() {
    const c = this.config;
    const ovenConfig = c.oven || {
      upper_control: c.upper_control,
      lower_control: c.lower_control,
      upper_raw_temp: c.upper_raw_temp,
      lower_raw_temp: c.lower_raw_temp,
      upper_state_entity: c.upper_state_entity,
      lower_state_entity: c.lower_state_entity,
    };
    const cooktopConfig = c.cooktop || {
      burners: [
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_left_front_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_left_front_power_pct` },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_left_rear_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_left_rear_power_pct` },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_center_rear_on`, power_entity: null },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_right_rear_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_right_rear_power_pct` },
        { status_entity: `binary_sensor.${c.device_prefix}_cooktop_status_right_front_on`, power_entity: `sensor.${c.device_prefix}_cooktop_status_right_front_power_pct` },
      ],
    };

    const burners = cooktopConfig.burners.map((b) => ({
      status: this._getEntity(b.status_entity),
      power: b.power_entity ? this._getEntity(b.power_entity) : null,
    }));

    const isAnyBurnerOn = burners.some((b) => b.status.state === "on" || b.status.state === "true");
    const upperOvenState = this._getEntity(ovenConfig.upper_state_entity);
    const lowerOvenState = this._getEntity(ovenConfig.lower_state_entity);
    const upperRawTemp = this._getEntity(ovenConfig.upper_raw_temp);
    const lowerRawTemp = this._getEntity(ovenConfig.lower_raw_temp);

    const isUpperOn = upperOvenState.state !== "Off" && upperOvenState.state !== "unavailable";
    const isLowerOn = lowerOvenState.state !== "Off" && lowerOvenState.state !== "unavailable";

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isAnyBurnerOn && (isUpperOn || isLowerOn)) {
      chipLabel = "RANGE ACTIVE";
      chipClass = "active-alert";
    } else if (isAnyBurnerOn) {
      chipLabel = "COOKTOP ON";
      chipClass = "active-alert";
    } else if (isUpperOn || isLowerOn) {
      chipLabel = "OVEN ON";
      chipClass = "active-alert";
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon icon="mdi:stove" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
              ${c.title || "Induction Range"}
            </h1>
            <p class="subtitle">Cooking Zones & Ovens</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${chipClass}">${chipLabel}</div>
          </div>
        </div>

        <div class="card-content">
          <div class="graphics-container">
            <!-- 5 Burner Cooktop Graphic -->
            <div class="cooktop-container">
              ${this._renderBurner(burners[0], "top: 48%; left: 12%; width: 26%;")}
              ${this._renderBurner(burners[1], "top: 2%; left: 12%; width: 26%;")}
              ${this._renderBurner(burners[2], "top: 5%; left: 42%; width: 21%;")}
              ${this._renderBurner(burners[3], "top: 5%; left: 68%; width: 21%;")}
              ${this._renderBurner(burners[4], "top: 41%; left: 55%; width: 31%;")}
              <div class="sync-line" style="left: 12%;"></div>
              <div class="sync-line" style="left: 36%;"></div>
            </div>

            <!-- Oven Panel & Dual Oven Doors -->
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

              <!-- Upper Oven -->
              <div class="oven-door ${isUpperOn ? "oven-on" : ""}" @click=${() => this._showMoreInfo(ovenConfig.upper_control)}>
                <div class="oven-handle"></div>
                <div class="oven-temp-display">
                  <span class="state-text">${upperOvenState.state || "Off"}</span>
                  <span class="raw-temp">${upperRawTemp.state !== "unavailable" ? `${upperRawTemp.state}°` : ""}</span>
                </div>
              </div>

              <!-- Lower Oven -->
              <div class="oven-door ${isLowerOn ? "oven-on" : ""}" @click=${() => this._showMoreInfo(ovenConfig.lower_control)}>
                <div class="oven-handle"></div>
                <div class="oven-temp-display">
                  <span class="state-text">${lowerOvenState.state || "Off"}</span>
                  <span class="raw-temp">${lowerRawTemp.state !== "unavailable" ? `${lowerRawTemp.state}°` : ""}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderBurner(burner, style) {
    if (!burner) return html``;
    const isOn = burner.status && (burner.status.state === "on" || burner.status.state === "true");
    const powerLevel = burner.power ? Math.round(parseFloat(burner.power.state) || 0) : "";
    const statusText = isOn ? (burner.power ? `${powerLevel}%` : "On") : "Off";

    return html`
      <div class="burner ${isOn ? "burner-on" : "burner-off"}" style="${style}">
        <span class="status-text">${statusText}</span>
      </div>
    `;
  }

  // ==========================================
  // LAUNDRY (Washer & Dryer Graphic Stack)
  // ==========================================
  _renderLaundry() {
    const c = this.config;
    const washerStatus = this._getEntity(c.washer_status || (c.washer && c.washer.current_status));
    const washerOp = this._getEntity(c.washer_operation || (c.washer && c.washer.operation));
    const washerTime = this._getEntity(c.washer_remaining_time || (c.washer && c.washer.remaining_time));

    const dryerStatus = this._getEntity(c.dryer_status || (c.dryer && c.dryer.current_status));
    const dryerOp = this._getEntity(c.dryer_operation || (c.dryer && c.dryer.operation));
    const dryerTime = this._getEntity(c.dryer_remaining_time || (c.dryer && c.dryer.remaining_time));

    const activeStates = ["running", "wash", "rinse", "rinsing", "spin", "spinning", "drying", "cooling", "detecting"];
    const isWasherActive = activeStates.includes((washerStatus.state || "").toLowerCase());
    const isDryerActive = activeStates.includes((dryerStatus.state || "").toLowerCase());

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isWasherActive && isDryerActive) {
      chipLabel = "RUNNING BOTH";
      chipClass = "active-alert";
    } else if (isWasherActive) {
      chipLabel = "WASHING";
      chipClass = "active-alert";
    } else if (isDryerActive) {
      chipLabel = "DRYING";
      chipClass = "active-alert";
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon icon="mdi:washing-machine" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
              ${c.title || "Laundry Center"}
            </h1>
            <p class="subtitle">Washing Machine & Dryer</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${chipClass}">${chipLabel}</div>
          </div>
        </div>

        <div class="card-content">
          <div class="laundry-stack">
            <div class="laundry-unit ${isWasherActive ? "unit-active" : ""}">
              <ha-icon icon="mdi:washing-machine" class="laundry-icon ${isWasherActive ? "spinning" : ""}"></ha-icon>
              <div class="laundry-meta">
                <span class="unit-title">Washer</span>
                <span class="unit-state">${washerStatus.state}</span>
                ${washerTime.state !== "unavailable" ? html`<span class="unit-time">${washerTime.state} min left</span>` : ""}
              </div>
            </div>

            <div class="laundry-unit ${isDryerActive ? "unit-active" : ""}">
              <ha-icon icon="mdi:tumble-dryer" class="laundry-icon ${isDryerActive ? "tumbling" : ""}"></ha-icon>
              <div class="laundry-meta">
                <span class="unit-title">Dryer</span>
                <span class="unit-state">${dryerStatus.state}</span>
                ${dryerTime.state !== "unavailable" ? html`<span class="unit-time">${dryerTime.state} min left</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  // ==========================================
  // WATER HEATER (Navien Tankless Graphic)
  // ==========================================
  _renderWaterHeater() {
    const c = this.config;
    const mainEntityId = c.entity || "water_heater.water_heater";
    const stateObj = this.hass.states[mainEntityId] || { state: "unavailable", attributes: {} };

    const flowRate = c.flow_rate_sensor ? this._getEntity(c.flow_rate_sensor) : { state: "0" };
    const gasUsage = c.gas_usage_sensor ? this._getEntity(c.gas_usage_sensor) : { state: "0" };
    const targetTemp = stateObj.attributes.temperature ?? "--";
    const currentTemp = stateObj.attributes.current_temperature ?? targetTemp;

    const isHeating = stateObj.state === "eco" || stateObj.state === "electric" || stateObj.state === "gas" || parseFloat(flowRate.state) > 0;

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon icon="mdi:water-boiler" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
              ${c.title || "Tankless Water Heater"}
            </h1>
            <p class="subtitle">Hot Water System</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${isHeating ? "active-alert" : "idle"}">${isHeating ? "HEATING" : stateObj.state.toUpperCase()}</div>
          </div>
        </div>

        <div class="card-content">
          <div class="hero-temp-card">
            <div class="hero-temp-value">${currentTemp}°</div>
            <div class="hero-temp-sub">Target Setpoint: ${targetTemp}°</div>
            <div class="hero-temp-controls">
              <button class="btn-temp" @click=${() => this._changeWaterHeaterTemp(mainEntityId, (parseFloat(targetTemp) || 120) - 1)}>-</button>
              <button class="btn-temp" @click=${() => this._changeWaterHeaterTemp(mainEntityId, (parseFloat(targetTemp) || 120) + 1)}>+</button>
            </div>
          </div>
        </div>
      </ha-card>
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
  // SMART HOSE TIMER (Ring Duration Dial)
  // ==========================================
  _renderSmartHoseTimer() {
    const c = this.config;
    const valve = this._getEntity(c.valve_entity);
    const isOpen = valve.state === "open" || valve.state === "on";

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon icon="mdi:sprinkler-variant" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
              ${c.title || "Smart Hose Timer"}
            </h1>
            <p class="subtitle">Zone Watering Controller</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${isOpen ? "active-alert" : "idle"}">${isOpen ? "WATERING" : "IDLE"}</div>
          </div>
        </div>

        <div class="card-content">
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
                ? html`<button class="btn-hose stop" @click=${() => this._stopWatering()}><ha-icon icon="mdi:water-off"></ha-icon> Stop Watering</button>`
                : html`<button class="btn-hose start" @click=${() => this._startWatering()}><ha-icon icon="mdi:water"></ha-icon> Start Watering (${this._durationMinutes}m)</button>`}
            </div>
          </div>
        </div>
      </ha-card>
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
  // STYLES & GRAPHIC CSS
  // ==========================================
  static get styles() {
    return css`
      ha-card {
        border-radius: var(--ha-card-border-radius, 16px);
        background: var(--ha-card-background, #1c1c1e);
        box-shadow: var(--ha-card-box-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
        overflow: hidden;
        color: var(--primary-text-color, #ffffff);
      }

      /* HEADER */
      .header {
        padding: 16px 16px 0;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        padding-bottom: 14px;
        margin-bottom: 14px;
      }
      .header-left {
        display: flex;
        flex-direction: column;
      }
      .title {
        font-size: 22px;
        font-weight: 600;
        margin: 0;
        letter-spacing: -0.01em;
        display: flex;
        align-items: center;
      }
      .subtitle {
        color: var(--secondary-text-color, #a1a1aa);
        font-size: 13px;
        margin-top: 4px;
        margin-bottom: 0;
      }
      .status-chip {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 14px;
        text-transform: uppercase;
        background: rgba(128, 128, 128, 0.15);
        color: var(--secondary-text-color, #a1a1aa);
      }
      .status-chip.active-alert {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
      }

      .card-content {
        padding: 0 16px 16px;
      }

      /* REFRIGERATOR GRAPHICS */
      .fridge-body {
        display: flex;
        height: 280px;
      }
      .door {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        position: relative;
        display: flex;
        flex-direction: column;
        transition: background-color 0.3s ease;
      }
      .left-door {
        border-right-width: 1px;
        border-top-left-radius: 16px;
      }
      .right-door {
        border-left-width: 1px;
        border-top-right-radius: 16px;
      }
      .freezer-drawer {
        height: 120px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-top: none;
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
      }
      .fridge-handle {
        position: absolute;
        top: 20px;
        bottom: 20px;
        width: 10px;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 6px;
      }
      .left-door .fridge-handle {
        right: 10px;
      }
      .right-door .fridge-handle {
        left: 10px;
      }
      .freezer-handle {
        position: absolute;
        top: 14px;
        left: 20px;
        right: 20px;
        height: 10px;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 6px;
      }
      .dispenser {
        width: 60px;
        height: 80px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        position: relative;
        margin-top: 50px;
        margin-left: 20px;
        cursor: pointer;
      }
      .temp-display {
        background: rgba(0, 0, 0, 0.3);
        padding: 12px 16px;
        border-radius: 12px;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
      }
      .temp-value {
        font-size: 1.8rem;
        font-weight: 800;
      }
      .temp-setpoint {
        font-size: 0.8rem;
        color: #a1a1aa;
      }
      .right-door-content {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      /* INDUCTION RANGE & COOKTOP GRAPHICS */
      .graphics-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .cooktop-container {
        position: relative;
        width: 100%;
        height: 220px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
      }
      .burner {
        position: absolute;
        border-radius: 50%;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        border: 2px solid rgba(255, 255, 255, 0.15);
      }
      .burner-on {
        background: rgba(249, 115, 22, 0.25);
        border-color: #f97316;
        box-shadow: 0 0 16px rgba(249, 115, 22, 0.4);
      }
      .status-text {
        font-weight: 700;
        font-size: 0.9rem;
      }
      .sync-line {
        position: absolute;
        top: 25%;
        bottom: 25%;
        width: 4px;
        background: rgba(255, 255, 255, 0.15);
      }

      .oven-container {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 16px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .oven-control-panel {
        height: 36px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }
      .oven-knob {
        fill: rgba(255, 255, 255, 0.3);
      }
      .oven-screen {
        fill: rgba(0, 0, 0, 0.6);
      }
      .oven-door {
        height: 80px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .oven-door.oven-on {
        border-color: #f97316;
        background: rgba(249, 115, 22, 0.15);
      }
      .oven-handle {
        position: absolute;
        top: 12px;
        left: 20px;
        right: 20px;
        height: 8px;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 4px;
      }
      .oven-temp-display {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .state-text {
        font-weight: 700;
        font-size: 1.1rem;
      }
      .raw-temp {
        font-size: 0.85rem;
        color: #a1a1aa;
      }

      /* LAUNDRY GRAPHICS */
      .laundry-stack {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .laundry-unit {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 16px;
        text-align: center;
      }
      .laundry-unit.unit-active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.15);
      }
      .laundry-icon {
        --mdc-icon-size: 48px;
      }
      .unit-title {
        display: block;
        font-weight: 600;
        font-size: 1.1rem;
        margin-top: 8px;
      }
      .unit-state {
        display: block;
        color: #3b82f6;
        font-weight: 700;
      }

      /* HERO TEMP / HOSE CONTROLS */
      .hero-temp-card, .hose-control-card {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
      }
      .hero-temp-value {
        font-size: 3.2rem;
        font-weight: 800;
      }
      .btn-temp {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 1.5rem;
        font-weight: bold;
        cursor: pointer;
      }
      .hose-timer-display .num {
        font-size: 3.2rem;
        font-weight: 800;
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
      }
      .btn-hose.start {
        background: #22c55e;
        color: white;
      }
      .btn-hose.stop {
        background: #ef4444;
        color: white;
      }
    `;
  }
}

// ==========================================
// VISUAL CARD EDITOR
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
        <div class="form-group">
          <label class="form-label">Card Title</label>
          <ha-textfield
            label="Title (Optional)"
            .value=${this.config.title || ""}
            .configValue=${"title"}
            @input=${this._onFieldChange}
          ></ha-textfield>
        </div>

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

        <div class="form-group">
          <label class="form-label">Device Prefix (Optional Shortcut)</label>
          <ha-textfield
            label="Device Prefix (e.g. lg_fridge or ge_range)"
            .value=${this.config.device_prefix || ""}
            .configValue=${"device_prefix"}
            @input=${this._onFieldChange}
          ></ha-textfield>
        </div>
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
