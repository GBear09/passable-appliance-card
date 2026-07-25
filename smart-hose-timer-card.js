/**
 * Smart Hose Timer Card
 * Version: 1.3 (Ring Slider & M3 Design)
 */

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class SmartHoseTimerCardEditor extends LitElement {
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
      <div class="card-config">
        <ha-textfield
          label="Card Title"
          .value=${this.config.title || "Smart Hose Timer"}
          .configValue=${"title"}
          @input=${this._valueChanged}
        ></ha-textfield>
        
        <ha-formfield .label=${"Enable B-hyve specific manual runtime (bhyve.start_watering)"}>
          <ha-switch
            .checked=${this.config.bhyve_mode !== false}
            .configValue=${"bhyve_mode"}
            @change=${this._valueChanged}
          ></ha-switch>
        </ha-formfield>
        
        <h3>Required Entities</h3>
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "valve" } }}
          .value=${this.config.valve_entity || ""}
          .configValue=${"valve_entity"}
          .label=${"Zone Valve"}
          @value-changed=${this._valueChanged}
        ></ha-selector>
        
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor" } }}
          .value=${this.config.state_sensor || ""}
          .configValue=${"state_sensor"}
          .label=${"State Sensor"}
          @value-changed=${this._valueChanged}
        ></ha-selector>
        
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor", device_class: "timestamp" } }}
          .value=${this.config.history_sensor || ""}
          .configValue=${"history_sensor"}
          .label=${"History Sensor"}
          @value-changed=${this._valueChanged}
        ></ha-selector>

        <h3>Optional Entities</h3>
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor", device_class: "battery" } }}
          .value=${this.config.battery_sensor || ""}
          .configValue=${"battery_sensor"}
          .label=${"Battery Sensor"}
          @value-changed=${this._valueChanged}
        ></ha-selector>
        
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "sensor", device_class: "timestamp" } }}
          .value=${this.config.next_watering_sensor || ""}
          .configValue=${"next_watering_sensor"}
          .label=${"Next Watering Sensor"}
          @value-changed=${this._valueChanged}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.smart_watering_switch || ""}
          .configValue=${"smart_watering_switch"}
          .label=${"Smart Watering Switch"}
          @value-changed=${this._valueChanged}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: "switch" } }}
          .value=${this.config.rain_delay_switch || ""}
          .configValue=${"rain_delay_switch"}
          .label=${"Rain Delay Switch"}
          @value-changed=${this._valueChanged}
        ></ha-selector>
      </div>
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 20px;
        }
        h3 {
          margin-top: 16px;
          margin-bottom: 4px;
          border-bottom: 1px solid var(--divider-color, #ccc);
          color: var(--primary-text-color);
          font-size: 1em;
          padding-bottom: 4px;
        }
      </style>
    `;
  }
}
customElements.define("smart-hose-timer-card-editor", SmartHoseTimerCardEditor);

class SmartHoseTimerCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _manualRuntime: { type: Number },
      _showSettings: { type: Boolean },
      _isDragging: { type: Boolean }
    };
  }

  static getConfigElement() {
    return document.createElement("smart-hose-timer-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Smart Hose Timer",
      bhyve_mode: true,
      valve_entity: "valve.pool_zone",
      state_sensor: "sensor.pool_state",
      history_sensor: "sensor.pool_zone_history",
      battery_sensor: "sensor.pool_battery_level",
      next_watering_sensor: "sensor.pool_next_watering",
      smart_watering_switch: "switch.pool_smart_watering",
      rain_delay_switch: "switch.pool_rain_delay",
    };
  }

  constructor() {
    super();
    this._manualRuntime = 5; // Default manual preset in minutes
    this._showSettings = false;
    this._isDragging = false;
  }

  setConfig(config) {
    if (!config.valve_entity) {
      throw new Error("You need to define a valve_entity");
    }
    this.config = config;
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    this._fireHaptic("light");
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    }));
  }
  
  _fireHaptic(type = "light") {
    const event = new Event("haptic", { bubbles: true, composed: true });
    event.detail = type;
    this.dispatchEvent(event);
  }

  _toggleValve() {
    this._fireHaptic("medium");
    const valveState = this.hass.states[this.config.valve_entity];
    if (!valveState) return;
    
    if (valveState.state === 'open') {
      this.hass.callService("valve", "close_valve", { entity_id: this.config.valve_entity });
    } else {
      if (this.config.bhyve_mode !== false) {
        this.hass.callService("bhyve", "start_watering", { 
          entity_id: this.config.valve_entity,
          minutes: this._manualRuntime
        });
      } else {
        this.hass.callService("valve", "open_valve", { entity_id: this.config.valve_entity });
      }
    }
  }

  _toggleSwitch(entityId) {
    if (!entityId) return;
    this._fireHaptic("light");
    this.hass.callService("switch", "toggle", { entity_id: entityId });
  }

  _formatTime(timestamp) {
    if (!timestamp || timestamp === "unknown") return "Unknown";
    const date = new Date(timestamp);
    if (isNaN(date)) return "Unknown";
    return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  _startDrag(e) {
    if (this.hass.states[this.config.valve_entity]?.state === 'open') return;
    this._isDragging = true;
    this.shadowRoot.querySelector('.ring-slider').setPointerCapture(e.pointerId);
    this._updateRing(e);
    this._fireHaptic("selection");
  }

  _onDrag(e) {
    if (this._isDragging) {
      this._updateRing(e);
    }
  }

  _endDrag(e) {
    this._isDragging = false;
    this.shadowRoot.querySelector('.ring-slider').releasePointerCapture(e.pointerId);
    this._fireHaptic("light");
  }

  _updateRing(e) {
    const slider = this.shadowRoot.querySelector('.ring-slider');
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Calculate angle in degrees (0 is top, clockwise)
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    
    // Map 0-360 to 1-120 minutes
    let val = Math.round((angle / 360) * 120);
    if (val < 1) val = 1;
    if (val > 120) val = 120;
    
    // Prevent jumping across the 120 / 1 boundary when dragging
    if (this._manualRuntime > 90 && val < 30) val = 120;
    if (this._manualRuntime < 30 && val > 90) val = 1;
    
    if (this._manualRuntime !== val) {
      this._manualRuntime = val;
      // Only fire haptic on every 5 minutes to avoid buzzing too much
      if (val % 5 === 0) this._fireHaptic("selection");
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const valve = this.hass.states[this.config.valve_entity];
    const stateSens = this.hass.states[this.config.state_sensor];
    const history = this.hass.states[this.config.history_sensor];
    const battery = this.config.battery_sensor ? this.hass.states[this.config.battery_sensor] : null;
    const nextWatering = this.config.next_watering_sensor ? this.hass.states[this.config.next_watering_sensor] : null;
    const smartWatering = this.config.smart_watering_switch ? this.hass.states[this.config.smart_watering_switch] : null;
    const rainDelay = this.config.rain_delay_switch ? this.hass.states[this.config.rain_delay_switch] : null;

    if (!valve) return html`<ha-card><div class="card-content">Entity not found: ${this.config.valve_entity}</div></ha-card>`;

    const isOpen = valve.state === "open";
    const statusText = isOpen ? "Watering" : (stateSens ? stateSens.state : "Idle");
    
    let lastRunTime = "--";
    let lastGallons = "--";
    let lastStart = "--";
    if (history && history.attributes) {
      if (history.attributes.run_time) lastRunTime = history.attributes.run_time + " min";
      if (history.attributes.consumption_gallons !== undefined) lastGallons = history.attributes.consumption_gallons + " gal";
      if (history.attributes.start_time) lastStart = this._formatTime(history.attributes.start_time);
    }

    let currentRuntime = valve.attributes && valve.attributes.current_runtime ? Math.floor(valve.attributes.current_runtime / 60) : 0;
    
    // Ring Math
    const maxVal = 120;
    const currentVal = isOpen ? Math.min(maxVal, currentRuntime) : this._manualRuntime;
    const pct = currentVal / maxVal;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dasharray = `${pct * circumference} ${circumference}`;
    const angleRad = pct * 2 * Math.PI - Math.PI/2;
    const knobX = 50 + radius * Math.cos(angleRad);
    const knobY = 50 + radius * Math.sin(angleRad);

    return html`
      <ha-card>
        <div class="header">
          <div class="header-left">
            <h1 class="title">
              <ha-icon icon="${isOpen ? 'mdi:sprinkler' : 'mdi:sprinkler-variant'}" style="margin-right:8px; color: var(--primary-color);"></ha-icon>
              ${this.config.title || "Smart Hose Timer"}
            </h1>
            <p class="subtitle" style="text-transform: capitalize;">${statusText}</p>
          </div>
          <div class="header-right">
            ${battery ? html`
              <div class="status-chip ${parseInt(battery.state) < 20 ? 'error' : 'idle'}" @click=${() => this._showMoreInfo(this.config.battery_sensor)} style="cursor: pointer;">
                <ha-icon icon="mdi:battery" style="margin-right:4px; --mdc-icon-size: 14px;"></ha-icon>
                ${battery.state}%
              </div>
            ` : ''}
            <div class="status-chip ${isOpen ? "heating" : "idle"}">
              ${isOpen ? "ACTIVE" : "IDLE"}
            </div>
          </div>
        </div>

        <div class="card-content">
          ${this.config.bhyve_mode !== false ? html`
            <div class="ring-container">
              <div class="ring-slider" 
                @pointerdown=${this._startDrag} 
                @pointermove=${this._onDrag} 
                @pointerup=${this._endDrag}
                @pointercancel=${this._endDrag}
                style="touch-action: none; cursor: ${isOpen ? 'default' : 'pointer'};">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--divider-color, rgba(128,128,128,0.2))" stroke-width="6"></circle>
                  <circle cx="50" cy="50" r="${radius}" fill="none" 
                    stroke="${isOpen ? 'var(--info-color, #03a9f4)' : 'var(--primary-color)'}" 
                    stroke-width="6" 
                    stroke-dasharray="${dasharray}" 
                    stroke-linecap="round"
                    transform="rotate(-90 50 50)"
                    style="transition: stroke-dasharray 0.1s linear;"></circle>
                  ${!isOpen ? html`
                    <circle cx="${knobX}" cy="${knobY}" r="5" fill="#fff" 
                      stroke="var(--primary-color)" stroke-width="2" 
                      style="transition: cx 0.1s linear, cy 0.1s linear;"></circle>
                  ` : ''}
                </svg>
                <div class="ring-content">
                  <span class="ring-value" style="color: ${isOpen ? 'var(--info-color, #03a9f4)' : 'var(--primary-text-color)'}">${currentVal}</span>
                  <span class="ring-label">MIN</span>
                </div>
              </div>
            </div>
          ` : ''}
          
          <div class="control-group m3-card">
            <div class="controls-container">
              <button
                class="recirc-button ${isOpen ? "active" : ""}"
                @click=${this._toggleValve}
              >
                <ha-icon icon="${isOpen ? 'mdi:water-off' : 'mdi:water'}"></ha-icon>
                <span class="button-content">
                  <span class="main-label">${isOpen ? 'Stop Watering' : 'Start Watering'}</span>
                  ${!isOpen ? html`<span class="sub-label">• ${lastStart !== '--' ? lastStart : 'Ready'}</span>` : html`<span class="sub-label">• ${currentRuntime} min elapsed</span>`}
                </span>
              </button>
              <button
                class="settings-btn ${this._showSettings ? "active" : ""}"
                @click=${() => { this._showSettings = !this._showSettings; this._fireHaptic("light"); this.requestUpdate(); }}
              >
                <ha-icon icon="mdi:cog"></ha-icon>
              </button>
            </div>

            ${this._showSettings ? html`
              <div class="settings-drawer">
                ${smartWatering ? html`
                  <div class="settings-row">
                    <div class="setting-label">
                      <ha-icon icon="mdi:auto-fix"></ha-icon>
                      <span>Smart Watering</span>
                    </div>
                    <div class="setting-control">
                      <ha-switch .checked=${smartWatering.state === 'on'} @change=${() => this._toggleSwitch(this.config.smart_watering_switch)}></ha-switch>
                    </div>
                  </div>
                ` : ''}
                ${rainDelay ? html`
                  <div class="settings-row">
                    <div class="setting-label">
                      <ha-icon icon="mdi:weather-pouring"></ha-icon>
                      <span>Rain Delay</span>
                    </div>
                    <div class="setting-control">
                      <ha-switch .checked=${rainDelay.state === 'on'} @change=${() => this._toggleSwitch(this.config.rain_delay_switch)}></ha-switch>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>

          <div class="stats-row">
            ${nextWatering ? html`
              <div class="stat-inline" @click=${() => this._showMoreInfo(this.config.next_watering_sensor)}>
                <div class="stat-inline-header">
                  <ha-icon icon="mdi:calendar-clock"></ha-icon>
                  <span class="value" style="font-size: 0.9em;">Next</span>
                </div>
                <div class="stat-inline-trend" style="font-size: 0.85em; font-weight: 500;">
                  ${this._formatTime(nextWatering.state)}
                </div>
              </div>
            ` : ''}
            
            ${history ? html`
              <div class="stat-inline" @click=${() => this._showMoreInfo(this.config.history_sensor)}>
                <div class="stat-inline-header">
                  <ha-icon icon="mdi:history"></ha-icon>
                  <span class="value" style="font-size: 0.9em;">Last</span>
                </div>
                <div class="stat-inline-trend" style="font-size: 0.85em; font-weight: 500; color: var(--info-color, #03a9f4);">
                  ${lastRunTime} • ${lastGallons}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
      }
      ha-card {
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2));
        overflow: hidden;
        color: var(--primary-text-color, #212121);
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
        gap: 8px;
      }

      .status-chip {
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 12px;
        text-transform: uppercase;
        background: rgba(128, 128, 128, 0.15);
        color: var(--secondary-text-color);
        display: flex;
        align-items: center;
      }
      .status-chip.idle {
        background: rgba(128, 128, 128, 0.15);
        color: var(--secondary-text-color);
      }
      .status-chip.heating {
        background: rgba(var(--rgb-info-color, 3, 169, 244), 0.15);
        color: var(--info-color, #03a9f4);
        animation: pulse 2s infinite;
      }
      .status-chip.error {
        background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15);
        color: var(--error-color, #f44336);
      }
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }

      .card-content {
        padding: 0 16px 16px;
      }

      /* Ring Slider */
      .ring-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;
      }
      .ring-slider {
        position: relative;
        width: 180px;
        height: 180px;
      }
      .ring-slider svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .ring-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
      }
      .ring-value {
        font-size: 2.8em;
        font-weight: 600;
        line-height: 1;
      }
      .ring-label {
        font-size: 0.75em;
        font-weight: 600;
        color: var(--secondary-text-color);
        letter-spacing: 1px;
      }

      /* M3 Container Styling */
      .m3-card, .stat-inline {
        background: var(--secondary-background-color, #f5f5f5);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-card-border-radius, 12px);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .control-group.m3-card {
        padding: 12px;
        margin-bottom: 16px;
        cursor: default;
      }

      .controls-container {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0;
        width: 100%;
        gap: 12px;
      }

      .recirc-button {
        background: var(--primary-color, #2196f3);
        color: var(--text-primary-color, #fff);
        border: none;
        padding: 10px 20px;
        border-radius: 24px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        transition: box-shadow 0.2s, background-color 0.2s;
        flex: 1;
        box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12);
      }
      .recirc-button ha-icon {
        --mdc-icon-size: 24px;
      }
      .recirc-button:hover {
        box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
      }
      .recirc-button.active {
        background-color: var(--info-color, #03a9f4);
        animation: gentlePulse 2s infinite;
      }
      @keyframes gentlePulse {
        0% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(3, 169, 244, 0); }
        100% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0); }
      }

      .settings-btn {
        background: transparent;
        border: 1px solid var(--divider-color, #e0e0e0);
        color: var(--secondary-text-color);
        width: 48px;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .settings-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      .settings-btn.active {
        background: var(--secondary-background-color);
        color: var(--primary-color);
        border-color: var(--primary-color);
      }

      .button-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .main-label {
        line-height: 1.2;
      }
      .sub-label {
        font-size: 0.7em;
        opacity: 0.8;
        text-transform: none;
        font-weight: 400;
        line-height: 1.2;
      }

      .settings-drawer {
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: slideDown 0.2s ease-out;
        border-top: 1px solid var(--divider-color);
        padding-top: 12px;
        margin-top: 12px;
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 4px;
        gap: 16px;
      }
      .setting-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9em;
        color: var(--primary-text-color);
        font-weight: 500;
        flex-shrink: 0;
      }
      .setting-label ha-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
      }
      .setting-control {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      /* Stats Ribbon */
      .stats-row {
        display: flex;
        gap: 16px;
        padding: 0 2px;
      }
      .stat-inline {
        flex: 1;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        padding: 10px 12px;
      }
      .stat-inline:hover {
        background-color: rgba(0, 0, 0, 0.04);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-color: var(--primary-color, #2196f3);
      }
      .stat-inline-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        color: var(--secondary-text-color);
      }
      .stat-inline-header ha-icon {
        --mdc-icon-size: 18px;
      }
      .stat-inline-trend {
        color: var(--primary-text-color);
      }
    `;
  }
}

customElements.define("smart-hose-timer-card", SmartHoseTimerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "smart-hose-timer-card",
  name: "Smart Hose Timer Card",
  description: "A custom card for smart hose timers with history, ring slider, and manual runtime controls."
});
