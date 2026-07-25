// refrigerator-status-card.js - Header & Slider Fix

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class RefrigeratorStatusCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _popup: { state: true },
    };
  }

  constructor() {
    super();
    this._popup = null;
    console.info(
      "%c REFRIGERATOR-STATUS-CARD %c IS LOADED ",
      "color: cyan; background: black; font-weight: bold;",
      "color: darkblue; background: white; font-weight: bold;"
    );
  }

  setConfig(config) {
    if (!config.device_prefix && (!config.fridge_control || !config.freezer_control || !config.dispenser_control)) {
      throw new Error("Configuration requires either 'device_prefix' or explicit entity definitions (fridge_control, etc).");
    }

    const c = { ...config };
    if (c.device_prefix) {
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
    
    this.config = c;
  }

  static getConfigElement() {
    return document.createElement("refrigerator-status-card-editor");
  }

  _getEntity(entityId) {
    if (!entityId) return { state: "unavailable", attributes: {} };
    const state = this.hass.states[entityId];
    if (!state) {
      console.warn(`[refrigerator-status-card] Entity not found: ${entityId}`);
      return { state: "unavailable", attributes: {} };
    }
    return state;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const fridgeControl = this._getEntity(this.config.fridge_control);
    const freezerControl = this._getEntity(this.config.freezer_control);
    const fridgeTemp = this._getEntity(this.config.fridge_temp_current);
    const freezerTemp = this._getEntity(this.config.freezer_temp_current);
    const doorStatus = this._getEntity(this.config.door_status);
    const waterFilter = this._getEntity(this.config.water_filter_status);
    const hotWaterInUse = this._getEntity(this.config.hot_water_in_use);
    const hotWaterSetTemp = this._getEntity(this.config.hot_water_set_temp);
    const hotWaterCurrentTemp = this._getEntity(
      this.config.hot_water_status_current_temp
    );
    const hotWaterStatus = this._getEntity(this.config.hot_water_status);

    const fridgeSetTemp = fridgeControl.attributes.temperature ?? "N/A";
    const freezerSetTemp = freezerControl.attributes.temperature ?? "N/A";

    let dispenserClass = "dispenser";
    if (hotWaterStatus.state === "Heating") {
      dispenserClass += " heating";
    } else if (hotWaterStatus.state === "Ready") {
      dispenserClass += " ready";
    }

    let chipLabel = "NORMAL";
    let chipClass = "idle";

    const isOpen =
      doorStatus.state === "Fridge Open" || doorStatus.state === "Freezer Open";
    const isHeating = hotWaterStatus.state === "Heating";
    const isFilterExpired = waterFilter.state === "Expired";
    const isFilterReplace = waterFilter.state === "Replace";

    if (isOpen) {
      chipLabel = "DOOR OPEN";
      chipClass = "active-alert";
    } else if (isFilterExpired) {
      chipLabel = "FILTER EXPIRED";
      chipClass = "active-alert";
    } else if (isFilterReplace) {
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
              <ha-icon
                icon="mdi:fridge-outline"
                style="margin-right:8px; color: var(--primary-color);"
              ></ha-icon>
              ${this.config.title || "Refrigerator"}
            </h1>
            <p class="subtitle">Food Storage & Dispenser</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${chipClass}">${chipLabel}</div>
          </div>
        </div>

        <div class="card-content">
          <div class="fridge-body">
            <div
              class="door left-door ${doorStatus.state === "Fridge Open"
                ? "door-open"
                : ""}"
            >
              <div class="fridge-handle"></div>
              <div class="left-door-content">
                <div class="dispenser-group">
                  <div
                    class="${dispenserClass}"
                    @click=${() => this._showPopup("dispenser")}
                  >
                    <div class="dispenser-screen"></div>
                    <div class="dispenser-lever"></div>
                  </div>
                  ${hotWaterInUse.state === "on"
                    ? html`
                        <div
                          class="hot-water-status"
                          @click=${() => this._showPopup("dispenser")}
                        >
                          <ha-icon icon="mdi:thermometer"></ha-icon>
                          <span
                            >${hotWaterCurrentTemp.state}° /
                            ${hotWaterSetTemp.state}°</span
                          >
                        </div>
                      `
                    : ""}
                </div>
              </div>
            </div>

            <div
              class="door right-door ${doorStatus.state === "Fridge Open"
                ? "door-open"
                : ""}"
            >
              <div class="fridge-handle"></div>
              <div class="right-door-content">
                <div
                  class="temp-display fridge-temp"
                  @click=${() => this._showMoreInfo(this.config.fridge_control)}
                >
                  <span class="temp-value">${fridgeTemp.state}°</span>
                  <span class="temp-setpoint">Set: ${fridgeSetTemp}°</span>
                </div>
              </div>
            </div>
          </div>
          <div
            class="freezer-drawer ${doorStatus.state === "Freezer Open"
              ? "door-open"
              : ""}"
            @click=${() => this._showMoreInfo(this.config.freezer_control)}
          >
            <div class="freezer-handle"></div>
            <div class="temp-display freezer-temp">
              <span class="temp-value">${freezerTemp.state}°</span>
              <span class="temp-setpoint">Set: ${freezerSetTemp}°</span>
            </div>
          </div>
        </div>
        ${this._renderPopup()}
      </ha-card>
    `;
  }

  async _showPopup(popup) {
    this._popup = popup;
    await this.updateComplete;

    requestAnimationFrame(() => {
      const popupOverlay = this.shadowRoot.querySelector(".popup-overlay");
      const popupContent = this.shadowRoot.querySelector(".popup-content");
      if (popupOverlay) popupOverlay.classList.add("visible");
      if (popupContent) popupContent.classList.add("visible");
    });
  }

  _closePopup() {
    const popupOverlay = this.shadowRoot.querySelector(".popup-overlay");
    const popupContent = this.shadowRoot.querySelector(".popup-content");

    if (popupOverlay) popupOverlay.classList.remove("visible");
    if (popupContent) {
      popupContent.style.transform = "";
      popupContent.classList.remove("visible");
    }

    setTimeout(() => {
      this._popup = null;
      if (this._embeddedCard) {
        this._embeddedCard = null;
      }
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

  _renderPopup() {
    if (this._popup !== "dispenser") return html``;

    const controlEntity = this._getEntity(this.config.dispenser_control);
    const iceMaker = this._getEntity(this.config.ice_maker_control);
    const waterFilter = this._getEntity(this.config.water_filter_status);
    const hotWaterStatus = this._getEntity(this.config.hot_water_status);
    const hotWaterTime = this._getEntity(this.config.hot_water_status_time);

    const title = "Dispenser Controls";

    let statusText = hotWaterStatus.state;
    if (hotWaterStatus.state === "Heating" && hotWaterTime.state !== "Off") {
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

    if (!this._embeddedCard && window.loadCardHelpers) {
      window.loadCardHelpers().then(helpers => {
        try {
          const card = helpers.createCardElement({
            type: "custom:more-info-card",
            entity: this.config.dispenser_control
          });
          card.hass = this.hass;
          this._embeddedCard = card;
          card.style.cssText = "--ha-card-background: transparent; --ha-card-box-shadow: none; --ha-card-border-width: 0; background: transparent; box-shadow: none; border: none;";
          this.requestUpdate();
        } catch (e) {
          console.error("Failed to create more-info-card", e);
        }
      });
    } else if (this._embeddedCard) {
      this._embeddedCard.hass = this.hass;
    }

    return html`
      <div class="popup-overlay" @click=${() => this._closePopup()}>
        <div class="popup-content" 
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
            <h3>${title}</h3>
          </div>

          <div class="popup-controls">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="margin: 0;">Hot Water Control</h4>
              ${hotWaterStatus.state === "Heating"
                ? html`
                    <button
                      class="floating-cancel-button"
                      @click=${() =>
                        this._toggleEntity(this.config.hot_water_cancel_switch)}
                      style="position: static; margin: 0;"
                    >
                      Cancel
                    </button>
                  `
                : ""}
            </div>
              <div class="control-row status-row">
                <ha-icon icon="mdi:water-boiler"></ha-icon>
                <span class="control-label">Status:</span>
                <span class="control-value">${statusText}</span>
              </div>

              <div class="embedded-card-container" style="margin-top: 12px; margin-bottom: 12px;">
                ${this._embeddedCard ? this._embeddedCard : html`<div style="text-align: center; padding: 20px;">Loading Native Controls...</div>`}
              </div>

              <div class="preset-buttons">
                <button
                  class="preset-button"
                  @click=${() => this._setTemperature(controlEntity, 150)}
                >
                  <ha-icon icon="mdi:coffee-outline"></ha-icon>
                  <span>Cocoa (150°)</span>
                </button>
                <button
                  class="preset-button"
                  @click=${() => this._setTemperature(controlEntity, 170)}
                >
                  <ha-icon icon="mdi:tea"></ha-icon>
                  <span>Tea (170°)</span>
                </button>
                <button
                  class="preset-button"
                  @click=${() => this._setTemperature(controlEntity, 185)}
                >
                  <ha-icon icon="mdi:bowl-mix-outline"></ha-icon>
                  <span>Soup (185°)</span>
                </button>
              </div>
            </div>

            <div class="divider"></div>
            
            <h4 style="margin: 0 0 8px 0;">Other Controls</h4>
              <div class="control-row">
                <ha-icon
                  icon="${filterIcon}"
                  style="${filterColorStyle}"
                ></ha-icon>
                <span class="control-label">Water Filter:</span>
                <span class="control-value" style="${filterColorStyle}"
                  >${waterFilter.state}</span
                >
              </div>

              <div class="control-row">
                <ha-icon icon="mdi:cube-outline"></ha-icon>
                <span class="control-label">Ice Maker:</span>
                <ha-switch
                  .checked=${iceMaker.state === "on"}
                  @change=${() =>
                    this._toggleEntity(this.config.ice_maker_control)}
                  class="popup-switch"
                ></ha-switch>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
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
    if (!entity_id) {
      console.error(
        "[refrigerator-status-card] Attempted to toggle a missing entity."
      );
      return;
    }
    this.hass.callService("homeassistant", "toggle", { entity_id });
  }

  _setTemperature(entity, temp) {
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: entity.entity_id,
      temperature: temp,
    });
  }

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
        flex-shrink: 0;
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
      .header-right {
        display: flex;
        align-items: center;
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
      .status-chip.active-alert {
        background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15);
        color: var(--error-color, #f44336);
        animation: pulse 2s infinite;
      }
      .status-chip.active-warning {
        background: rgba(var(--rgb-warning-color, 255, 152, 0), 0.15);
        color: var(--warning-color, #ff9800);
      }
      .status-chip.active-heat {
        background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15);
        color: var(--error-color, #f44336);
      }
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(var(--rgb-error-color, 244, 67, 54), 0.4);
        }
        70% {
          box-shadow: 0 0 0 6px rgba(var(--rgb-error-color, 244, 67, 54), 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(var(--rgb-error-color, 244, 67, 54), 0);
        }
      }

      .card-content {
        padding: 0 16px 16px;
      }

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
      .left-door .fridge-handle {
        right: -30px;
        z-index: 1;
      }
      .right-door .fridge-handle {
        left: -30px;
        z-index: 1;
      }
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
        padding: 16px 15px 16px 16px;
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
        transition: background-color 0.3s ease;
      }
      .dispenser.heating {
        background-color: rgba(var(--rgb-error-color, 244, 67, 54), 0.1);
        border-color: var(--error-color, #f44336);
      }
      .dispenser.ready {
        background-color: rgba(var(--rgb-info-color, 49, 130, 206), 0.1);
        border-color: var(--info-color, #3182ce);
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
        position: relative;
        bottom: auto;
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

      .hot-water-status {
        margin-top: 12px;
        background: var(--warning-color);
        color: var(--on-warning-color, #000);
        padding: 4px 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: bold;
        cursor: pointer;
      }

      /* Popup Styles */
      .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        touch-action: none;
      }
      .popup-overlay.visible {
        opacity: 1;
        visibility: visible;
      }
      .popup-content {
        background-color: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        padding: 24px;
        border-radius: 24px;
        width: 90%;
        max-width: 450px;
        max-height: 90vh;
        overflow-y: auto;
        overscroll-behavior: contain;
        touch-action: pan-y;
        box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.24);
        color: var(--primary-text-color);
        display: flex;
        flex-direction: column;
        gap: 16px;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .popup-content.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .drag-handle {
        width: 36px;
        height: 5px;
        flex-shrink: 0;
        background-color: #888;
        border-radius: 3px;
        margin: -12px auto 16px auto;
      }
      .popup-header {
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 12px;
      }
      .popup-header h3 {
        margin: 0;
        font-size: 1.5em;
        font-weight: 500;
        color: var(--primary-text-color);
        flex-grow: 1;
      }
      .popup-header .close-button {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        transition: background-color 0.2s;
      }
      .popup-header .close-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .popup-header .close-button ha-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 24px;
      }

      .popup-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .popup-controls h4 {
        font-size: 1.2em;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .divider {
        border-top: 1px solid var(--divider-color);
        margin: 8px 0;
      }

      .control-row {
        display: flex;
        align-items: center;
        gap: 16px;
        min-height: 40px;
      }
      .control-row ha-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 24px;
      }
      .control-label {
        flex-grow: 1;
        font-size: 1.1em;
      }
      .control-value {
        font-weight: 600;
        font-size: 1.1em;
        color: var(--primary-text-color);
      }

      .floating-cancel-button {
        position: absolute;
        top: 12px;
        right: 12px;
        background-color: var(--error-color);
        color: var(--on-error-color, #fff);
        border: none;
        border-radius: var(--ha-card-border-radius, 8px);
        padding: 6px 12px;
        font-weight: 500;
        font-size: 0.9em;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 2;
        transition: background-color 0.2s ease, filter 0.2s ease;
      }
      .floating-cancel-button:hover {
        filter: brightness(90%);
      }



      .preset-buttons {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
      }
      .preset-button {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background-color: var(--tertiary-color, var(--disabled-color));
        color: var(--on-tertiary-color, var(--primary-text-color));
        border: none;
        border-radius: var(--ha-card-border-radius, 12px);
        padding: 12px 8px;
        font-weight: 500;
        font-size: 0.9em;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
      }
      .preset-button:hover {
        transform: scale(1.03);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        filter: brightness(95%);
      }
      .preset-button ha-icon {
        --mdc-icon-size: 20px;
      }
      .preset-button span {
        white-space: nowrap;
      }

      .popup-switch {
        --mdc-theme-secondary: var(--accent-color);
        --mdc-switch-selected-track-color: rgba(var(--accent-color-rgb), 0.5);
        --mdc-switch-selected-handle-color: var(--accent-color);
      }

      @media (max-width: 768px) {
        .popup-overlay {
          align-items: flex-end;
        }
        .popup-content {
          width: 100%;
          max-width: none;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 24px 24px 0 0;
          box-shadow: 0px -4px 16px rgba(0, 0, 0, 0.15);
          box-sizing: border-box;
          transform: translateY(100%);
          padding-bottom: max(24px, env(safe-area-inset-bottom, 24px));
        }
        .popup-content.visible {
          transform: translateY(0);
        }
      }
    `;
  }

  getCardSize() {
    return 8;
  }
}

class RefrigeratorStatusCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }
  setConfig(config) {
    this._config = config;
  }
  render() {
    if (!this.hass || !this._config) {
      return html``;
    }
    return html`
      <div class="card-config">
        <div class="config-row">
          <label for="title">Card Title</label>
          <input
            id="title"
            .value="${this._config.title || ''}"
            @input="${(e) => this._valueChanged(e, 'title')}"
          ></input>
        </div>
        <div class="config-row">
          <label for="device_prefix">Device Prefix (e.g. dt507030)</label>
          <input
            id="device_prefix"
            .value="${this._config.device_prefix || ''}"
            @input="${(e) => this._valueChanged(e, 'device_prefix')}"
          ></input>
        </div>
        <p style="font-size: 0.9em; color: var(--secondary-text-color);">
          Setting a device prefix will automatically configure all required entities 
          assuming standard naming conventions (e.g., water_heater.[prefix]_fridge).
        </p>
      </div>
    `;
  }
  _valueChanged(ev, configKey) {
    if (!this._config) return;
    const value = ev.target.value;
    if (this._config[configKey] === value) return;
    const newConfig = { ...this._config, [configKey]: value };
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .config-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      label {
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      input {
        padding: 8px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }
    `;
  }
}
customElements.define("refrigerator-status-card-editor", RefrigeratorStatusCardEditor);

customElements.define("refrigerator-status-card", RefrigeratorStatusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "refrigerator-status-card",
  name: "Refrigerator Status Card",
  description: "A custom card for refrigerator status with dynamic config.",
  preview: true,
});
