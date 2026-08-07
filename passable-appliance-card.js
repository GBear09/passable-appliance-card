/**
 * Passable Appliance Card
 * Version: 1.1.2
 * GitHub: https://github.com/GBear09/passable-appliance-card
 * 
 * Dynamic Universal Appliance Card for Home Assistant.
 * Restores 100% exact graphical layouts, SVGs, animations, embedded controls,
 * ring sliders, telemetry bars, 24-hour recirc timeline, and custom popups for ALL 6 appliances & mechanical systems:
 *  1. Refrigerator & Freezer (Scoped CSS French Door + Water Dispenser + Embedded Dial Popup + Presets)
 *  2. Induction Range & Oven (5-Burner Cooktop + Sync Lines + SVG Knobs Panel + Dual Oven Doors + Oven Popups with Light Toggle)
 *  3. Laundry Center (Vertical Stack + Knob/Screen Panel + Spinning SVG Drum + Select/Sensor Domain Editor)
 *  4. Navien Water Heater (SVG Chassis + Layer-Ordered Recirculation Loop Pipe + 40px Color Arrow Buttons + Centered SETPOINT + Pipe-Aligned Inlet/Outlet Badges + Theme Colored Interactive Timeline + Customizable Flush Guide)
 *  5. Smart Hose Timer (Nowrap Single-Line Header Title + Side-by-Side Battery Icon & % Chip + Exact Original Recirc-Button Text Style/Format Match + 24px Pill Rounded Next/Last Blocks + Ring Slider + Gear Drawer)
 *  6. HVAC Systems (Dual Heat Pump Systems + Overshoot Helpers + Filter Lifespan Monitors + Thermostat & Filter Modals)
 */

