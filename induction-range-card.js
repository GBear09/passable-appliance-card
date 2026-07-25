// induction-range-card.js - Visual Tweaks & Slider Fix

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class InductionRangeCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _popupOven: { state: true },
      _ovenTargetTemp: { state: true },
      _isOvenSliderDragging: { state: true },
    };
  }

  constructor() {
    super();
    this._popupOven = null;
    this._ovenTargetTemp = null;
    this._isOvenSliderDragging = false;
    console.info(
      "%c INDUCTION-RANGE-CARD %c IS LOADED ",
      "color: cyan; background: black; font-weight: bold;",
      "color: darkblue; background: white; font-weight: bold;"
    );
  }

  setConfig(config) {
    if (!config.device_prefix && (!config.oven || !config.cooktop)) {
      throw new Error("Configuration requires either 'device_prefix' or explicit 'oven' and 'cooktop' config.");
    }
    const c = { ...config };
    if (c.device_prefix) {
      const p = c.device_prefix;
      c.oven = c.oven || {
        upper_control: `water_heater.${p}_oven`,
        lower_control: `water_heater.${p}_lower_oven`,
        upper_raw_temp: `sensor.${p}_raw_temperature`,
        lower_raw_temp: `sensor.${p}_lower_oven_raw_temperature`,
        upper_light_entity: `select.${p}_light`,
        lower_light_entity: `select.${p}_lower_oven_light`,
        upper_state_entity: `sensor.${p}_current_state`,
        lower_state_entity: `sensor.${p}_lower_oven_current_state`
      };
      c.cooktop = c.cooktop || {
        burners: [
          { status_entity: `binary_sensor.${p}_cooktop_status_left_front_on`, power_entity: `sensor.${p}_cooktop_status_left_front_power_pct` },
          { status_entity: `binary_sensor.${p}_cooktop_status_left_rear_on`, power_entity: `sensor.${p}_cooktop_status_left_rear_power_pct` },
          { status_entity: `binary_sensor.${p}_cooktop_status_center_rear_on`, power_entity: null },
          { status_entity: `binary_sensor.${p}_cooktop_status_right_rear_on`, power_entity: `sensor.${p}_cooktop_status_right_rear_power_pct` },
          { status_entity: `binary_sensor.${p}_cooktop_status_right_front_on`, power_entity: `sensor.${p}_cooktop_status_right_front_power_pct` }
        ],
        sync_entities: {
          left_front: `binary_sensor.${p}_cooktop_status_left_front_synchronized`,
          left_rear: `binary_sensor.${p}_cooktop_status_left_rear_synchronized`
        }
      };
    }
    this.config = c;
  }

  static getConfigElement() {
    return document.createElement("induction-range-card-editor");
  }

  _getEntity(entityId) {
    if (!entityId) return { state: "unavailable", attributes: {} };
    const state = this.hass.states[entityId];
    if (!state) {
      console.warn(`[induction-range-card] Entity not found: ${entityId}`);
      return { state: "unavailable", attributes: {} };
    }
    return state;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const burners = this.config.cooktop.burners.map((b) => ({
      status: this._getEntity(b.status_entity),
    }));
    const isAnyBurnerOn = burners.some((b) => b.status.state === "on");

    const upperState = this._getEntity(
      this.config.oven.upper_state_entity
    ).state;
    const lowerState = this._getEntity(
      this.config.oven.lower_state_entity
    ).state;

    const isUpperOn = upperState !== "Off" && upperState !== "unavailable";
    const isLowerOn = lowerState !== "Off" && lowerState !== "unavailable";
    const isOvenOn = isUpperOn || isLowerOn;

    let chipLabel = "IDLE";
    let chipClass = "idle";

    if (isAnyBurnerOn && isOvenOn) {
      chipLabel = "RANGE ACTIVE";
      chipClass = "active-range";
    } else if (isAnyBurnerOn) {
      chipLabel = "COOKTOP ON";
      chipClass = "active-cooktop";
    } else if (isOvenOn) {
      chipLabel = "OVEN ON";
      chipClass = "active-oven";
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon
                icon="mdi:stove"
                style="margin-right:8px; color: var(--primary-color);"
              ></ha-icon>
              ${this.config.title || "Induction Range"}
            </h1>
            <p class="subtitle">Cooking Zones & Ovens</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${chipClass}">${chipLabel}</div>
          </div>
        </div>

        <div class="card-content">${this._renderMainGraphics()}</div>
        ${this._renderPopup()}
      </ha-card>
    `;
  }

  _renderMainGraphics() {
    const burners = this.config.cooktop.burners.map((b) => ({
      status: this._getEntity(b.status_entity),
      power: b.power_entity ? this._getEntity(b.power_entity) : null,
    }));

    const syncLeftFront = this._getEntity(
      this.config.cooktop.sync_entities?.left_front
    );
    const syncLeftRear = this._getEntity(
      this.config.cooktop.sync_entities?.left_rear
    );
    const isLeftSynced =
      syncLeftFront.state === "on" && syncLeftRear.state === "on";

    const ovenConfig = this.config.oven;
    const upperOvenControl = this._getEntity(ovenConfig.upper_control);
    const lowerOvenControl = this._getEntity(ovenConfig.lower_control);
    const upperOvenState = this._getEntity(ovenConfig.upper_state_entity);
    const lowerOvenState = this._getEntity(ovenConfig.lower_state_entity);

    return html`
      <div class="graphics-container">
        <div class="cooktop-container">
          ${this._renderBurner(burners[0], {
            top: "48%",
            left: "12%",
            width: "26%",
          })}
          ${this._renderBurner(burners[1], {
            top: "2%",
            left: "12%",
            width: "26%",
          })}
          ${this._renderBurner(burners[2], {
            top: "5%",
            left: "42%",
            width: "21%",
          })}
          ${this._renderBurner(burners[3], {
            top: "5%",
            left: "68%",
            width: "21%",
          })}
          ${this._renderBurner(burners[4], {
            top: "41%",
            left: "55%",
            width: "31%",
          })}
          ${this._renderSyncLines(isLeftSynced)}
        </div>

        <div class="oven-container">
          <div class="oven-control-panel">${this._renderOvenKnobs()}</div>
          ${this._renderOven(upperOvenControl, upperOvenState, "upper")}
          ${this._renderOven(lowerOvenControl, lowerOvenState, "lower")}
        </div>
      </div>
    `;
  }

  _renderBurner(burner, position) {
    const isOn = burner.status.state === "on";
    const powerLevel = burner.power ? Math.round(burner.power.state) : "";
    const statusText = isOn ? (burner.power ? `${powerLevel}%` : "On") : "Off";
    const style = `top:${position.top}; left:${position.left}; width:${position.width};`;

    return html`
      <div
        class="burner ${isOn ? "burner-on" : "burner-off"}"
        style="${style}"
        @click="${() => this._showMoreInfo(burner.status.entity_id)}"
      >
        <span class="status-text">${statusText}</span>
      </div>
    `;
  }

  _renderSyncLines(isSynced) {
    return html`
      <div
        class="sync-line ${isSynced ? "synced-on" : ""}"
        style="left: 12%;"
      ></div>
      <div
        class="sync-line ${isSynced ? "synced-on" : ""}"
        style="left: 36%;"
      ></div>
    `;
  }

  _renderOvenKnobs() {
    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 180 32"
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          <circle class="oven-knob" cx="0" cy="16" r="9" />
          <circle class="oven-knob" cx="22.5" cy="16" r="9" />
          <circle class="oven-knob" cx="45" cy="16" r="9" />
          <rect
            class="oven-screen"
            x="60"
            y="4"
            width="60"
            height="24"
            rx="4"
          />
          <circle class="oven-knob" cx="135" cy="16" r="9" />
          <circle class="oven-knob" cx="157.5" cy="16" r="9" />
          <circle class="oven-knob" cx="180" cy="16" r="9" />
        </g>
      </svg>
    `;
  }

  _renderOven(ovenControlEntity, ovenStateEntity, type) {
    const ovenConfig = this.config.oven;
    const rawTemp =
      type === "upper"
        ? this._getEntity(ovenConfig.upper_raw_temp)
        : this._getEntity(ovenConfig.lower_raw_temp);
    const targetTemp = ovenControlEntity.attributes.temperature;

    const isOn =
      ovenStateEntity.state.toLowerCase() !== "off" &&
      ovenStateEntity.state !== "unavailable";
    const ovenClass = `oven ${type}-oven ${isOn ? "oven-on" : "oven-off"}`;

    return html`
      <div class="${ovenClass}" @click=${() => this._showPopup(type)}>
        <div class="oven-handle"></div>
        <div class="oven-info">
          ${isOn
            ? html`
                <span class="oven-state">${ovenStateEntity.state}</span>
                <span class="oven-temps"
                  >${rawTemp.state}° / ${targetTemp}°</span
                >
              `
            : html`
                <span class="oven-state">Off</span>
                <span class="oven-temps">${rawTemp.state}°</span>
              `}
        </div>
      </div>
    `;
  }

  async _showPopup(oven) {
    this._popupOven = oven;
    
    if (window.loadCardHelpers) {
      const helpers = await window.loadCardHelpers();
      try {
        const card = await helpers.createCardElement({
          type: "custom:more-info-card",
          entity: this.config.oven[`${oven}_control`]
        });
        card.hass = this.hass;
        card.style.cssText = "--ha-card-background: transparent; --ha-card-box-shadow: none; --ha-card-border-width: 0; background: transparent; box-shadow: none; border: none;";
        this._embeddedCard = card;
      } catch (e) {
        console.error("Failed to create more-info-card", e);
      }
    }

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
      this._popupOven = null;
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
    if (!this._popupOven) return html``;

    const ovenName = this._popupOven === "upper" ? "Upper" : "Lower";
    const ovenControlEntity = this._getEntity(
      this.config.oven[`${this._popupOven}_control`]
    );
    const lightEntity = this._getEntity(
      this.config.oven[`${this._popupOven}_light_entity`]
    );

    const tempUnit = ovenControlEntity.attributes.temperature_unit || "°";
    const minTemp = parseFloat(ovenControlEntity.attributes.min_temp) || 170;
    const maxTemp = parseFloat(ovenControlEntity.attributes.max_temp) || 550;
    const currentTemp = parseFloat(
      ovenControlEntity.attributes.current_temperature
    );

    const entityTargetTemp = parseFloat(
      ovenControlEntity.attributes.temperature
    );
    const sliderInputTemp = parseFloat(this._ovenTargetTemp);

    const targetTemp = this._isOvenSliderDragging
      ? sliderInputTemp
      : entityTargetTemp;

    const range = maxTemp - minTemp;
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    const isCurrentValid = !isNaN(currentTemp);
    const isTargetValid = !isNaN(targetTemp);

    const clampedCurrent = clamp(currentTemp, minTemp, maxTemp);
    const clampedTarget = isTargetValid
      ? clamp(targetTemp, minTemp, maxTemp)
      : minTemp;

    const currentPerc =
      range > 0 ? ((clampedCurrent - minTemp) / range) * 100 : 0;
    const targetPerc =
      range > 0 ? ((clampedTarget - minTemp) / range) * 100 : 0;

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
            <h3>${ovenName} Oven Controls</h3>
          </div>
          <div class="popup-controls">

            <div class="embedded-card-container" style="margin-top: 12px; margin-bottom: 12px;">
              ${this._embeddedCard ? this._embeddedCard : html`<div style="text-align: center; padding: 20px;">Loading Native Controls...</div>`}
            </div>

            <div class="divider"></div>
            <div class="control-row">
              <ha-icon icon="mdi:lightbulb"></ha-icon>
              <span class="control-label">Oven Light</span>
              <ha-switch
                .checked=${lightEntity.state === "High"}
                @change=${() => this._toggleOvenLight(lightEntity)}
                class="popup-switch"
              ></ha-switch>
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

  _toggleOvenLight(lightEntity) {
    if (!lightEntity || lightEntity.state === "unavailable") return;
    const newOption = lightEntity.state === "High" ? "Off" : "High";
    this.hass.callService("select", "select_option", {
      entity_id: lightEntity.entity_id,
      option: newOption,
    });
  }



  _setTemperature(ovenEntity, temp) {
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: ovenEntity.entity_id,
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
      .status-chip.active-range {
        background-color: rgba(var(--error-color-rgb, 229, 62, 62), 0.15);
        color: var(--error-color, #e53e3e);
        animation: pulse 2s infinite;
      }
      .status-chip.active-cooktop {
        background-color: rgba(var(--warning-color-rgb, 237, 137, 54), 0.15);
        color: var(--warning-color, #ed8936);
      }
      .status-chip.active-oven {
        background-color: rgba(var(--error-color-rgb, 229, 62, 62), 0.15);
        color: var(--error-color, #e53e3e);
      }
      @keyframes pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
        100% {
          opacity: 1;
        }
      }

      .card-content {
        padding: 16px;
      }
      .graphics-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 24px;
      }

      /* Cooktop Styles */
      .cooktop-container,
      .oven-container {
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
        background: rgba(
          var(--warning-color-rgb, 237, 137, 54),
          0.15
        ) !important;
        box-shadow: inset 0 0 20px 5px
          rgba(var(--warning-color-rgb, 237, 137, 54), 0.2);
      }
      .burner .status-text {
        color: var(--primary-text-color);
      }
      .status-text {
        font-weight: bold;
        font-size: 0.9em;
        text-transform: capitalize;
      }

      .sync-line {
        position: absolute;
        top: 36%;
        height: 24%;
        width: 2%;
        background-color: var(--disabled-text-color);
        border: none;
        border-radius: 8px;
        opacity: 0.6;
        box-sizing: border-box;
        z-index: 0;
        transition: all 0.3s ease;
      }

      .sync-line.synced-on {
        border-color: var(--warning-color);
        background-color: var(--warning-color);
        opacity: 1;
        box-shadow: 0 0 10px 2px var(--warning-color);
      }

      /* Oven Styles */
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
        border-radius: var(--ha-card-border-radius, 8px);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .oven-knob {
        fill: transparent;
        stroke: var(--secondary-text-color);
        stroke-width: 2;
        opacity: 1;
      }
      .oven-screen {
        fill: rgba(128, 128, 128, 0.1);
        stroke: var(--secondary-text-color);
        stroke-width: 1.5;
        opacity: 1;
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
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s ease, color 0.3s ease,
          border-color 0.3s ease;
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
      .upper-oven {
        margin-bottom: 8px;
        flex-grow: 0.5;
      }
      .lower-oven {
        flex-grow: 1.3;
      }
      .oven.oven-off {
        opacity: 1;
        background: var(--card-background-color, #fff) !important;
        color: var(--primary-text-color);
      }
      .oven.oven-on {
        opacity: 1;
        background: rgba(var(--error-color-rgb, 229, 62, 62), 0.15) !important;
        color: var(--error-color, #e53e3e);
        border-color: var(--error-color, #e53e3e);
      }

      .oven-info {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        justify-content: center;
        line-height: 1.2;
        padding-top: 25px;
        box-sizing: border-box;
      }
      .oven-state {
        font-weight: bold;
        font-size: 1.1em;
        color: inherit;
        text-transform: capitalize;
      }
      .oven-temps {
        font-size: 0.8em;
        color: inherit;
        opacity: 0.8;
      }

      /* POPUP STYLES */
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
        font-weight: 500;
      }



      .mode-select {
        background-color: var(--tertiary-color, var(--disabled-color));
        color: var(--on-tertiary-color, var(--primary-text-color));
        border: none;
        border-radius: var(--ha-card-border-radius, 8px);
        padding: 8px 12px;
        font-weight: 500;
        font-size: 1em;
        text-transform: capitalize;
        max-width: 150px;
        cursor: pointer;
      }
      .divider {
        border-top: 1px solid var(--divider-color);
        margin: 8px 0;
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
    return 6;
  }
}

class InductionRangeCardEditor extends LitElement {
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
          <label for="device_prefix">Device Prefix (e.g. sqdr174020p)</label>
          <input
            id="device_prefix"
            .value="${this._config.device_prefix || ''}"
            @input="${(e) => this._valueChanged(e, 'device_prefix')}"
          ></input>
        </div>
        <p style="font-size: 0.9em; color: var(--secondary-text-color);">
          Setting a device prefix automatically configures all upper/lower oven 
          and cooktop entities based on the Café Range convention.
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
customElements.define("induction-range-card-editor", InductionRangeCardEditor);

customElements.define("induction-range-card", InductionRangeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "induction-range-card",
  name: "Induction Range Card",
  description: "A custom card for an induction range with dynamic config.",
  preview: true,
});
