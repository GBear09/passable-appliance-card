// water-heater-card.js - Material Design Update

const LitElement = Object.getPrototypeOf(
  customElements.get("hui-entities-card")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class NavienWaterHeaterCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _tempInterval: { state: true },
      _showFlushGuide: { state: true },
      _showRecircSettings: { state: true },
      _historyData: { state: true },
      _flowHistory: { state: true },
      _gasHistory: { state: true },
      _selectedSegmentText: { state: true },
    };
  }

  constructor() {
    super();
    this._cardId = `navien-${Math.random().toString(36).substr(2, 9)}`;
    this._tempInterval = null;
    this._showFlushGuide = false;
    this._showRecircSettings = false;
    this._historyData = [];
    this._flowHistory = [];
    this._gasHistory = [];
    this._selectedSegmentText = "Tap timeline for details";
    this._trendTrackers = {
      flow: { id: null, last: 0 },
      gas: { id: null, last: 0 },
    };
    console.info(
      "%c NAVIEN-WATER-HEATER-CARD %c IS LOADED ",
      "color: white; background: var(--error-color, #e53e3e); font-weight: bold;",
      "color: var(--error-color, #e53e3e); background: white; font-weight: bold;"
    );
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error(
        "You must define the main 'entity' (e.g., water_heater.water_heater)."
      );
    }
    this.config = config;
  }

  getCardSize() {
    return 9;
  }

  // --- HAPTIC FEEDBACK HELPER ---
  _fireHaptic(type = "light") {
    const event = new Event("haptic", { bubbles: true, composed: true });
    event.detail = type;
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    const mainEntityId = this.config.entity;
    const stateObj = this.hass.states[mainEntityId];

    if (!stateObj) {
      return html`<ha-card
        ><div class="not-found">Entity not found: ${mainEntityId}</div></ha-card
      >`;
    }

    const attributes = stateObj.attributes;
    const baseName = mainEntityId.split(".")[1];

    const getData = (configKey, candidateIds, attrKey, defaultVal) => {
      if (this.config.sensors && this.config.sensors[configKey]) {
        const eid = this.config.sensors[configKey];
        const ent = this.hass.states[eid];
        return { value: ent ? ent.state : defaultVal, entity_id: eid };
      }
      const candidates = [...candidateIds, `sensor.${baseName}_${attrKey}`];
      for (const id of candidates) {
        if (this.hass.states[id]) {
          return { value: this.hass.states[id].state, entity_id: id };
        }
      }
      if (attrKey && attributes[attrKey] != undefined) {
        return { value: attributes[attrKey], entity_id: null };
      }
      return { value: defaultVal, entity_id: null };
    };

    const flowData = getData(
      "flow_rate",
      ["sensor.hot_water_flow", "sensor.navien_hot_water_flow_rate"],
      "hot_water_flow_rate",
      0
    );
    const flowRate = parseFloat(flowData.value) || 0;
    const currentTempData = getData(
      "outlet_temp",
      ["sensor.hot_water_temp", "sensor.navien_hot_water_outlet_temperature"],
      "hot_water_current_temperature",
      0
    );
    const inletTempData = getData(
      "inlet_temp",
      ["sensor.inlet_temp", "sensor.navien_inlet_temperature"],
      "inlet_temperature",
      0
    );
    const setTemp =
      attributes["hot_water_setting_temperature"] ||
      attributes.temperature ||
      120;
    const gasData = getData(
      "gas_usage",
      ["sensor.current_gas_use", "sensor.navien_current_gas_usage"],
      "current_gas_usage",
      "0.0 BTU"
    );
    const heatingPowerData = getData(
      "heating_power",
      ["sensor.heating_power"],
      "heating_power",
      0
    );
    const heatingPower = parseFloat(heatingPowerData.value) || 0;

    let isRecircActive = false;
    let recircEntityId = this.config.recirc_entity;
    let lastRecircStr = "Unknown";
    let recircEntityObj = null;

    if (!recircEntityId) {
      const potentialRecircs = [
        "switch.water_heater_hot_button",
        `switch.${baseName}_hot_button`,
        `switch.${baseName}_recirculation_pump`,
        `switch.${baseName}_recirculation`,
      ];
      recircEntityId = potentialRecircs.find((id) => this.hass.states[id]);
    }

    const recircIntervalId =
      this.config.interval_entity ||
      "input_number.water_heater_recirc_interval";
    const recircIntervalObj = this.hass.states[recircIntervalId];
    const recircDurationData = getData(
      "recirc_duration",
      [
        "sensor.last_recirc_duration",
        "sensor.recirc_cycle_duration",
        "sensor.recirc_duration",
      ],
      "last_recirc_duration",
      null
    );
    const recircTimestampData = getData(
      "recirc_timestamp",
      [
        "sensor.water_heater_last_recirc_timestamp",
        "sensor.navien_last_recirc_timestamp",
      ],
      "last_recirc_timestamp",
      null
    );

    if (recircEntityId && this.hass.states[recircEntityId]) {
      recircEntityObj = this.hass.states[recircEntityId];
      isRecircActive = recircEntityObj.state === "on";

      if (isRecircActive) {
        lastRecircStr = "Running now";
      } else {
        if (
          recircTimestampData.value &&
          recircTimestampData.value !== "unknown" &&
          recircTimestampData.value !== "unavailable"
        ) {
          lastRecircStr = this._computeRelativeTime(recircTimestampData.value);
        } else if (recircEntityObj.last_changed) {
          lastRecircStr = this._computeRelativeTime(
            recircEntityObj.last_changed
          );
        }
      }
    }

    const errorCode = attributes["error_code"] || "Normal";
    const isError = errorCode !== "Normal" && errorCode !== "0";
    const isHeating = heatingPower > 0 || parseFloat(gasData.value) > 0;
    const isFlowing = flowRate > 0 || isHeating;
    const recircGradId = `recircGradient-${this._cardId}`;
    const heatingGradId = `heatingGradient-${this._cardId}`;

    // Dynamic Pulse based on Heating Power (0-100)
    const powerPercent = Math.max(0, Math.min(100, heatingPower));
    const minPulse = 60;
    const maxPulse = 60 + (powerPercent / 100) * 40; // Max radius expands up to 100%
    const pulseDur = Math.max(0.5, 3 - (powerPercent / 100) * 2); // Faster pulse at higher power
    const pulseValues = `${minPulse}%; ${maxPulse}%; ${minPulse}%`;

    let sliderMin = 5,
      sliderMax = 45,
      sliderStep = 1,
      sliderValue = 30;
    if (recircIntervalObj) {
      sliderMin = parseFloat(recircIntervalObj.attributes.min) || 5;
      sliderMax = parseFloat(recircIntervalObj.attributes.max) || 45;
      sliderStep = parseFloat(recircIntervalObj.attributes.step) || 1;
      sliderValue =
        this._tempInterval !== null
          ? this._tempInterval
          : parseFloat(recircIntervalObj.state);
    }

    const animateMainLines = isFlowing && !isRecircActive;

    return html`
      <ha-card>
        <!-- HEADER (UNCHANGED PER REQUEST) -->
        <div class="header">
          <h1 class="title">
            <ha-icon
              icon="mdi:water-boiler"
              style="margin-right:8px; color: var(--primary-color);"
            ></ha-icon>
            ${this.config.name ||
            attributes.friendly_name ||
            "Navien Water Heater"}
          </h1>
          <div class="header-subtitle-row">
            <p class="subtitle">Tankless Water Heater</p>
            <div class="header-right">
              <div
                class="icon-btn-header"
                @click=${this._toggleFlushGuide}
                title="Flush & Descale Guide"
              >
                <ha-icon icon="mdi:wrench-outline"></ha-icon>
              </div>
              <div
                class="status-chip ${isError
                  ? "error"
                  : isHeating
                  ? "heating"
                  : "idle"}"
              >
                ${isError ? `ERR: ${errorCode}` : isHeating ? "HEATING" : "IDLE"}
              </div>
            </div>
          </div>
        </div>

        <div class="card-content">
          <div class="viz-container">
            <svg
              viewBox="0 0 300 260"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient
                  id="${recircGradId}"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    style="stop-color: var(--error-color, #e53e3e); stop-opacity:1"
                  />
                  <stop
                    offset="100%"
                    style="stop-color: var(--info-color, #3182ce); stop-opacity:1"
                  />
                </linearGradient>

                <radialGradient
                  id="${heatingGradId}"
                  cx="50%"
                  cy="50%"
                  r="${minPulse}%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="40%"
                    style="stop-color: #2d3748; stop-opacity: 1"
                  />
                  <stop
                    offset="100%"
                    style="stop-color: var(--warning-color, #ed8936); stop-opacity: 1"
                  />
                  <animate
                    attributeName="r"
                    values="${pulseValues}"
                    dur="${pulseDur}s"
                    repeatCount="indefinite"
                  />
                </radialGradient>

                <marker
                  id="arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path
                    d="M0,0 L0,6 L6,3 z"
                    fill="var(--warning-color, #ed8936)"
                  />
                </marker>
              </defs>

              <rect
                x="80"
                y="20"
                width="140"
                height="220"
                rx="12"
                fill="${isHeating
                  ? `url(#${heatingGradId})`
                  : "var(--ha-card-background, #fff)"}"
                stroke="${isHeating
                  ? "var(--warning-color, #ed8936)"
                  : "var(--divider-color)"}"
                stroke-width="${isHeating ? 3 : 2}"
                class="unit-body"
                style="transition: all 0.5s ease;"
              />
              <rect
                x="90"
                y="205"
                width="120"
                height="20"
                rx="2"
                fill="${isHeating ? "#ffffff" : "#2d3748"}"
                opacity="${isHeating ? 0.2 : 0.1}"
              />
              <text
                x="150"
                y="219"
                font-size="12"
                text-anchor="middle"
                fill="${isHeating ? "#ffffff" : "var(--primary-text-color)"}"
                font-weight="bold"
                opacity="0.7"
              >
                NAVIEN
              </text>

              <path
                d="M0,180 L80,180"
                stroke="var(--info-color, #3182ce)"
                stroke-width="8"
                fill="none"
              />
              <path
                d="M0,180 L80,180"
                stroke="rgba(255,255,255,0.7)"
                stroke-width="4"
                stroke-dasharray="8,8"
                fill="none"
                class="flow-anim ${animateMainLines ? "flowing" : ""}"
              />
              <circle
                cx="80"
                cy="180"
                r="4"
                fill="var(--info-color, #3182ce)"
              />

              <path
                d="M220,60 L300,60"
                stroke="var(--error-color, #e53e3e)"
                stroke-width="8"
                fill="none"
              />
              <path
                d="M220,60 L300,60"
                stroke="rgba(255,255,255,0.7)"
                stroke-width="4"
                stroke-dasharray="8,8"
                fill="none"
                class="flow-anim ${animateMainLines ? "flowing" : ""}"
              />
              <circle
                cx="220"
                cy="60"
                r="4"
                fill="var(--error-color, #e53e3e)"
              />

              <path
                d="M260,60 L260,210 L220,210"
                stroke="url(#${recircGradId})"
                stroke-width="6"
                fill="none"
                stroke-linejoin="round"
              />
              <path
                d="M260,60 L260,210 L220,210"
                stroke="rgba(255,255,255,0.8)"
                stroke-width="3"
                stroke-dasharray="6,6"
                fill="none"
                class="flow-anim ${isRecircActive ? "flowing" : ""}"
                stroke-linejoin="round"
              />
              <path
                d="M240,210 L235,210"
                stroke="var(--warning-color, #ed8936)"
                stroke-width="3"
                marker-end="url(#arrow)"
                opacity="${isRecircActive ? 1 : 0}"
              />
            </svg>

            <div class="box-controls">
              <div
                class="temp-btn up"
                @click=${() => this._changeTemp(setTemp + 1)}
              >
                <ha-icon icon="mdi:arrow-up"></ha-icon>
              </div>
              <div class="temp-display">
                <span
                  class="temp-val"
                  style="color: ${isHeating
                    ? "#ffffff"
                    : "var(--primary-text-color)"}; text-shadow: ${isHeating
                    ? "0 2px 4px rgba(0,0,0,0.5)"
                    : "none"}"
                  >${Math.round(setTemp)}°</span
                >
                <span
                  class="temp-label"
                  style="color: ${isHeating
                    ? "rgba(255,255,255,0.8)"
                    : "var(--secondary-text-color)"}"
                  >SETPOINT</span
                >
              </div>
              <div
                class="temp-btn down"
                @click=${() => this._changeTemp(setTemp - 1)}
              >
                <ha-icon icon="mdi:arrow-down"></ha-icon>
              </div>
            </div>

            <div
              class="overlay-stat outlet"
              style="right: 10px; top: 10px;"
              @click=${() => this._handleMoreInfo(currentTempData.entity_id)}
            >
              <span>${this._formatTemp(currentTempData.value)}</span>
              <span class="label">Outlet</span>
            </div>
            <div
              class="overlay-stat inlet"
              style="left: 10px; top: 120px;"
              @click=${() => this._handleMoreInfo(inletTempData.entity_id)}
            >
              <span>${this._formatTemp(inletTempData.value)}</span>
              <span class="label">Inlet</span>
            </div>
          </div>

          <div class="stats-row">
            <div
              class="stat-inline"
              @click=${() => this._handleMoreInfo(flowData.entity_id)}
            >
              <div class="stat-inline-header">
                <ha-icon icon="mdi:water-pump"></ha-icon>
                <span class="value">${flowRate} <span class="unit">GPM</span></span>
              </div>
              <div class="stat-inline-trend">
                ${this._renderCapacityBar(
                  flowRate,
                  8, // Max GPM threshold
                  "var(--info-color, #3182ce)"
                )}
              </div>
            </div>

            <div
              class="stat-inline"
              @click=${() => this._handleMoreInfo(gasData.entity_id)}
            >
              <div class="stat-inline-header">
                <ha-icon icon="mdi:fire"></ha-icon>
                <span class="value">${gasData.value}</span>
              </div>
              <div class="stat-inline-trend">
                ${this._renderCapacityBar(
                  parseFloat(gasData.value.toString().replace(/[^\d.]/g, "")) || 0,
                  parseFloat(gasData.value.toString().replace(/[^\d.]/g, "")) > 200 ? 199000 : 100, // Detect if using raw BTU or %
                  "var(--warning-color, #ed8936)"
                )}
              </div>
            </div>
          </div>

          <div class="control-group m3-card">
            <div class="controls-container">
              <button
                class="recirc-button ${isRecircActive ? "active" : ""}"
                @click=${() => this._toggleRecirc(recircEntityId)}
                ?disabled=${!recircEntityId}
              >
                <ha-icon icon="mdi:refresh"></ha-icon>
                <span class="button-content">
                  <span class="main-label"
                    >${isRecircActive
                      ? "Recirculation Active"
                      : "Start Recirculation"}</span
                  >
                  ${!isRecircActive && lastRecircStr !== "Unknown"
                    ? html`<span class="sub-label"
                        >•
                        ${lastRecircStr}${recircDurationData.value
                          ? ` • Ran for ${recircDurationData.value}`
                          : ""}</span
                      >`
                    : ""}
                </span>
              </button>
              <button
                class="settings-btn ${this._showRecircSettings ? "active" : ""}"
                @click=${() => this._toggleRecircSettings(recircEntityId)}
              >
                <ha-icon icon="mdi:cog"></ha-icon>
              </button>
            </div>

            ${this._showRecircSettings
              ? html`
                  <div class="settings-drawer">
                    ${recircIntervalObj
                      ? html`
                          <div class="settings-row">
                            <div class="setting-label">
                              <ha-icon
                                icon="mdi:timer-refresh-outline"
                              ></ha-icon>
                              <span>Interval</span>
                            </div>
                            <div class="setting-control step-controller">
                              <button 
                                class="step-btn" 
                                @click=${() => this._stepInterval(-1, sliderMin, sliderMax, sliderStep, recircIntervalId, sliderValue)}
                                ?disabled=${sliderValue <= sliderMin}
                              >
                                <ha-icon icon="mdi:minus"></ha-icon>
                              </button>
                              <span class="setting-value">${sliderValue} min</span>
                              <button 
                                class="step-btn" 
                                @click=${() => this._stepInterval(1, sliderMin, sliderMax, sliderStep, recircIntervalId, sliderValue)}
                                ?disabled=${sliderValue >= sliderMax}
                              >
                                <ha-icon icon="mdi:plus"></ha-icon>
                              </button>
                            </div>
                          </div>
                        `
                      : ""}
                    <div class="timeline-container">
                      <div class="timeline-label">Last 24 Hours</div>
                      <div class="timeline-track">
                        ${this._renderTimeline()}
                      </div>
                      <div class="timeline-axis">
                        <span>${this._formatShortTime(new Date(Date.now() - 24 * 3600 * 1000))}</span>
                        <span>${this._formatShortTime(new Date(Date.now() - 12 * 3600 * 1000))}</span>
                        <span>${this._formatShortTime(new Date())}</span>
                      </div>
                      <div class="segment-info">${this._selectedSegmentText}</div>
                    </div>
                  </div>
                `
              : ""}
          </div>
        </div>

        ${this._showFlushGuide ? this._renderFlushGuide() : ""}
      </ha-card>
    `;
  }

  // --- NEW: Real-time Capacity Bars (Replaces Sparklines) ---
  _renderCapacityBar(current, max, color) {
    const pct = Math.min(100, Math.max(0, (current / max) * 100));
    return html`
      <div class="capacity-bar-bg">
        <div 
          class="capacity-bar-fill" 
          style="width: ${pct}%; background-color: ${color};"
        ></div>
      </div>
    `;
  }

  _toggleFlushGuide() {
    this._fireHaptic("light");
    this._showFlushGuide = !this._showFlushGuide;
  }
  _toggleRecircSettings(entityId) {
    this._fireHaptic("light");
    this._showRecircSettings = !this._showRecircSettings;
    if (this._showRecircSettings && entityId) {
      this._selectedSegmentText = "Tap timeline for details";
      this._fetchHistory(entityId);
    }
  }

  async _fetchHistory(entityId) {
    if (!this.hass) return;
    const now = new Date(),
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      endTime = now.toISOString();
    try {
      const history = await this.hass.callApi(
        "GET",
        `history/period/${startTime}?filter_entity_id=${entityId}&end_time=${endTime}`
      );
      if (history && history.length > 0) this._historyData = history[0];
      else this._historyData = [];
    } catch (e) {
      console.error("Failed to fetch history", e);
      this._historyData = [];
    }
  }

  _renderTimeline() {
    if (!this._historyData || this._historyData.length === 0)
      return html`<div class="no-data">No history available</div>`;
      
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const start = now - twentyFourHours;
    const data = [...this._historyData].sort(
      (a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime()
    );

    const segments = [];
    let lastTime = start;
    // Assume inverse of first data point for the leading segment
    let lastState = data.length > 0 ? (data[0].state === 'on' ? 'off' : 'on') : 'off';

    const addSegment = (startTime, endTime, state) => {
      const duration = endTime - startTime;
      if (duration <= 0) return;
      
      const pct = (duration / twentyFourHours) * 100;
      const stateTxt = state === 'on' ? 'Running' : 'Idle';
      const mins = Math.round(duration / 60000);
      const durTxt = mins > 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
      const startStr = this._formatShortTime(new Date(startTime));
      const endStr = this._formatShortTime(new Date(endTime));
      const text = `${stateTxt}: ${startStr} - ${endStr} (${durTxt})`;

      segments.push({
        width: pct,
        color: state === "on" ? "var(--primary-color)" : "transparent",
        text: text
      });
    };

    data.forEach(item => {
      const changeTime = new Date(item.last_changed).getTime();
      if (changeTime > lastTime) {
        addSegment(lastTime, changeTime, lastState);
      }
      lastState = item.state;
      lastTime = changeTime;
    });

    if (lastTime < now) {
      addSegment(lastTime, now, lastState);
    }

    return segments.map(
      (seg) =>
        html`<div
          class="timeline-segment"
          style="width: ${seg.width}%; background-color: ${seg.color};"
          @click=${() => this._selectSegment(seg.text)}
          title=${seg.text}
        ></div>`
    );
  }
  
  _selectSegment(text) {
    this._fireHaptic("light");
    this._selectedSegmentText = text;
  }
  
  _formatShortTime(dateObj) {
    return dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  _renderFlushGuide() {
    return html`
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>NPE-240A2 Flush Procedure</h2>
            <button class="close-btn" @click=${this._toggleFlushGuide}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>
          <div class="modal-body">
            <div class="materials-section">
              <h3><ha-icon icon="mdi:toolbox"></ha-icon> Required Materials</h3>
              <ul>
                <li>4 Gallons White Vinegar (Food Grade)</li>
                <li>Submersible Utility Pump</li>
                <li>2 x Washing Machine Hoses</li>
                <li>5 Gallon Bucket</li>
              </ul>
            </div>
            <div class="step-timeline">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">
                  <h4>Preparation</h4>
                  <p>Turn off power to the unit.</p>
                  <p>Turn off gas valve (Yellow handle perpendicular).</p>
                  <p>
                    <strong>Isolate Unit:</strong> Close Cold Inlet (Blue) and
                    Hot Outlet (Red) main valves.
                  </p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">
                  <h4>Connect Pump</h4>
                  <p>Pour 4 gallons of vinegar into bucket.</p>
                  <p>
                    Connect <strong>Hose A</strong> from Pump → Cold Service
                    Port.
                  </p>
                  <p>
                    Connect <strong>Hose B</strong> from Hot Service Port →
                    Bucket.
                  </p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">
                  <h4>Flush (60 Mins)</h4>
                  <p>Open both Service Valves (Blue/Red small handles).</p>
                  <p>Turn on Pump.</p>
                  <p>Let vinegar circulate for 45-60 minutes.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">
                  <h4>Rinse</h4>
                  <p>Turn off pump.</p>
                  <p>Close Cold Service Valve & remove hose.</p>
                  <p>Keep Hot Service Valve OPEN with hose in bucket.</p>
                  <p>
                    Slowly open Main Cold Inlet to flush fresh water through
                    unit for 5 mins.
                  </p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">5</div>
                <div class="step-content">
                  <h4>Clean Filter</h4>
                  <p>Close Main Cold Inlet.</p>
                  <p>Remove Cold Inlet Filter (bottom of unit).</p>
                  <p>Rinse mesh clean and reinstall.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">6</div>
                <div class="step-content">
                  <h4>Restart</h4>
                  <p>Close Service Valves. Disconnect hoses.</p>
                  <p>Open Main Cold Inlet & Hot Outlet.</p>
                  <p>Open Gas Valve.</p>
                  <p>Turn Power On.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _computeRelativeTime(timestamp) {
    if (!timestamp) return "Never";
    const now = new Date(),
      then = new Date(timestamp),
      diffInSeconds = Math.floor((now - then) / 1000);
    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hr ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  }

  _formatTemp(val) {
    const num = parseFloat(val);
    return isNaN(num) ? "--" : `${Math.round(num)}°F`;
  }
  
  _changeTemp(newTemp) {
    this._fireHaptic("success");
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: this.config.entity,
      temperature: newTemp,
    });
  }
  
  _toggleRecirc(entityId) {
    if (!entityId) return;
    this._fireHaptic("light");
    this.hass.callService("homeassistant", "toggle", { entity_id: entityId });
  }
  
  _stepInterval(direction, min, max, step, entityId, currentValue) {
    let newValue = currentValue + (direction * step);
    if (newValue < min) newValue = min;
    if (newValue > max) newValue = max;

    this._fireHaptic("selection");
    this._tempInterval = newValue;
    this.requestUpdate();

    this.hass.callService("input_number", "set_value", {
      entity_id: entityId,
      value: newValue,
    });

    if (this._intervalTimeout) clearTimeout(this._intervalTimeout);
    this._intervalTimeout = setTimeout(() => {
      this._tempInterval = null;
    }, 2000);
  }
  
  _handleMoreInfo(entityId) {
    if (!entityId) return;
    this._fireHaptic("light");
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
      }
      ha-card {
        background: var(
          --ha-card-background,
          var(--card-background-color, #fff)
        );
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(
          --ha-card-box-shadow,
          0 2px 2px 0 rgba(0, 0, 0, 0.14),
          0 1px 5px 0 rgba(0, 0, 0, 0.12),
          0 3px 1px -2px rgba(0, 0, 0, 0.2)
        );
        overflow: hidden;
        color: var(--primary-text-color, #212121);
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }
      .header-subtitle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
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

      .icon-btn-header {
        cursor: pointer;
        padding: 4px;
        color: var(--secondary-text-color);
        border-radius: 50%;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-btn-header:hover {
        background-color: rgba(0, 0, 0, 0.05);
        color: var(--primary-color);
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
      .status-chip.heating {
        background: rgba(var(--rgb-error-color, 244, 67, 54), 0.15);
        color: var(--error-color, #f44336);
        animation: pulse 2s infinite;
      }
      .status-chip.error {
        background: var(--error-color, #e53e3e);
        color: white;
        animation: pulse 1s infinite;
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
        padding: 0 16px 16px;
      }

      /* M3 Container Styling */
      .m3-card,
      .stat-item {
        background: var(--secondary-background-color, #f5f5f5);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-card-border-radius, 12px);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      .stat-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-color: var(--primary-color, #2196f3);
      }
      .control-group.m3-card {
        padding: 12px;
        margin-bottom: 16px;
        cursor: default;
      }

      /* Visualization */
      .viz-container {
        position: relative;
        height: 240px;
        margin-bottom: 16px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: var(--ha-card-border-radius, 12px);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        border: 1px solid var(--divider-color, #e0e0e0);
      }
      svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .unit-body {
        transition: all 0.5s ease;
      }

      .box-controls {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }
      .temp-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
        margin: 6px 0;
      }
      .temp-val {
        font-size: 2em;
        font-weight: 500;
        color: var(--primary-text-color);
        transition: color 0.3s ease;
      }
      .temp-label {
        font-size: 0.6em;
        text-transform: uppercase;
        color: var(--secondary-text-color);
        font-weight: 600;
        letter-spacing: 0.5px;
        transition: color 0.3s ease;
      }

      .temp-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.1s ease, background-color 0.2s;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
      }
      .temp-btn:active {
        transform: scale(0.95);
      }
      .temp-btn ha-icon {
        --mdc-icon-size: 24px;
      }
      .temp-btn.up {
        background-color: var(--warning-color, #ff9800);
        color: #fff;
      }
      .temp-btn.down {
        background-color: var(--info-color, #2196f3);
        color: #fff;
      }

      .flow-anim {
        stroke-dasharray: 8;
        opacity: 0;
        transition: opacity 0.3s;
      }
      .flow-anim.flowing {
        opacity: 1;
        animation: flow 1s linear infinite;
      }
      @keyframes flow {
        from {
          stroke-dashoffset: 16;
        }
        to {
          stroke-dashoffset: 0;
        }
      }

      .overlay-stat {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 0.85em;
        font-weight: bold;
        background: var(--card-background-color, #fff);
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.1s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--divider-color);
      }
      .overlay-stat:hover {
        transform: scale(1.05);
      }
      .overlay-stat.inlet {
        color: var(--info-color, #2196f3);
      }
      .overlay-stat.outlet {
        color: var(--error-color, #f44336);
      }
      .overlay-stat .label {
        font-size: 0.7em;
        font-weight: normal;
        opacity: 0.8;
        color: var(--secondary-text-color);
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
        padding: 10px 24px;
        border-radius: 24px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        transition: box-shadow 0.2s, background-color 0.2s;
        flex: 1;
        box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2),
          0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12);
      }
      .recirc-button:hover {
        box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14),
          0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
      }
      .recirc-button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: var(--disabled-text-color);
        box-shadow: none;
      }
      /* UPDATED: Added pulse to active button */
      .recirc-button.active {
        background-color: var(--success-color, #4caf50);
        animation: gentlePulse 2s infinite;
      }
      @keyframes gentlePulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
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
      .sub-label {
        font-size: 0.7em;
        opacity: 0.8;
        text-transform: none;
        font-weight: 400;
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
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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
      .step-controller {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, #e0e0e0);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-radius: 20px;
        padding: 4px 8px;
      }
      .step-btn {
        background: none;
        border: none;
        color: var(--primary-text-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 50%;
        transition: background-color 0.2s;
      }
      .step-btn:hover {
        background: rgba(0, 0, 0, 0.1);
      }
      .step-btn[disabled] {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .step-btn ha-icon {
        --mdc-icon-size: 20px;
      }
      .setting-value {
        font-weight: 600;
        min-width: 60px;
        text-align: center;
        font-size: 0.9em;
        color: var(--primary-text-color);
        white-space: nowrap;
      }

      .timeline-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 0 4px;
      }
      .timeline-label {
        font-size: 0.75em;
        text-transform: uppercase;
        color: var(--secondary-text-color);
        font-weight: 600;
      }
      .timeline-track {
        height: 24px;
        width: 100%;
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, #e0e0e0);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        align-items: center;
      }
      .timeline-segment {
        height: 100%;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .timeline-segment:hover {
        opacity: 0.8;
      }
      .timeline-axis {
        display: flex;
        justify-content: space-between;
        font-size: 0.65em;
        color: var(--secondary-text-color);
        opacity: 0.8;
        margin-top: 2px;
      }
      .segment-info {
        text-align: center;
        font-size: 0.8em;
        color: var(--primary-color);
        margin-top: 4px;
        font-weight: 500;
        min-height: 1.2em;
      }
      .no-data {
        font-size: 0.8em;
        color: var(--secondary-text-color);
        font-style: italic;
        padding: 8px 0;
      }

      /* Stats Ribbon (Replaces old grid) */
      .stats-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
        padding: 0 8px;
      }
      .stat-inline {
        flex: 1;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        position: relative;
        padding: 8px 8px 0 8px;
        border-radius: 8px;
        transition: background-color 0.2s;
        overflow: hidden;
      }
      .stat-inline:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
      .stat-inline-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        z-index: 2;
      }
      .stat-inline-header ha-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
      }
      .stat-inline-header .value {
        font-weight: 600;
        font-size: 1.05em;
      }
      .stat-inline-header .unit {
        font-size: 0.75em;
        color: var(--secondary-text-color);
        font-weight: normal;
      }
      .stat-inline-trend {
        width: 100%;
        padding-bottom: 8px;
      }
      .capacity-bar-bg {
        width: 100%;
        height: 6px;
        background: rgba(128, 128, 128, 0.2);
        border-radius: 3px;
        margin-top: 6px;
        overflow: hidden;
      }
      .capacity-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Modal Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 100;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.3s ease-out;
      }
      .modal-content {
        background: var(--card-background-color, #fff);
        border-radius: 28px 28px 0 0;
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        max-height: 90vh;
        box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s cubic-bezier(0.1, 0.9, 0.2, 1);
      }
      .modal-header {
        padding: 16px;
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .modal-header h2 {
        margin: 0;
        font-size: 1.1em;
        font-weight: 500;
      }
      .close-btn {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
      }
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .modal-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
      }

      .materials-section {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.1);
        padding: 12px;
        border-radius: var(--ha-card-border-radius, 8px);
        margin-bottom: 20px;
        border: 1px solid rgba(var(--rgb-primary-color), 0.2);
      }
      .materials-section h3 {
        margin: 0 0 8px 0;
        font-size: 0.9em;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--primary-color);
      }
      .materials-section ul {
        margin: 0;
        padding-left: 20px;
        font-size: 0.9em;
      }
      .materials-section li {
        margin-bottom: 4px;
      }

      .step-timeline {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 20px;
      }
      .step {
        display: flex;
        gap: 12px;
      }
      .step-num {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.8em;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .step-content {
        flex: 1;
      }
      .step-content h4 {
        margin: 0 0 4px 0;
        font-size: 1em;
      }
      .step-content p {
        margin: 0 0 4px 0;
        font-size: 0.85em;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
    `;
  }
}

customElements.define("navien-water-heater-card", NavienWaterHeaterCard);