const CARD_VERSION = "1.1.2";

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
      _hvacModal: { state: true },
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
    this._hvacModal = null;
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

    // Auto-populate HVAC entities if appliance_type is hvac or device_prefix/auto-detect is used
    if (c.appliance_type === "hvac" || (c.device_prefix && (c.appliance_type === "hvac" || c.upstairs_climate || c.downstairs_climate))) {
      const p = c.device_prefix || "hvac";
      c.downstairs_climate = c.downstairs_climate || (c.device_prefix ? `climate.${p}_downstairs` : "climate.downstairs");
      c.downstairs_climate_hk = c.downstairs_climate_hk || (c.device_prefix ? `climate.${p}_downstairs_hk` : "climate.downstairs_hk");
      c.downstairs_setpoint_preset = c.downstairs_setpoint_preset || (c.device_prefix ? `input_text.${p}_active_profile` : "input_text.hvac_active_profile");
      c.downstairs_overshoot_active = c.downstairs_overshoot_active || "input_boolean.hvac_overshoot_active_downstairs";
      c.downstairs_cool_overshoot = c.downstairs_cool_overshoot || "input_number.hvac_overshoot_amount_cool";
      c.downstairs_heat_overshoot = c.downstairs_heat_overshoot || "input_number.hvac_overshoot_amount_heat";
      c.downstairs_cool_overshoot_thresh = c.downstairs_cool_overshoot_thresh || "input_number.hvac_overshoot_threshold_cool";
      c.downstairs_heat_overshoot_thresh = c.downstairs_heat_overshoot_thresh || "input_number.hvac_overshoot_threshold_heat";
      c.downstairs_filter_hours = c.downstairs_filter_hours || "sensor.hvac_filter_life_remaining_downstairs";
      c.downstairs_filter_life = c.downstairs_filter_life || "input_number.hvac_filter_life_downstairs";

      c.upstairs_climate = c.upstairs_climate || (c.device_prefix ? `climate.${p}_upstairs` : "climate.upstairs");
      c.upstairs_climate_hk = c.upstairs_climate_hk || (c.device_prefix ? `climate.${p}_upstairs_hk` : "climate.upstairs_hk");
      c.upstairs_setpoint_preset = c.upstairs_setpoint_preset || (c.device_prefix ? `input_text.${p}_active_profile` : "input_text.hvac_active_profile");
      c.upstairs_overshoot_active = c.upstairs_overshoot_active || "input_boolean.hvac_overshoot_active_upstairs";
      c.upstairs_cool_overshoot = c.upstairs_cool_overshoot || "input_number.hvac_overshoot_amount_cool";
      c.upstairs_heat_overshoot = c.upstairs_heat_overshoot || "input_number.hvac_overshoot_amount_heat";
      c.upstairs_cool_overshoot_thresh = c.upstairs_cool_overshoot_thresh || "input_number.hvac_overshoot_threshold_cool";
      c.upstairs_heat_overshoot_thresh = c.upstairs_heat_overshoot_thresh || "input_number.hvac_overshoot_threshold_heat";
      c.upstairs_filter_hours = c.upstairs_filter_hours || "sensor.hvac_filter_life_remaining_upstairs";
      c.upstairs_filter_life = c.upstairs_filter_life || "input_number.hvac_filter_life_upstairs";

      c.global_setpoint_preset = c.global_setpoint_preset || "input_select.home_mode";
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

  _setTemperature(entityId, temp) {
    if (!entityId) return;
    this._fireHaptic("medium");
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: entityId,
      temperature: temp,
    });
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

    if (this.config.upstairs_climate || this.config.downstairs_climate || this.config.climate) {
      return "hvac";
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

  async _showDispenserPopup() {
    this._popup = "dispenser";
    this._embeddedCard = null;

    if (window.loadCardHelpers && this.config.dispenser_control) {
      try {
        const helpers = await window.loadCardHelpers();
        const card = await helpers.createCardElement({
          type: "custom:more-info-card",
          entity: this.config.dispenser_control,
        });
        card.hass = this.hass;
        card.style.cssText = "--ha-card-background: transparent; --ha-card-box-shadow: none; --ha-card-border-width: 0; background: transparent; box-shadow: none; border: none;";
        this._embeddedCard = card;
      } catch (e) {
        console.error("Failed to create dispenser control card", e);
      }
    }

    await this.updateComplete;
    requestAnimationFrame(() => {
      if (!this.shadowRoot) return;
      const overlay = this.shadowRoot.querySelector(".popup-overlay");
      const content = this.shadowRoot.querySelector(".popup-content");
      if (overlay) overlay.classList.add("visible");
      if (content) content.classList.add("visible");
    });
  }

  async _showOvenPopup(ovenType) {
    this._popupOven = ovenType;
    this._embeddedCard = null;

    const ovenConfig = this.config.oven || {};
    const controlEntity = ovenType === "upper" ? (ovenConfig.upper_control || this.config.upper_control) : (ovenConfig.lower_control || this.config.lower_control);

    if (window.loadCardHelpers && controlEntity) {
      try {
        const helpers = await window.loadCardHelpers();
        const card = await helpers.createCardElement({
          type: "custom:more-info-card",
          entity: controlEntity,
        });
        card.hass = this.hass;
        card.style.cssText = "--ha-card-background: transparent; --ha-card-box-shadow: none; --ha-card-border-width: 0; background: transparent; box-shadow: none; border: none;";
        this._embeddedCard = card;
      } catch (e) {
        console.error("Failed to create oven control card", e);
      }
    }

    await this.updateComplete;
    requestAnimationFrame(() => {
      if (!this.shadowRoot) return;
      const overlay = this.shadowRoot.querySelector(".popup-overlay");
      const content = this.shadowRoot.querySelector(".popup-content");
      if (overlay) overlay.classList.add("visible");
      if (content) content.classList.add("visible");
    });
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
    popupContent.style.transition = "none";
  }

  _handleTouchMove(e) {
    if (this._startY === undefined) return;
    const popupContent = e.currentTarget;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this._startY;
    if (deltaY > 0 && popupContent.scrollTop <= 0) {
      this._currentY = currentY;
      popupContent.style.transform = `translateY(${deltaY}px)`;
    }
  }

  _handleTouchEnd(e) {
    if (this._startY === undefined) return;
    const popupContent = e.currentTarget;
    const deltaY = this._currentY - this._startY;
    popupContent.style.transition = "";
    if (deltaY > 100) {
      this._closePopup();
    } else {
      popupContent.style.transform = "";
    }
    this._startY = undefined;
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
      case "hvac":
        return this._renderHVAC();
      default:
        return this._renderRefrigerator();
    }
  }

  // ==========================================
  // 1. REFRIGERATOR & FREEZER
  // ==========================================
  _renderRefrigerator() {
    const c = this.config;
    const powerEntity = this._getPowerEntity("refrigerator");
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false");

    const fridgeControl = this._getEntity(c.fridge_control);
    const freezerControl = this._getEntity(c.freezer_control);
    const fridgeTemp = this._getEntity(c.fridge_temp_current);
    const freezerTemp = this._getEntity(c.freezer_temp_current);
    const doorStatus = this._getEntity(c.door_status);
    const waterFilter = this._getEntity(c.water_filter_status);
    const hotWaterStatus = this._getEntity(c.hot_water_status);

    const fridgeSetTemp = fridgeControl.attributes.temperature ?? "37";
    const freezerSetTemp = freezerControl.attributes.temperature ?? "0";

    const isOpen = doorStatus.state === "Fridge Open" || doorStatus.state === "Freezer Open" || doorStatus.state === "open" || doorStatus.state === "on";
    const isHeating = hotWaterStatus.state === "Heating";

    let chipLabel = "NORMAL";
    let chipClass = "idle";
    if (isPowerOff) {
      chipLabel = "POWER OFF";
      chipClass = "power-off";
    } else if (isOpen) {
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
            <div class="fridge-door fridge-left-door ${doorStatus.state === "Fridge Open" ? "door-open" : ""}">
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
            <div class="fridge-door fridge-right-door ${doorStatus.state === "Fridge Open" ? "door-open" : ""}">
              <div class="fridge-handle right-handle"></div>
              <div class="right-door-content">
                <div class="temp-display fridge-temp" @click=${() => this._showMoreInfo(c.fridge_control)}>
                  <span class="temp-value">${fridgeTemp.state !== "unavailable" ? fridgeTemp.state : "35"}°</span>
                  <span class="temp-setpoint">Set: ${fridgeSetTemp}°</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Freezer Drawer -->
          <div class="fridge-freezer-drawer ${doorStatus.state === "Freezer Open" ? "door-open" : ""}" @click=${() => this._showMoreInfo(c.freezer_control)}>
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
    if (this._popup !== "dispenser") return html``;
    const c = this.config;
    const dispenserControl = c.dispenser_control;
    const iceMaker = this._getEntity(c.ice_maker_control);
    const waterFilter = this._getEntity(c.water_filter_status);
    const hotWaterStatus = this._getEntity(c.hot_water_status);
    const hotWaterTime = this._getEntity(c.hot_water_status_time);

    let statusText = hotWaterStatus.state !== "unavailable" ? hotWaterStatus.state : "Not Heating";
    if (hotWaterStatus.state === "Heating" && hotWaterTime.state !== "Off" && hotWaterTime.state !== "unavailable") {
      statusText += ` (${hotWaterTime.state} left)`;
    }

    let filterColorStyle = "";
    let filterIcon = "mdi:filter-variant";
    if (waterFilter.state === "Good") {
      filterColorStyle = "color: var(--success-color, #4caf50);";
      filterIcon = "mdi:filter-check";
    } else if (waterFilter.state === "Replace") {
      filterColorStyle = "color: var(--warning-color, #ffa726);";
      filterIcon = "mdi:filter-outline";
    } else if (waterFilter.state === "Expired") {
      filterColorStyle = "color: var(--error-color, #ef5350);";
      filterIcon = "mdi:filter-remove-outline";
    }

    return html`
      <div class="popup-overlay visible" @click=${() => this._closePopup()}>
        <div
          class="popup-content visible"
          @click=${(e) => e.stopPropagation()}
          @touchstart=${this._handleTouchStart}
          @touchmove=${this._handleTouchMove}
          @touchend=${this._handleTouchEnd}
        >
          <div class="drag-handle"></div>
          <div class="popup-header">
            <button class="close-button" @click=${() => this._closePopup()}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <h3>Dispenser Controls</h3>
          </div>

          <div class="popup-controls">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="margin: 0;">Hot Water Control</h4>
              ${hotWaterStatus.state === "Heating" && c.hot_water_cancel_switch
                ? html`
                    <button
                      class="floating-cancel-button"
                      @click=${() => this._toggleEntity(c.hot_water_cancel_switch)}
                      style="position: static; margin: 0;"
                    >
                      Cancel
                    </button>
                  `
                : ""}
            </div>

            <div class="control-row status-row">
              <div class="control-label-group">
                <ha-icon icon="mdi:water-boiler"></ha-icon>
                <span class="control-label">Status</span>
              </div>
              <span class="control-value">${statusText}</span>
            </div>

            <div class="embedded-card-container" style="margin-top: 12px; margin-bottom: 12px;">
              ${this._embeddedCard ? this._embeddedCard : html`<div style="text-align: center; padding: 20px;">Loading Native Controls...</div>`}
            </div>

            <div class="preset-buttons">
              <button class="preset-button" @click=${() => this._setTemperature(dispenserControl, 150)}>
                <ha-icon icon="mdi:coffee-outline"></ha-icon>
                <span>Cocoa (150°)</span>
              </button>
              <button class="preset-button" @click=${() => this._setTemperature(dispenserControl, 170)}>
                <ha-icon icon="mdi:tea"></ha-icon>
                <span>Tea (170°)</span>
              </button>
              <button class="preset-button" @click=${() => this._setTemperature(dispenserControl, 185)}>
                <ha-icon icon="mdi:bowl-mix-outline"></ha-icon>
                <span>Soup (185°)</span>
              </button>
            </div>

            <div class="divider"></div>

            <h4 style="margin: 0 0 8px 0;">Other Controls</h4>
            <div class="control-row">
              <div class="control-label-group">
                <ha-icon icon="${filterIcon}" style="${filterColorStyle}"></ha-icon>
                <span class="control-label">Water Filter</span>
              </div>
              <span class="control-value" style="${filterColorStyle}">${waterFilter.state}</span>
            </div>

            <div class="control-row">
              <div class="control-label-group">
                <ha-icon icon="mdi:cube-outline"></ha-icon>
                <span class="control-label">Ice Maker</span>
              </div>
              <ha-switch
                .checked=${iceMaker.state === "on"}
                @change=${() => this._toggleEntity(c.ice_maker_control)}
                class="popup-switch"
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
    const powerEntity = this._getPowerEntity("induction_range");
    const powerObj = powerEntity ? this._getEntity(powerEntity) : null;
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false");

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
    if (!this._popupOven) return html``;
    const ovenName = this._popupOven === "upper" ? "Upper" : "Lower";
    const ovenConfig = this.config.oven || {};
    const lightEntityId = this._popupOven === "upper"
      ? (ovenConfig.upper_light_entity || this.config.upper_light_entity)
      : (ovenConfig.lower_light_entity || this.config.lower_light_entity);
    const lightEntity = this._getEntity(lightEntityId);

    const isLightOn = lightEntity.state === "High" || lightEntity.state === "on" || lightEntity.state === "On";

    return html`
      <div class="popup-overlay visible" @click=${() => this._closePopup()}>
        <div
          class="popup-content visible"
          @click=${(e) => e.stopPropagation()}
          @touchstart=${this._handleTouchStart}
          @touchmove=${this._handleTouchMove}
          @touchend=${this._handleTouchEnd}
        >
          <div class="drag-handle"></div>
          <div class="popup-header">
            <button class="close-button" @click=${() => this._closePopup()}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <h3>${ovenName} Oven Controls</h3>
          </div>

          <div class="popup-controls">
            <div class="embedded-card-container" style="margin-top: 12px; margin-bottom: 12px;">
              ${this._embeddedCard ? this._embeddedCard : html`<div style="text-align: center; padding: 20px;">Loading Native Controls...</div>`}
            </div>

            <div class="divider"></div>

            <div class="control-row">
              <div class="control-label-group">
                <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                <span class="control-label">Oven Light</span>
              </div>
              <ha-switch
                .checked=${isLightOn}
                @change=${() => this._toggleEntity(lightEntityId)}
                class="popup-switch"
              ></ha-switch>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. LAUNDRY CENTER
  // ==========================================
  _renderLaundry() {
    const c = this.config;
    const washerPowerEntity = this._getPowerEntity("laundry", "washer");
    const dryerPowerEntity = this._getPowerEntity("laundry", "dryer");
    const cardPowerEntity = this._getPowerEntity("laundry");

    const washerPowerState = washerPowerEntity ? this._getEntity(washerPowerEntity).state : null;
    const dryerPowerState = dryerPowerEntity ? this._getEntity(dryerPowerEntity).state : null;
    const isWasherPowerOff = washerPowerState === "off" || washerPowerState === "false";
    const isDryerPowerOff = dryerPowerState === "off" || dryerPowerState === "false";

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
    const isWasherActive = !isWasherPowerOff && activeStates.includes((washerEntities.status.state || "").toLowerCase());
    const isDryerActive = !isDryerPowerOff && activeStates.includes((dryerEntities.status.state || "").toLowerCase());

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
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false");

    const status = (entities.status.state || "off").toLowerCase().replace("_", " ");
    const activeStates = ["running", "wash", "rinse", "rinsing", "spin", "spinning", "drying", "cooling", "detecting"];
    const isActive = !isPowerOff && activeStates.includes(status);
    const machineType = name.toLowerCase();
    const displayStatus = isPowerOff ? "Power Off" : (status === "power off" ? "Off" : status);
    const remainingTime = this._formatRemainingTime(entities.remaining_time.state);

    return html`
      <div class="appliance-container m3-card ${isPowerOff ? "unit-power-off" : ""}" style="margin-bottom: 16px;">
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
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false");

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

    // Heating condition: ONLY when heating or when water flow > 0 GPM
    const isHeating = !isPowerOff && (stateObj.state === "heating" || stateObj.state === "on" || flowRate > 0);
    const isRecircActive = !isPowerOff && (recircSwitch.state === "on" || recircSwitch.state === "true");
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
    const isPowerOff = powerObj && (powerObj.state === "off" || powerObj.state === "false");

    const valve = this._getEntity(c.valve_entity);
    const stateSens = c.state_sensor ? this._getEntity(c.state_sensor) : null;
    const history = c.history_sensor ? this._getEntity(c.history_sensor) : null;
    const battery = c.battery_sensor ? this._getEntity(c.battery_sensor) : null;
    const nextWatering = c.next_watering_sensor ? this._getEntity(c.next_watering_sensor) : null;
    const smartWatering = c.smart_watering_switch ? this._getEntity(c.smart_watering_switch) : null;
    const rainDelay = c.rain_delay_switch ? this._getEntity(c.rain_delay_switch) : null;

    const isOpen = !isPowerOff && (valve.state === "open" || valve.state === "on");
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

  _setHvacPresetMode(climateEntity, presetMode) {
    this._fireHaptic("medium");
    this.hass.callService("climate", "set_preset_mode", {
      entity_id: climateEntity,
      preset_mode: presetMode,
    });
  }

  // ==========================================
  // 6. HVAC SYSTEMS (DUAL HEAT PUMPS & HELPERS)
  // ==========================================
  _renderHVAC() {
    const c = this.config;
    const globalPresetObj = this._getEntity(c.global_setpoint_preset);

    return html`
      <ha-card>
        ${c.show_header !== false
          ? html`
              <div class="header">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                  <h1 class="title">
                    <ha-icon icon="mdi:hvac" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
                    ${c.title || "HVAC Systems"}
                  </h1>
                  ${globalPresetObj && globalPresetObj.state !== "unavailable" && globalPresetObj.state !== "unknown"
                    ? html`
                        <div class="global-preset-badge" @click=${() => this._showMoreInfo(c.global_setpoint_preset)}>
                          <ha-icon icon="mdi:tune-vertical" style="--mdc-icon-size:16px; margin-right:4px;"></ha-icon>
                          <span>${globalPresetObj.state}</span>
                        </div>
                      `
                    : ""}
                </div>
                <div class="header-subtitle-row">
                  <p class="subtitle">Dual Heat Pump Systems & Comfort Control</p>
                </div>
              </div>
            `
          : ""}

        <div class="card-content">
          <div class="hvac-grid">
            ${this._renderHvacUnitCard("downstairs", "Downstairs & Basement", "mdi:home-floor-1", c.downstairs_climate || "climate.downstairs", c.downstairs_climate_hk || "climate.downstairs_hk")}
            ${this._renderHvacUnitCard("upstairs", "Upstairs & Attic", "mdi:home-floor-2", c.upstairs_climate || "climate.upstairs", c.upstairs_climate_hk || "climate.upstairs_hk")}
          </div>
        </div>

        ${this._renderHvacModal()}
      </ha-card>
    `;
  }

  _renderHvacUnitCard(unitKey, title, icon, defaultClimate, defaultHkClimate) {
    const c = this.config;
    const climateId = c[`${unitKey}_climate`] || defaultClimate;
    const hkClimateId = c[`${unitKey}_climate_hk`] || defaultHkClimate;
    const presetId = c[`${unitKey}_setpoint_preset`] || "input_text.hvac_active_profile";
    const overshootActiveId = c[`${unitKey}_overshoot_active`] || `input_boolean.hvac_overshoot_active_${unitKey}`;
    const coolOvershootId = c[`${unitKey}_cool_overshoot`] || "input_number.hvac_overshoot_amount_cool";
    const heatOvershootId = c[`${unitKey}_heat_overshoot`] || "input_number.hvac_overshoot_amount_heat";
    const filterHoursId = c[`${unitKey}_filter_hours`] || `sensor.hvac_filter_life_remaining_${unitKey}`;
    const filterLifeId = c[`${unitKey}_filter_life`] || `input_number.hvac_filter_life_${unitKey}`;

    const climate = this._getEntity(climateId);
    const preset = this._getEntity(presetId);
    const overshootActiveObj = this._getEntity(overshootActiveId);
    const heatOvershoot = this._getEntity(heatOvershootId);
    const coolOvershoot = this._getEntity(coolOvershootId);
    const filterHours = this._getEntity(filterHoursId);
    const filterLife = this._getEntity(filterLifeId);

    const hvacAction = climate.attributes.hvac_action || climate.state || "idle";
    const currentTemp = climate.attributes.current_temperature ?? "--";
    const targetTemp = climate.attributes.temperature ?? climate.attributes.target_temp_high ?? climate.attributes.target_temp_low ?? "--";
    const humidity = climate.attributes.current_humidity ?? "--";

    let stateClass = "idle";
    let stateLabel = "IDLE";
    let stateIcon = "mdi:hvac-off";

    if (hvacAction === "cooling") {
      stateClass = "active-cool";
      stateLabel = "COOLING";
      stateIcon = "mdi:snowflake";
    } else if (hvacAction === "heating") {
      stateClass = "active-heat";
      stateLabel = "HEATING";
      stateIcon = "mdi:fire";
    } else if (hvacAction === "fan") {
      stateClass = "active-fan";
      stateLabel = "FAN ONLY";
      stateIcon = "mdi:fan";
    } else if (climate.state === "off") {
      stateClass = "power-off";
      stateLabel = "OFF";
      stateIcon = "mdi:power";
    }

    // Filter calculations
    const remHours = parseFloat(filterHours.state);
    const maxHours = parseFloat(filterLife.state) || 300;
    const filterPct = !isNaN(remHours) && maxHours > 0 ? Math.max(0, Math.min(100, Math.round((remHours / maxHours) * 100))) : 0;
    const filterClass = filterPct < 15 ? "expired" : filterPct < 35 ? "warning" : "ok";

    // Overshoot display calculation
    const isOvershootActive = overshootActiveObj.state === "on" || (overshootActiveObj.state !== "off" && (hvacAction === "cooling" || hvacAction === "heating"));
    let activeOvershoot = null;
    if (isOvershootActive) {
      if (hvacAction === "cooling" && coolOvershoot.state && coolOvershoot.state !== "unavailable" && coolOvershoot.state !== "unknown") {
        activeOvershoot = `Cool +${coolOvershoot.state}°F`;
      } else if (hvacAction === "heating" && heatOvershoot.state && heatOvershoot.state !== "unavailable" && heatOvershoot.state !== "unknown") {
        activeOvershoot = `Heat -${heatOvershoot.state}°F`;
      } else if (overshootActiveObj.state === "on") {
        activeOvershoot = `Overshoot Active`;
      }
    }

    // Preset display calculation
    const activePresetName = (climate.attributes.preset_mode && climate.attributes.preset_mode !== "temp" && climate.attributes.preset_mode !== "none") 
      ? climate.attributes.preset_mode 
      : (preset && preset.state !== "unavailable" && preset.state !== "unknown" ? preset.state : null);

    return html`
      <div class="hvac-unit-card">
        <div class="hvac-unit-header">
          <div class="hvac-unit-title">
            <ha-icon icon="${icon}"></ha-icon>
            <span>${title}</span>
          </div>
          <div class="status-chip ${stateClass}">
            <ha-icon icon="${stateIcon}" style="--mdc-icon-size:14px; margin-right:4px;"></ha-icon>
            ${stateLabel}
          </div>
        </div>

        <div class="hvac-temp-row" @click=${() => this._showMoreInfo(climateId)}>
          <div class="hvac-big-temp">${currentTemp}°</div>
          <div class="hvac-target-group">
            <span class="target-label">TARGET</span>
            <span class="target-val">${targetTemp}°</span>
          </div>
        </div>

        <div class="hvac-telemetry-row">
          <div class="hvac-metric">
            <ha-icon icon="mdi:water-percent"></ha-icon>
            <span>${humidity}% RH</span>
          </div>
          ${activePresetName
            ? html`
                <div class="hvac-metric" @click=${() => this._showHvacModal(unitKey, "setpoints")} style="cursor:pointer;">
                  <ha-icon icon="mdi:bookmark-outline"></ha-icon>
                  <span style="text-transform: capitalize;">${activePresetName}</span>
                </div>
              `
            : ""}
          ${activeOvershoot
            ? html`
                <div class="hvac-metric overshoot" @click=${() => this._showHvacModal(unitKey, "setpoints")} style="cursor:pointer;">
                  <ha-icon icon="mdi:lightning-bolt"></ha-icon>
                  <span>${activeOvershoot}</span>
                </div>
              `
            : ""}
        </div>

        <div class="filter-section">
          <div class="filter-header">
            <span>Filter Life</span>
            <span>${!isNaN(remHours) ? `${remHours} hrs (${filterPct}%)` : "Replace Filter"}</span>
          </div>
          <div class="filter-bar-track">
            <div class="filter-bar-fill ${filterClass}" style="width: ${filterPct}%;"></div>
          </div>
        </div>

        <div class="hvac-card-actions">
          <button class="hvac-btn" @click=${() => this._showHvacModal(unitKey, "setpoints")}>
            <ha-icon icon="mdi:tune"></ha-icon>
            <span>Setpoints</span>
          </button>
          <button class="hvac-btn" @click=${() => this._showHvacModal(unitKey, "filter")}>
            <ha-icon icon="mdi:air-filter"></ha-icon>
            <span>Filter</span>
          </button>
        </div>
      </div>
    `;
  }

  _showHvacModal(unitKey, type) {
    this._fireHaptic("light");
    this._hvacModal = { unitKey, type };
  }

  _closeHvacModal() {
    this._fireHaptic("light");
    this._hvacModal = null;
  }

  _setHvacMode(climateEntity, mode) {
    this._fireHaptic("medium");
    this.hass.callService("climate", "set_hvac_mode", {
      entity_id: climateEntity,
      hvac_mode: mode,
    });
  }

  _adjustHvacTemp(climateEntity, delta) {
    this._fireHaptic("light");
    const climate = this._getEntity(climateEntity);
    const curTarget = parseFloat(climate.attributes.temperature) || 70;
    this.hass.callService("climate", "set_temperature", {
      entity_id: climateEntity,
      temperature: curTarget + delta,
    });
  }

  _adjustNumberEntity(entityId, delta) {
    this._fireHaptic("light");
    const numObj = this._getEntity(entityId);
    const curVal = parseFloat(numObj.state) || 0;
    const newVal = Math.max(0, Math.round((curVal + delta) * 10) / 10);
    this.hass.callService("input_number", "set_value", {
      entity_id: entityId,
      value: newVal,
    });
  }

  _resetHvacFilter(filterHoursId, filterLifeId) {
    this._fireHaptic("heavy");
    const filterLife = this._getEntity(filterLifeId);
    const maxVal = parseFloat(filterLife.state) || 300;
    this.hass.callService("input_number", "set_value", {
      entity_id: filterHoursId,
      value: maxVal,
    }).catch(() => {
      this.hass.callService("sensor", "set_value", {
        entity_id: filterHoursId,
        value: maxVal,
      });
    });
  }

  _renderHvacModal() {
    if (!this._hvacModal) return html``;

    const { unitKey, type } = this._hvacModal;
    const c = this.config;
    const unitTitle = unitKey === "downstairs" ? "Downstairs & Basement" : "Upstairs & Attic";
    const climateId = c[`${unitKey}_climate`] || `climate.${unitKey}`;
    const climateHkId = c[`${unitKey}_climate_hk`] || `climate.${unitKey}_hk`;
    const overshootActiveId = c[`${unitKey}_overshoot_active`] || `input_boolean.hvac_overshoot_active_${unitKey}`;
    const coolOvershootId = c[`${unitKey}_cool_overshoot`] || "input_number.hvac_overshoot_amount_cool";
    const heatOvershootId = c[`${unitKey}_heat_overshoot`] || "input_number.hvac_overshoot_amount_heat";
    const coolThreshId = c[`${unitKey}_cool_overshoot_thresh`] || "input_number.hvac_overshoot_threshold_cool";
    const heatThreshId = c[`${unitKey}_heat_overshoot_thresh`] || "input_number.hvac_overshoot_threshold_heat";
    const filterHoursId = c[`${unitKey}_filter_hours`] || `sensor.hvac_filter_life_remaining_${unitKey}`;
    const filterLifeId = c[`${unitKey}_filter_life`] || `input_number.hvac_filter_life_${unitKey}`;

    const climate = this._getEntity(climateId);
    const overshootActiveObj = this._getEntity(overshootActiveId);
    const heatOvershoot = this._getEntity(heatOvershootId);
    const coolOvershoot = this._getEntity(coolOvershootId);
    const coolThresh = this._getEntity(coolThreshId);
    const heatThresh = this._getEntity(heatThreshId);
    const filterHours = this._getEntity(filterHoursId);
    const filterLife = this._getEntity(filterLifeId);

    const presetModes = climate.attributes.preset_modes || ["home", "away", "sleep", "ECO", "Alt Sleep"];
    const currentPreset = climate.attributes.preset_mode || "home";

    return html`
      <div class="popup-overlay visible" @click=${() => this._closeHvacModal()}>
        <div class="popup-content visible" @click=${(e) => e.stopPropagation()}>
          <div class="drag-handle"></div>
          <div class="popup-header">
            <button class="close-button" @click=${() => this._closeHvacModal()}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <h3>${unitTitle} - ${type === "setpoints" ? "Setpoints & Presets" : "Filter Maintenance"}</h3>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            ${type === "setpoints"
              ? html`
                  <!-- HVAC Mode -->
                  <div class="control-row">
                    <span class="control-label">HVAC Mode</span>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                      ${["cool", "heat", "auto", "off"].map(
                        (m) => html`
                          <button
                            class="hvac-mode-btn ${climate.state === m ? "active" : ""}"
                            @click=${() => this._setHvacMode(climateId, m)}
                          >
                            ${m.toUpperCase()}
                          </button>
                        `
                      )}
                    </div>
                  </div>

                  <!-- Preset Modes -->
                  <div class="control-row">
                    <span class="control-label">Preset Mode</span>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                      ${presetModes.map(
                        (p) => html`
                          <button
                            class="hvac-mode-btn ${currentPreset.toLowerCase() === p.toLowerCase() ? "active" : ""}"
                            @click=${() => this._setHvacPresetMode(climateId, p)}
                          >
                            ${p}
                          </button>
                        `
                      )}
                    </div>
                  </div>

                  <!-- Target Setpoint -->
                  <div class="control-row">
                    <span class="control-label">Target Setpoint</span>
                    <div class="step-controller-pill">
                      <button class="pill-btn" @click=${() => this._adjustHvacTemp(climateId, -0.5)}>-</button>
                      <span class="pill-value">${climate.attributes.temperature || 70}°F</span>
                      <button class="pill-btn" @click=${() => this._adjustHvacTemp(climateId, 0.5)}>+</button>
                    </div>
                  </div>

                  <div class="divider"></div>
                  <h4 style="margin:4px 0 8px 0; color:var(--primary-color); display:flex; align-items:center; gap:6px;">
                    <ha-icon icon="mdi:lightning-bolt"></ha-icon>
                    <span>Overshoot Buffer Controls</span>
                  </h4>

                  ${overshootActiveObj && overshootActiveObj.state !== "unavailable"
                    ? html`
                        <div class="control-row">
                          <div class="control-label-group">
                            <ha-icon icon="mdi:power-plug"></ha-icon>
                            <span class="control-label">Overshoot State</span>
                          </div>
                          <ha-switch
                            .checked=${overshootActiveObj.state === "on"}
                            @change=${() => this._toggleEntity(overshootActiveId)}
                            class="popup-switch"
                          ></ha-switch>
                        </div>
                      `
                    : ""}

                  ${coolOvershoot.state && coolOvershoot.state !== "unavailable"
                    ? html`
                        <div class="control-row">
                          <div class="control-label-group">
                            <ha-icon icon="mdi:snowflake"></ha-icon>
                            <span class="control-label">Cooling Overshoot Offset</span>
                          </div>
                          <div class="step-controller-pill">
                            <button class="pill-btn" @click=${() => this._adjustNumberEntity(coolOvershootId, -0.5)}>-</button>
                            <span class="pill-value">+${coolOvershoot.state}°F</span>
                            <button class="pill-btn" @click=${() => this._adjustNumberEntity(coolOvershootId, 0.5)}>+</button>
                          </div>
                        </div>
                      `
                    : ""}

                  ${heatOvershoot.state && heatOvershoot.state !== "unavailable"
                    ? html`
                        <div class="control-row">
                          <div class="control-label-group">
                            <ha-icon icon="mdi:fire"></ha-icon>
                            <span class="control-label">Heating Overshoot Offset</span>
                          </div>
                          <div class="step-controller-pill">
                            <button class="pill-btn" @click=${() => this._adjustNumberEntity(heatOvershootId, -0.5)}>-</button>
                            <span class="pill-value">-${heatOvershoot.state}°F</span>
                            <button class="pill-btn" @click=${() => this._adjustNumberEntity(heatOvershootId, 0.5)}>+</button>
                          </div>
                        </div>
                      `
                    : ""}

                  ${coolThresh.state && coolThresh.state !== "unavailable"
                    ? html`
                        <div class="control-row">
                          <div class="control-label-group">
                            <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                            <span class="control-label">Cool Trigger Threshold</span>
                          </div>
                          <div class="step-controller-pill">
                            <button class="pill-btn" @click=${() => this._adjustNumberEntity(coolThreshId, -0.5)}>-</button>
                            <span class="pill-value">${coolThresh.state}°F</span>
                            <button class="pill-btn" @click=${() => this._adjustNumberEntity(coolThreshId, 0.5)}>+</button>
                          </div>
                        </div>
                      `
                    : ""}

                  <div class="divider"></div>
                  <button class="recirc-button" style="width:100%; margin-top:4px;" @click=${() => this._showMoreInfo(climateHkId || climateId)}>
                    <ha-icon icon="mdi:homekit"></ha-icon>
                    <span>OPEN HOMEKIT / ECOBEE CONTROL</span>
                  </button>
                `
              : html`
                  <div class="materials-section">
                    <h3><ha-icon icon="mdi:air-filter"></ha-icon> Air Filter Status</h3>
                    <p>Remaining Run Time: <strong>${filterHours.state || 0} Hours</strong></p>
                    <p>Max Recommended Life: <strong>${filterLife.state || 300} Hours</strong></p>
                  </div>

                  <div class="step-timeline">
                    <div class="step">
                      <div class="step-num">1</div>
                      <div class="step-content">
                        <h4>Power Off System</h4>
                        <p>Turn off unit power at thermostat or breaker before replacing filter.</p>
                      </div>
                    </div>
                    <div class="step">
                      <div class="step-num">2</div>
                      <div class="step-content">
                        <h4>Replace Filter Slot</h4>
                        <p>Slide out old filter. Insert clean filter matching airflow directional arrows.</p>
                      </div>
                    </div>
                    <div class="step">
                      <div class="step-num">3</div>
                      <div class="step-content">
                        <h4>Reset Hours Counter</h4>
                        <p>Tap the reset button below to restore filter lifespan back to max limit.</p>
                      </div>
                    </div>
                  </div>

                  <button class="recirc-button active" style="width:100%; margin-top:16px;" @click=${() => this._resetHvacFilter(filterHoursId, filterLifeId)}>
                    <ha-icon icon="mdi:refresh"></ha-icon>
                    <span>RESET FILTER LIFE COUNTER</span>
                  </button>
                `}
          </div>
        </div>
      </div>
    `;
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
      .door-open { background-color: rgba(var(--rgb-warning-color, 255, 152, 0), 0.1); color: var(--warning-color, #ff9800); }
      .fridge-handle { position: absolute; top: 20px; bottom: 20px; width: 12px; background: var(--disabled-text-color); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2); }
      .left-handle { right: -30px; z-index: 1; }
      .right-handle { left: -30px; z-index: 1; }
      .freezer-handle { position: absolute; top: 15px; left: 20px; right: 20px; height: 12px; background: var(--disabled-text-color); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2); }
      .left-door-content { padding: 16px; height: 100%; display: flex; align-items: center; justify-content: flex-end; flex-direction: column; }
      .right-door-content { padding: 16px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
      .dispenser-group { display: flex; flex-direction: column; align-items: flex-start; width: 80%; }
      .dispenser { width: 100%; max-width: 90px; height: 125px; background: var(--primary-background-color); border-radius: 8px; display: flex; flex-direction: column; align-items: center; padding: 8px; box-sizing: border-box; cursor: pointer; }
      .dispenser-screen { width: 80%; height: 40px; background: var(--secondary-background-color); border-radius: 4px; margin-bottom: 8px; }
      .dispenser-lever { width: 20px; flex-grow: 1; background: var(--disabled-text-color); border-radius: 4px; }
      .temp-display { width: auto; min-width: 90px; text-align: center; color: var(--primary-text-color); cursor: pointer; background: rgba(0, 0, 0, 0.2); padding: 4px 8px; border-radius: 8px; }
      .fridge-temp { display: flex; flex-direction: column; align-items: center; width: 80%; max-width: 120px; margin: auto 0; }
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
        border-radius: 20px; padding: 6px 14px; gap: 16px; border: none; min-width: 140px;
      }
      .pill-btn {
        background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 0;
        display: flex; align-items: center; justify-content: center; font-size: 1.2rem; opacity: 0.8;
      }
      .pill-btn:hover { opacity: 1; }
      .pill-value { font-weight: 600; font-size: 0.95rem; color: var(--primary-text-color); white-space: nowrap; }

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
      .popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease; }
      .popup-overlay.visible { opacity: 1; visibility: visible; }
      .popup-content { background-color: var(--ha-card-background, var(--card-background-color, white)); padding: 20px 24px 24px; border-radius: 24px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto; color: var(--primary-text-color); display: flex; flex-direction: column; gap: 16px; opacity: 0; transform: translateY(20px) scale(0.95); transition: opacity 0.3s ease, transform 0.4s ease; }
      .popup-content.visible { opacity: 1; transform: translateY(0) scale(1); }
      .drag-handle { width: 36px; height: 5px; background-color: #888; border-radius: 3px; margin: -8px auto 16px auto; }
      
      .popup-header {
        display: flex; align-items: center; justify-content: flex-start; gap: 14px; width: 100%;
        padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }
      .popup-header h3 {
        margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--primary-text-color); letter-spacing: 0.01em;
      }
      .close-button {
        background: none; border: none; padding: 4px; cursor: pointer; color: var(--primary-text-color);
        display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s;
      }
      .close-button:hover { background-color: rgba(255, 255, 255, 0.1); }
      .close-button ha-icon { --mdc-icon-size: 22px; }

      .control-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; }
      .control-label-group { display: flex; align-items: center; gap: 12px; color: var(--primary-text-color); }
      .control-label-group ha-icon { --mdc-icon-size: 22px; color: var(--secondary-text-color, #a1a1aa); }
      .control-label { font-size: 1rem; font-weight: 500; color: var(--primary-text-color); }
      .popup-switch { margin-left: auto; }
      .control-value { margin-left: auto; font-weight: 600; font-size: 0.95rem; }

      .floating-cancel-button { background-color: var(--error-color, #ef4444); color: white; border: none; border-radius: 8px; padding: 6px 12px; font-weight: 500; cursor: pointer; }
      .preset-buttons { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; }
      .preset-button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background-color: rgba(128, 128, 128, 0.15); color: var(--primary-text-color); border: none; border-radius: 12px; padding: 12px 8px; font-weight: 500; font-size: 0.9em; cursor: pointer; }
      .divider { border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12)); margin: 16px 0 12px 0; width: 100%; }

      /* FLUSH GUIDE MODAL */
      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); z-index: 1000; display: flex; justify-content: center; align-items: flex-end; backdrop-filter: blur(5px); }
      .modal-content { background: var(--card-background-color, #1c1c1e); border-radius: 28px 28px 0 0; width: 100%; max-width: 600px; display: flex; flex-direction: column; overflow: hidden; max-height: 90vh; box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.3); color: var(--primary-text-color); }
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

      /* HVAC SPECIFIC STYLES */
      .hvac-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
      @container (max-width: 550px) { .hvac-grid { grid-template-columns: 1fr; } }
      @media (max-width: 768px) { .hvac-grid { grid-template-columns: 1fr; } }
      .hvac-unit-card { background: var(--secondary-background-color, rgba(128,128,128,0.12)); border-radius: 20px; padding: 16px; display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--divider-color, rgba(255,255,255,0.08)); }
      .hvac-unit-header { display: flex; justify-content: space-between; align-items: center; }
      .hvac-unit-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1.05rem; }
      .hvac-temp-row { display: flex; align-items: baseline; gap: 12px; cursor: pointer; padding: 4px 0; }
      .hvac-big-temp { font-size: 2.8rem; font-weight: 800; line-height: 1; color: var(--primary-text-color); }
      .hvac-target-group { display: flex; flex-direction: column; }
      .target-label { font-size: 0.65rem; letter-spacing: 0.08em; color: var(--secondary-text-color); }
      .target-val { font-size: 1.1rem; font-weight: 700; color: var(--primary-color); }
      .hvac-telemetry-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .hvac-metric { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; color: var(--primary-text-color); }
      .hvac-metric.overshoot { background: rgba(251, 146, 60, 0.2); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.4); }
      .filter-section { display: flex; flex-direction: column; gap: 4px; }
      .filter-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--secondary-text-color); }
      .filter-bar-track { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
      .filter-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
      .filter-bar-fill.ok { background: #4ade80; }
      .filter-bar-fill.warning { background: #facc15; }
      .filter-bar-fill.expired { background: #ef4444; }
      .hvac-card-actions { display: flex; gap: 8px; margin-top: 4px; }
      .hvac-btn { flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: var(--primary-text-color); border-radius: 12px; padding: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.2s; }
      .hvac-btn:hover { background: rgba(255,255,255,0.15); }
      .hvac-mode-btn { background: rgba(255,255,255,0.1); border: none; color: var(--primary-text-color); padding: 6px 10px; border-radius: 8px; font-weight: 600; font-size: 0.75rem; cursor: pointer; }
      .hvac-mode-btn.active { background: var(--primary-color, #2196f3); color: white; }
      .global-preset-badge { display: flex; align-items: center; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
      .status-chip.active-cool { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
      .status-chip.active-heat { background: rgba(249, 115, 22, 0.2); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.4); }
      .status-chip.active-fan { background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); }

      @media (max-width: 768px) {
        .popup-overlay { align-items: flex-end; }
        .popup-content { width: 100%; max-width: none; border-radius: 24px 24px 0 0; transform: translateY(100%); padding-bottom: max(24px, env(safe-area-inset-bottom, 24px)); }
        .popup-content.visible { transform: translateY(0); }
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
            <option value="hvac">HVAC Systems</option>
          </select>
        </div>

        <!-- Device Prefix Field -->
        <div class="form-group">
          <label class="form-label">Device Prefix (Optional Shortcut)</label>
          <ha-textfield
            label="Device Prefix (e.g. dt507030 or hvac)"
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
        ${applianceType === "hvac"
          ? this._renderHvacEditor()
          : ""}
      </div>
    `;
  }

  _renderHvacEditor() {
    return html`
      <div class="section-box">
        <h3>Downstairs HVAC Entities</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "climate" } }}
          .value=${this.config.downstairs_climate || ""}
          .configValue=${"downstairs_climate"}
          .label=${"Downstairs Climate Entity (Ecobee)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "climate" } }}
          .value=${this.config.downstairs_climate_hk || ""}
          .configValue=${"downstairs_climate_hk"}
          .label=${"Downstairs HomeKit Climate Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_select", "select"] } }}
          .value=${this.config.downstairs_setpoint_preset || ""}
          .configValue=${"downstairs_setpoint_preset"}
          .label=${"Downstairs Setpoint Preset Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_number", "number"] } }}
          .value=${this.config.downstairs_cool_overshoot || ""}
          .configValue=${"downstairs_cool_overshoot"}
          .label=${"Downstairs Cool Overshoot Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_number", "number"] } }}
          .value=${this.config.downstairs_heat_overshoot || ""}
          .configValue=${"downstairs_heat_overshoot"}
          .label=${"Downstairs Heat Overshoot Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.downstairs_filter_hours || ""}
          .configValue=${"downstairs_filter_hours"}
          .label=${"Downstairs Filter Life Hours Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>

      <div class="section-box" style="margin-top:12px;">
        <h3>Upstairs HVAC Entities</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "climate" } }}
          .value=${this.config.upstairs_climate || ""}
          .configValue=${"upstairs_climate"}
          .label=${"Upstairs Climate Entity (Ecobee)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "climate" } }}
          .value=${this.config.upstairs_climate_hk || ""}
          .configValue=${"upstairs_climate_hk"}
          .label=${"Upstairs HomeKit Climate Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_select", "select"] } }}
          .value=${this.config.upstairs_setpoint_preset || ""}
          .configValue=${"upstairs_setpoint_preset"}
          .label=${"Upstairs Setpoint Preset Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_number", "number"] } }}
          .value=${this.config.upstairs_cool_overshoot || ""}
          .configValue=${"upstairs_cool_overshoot"}
          .label=${"Upstairs Cool Overshoot Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_number", "number"] } }}
          .value=${this.config.upstairs_heat_overshoot || ""}
          .configValue=${"upstairs_heat_overshoot"}
          .label=${"Upstairs Heat Overshoot Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.upstairs_filter_hours || ""}
          .configValue=${"upstairs_filter_hours"}
          .label=${"Upstairs Filter Life Hours Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
      </div>

      <div class="section-box" style="margin-top:12px;">
        <h3>Global HVAC Helpers</h3>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["input_select", "select"] } }}
          .value=${this.config.global_setpoint_preset || ""}
          .configValue=${"global_setpoint_preset"}
          .label=${"Global Setpoint Preset Helper"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>
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
          .value=${this.config.power_entity || ""}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

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
          .selector=${{ entity: { domain: ["water_heater", "climate"] } }}
          .value=${this.config.dispenser_control || ""}
          .configValue=${"dispenser_control"}
          .label=${"Dispenser Control Entity (for dial/presets popup)"}
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

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.water_filter_status || ""}
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
          .value=${this.config.power_entity || ""}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

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
          .selector=${{ entity: { domain: ["select", "switch", "light"] } }}
          .value=${this.config.upper_light_entity || ""}
          .configValue=${"upper_light_entity"}
          .label=${"Upper Oven Light Entity"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["select", "switch", "light"] } }}
          .value=${this.config.lower_light_entity || ""}
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
          .value=${this.config.power_entity || ""}
          .configValue=${"power_entity"}
          .label=${"Main Laundry Power Switch (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.washer_power || ""}
          .configValue=${"washer_power"}
          .label=${"Washer Power Switch (e.g. switch.washer_power)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

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
          .selector=${{ entity: { domain: ["sensor", "select", "input_select"] } }}
          .value=${this.config.washer_operation || ""}
          .configValue=${"washer_operation"}
          .label=${"Washer Cycle Operation (Sensor / Select)"}
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
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.dryer_power || ""}
          .configValue=${"dryer_power"}
          .label=${"Dryer Power Switch (e.g. switch.dryer_power)"}
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
          .selector=${{ entity: { domain: ["sensor", "select", "input_select"] } }}
          .value=${this.config.dryer_operation || ""}
          .configValue=${"dryer_operation"}
          .label=${"Dryer Cycle Operation (Sensor / Select)"}
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
          .selector=${{ entity: { domain: ["switch", "binary_sensor"] } }}
          .value=${this.config.power_entity || ""}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional, e.g. switch.water_heater_power)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

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
          .value=${this.config.inlet_temp_sensor || ""}
          .configValue=${"inlet_temp_sensor"}
          .label=${"Inlet Temperature Sensor"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.outlet_temp_sensor || ""}
          .configValue=${"outlet_temp_sensor"}
          .label=${"Outlet Temperature Sensor"}
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

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: ["switch", "button"] } }}
          .value=${this.config.recirc_switch || ""}
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
          .value=${this.config.power_entity || ""}
          .configValue=${"power_entity"}
          .label=${"Power Switch / Entity (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

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
          .value=${this.config.state_sensor || ""}
          .configValue=${"state_sensor"}
          .label=${"State Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.history_sensor || ""}
          .configValue=${"history_sensor"}
          .label=${"History Sensor (Optional)"}
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
          .value=${this.config.next_watering_sensor || ""}
          .configValue=${"next_watering_sensor"}
          .label=${"Next Watering Sensor (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.smart_watering_switch || ""}
          .configValue=${"smart_watering_switch"}
          .label=${"Smart Watering Switch (Optional)"}
          @value-changed=${this._onFieldChange}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.rain_delay_switch || ""}
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
  description: "Dynamic universal appliance card supporting refrigerators, induction ranges, laundry, water heaters, and smart hose timers.",
});
