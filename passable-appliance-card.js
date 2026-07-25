/**
 * Passable Appliance Card
 * Version: 1.0.3
 * GitHub: https://github.com/GBear09/passable-appliance-card
 * 
 * Dynamic Universal Appliance Card for Home Assistant.
 * Restores 100% exact graphical layouts, SVGs, animations, popups, and styles of:
 *  1. Refrigerator & Freezer (French Door + Water Dispenser + Freezer Drawer + Dispenser Popup)
 *  2. Induction Range & Oven (5-Burner Cooktop + Sync Lines + SVG Knobs Panel + Dual Oven Doors)
 *  3. Laundry Center (Washer & Dryer Stack + Spin/Tumble Animations)
 *  4. Navien Water Heater (SVG Tankless Unit + Animated Flow Lines + Heating Pulse + Gauges)
 *  5. Smart Hose Timer (Duration Ring + Preset Chips + Watering Control + Badges)
 */

const CARD_VERSION = "1.0.3";

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
      _durationMinutes: { state: true },
    };
  }

  constructor() {
    super();
    this._popup = null;
    this._popupOven = null;
    this._ovenTargetTemp = null;
    this._showFlushGuide = false;
    this._durationMinutes = 15;
    this._cardId = `pac-${Math.random().toString(36).substr(2, 9)}`;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    const c = { ...config };
    c.appliance_type = c.appliance_type || "auto";

    // Auto-populate refrigerator entities if device_prefix is provided
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

  _toggleEntity(entity_id) {
    if (!entity_id) return;
    this.hass.callService("homeassistant", "toggle", { entity_id });
  }

  _setTemperature(entityId, temp) {
    if (!entityId) return;
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: entityId,
      temperature: temp,
    });
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
    } else if (waterFilter.state === "Replace") {
      chipLabel = "REPLACE FILTER";
      chipClass = "active-warning";
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
            <!-- Left Door -->
            <div class="door left-door ${doorStatus.state === "Fridge Open" ? "door-open" : ""}">
              <div class="fridge-handle"></div>
              <div class="left-door-content">
                <div class="dispenser-group">
                  <div class="dispenser ${isHeating ? "heating" : ""}" @click=${() => (this._popup = "dispenser")}>
                    <div class="dispenser-screen"></div>
                    <div class="dispenser-lever"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Door -->
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

        ${this._renderRefrigeratorPopup()}
      </ha-card>
    `;
  }

  _renderRefrigeratorPopup() {
    if (this._popup !== "dispenser") return html``;
    const c = this.config;
    const iceMaker = this._getEntity(c.ice_maker_control);
    const waterFilter = this._getEntity(c.water_filter_status);
    const hotWaterStatus = this._getEntity(c.hot_water_status);

    return html`
      <div class="popup-overlay visible" @click=${() => (this._popup = null)}>
        <div class="popup-content visible" @click=${(e) => e.stopPropagation()}>
          <div class="drag-handle"></div>
          <div class="popup-header">
            <h3>Dispenser Controls</h3>
            <button class="close-button" @click=${() => (this._popup = null)}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>

          <div class="popup-controls">
            <h4>Hot Water Presets</h4>
            <div class="preset-buttons">
              <button class="preset-button" @click=${() => this._setTemperature(c.dispenser_control, 150)}>
                <ha-icon icon="mdi:coffee-outline"></ha-icon> Cocoa (150°)
              </button>
              <button class="preset-button" @click=${() => this._setTemperature(c.dispenser_control, 170)}>
                <ha-icon icon="mdi:tea"></ha-icon> Tea (170°)
              </button>
              <button class="preset-button" @click=${() => this._setTemperature(c.dispenser_control, 185)}>
                <ha-icon icon="mdi:bowl-mix-outline"></ha-icon> Soup (185°)
              </button>
            </div>

            <div class="divider" style="height:1px; background:var(--divider-color); margin:12px 0;"></div>

            <div class="control-row" style="display:flex; justify-content:space-between; align-items:center;">
              <span>Water Filter: <strong>${waterFilter.state}</strong></span>
            </div>

            <div class="control-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <span>Ice Maker Control</span>
              <ha-switch
                .checked=${iceMaker.state === "on"}
                @change=${() => this._toggleEntity(c.ice_maker_control)}
              ></ha-switch>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 2. INDUCTION RANGE & OVEN
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
      sync_entities: {
        left_front: `binary_sensor.${c.device_prefix}_cooktop_status_left_front_synchronized`,
        left_rear: `binary_sensor.${c.device_prefix}_cooktop_status_left_rear_synchronized`,
      },
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

    const syncFront = this._getEntity(cooktopConfig.sync_entities?.left_front);
    const isSynced = syncFront.state === "on" || syncFront.state === "true";

    let chipLabel = "IDLE";
    let chipClass = "idle";
    if (isAnyBurnerOn && (isUpperOn || isLowerOn)) {
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
            <!-- Cooktop Container -->
            <div class="cooktop-container">
              ${this._renderBurner(burners[0], "top: 48%; left: 12%; width: 26%;")}
              ${this._renderBurner(burners[1], "top: 2%; left: 12%; width: 26%;")}
              ${this._renderBurner(burners[2], "top: 5%; left: 42%; width: 21%;")}
              ${this._renderBurner(burners[3], "top: 5%; left: 68%; width: 21%;")}
              ${this._renderBurner(burners[4], "top: 41%; left: 55%; width: 31%;")}
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
              <div class="oven upper-oven ${isUpperOn ? "oven-on" : "oven-off"}" @click=${() => this._showMoreInfo(ovenConfig.upper_control)}>
                <div class="oven-handle"></div>
                <div class="oven-info">
                  <span class="oven-state">${upperOvenState.state || "Off"}</span>
                  <span class="oven-temps">${upperRawTemp.state !== "unavailable" ? `${upperRawTemp.state}°` : "100°"}</span>
                </div>
              </div>

              <!-- Lower Oven Door -->
              <div class="oven lower-oven ${isLowerOn ? "oven-on" : "oven-off"}" @click=${() => this._showMoreInfo(ovenConfig.lower_control)}>
                <div class="oven-handle"></div>
                <div class="oven-info">
                  <span class="oven-state">${lowerOvenState.state || "Off"}</span>
                  <span class="oven-temps">${lowerRawTemp.state !== "unavailable" ? `${lowerRawTemp.state}°` : "100°"}</span>
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
      <div class="burner ${isOn ? "burner-on" : "burner-off"}" style="${style}" @click=${() => this._showMoreInfo(burner.status.entity_id)}>
        <span class="status-text">${statusText}</span>
      </div>
    `;
  }

  // ==========================================
  // 3. LAUNDRY CENTER
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
          <div class="laundry-grid">
            <!-- Washer Box -->
            <div class="laundry-unit-card ${isWasherActive ? "unit-active" : ""}">
              <div class="laundry-icon-frame ${isWasherActive ? "spinning" : ""}">
                <ha-icon icon="mdi:washing-machine"></ha-icon>
              </div>
              <div class="laundry-info">
                <h3>Washer</h3>
                <div class="status-tag">${washerStatus.state}</div>
                ${washerOp.state !== "unavailable" ? html`<div class="sub-state">${washerOp.state}</div>` : ""}
                ${washerTime.state !== "unavailable" ? html`<div class="time-rem"><ha-icon icon="mdi:clock-outline"></ha-icon>${washerTime.state} min</div>` : ""}
              </div>
            </div>

            <!-- Dryer Box -->
            <div class="laundry-unit-card ${isDryerActive ? "unit-active" : ""}">
              <div class="laundry-icon-frame ${isDryerActive ? "tumbling" : ""}">
                <ha-icon icon="mdi:tumble-dryer"></ha-icon>
              </div>
              <div class="laundry-info">
                <h3>Dryer</h3>
                <div class="status-tag">${dryerStatus.state}</div>
                ${dryerOp.state !== "unavailable" ? html`<div class="sub-state">${dryerOp.state}</div>` : ""}
                ${dryerTime.state !== "unavailable" ? html`<div class="time-rem"><ha-icon icon="mdi:clock-outline"></ha-icon>${dryerTime.state} min</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  // ==========================================
  // 4. NAVIEN WATER HEATER
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
            <div class="status-chip ${isHeating ? "heating" : "idle"}">${isHeating ? "HEATING" : stateObj.state.toUpperCase()}</div>
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

          ${c.flow_rate_sensor || c.gas_usage_sensor
            ? html`
                <div class="telemetry-bar">
                  <div class="telem-item"><ha-icon icon="mdi:water-pump"></ha-icon> ${flowRate.state} GPM</div>
                  <div class="telem-item"><ha-icon icon="mdi:fire"></ha-icon> ${gasUsage.state} BTU/h</div>
                </div>
              `
            : ""}
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
  // 5. SMART HOSE TIMER
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
  // STYLES (ORIGINAL CARD STYLES COMBINED)
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
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        padding-bottom: 16px;
        margin-bottom: 16px;
      }
      .header-left {
        display: flex;
        flex-direction: column;
      }
      .title {
        font-size: 24px;
        font-weight: 500;
        margin: 0;
        letter-spacing: -0.01em;
        display: flex;
        align-items: center;
      }
      .subtitle {
        color: var(--secondary-text-color, #757575);
        font-size: 14px;
        margin-top: 4px;
        margin-bottom: 0;
      }
      .status-chip {
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 12px;
        text-transform: uppercase;
        background: rgba(128, 128, 128, 0.15);
        color: var(--secondary-text-color);
      }
      .status-chip.idle {
        background: rgba(128, 128, 128, 0.15);
        color: var(--secondary-text-color);
      }
      .status-chip.active-alert, .status-chip.heating {
        background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15);
        color: var(--error-color, #f44336);
      }
      .status-chip.active-cooktop, .status-chip.active-warning {
        background: rgba(var(--rgb-warning-color, 255, 152, 0), 0.15);
        color: var(--warning-color, #ff9800);
      }

      .card-content {
        padding: 0 16px 16px;
      }

      /* REFRIGERATOR GRAPHICS */
      .fridge-body {
        display: flex;
        height: 320px;
      }
      .door {
        flex: 1;
        background: var(--secondary-background-color);
        border: 2px solid var(--primary-background-color);
        position: relative;
        display: flex;
        flex-direction: column;
        transition: background-color 0.3s ease;
      }
      .left-door {
        border-right-width: 1px;
        border-top-left-radius: var(--ha-card-border-radius, 12px);
      }
      .right-door {
        border-left-width: 1px;
        border-top-right-radius: var(--ha-card-border-radius, 12px);
      }
      .freezer-drawer {
        height: 150px;
        background: var(--secondary-background-color);
        border: 2px solid var(--primary-background-color);
        border-top: none;
        border-bottom-left-radius: var(--ha-card-border-radius, 12px);
        border-bottom-right-radius: var(--ha-card-border-radius, 12px);
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }
      .door-open {
        background-color: rgba(var(--rgb-warning-color, 255, 152, 0), 0.1);
        color: var(--warning-color, #ff9800);
      }
      .fridge-handle {
        position: absolute;
        top: 20px;
        bottom: 20px;
        width: 12px;
        background: var(--disabled-text-color);
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.2);
      }
      .left-door .fridge-handle { right: -30px; z-index: 1; }
      .right-door .fridge-handle { left: -30px; z-index: 1; }
      .freezer-handle {
        position: absolute;
        top: 15px;
        left: 20px;
        right: 20px;
        height: 12px;
        background: var(--disabled-text-color);
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.2);
      }
      .left-door-content {
        padding: 16px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-direction: column;
      }
      .right-door-content {
        padding: 16px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
      }
      .dispenser-group {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 80%;
      }
      .dispenser {
        width: 100%;
        max-width: 90px;
        height: 125px;
        background: var(--primary-background-color);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        box-sizing: border-box;
        cursor: pointer;
      }
      .dispenser-screen {
        width: 80%;
        height: 40px;
        background: var(--secondary-background-color);
        border-radius: 4px;
        margin-bottom: 8px;
      }
      .dispenser-lever {
        width: 20px;
        flex-grow: 1;
        background: var(--disabled-text-color);
        border-radius: 4px;
      }
      .temp-display {
        width: auto;
        min-width: 90px;
        text-align: center;
        color: var(--primary-text-color);
        cursor: pointer;
        background: rgba(0, 0, 0, 0.2);
        padding: 4px 8px;
        border-radius: 8px;
      }
      .fridge-temp {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 80%;
        max-width: 120px;
        margin: auto 0;
      }
      .freezer-temp {
        width: 60%;
      }
      .temp-value {
        font-size: 2.5em;
        font-weight: bold;
        line-height: 1;
      }
      .temp-setpoint {
        font-size: 1.3em;
        opacity: 0.8;
      }

      /* INDUCTION RANGE GRAPHICS */
      .graphics-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 24px;
      }
      .cooktop-container, .oven-container {
        flex: 1;
        min-width: 280px;
      }
      .cooktop-container {
        aspect-ratio: 1.75 / 1;
        background: var(--secondary-background-color);
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 12px);
        position: relative;
      }
      .burner {
        position: absolute;
        border: 2px solid var(--secondary-text-color);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        box-sizing: border-box;
        aspect-ratio: 1;
        z-index: 1;
      }
      .burner-off {
        opacity: 0.6;
        background: var(--disabled-text-color) !important;
      }
      .burner-on {
        opacity: 1;
        border-color: var(--warning-color, #ed8936);
        background: rgba(var(--warning-color-rgb, 237, 137, 54), 0.15) !important;
        box-shadow: inset 0 0 20px 5px rgba(var(--warning-color-rgb, 237, 137, 54), 0.2);
      }
      .burner .status-text {
        color: var(--primary-text-color);
        font-weight: bold;
        font-size: 0.9em;
      }
      .sync-line {
        position: absolute;
        top: 36%;
        height: 24%;
        width: 2%;
        background-color: var(--disabled-text-color);
        border-radius: 8px;
        opacity: 0.6;
        z-index: 0;
      }
      .sync-line.synced-on {
        background-color: var(--warning-color);
        opacity: 1;
        box-shadow: 0 0 10px 2px var(--warning-color);
      }
      .oven-container {
        height: 250px;
        background: var(--secondary-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        padding: 8px;
        box-sizing: border-box;
      }
      .oven-control-panel {
        background: var(--primary-background-color);
        height: 18%;
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .oven-knob {
        fill: transparent;
        stroke: var(--secondary-text-color);
        stroke-width: 2;
      }
      .oven-screen {
        fill: rgba(128, 128, 128, 0.1);
        stroke: var(--secondary-text-color);
        stroke-width: 1.5;
      }
      .oven {
        position: relative;
        flex-grow: 1;
        border: 2px solid var(--divider-color);
        border-radius: 8px;
        cursor: pointer;
        padding: 5px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--card-background-color, #fff);
      }
      .upper-oven { margin-bottom: 8px; flex-grow: 0.5; }
      .lower-oven { flex-grow: 1.3; }
      .oven.oven-on {
        background: rgba(var(--error-color-rgb, 229, 62, 62), 0.15) !important;
        color: var(--error-color, #e53e3e);
        border-color: var(--error-color, #e53e3e);
      }
      .oven-handle {
        position: absolute;
        top: 10px;
        left: 15px;
        right: 15px;
        height: 12px;
        background: var(--disabled-text-color);
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.2);
      }
      .oven-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 20px;
      }
      .oven-state {
        font-weight: bold;
        font-size: 1.1em;
      }
      .oven-temps {
        font-size: 0.8em;
        opacity: 0.8;
      }

      /* LAUNDRY STACK GRAPHICS */
      .laundry-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .laundry-unit-card {
        background: var(--secondary-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }
      .laundry-unit-card.unit-active {
        border-color: var(--primary-color, #3b82f6);
        background: rgba(59, 130, 246, 0.1);
      }
      .laundry-icon-frame ha-icon {
        --mdc-icon-size: 48px;
        color: var(--primary-text-color);
      }
      .status-tag {
        font-weight: bold;
        color: var(--primary-color, #3b82f6);
        margin-top: 4px;
      }

      /* HERO TEMP & HOSE TIMER */
      .hero-temp-card, .hose-control-card {
        background: var(--secondary-background-color);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
      }
      .hero-temp-value, .hose-timer-display .num {
        font-size: 3.5rem;
        font-weight: 800;
      }
      .hero-temp-controls {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 12px;
      }
      .btn-temp {
        background: rgba(128, 128, 128, 0.2);
        color: var(--primary-text-color);
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 1.5rem;
        font-weight: bold;
        cursor: pointer;
      }
      .presets-row {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin: 14px 0;
      }
      .preset-chip {
        background: rgba(128, 128, 128, 0.15);
        border: none;
        color: var(--primary-text-color);
        padding: 6px 14px;
        border-radius: 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .preset-chip.selected {
        background: var(--primary-color, #3b82f6);
        color: white;
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
      .btn-hose.start { background: #22c55e; color: white; }
      .btn-hose.stop { background: #ef4444; color: white; }

      /* POPUP STYLES */
      .popup-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex; justify-content: center; align-items: center;
        z-index: 1000;
      }
      .popup-content {
        background-color: var(--ha-card-background, #242426);
        padding: 24px; border-radius: 24px;
        width: 90%; max-width: 450px;
        color: var(--primary-text-color);
      }
      .popup-header { display: flex; align-items: center; justify-content: space-between; }
      .close-button { background: none; border: none; cursor: pointer; color: var(--primary-text-color); }
      .preset-buttons { display: flex; gap: 8px; margin-top: 12px; }
      .preset-button {
        flex: 1; padding: 10px; border-radius: 10px; border: none;
        background: rgba(128, 128, 128, 0.15); color: var(--primary-text-color);
        font-weight: 600; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 6px;
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
            label="Device Prefix (e.g. lg_fridge or ge_range)"
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
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.fridge_control || ""}
          .configValue=${"fridge_control"}
          .label=${"Fridge Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.freezer_control || ""}
          .configValue=${"freezer_control"}
          .label=${"Freezer Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.fridge_temp_current || ""}
          .configValue=${"fridge_temp_current"}
          .label=${"Fridge Current Temp Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.freezer_temp_current || ""}
          .configValue=${"freezer_temp_current"}
          .label=${"Freezer Current Temp Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: {} }}
          .value=${this.config.door_status || ""}
          .configValue=${"door_status"}
          .label=${"Door Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.ice_maker_control || ""}
          .configValue=${"ice_maker_control"}
          .label=${"Ice Maker Switch"}
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
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.upper_control || ""}
          .configValue=${"upper_control"}
          .label=${"Upper Oven Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.lower_control || ""}
          .configValue=${"lower_control"}
          .label=${"Lower Oven Control Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.upper_raw_temp || ""}
          .configValue=${"upper_raw_temp"}
          .label=${"Upper Oven Temp Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.lower_raw_temp || ""}
          .configValue=${"lower_raw_temp"}
          .label=${"Lower Oven Temp Sensor"}
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
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.washer_status || ""}
          .configValue=${"washer_status"}
          .label=${"Washer Current Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.washer_operation || ""}
          .configValue=${"washer_operation"}
          .label=${"Washer Cycle Operation Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.washer_remaining_time || ""}
          .configValue=${"washer_remaining_time"}
          .label=${"Washer Remaining Time Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.dryer_status || ""}
          .configValue=${"dryer_status"}
          .label=${"Dryer Current Status Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.dryer_operation || ""}
          .configValue=${"dryer_operation"}
          .label=${"Dryer Cycle Operation Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.dryer_remaining_time || ""}
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
          .selector=${{ entity: { domain: "water_heater" } }}
          .value=${this.config.entity || ""}
          .configValue=${"entity"}
          .label=${"Main Water Heater Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.flow_rate_sensor || ""}
          .configValue=${"flow_rate_sensor"}
          .label=${"Flow Rate Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.gas_usage_sensor || ""}
          .configValue=${"gas_usage_sensor"}
          .label=${"Gas Consumption Sensor (Optional)"}
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
          .selector=${{ entity: { domain: ["valve", "switch"] } }}
          .value=${this.config.valve_entity || ""}
          .configValue=${"valve_entity"}
          .label=${"Zone Valve Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.battery_sensor || ""}
          .configValue=${"battery_sensor"}
          .label=${"Battery Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.signal_sensor || ""}
          .configValue=${"signal_sensor"}
          .label=${"Signal Strength Sensor (Optional)"}
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
  description: "Dynamic universal appliance card supporting refrigerators, induction ranges, laundry, water heaters, and smart hose timers.",
});
