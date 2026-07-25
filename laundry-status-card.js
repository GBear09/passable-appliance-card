// laundry-status-card.js - Header Alignment Update

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class LaundryStatusCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  constructor() {
    super();
    console.info(
      "%c LAUNDRY-STATUS-CARD %c IS LOADED ",
      "color: cyan; background: black; font-weight: bold;",
      "color: darkblue; background: white; font-weight: bold;"
    );
  }

  setConfig(config) {
    if (!config.washer || !config.dryer) {
      throw new Error("You must define a 'washer' and a 'dryer' section.");
    }
    if (!config.washer.current_status || !config.dryer.current_status) {
      throw new Error("Each appliance must have a 'current_status' entity.");
    }
    this.config = config;
  }

  _getEntity(entityId) {
    if (!entityId) return { state: "unavailable", attributes: {} };
    const state = this.hass.states[entityId];
    if (!state) {
      console.warn(`[laundry-status-card] Entity not found: ${entityId}`);
      return { state: "unavailable", attributes: {} };
    }
    return state;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const washerEntities = {
      status: this._getEntity(this.config.washer.current_status),
      operation: this._getEntity(this.config.washer.operation),
      remaining_time: this._getEntity(this.config.washer.remaining_time),
    };

    const dryerEntities = {
      status: this._getEntity(this.config.dryer.current_status),
      operation: this._getEntity(this.config.dryer.operation),
      remaining_time: this._getEntity(this.config.dryer.remaining_time),
    };

    const activeStates = [
      "running",
      "wash",
      "rinse",
      "rinsing",
      "spin",
      "spinning",
      "drying",
      "cooling",
      "detecting",
    ];

    const isWasherActive = activeStates.includes(
      washerEntities.status.state.toLowerCase()
    );
    const isDryerActive = activeStates.includes(
      dryerEntities.status.state.toLowerCase()
    );

    let chipLabel = "IDLE";
    let chipClass = "idle";

    if (isWasherActive && isDryerActive) {
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
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon
                icon="mdi:washing-machine"
                style="margin-right:8px; color: var(--primary-color);"
              ></ha-icon>
              ${this.config.title || "Laundry"}
            </h1>
            <p class="subtitle">Washer & Dryer Status</p>
          </div>
          <div class="header-right">
            <div class="status-chip ${chipClass}">${chipLabel}</div>
          </div>
        </div>

        <div class="card-content">
          ${this._renderAppliance(
            "Washer",
            "mdi:washing-machine",
            washerEntities
          )}
          ${this._renderAppliance("Dryer", "mdi:tumble-dryer", dryerEntities)}
        </div>
      </ha-card>
    `;
  }

  _formatRemainingTime(finishTimeStr) {
    if (!finishTimeStr || finishTimeStr === "unavailable") {
      return "";
    }
    const finishTime = new Date(finishTimeStr);
    const now = new Date();

    let diff = (finishTime.getTime() - now.getTime()) / 1000;
    if (diff < 0) diff = 0;

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    const paddedHours = String(hours).padStart(2, "0");
    const paddedMinutes = String(minutes).padStart(2, "0");

    return `${paddedHours}:${paddedMinutes}`;
  }

  _renderAppliance(name, icon, entities) {
    const status = entities.status.state.toLowerCase().replace("_", " ");
    const activeStates = [
      "running",
      "wash",
      "rinse",
      "rinsing",
      "spin",
      "spinning",
      "drying",
      "cooling",
      "detecting",
    ];
    const isActive = activeStates.includes(status);
    const machineType = name.toLowerCase();

    let displayStatus = status;
    if (status === "power off") {
      displayStatus = "Off";
    }

    const remainingTime = this._formatRemainingTime(
      entities.remaining_time.state
    );

    return html`
      <div class="appliance-container m3-card">
        <div class="graphic-header">
          <div class="appliance-header">
            <ha-icon .icon=${icon}></ha-icon>
            <span class="name">${name}</span>
          </div>
          <div class="knob-container">
            <svg class="knob-svg" viewBox="0 0 32 32">
              <circle class="knob" cx="16" cy="16" r="14" />
            </svg>
          </div>
          <div class="screen-container">
            <div class="screen">
              ${isActive && remainingTime
                ? html` <span class="screen-time">${remainingTime}</span> `
                : ""}
            </div>
          </div>
        </div>
        <div class="graphic-body">
          <div class="door">
            <div
              class="door-inner ${isActive ? `${machineType}-active` : ""}"
            ></div>
            ${isActive
              ? html`
                  <svg class="spinner-svg" viewBox="0 0 100 100">
                    <g class="spinner">
                      <circle
                        class="spinner-arc ${machineType}-active"
                        cx="50"
                        cy="50"
                        r="45"
                      ></circle>
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

  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
      }
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
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
      }
      .status-chip.idle {
        background: rgba(128, 128, 128, 0.15);
        color: var(--secondary-text-color);
      }
      .status-chip.active {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.15);
        color: var(--primary-color, #2196f3);
      }
      .status-chip.active-washer {
        background: rgba(var(--rgb-info-color, 49, 130, 206), 0.15);
        color: var(--info-color, #3182ce);
      }
      .status-chip.active-dryer {
        background: rgba(var(--rgb-warning-color, 237, 137, 54), 0.15);
        color: var(--warning-color, #ed8936);
      }

      .card-content {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        padding: 0 16px 16px;
        gap: 16px;
      }

      /* M3 Container Styling */
      .appliance-container {
        flex: 1;
        min-width: 240px;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--secondary-background-color, #f5f5f5);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-card-border-radius, 12px);
        padding: 16px;
        box-sizing: border-box;
      }

      .graphic-header {
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        height: 48px;
      }
      .appliance-header {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        color: var(--primary-text-color);
      }
      .appliance-header ha-icon {
        color: var(--secondary-text-color);
      }
      .appliance-header .name {
        margin-left: 8px;
        font-weight: 500;
        font-size: 1.2em;
        white-space: nowrap;
      }
      .knob-container {
        flex: 1;
        display: flex;
        justify-content: center;
      }
      .knob-svg {
        width: 48px;
        height: 48px;
      }
      .knob {
        fill: var(--card-background-color, #fff);
        stroke: var(--divider-color);
        stroke-width: 2;
      }
      .screen-container {
        flex: 1;
        display: flex;
        justify-content: flex-end;
      }
      .screen {
        width: 80px;
        height: 40px;
        background-color: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .screen-time {
        color: var(--primary-color);
        font-weight: bold;
        font-size: 1.2em;
        font-family: monospace;
      }
      .graphic-body {
        width: 100%;
        max-width: 180px;
        margin-bottom: 16px;
      }
      .door {
        width: 100%;
        padding-top: 100%; /* 1:1 Aspect ratio */
        position: relative;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        border: 2px solid var(--divider-color, #e0e0e0);
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .spinner-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }
      .spinner {
        animation: spin 1.5s linear infinite;
        transform-origin: center;
      }
      .spinner-arc {
        fill: transparent;
        stroke-width: 6;
        stroke-linecap: round;
        stroke-dasharray: 212;
        stroke-dashoffset: 70;
      }
      .spinner-arc.washer-active {
        stroke: var(--info-color, #3182ce);
      }
      .spinner-arc.dryer-active {
        stroke: var(--warning-color, #ed8936);
      }

      .door-inner {
        position: absolute;
        top: 15%;
        left: 15%;
        right: 15%;
        bottom: 15%;
        border-radius: 50%;
        background-color: rgba(128, 128, 128, 0.05);
        border: 1px solid var(--divider-color);
        transition: box-shadow 0.3s ease-in-out;
      }
      .door-inner.washer-active {
        box-shadow: inset 0 0 20px 5px
          rgba(var(--rgb-info-color, 49, 130, 206), 0.2);
      }
      .door-inner.dryer-active {
        box-shadow: inset 0 0 20px 5px
          rgba(var(--rgb-warning-color, 237, 137, 54), 0.2);
      }

      .door-info {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        pointer-events: none;
      }
      .door-state {
        font-weight: bold;
        font-size: 1.1em;
        color: var(--primary-text-color);
        text-transform: capitalize;
      }
    `;
  }
}

customElements.define("laundry-status-card", LaundryStatusCard);
