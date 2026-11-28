/**
 * Passable Appliance Card
 * Version: 2.4.0
 * GitHub: https://github.com/GBear09/passable-appliance-card
 *
 * Passable design-system universal appliance card for Home Assistant supporting:
 *  1. Café CYE22TP2MIS1 French-Door Refrigerator & Keurig K-Cup Dispenser
 *  2. Café CHS950P2M1S1 Induction Range & Double Convection Oven
 *  3. LG ThinQ F3L2CYU__ Washer & RV13B6BSD Dryer Laundry Center
 *  4. Navien NPE-240A2 Condensing Tankless Water Heater & HotButton Recirculation
 *  5. Orbit B-hyve HT25-0000 Smart Hose Timer
 *
 * Supports both rich graphical "full" mode (default) and compact "summary" mode (with
 * Consolidated Hero `compact`, `strip`, `active`, `tiles`, `rows`, and `rings` layouts
 * plus an inline quick-drawer and responsive 3-tab Command Center popup), with optional
 * SPAN Panel live electrical telemetry.
 */

const CARD_VERSION = "2.4.0";

const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace") ||
    customElements.get("hui-entities-card") ||
    customElements.get("hui-masonry-view") ||
    customElements.get("hc-main")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;
const svg =
  LitElement.prototype.svg ||
  ((strings, ...values) => {
    const result = html(strings, ...values);
    if (result && typeof result === "object") {
      return Object.assign({}, result, { _$litType$: 2, type: "svg" });
    }
    return result;
  });

console.info(
  `%c PASSABLE-APPLIANCE-CARD %c v${CARD_VERSION} IS LOADED `,
  "color: white; background: #0284c7; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: #0284c7; background: #e0f2fe; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

const APPLIANCE_META = {
  refrigerator: { title: "Refrigerator", subtitle: "Food Storage & K-Cup", icon: "mdi:fridge-outline" },
  induction_range: { title: "Induction Range", subtitle: "Cooktop & Double Oven", icon: "mdi:stove" },
  laundry: { title: "Laundry Center", subtitle: "LG ThinQ Washer & Dryer", icon: "mdi:washing-machine" },
  water_heater: { title: "Water Heater", subtitle: "Navien Tankless NPE-240A2", icon: "mdi:water-boiler" },
  smart_hose_timer: { title: "Smart Hose Timer", subtitle: "Orbit B-hyve HT25", icon: "mdi:sprinkler-variant" },
};

function parseFiniteNum(val, fallback = null) {
  if (val === null || val === undefined || val === "") return fallback;
  const n = typeof val === "number" ? val : parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatTitleCase(val) {
  if (!val) return "";
  return String(val)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatRelativeTime(ts) {
  if (!ts || ts === "unavailable" || ts === "unknown") return "--";
  const then = new Date(ts);
  if (isNaN(then.getTime())) return String(ts);
  const diffSec = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatShortTime(ts) {
  if (!ts || ts === "unavailable" || ts === "unknown") return "--";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatShortDate(ts) {
  if (!ts || ts === "unavailable" || ts === "unknown") return "--";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

class PassableApplianceCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _modalOpen: { state: true },
      _activeUnitIdx: { state: true },
      _activeTab: { state: true },
      _animDirection: { state: true },
      _drawerMode: { state: true },
      _drawerFilter: { state: true },
      _expandedTrays: { state: true },
      _showRecircSettings: { state: true },
      _showHoseSettings: { state: true },
      _showFlushModal: { state: true },
      _manualRuntime: { state: true },
      _selectedSegmentText: { state: true },
      _historyCache: { state: true },
      _isDragging: { state: true },
      _localTemps: { state: true },
      _toastMsg: { state: true },
      _tick: { state: true },
    };
  }

  static getConfigElement() {
    return document.createElement("passable-appliance-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Home Appliances",
      display_mode: "summary",
      layout: "compact",
      show_header: false,
      auto_discover_span: true,
      appliances: [
        { appliance_type: "refrigerator", title: "Refrigerator" },
        { appliance_type: "induction_range", title: "Induction Range" },
        { appliance_type: "laundry", title: "Washer & Dryer" },
        { appliance_type: "water_heater", title: "Water Heater" },
        { appliance_type: "smart_hose_timer", title: "Pool Hose Timer" },
      ],
    };
  }

  constructor() {
    super();
    this._modalOpen = false;
    this._activeUnitIdx = 0;
    this._activeTab = "primary";
    this._animDirection = "none";
    this._drawerMode = null;
    this._drawerFilter = "all";
    this._expandedTrays = {};
    this._showRecircSettings = false;
    this._showHoseSettings = false;
    this._showFlushModal = false;
    this._manualRuntime = 15;
    this._runtimeSyncedFromEntity = false;
    this._selectedSegmentText = "Tap timeline segment for details";
    this._historyCache = {};
    this._isDragging = false;
    this._localTemps = {};
    this._toastMsg = null;
    this._tick = 0;
    this._cardId = `pac-${Math.random().toString(36).slice(2, 10)}`;
    this._holdTimeout = null;
    this._holdInterval = null;
    this._laundryTickInterval = null;
    this._toastTimer = null;
    this._closeModalTimer = null;
    this._swipeResetTimer = null;
    this._popupTouchStartY = undefined;
    this._popupTouchStartX = undefined;
    this._popupTouchCurrentY = undefined;
    this._popupTouchTarget = null;
    this._popupTouchDragging = false;
    this._popupTouchLockedHorizontal = false;
    this._scrollLockedElements = null;
    this._scrollGuardOverlay = null;
    this._guardTouchY = 0;
    this._guardTouchX = 0;
    this._onOverlayWheel = this._onOverlayWheel.bind(this);
    this._onOverlayTouchStart = this._onOverlayTouchStart.bind(this);
    this._onOverlayTouchMove = this._onOverlayTouchMove.bind(this);
    this._onKeyDown = (ev) => {
      if (ev.key === "Escape") {
        if (this._showFlushModal) this._showFlushModal = false;
        else if (this._modalOpen) this._closeModal();
      }
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    const prevDrawerDefault = this.config?.default_expanded_drawer;
    const rawMode = String(config.display_mode || "full").toLowerCase();
    const displayMode = rawMode === "summary" ? "summary" : "full";
    const validLayouts = ["compact", "strip", "active", "tiles", "rows", "hero", "rings"];
    const rawLayout = String(config.layout || "").toLowerCase();
    let layout;
    if (rawLayout === "hero") {
      layout = "rows";
    } else if (validLayouts.includes(rawLayout)) {
      layout = rawLayout;
    } else {
      layout = Array.isArray(config.appliances) && config.appliances.length > 1 ? "compact" : "rows";
    }
    const defaultShowHeader = displayMode === "full";
    const defaultStrips = !["compact", "strip"].includes(layout);
    this.config = {
      ...config,
      display_mode: displayMode,
      layout,
      show_header:
        config.show_header !== undefined
          ? config.show_header !== false
          : defaultShowHeader,
      show_summary_strip:
        config.show_summary_strip !== undefined
          ? Boolean(config.show_summary_strip)
          : defaultStrips,
      show_footer_strip:
        config.show_footer_strip !== undefined
          ? Boolean(config.show_footer_strip)
          : defaultStrips,
      auto_discover_span: config.auto_discover_span !== false,
    };
    if (config.default_expanded_drawer !== prevDrawerDefault) {
      this._drawerMode = config.default_expanded_drawer ? String(config.default_expanded_drawer) : null;
    }
    this._resolvedUnitsCache = null;
  }

  getCardSize() {
    const units = this._getNormalizedAppliances();
    if (this.config?.display_mode === "summary") {
      const layout = this.config.layout;
      if (layout === "compact" || layout === "strip") return 2;
      if (layout === "rings" && units.length > 1) return 3;
      if (layout === "tiles") return Math.max(3, Math.ceil(units.length / 2) * 2);
      return Math.max(3, units.length * 2 + 1);
    }
    return 8;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKeyDown);
    this._laundryTickInterval = setInterval(() => {
      this._tick = (this._tick + 1) % 10000;
    }, 30000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._onKeyDown);
    if (this._holdTimeout) clearTimeout(this._holdTimeout);
    if (this._holdInterval) clearInterval(this._holdInterval);
    clearInterval(this._laundryTickInterval);
    clearTimeout(this._toastTimer);
    clearTimeout(this._closeModalTimer);
    clearTimeout(this._swipeResetTimer);
    this._detachOverlayScrollGuard();
    this._unlockBackgroundScroll();
  }

  updated() {
    if (this._modalOpen) {
      this._attachOverlayScrollGuard();
    } else {
      this._detachOverlayScrollGuard();
    }
  }

  shouldUpdate(changedProps) {
    if (!changedProps.has("hass")) return true;
    for (const key of changedProps.keys()) {
      if (key !== "hass") return true;
    }
    const oldHass = changedProps.get("hass");
    const newHass = this.hass;
    if (!oldHass || !newHass || !oldHass.states || !newHass.states || !this.config) {
      return true;
    }
    if (Object.keys(oldHass.states).length !== Object.keys(newHass.states).length) {
      this._resolvedUnitsCache = null;
      return true;
    }
    const units = this._getNormalizedAppliances();
    for (const unit of units) {
      for (const id of unit._watchedIds) {
        if (oldHass.states[id] !== newHass.states[id]) {
          return true;
        }
      }
    }
    return false;
  }

  // =========================================================================
  // NORMALIZATION & AUTO-DISCOVERY (Single + Multi-Appliance + SPAN)
  // =========================================================================

  _detectSingleType(cfg) {
    const type = cfg.appliance_type;
    if (type && type !== "auto") return type === "range" ? "induction_range" : type === "hose_timer" ? "smart_hose_timer" : type;
    if (cfg.valve_entity || cfg.bhyve_mode !== undefined) return "smart_hose_timer";
    if (cfg.washer || cfg.dryer || cfg.washer_status || cfg.dryer_status) return "laundry";
    if (cfg.cooktop || cfg.oven || cfg.upper_control) return "induction_range";
    if (cfg.fridge_control || cfg.freezer_control) return "refrigerator";
    if (cfg.entity && cfg.entity.startsWith("water_heater.")) return "water_heater";
    return "refrigerator";
  }

  _findEntity(suffix, domain = null, hints = []) {
    const states = this.hass?.states || {};
    const keys = Object.keys(states);
    for (const h of hints) {
      if (!h) continue;
      if (domain && states[`${domain}.${h}_${suffix}`]) return `${domain}.${h}_${suffix}`;
    }
    for (const id of keys) {
      const [d, obj] = id.split(".");
      if (domain && d !== domain) continue;
      if (obj === suffix || obj.endsWith(`_${suffix}`)) {
        if (hints.length === 0 || hints.some((h) => h && obj.toLowerCase().includes(h.toLowerCase()))) {
          return id;
        }
      }
    }
    for (const id of keys) {
      const [d, obj] = id.split(".");
      if (domain && d !== domain) continue;
      if (obj === suffix || obj.endsWith(`_${suffix}`)) return id;
    }
    return null;
  }

  _findByKeywords(domains, keywords) {
    const states = this.hass?.states || {};
    const dList = Array.isArray(domains) ? domains : [domains];
    return (
      Object.keys(states).find((id) => {
        const [d, obj] = id.split(".");
        if (!dList.includes(d)) return false;
        const low = obj.toLowerCase();
        return keywords.every((kw) => low.includes(kw));
      }) || null
    );
  }

  _resolveSpanEntities(type, unitCfg) {
    if (this.config?.auto_discover_span === false && !unitCfg.power_sensor && !unitCfg.current_sensor) {
      return { power: null, current: null, energy: null };
    }
    const spanKw = {
      refrigerator: ["span_panel", "refrigerator"],
      induction_range: ["span_panel", "induction_range"],
      laundry: ["span_panel", "dryer"],
    }[type];
    if (!spanKw && !unitCfg.power_sensor && !unitCfg.current_sensor) {
      return { power: null, current: null, energy: null };
    }
    return {
      power:
        unitCfg.power_sensor ||
        (spanKw ? this._findByKeywords("sensor", [...spanKw, "_power"]) : null),
      current:
        unitCfg.current_sensor ||
        (spanKw ? this._findByKeywords("sensor", [...spanKw, "_current"]) : null),
      energy:
        unitCfg.energy_sensor ||
        (spanKw ? this._findByKeywords("sensor", [...spanKw, "_energy_net"]) : null),
    };
  }

  _normalizeUnit(rawCfg, idx) {
    const type = this._detectSingleType(rawCfg);
    const meta = APPLIANCE_META[type] || APPLIANCE_META.refrigerator;
    const prefix = rawCfg.device_prefix || "";
    const resolved = { ...rawCfg, appliance_type: type, title: rawCfg.title || meta.title, _index: idx, _key: rawCfg.id || `${type}_${idx}` };

    if (type === "refrigerator") {
      const hints = [prefix, "dt507030"].filter(Boolean);
      resolved.fridge_control = rawCfg.fridge_control || this._findEntity("fridge", "water_heater", hints);
      resolved.freezer_control = rawCfg.freezer_control || this._findEntity("freezer", "water_heater", hints);
      resolved.dispenser_control = rawCfg.dispenser_control || this._findEntity("dispenser", "water_heater", hints);
      resolved.fridge_temp_current = rawCfg.fridge_temp_current || this._findEntity("current_temperature_fridge", "sensor", hints);
      resolved.freezer_temp_current = rawCfg.freezer_temp_current || this._findEntity("current_temperature_freezer", "sensor", hints);
      resolved.fridge_temp_setting = rawCfg.fridge_temp_setting || this._findEntity("temperature_setting_fridge", "sensor", hints);
      resolved.freezer_temp_setting = rawCfg.freezer_temp_setting || this._findEntity("temperature_setting_freezer", "sensor", hints);
      resolved.fridge_min_entity = rawCfg.fridge_min_entity || this._findEntity("setpoint_limits_fridge_min", "sensor", hints);
      resolved.fridge_max_entity = rawCfg.fridge_max_entity || this._findEntity("setpoint_limits_fridge_max", "sensor", hints);
      resolved.freezer_min_entity = rawCfg.freezer_min_entity || this._findEntity("setpoint_limits_freezer_min", "sensor", hints);
      resolved.freezer_max_entity = rawCfg.freezer_max_entity || this._findEntity("setpoint_limits_freezer_max", "sensor", hints);
      resolved.door_status = rawCfg.door_status || this._findEntity("door_status", "sensor", hints);
      resolved.door_left = rawCfg.door_left || this._findEntity("door_status_fridge_left", "binary_sensor", hints);
      resolved.door_right = rawCfg.door_right || this._findEntity("door_status_fridge_right", "binary_sensor", hints);
      resolved.door_freezer = rawCfg.door_freezer || this._findEntity("door_status_freezer", "binary_sensor", hints);
      resolved.door_any = rawCfg.door_any || this._findEntity("door_status_any_open", "binary_sensor", hints);
      resolved.ice_maker_control = rawCfg.ice_maker_control || this._findEntity("ice_maker_control", "switch", hints);
      resolved.ice_boost_switch = rawCfg.ice_boost_switch || this._findEntity("fridge_ice_boost", "switch", hints);
      resolved.ice_bucket_status = rawCfg.ice_bucket_status || this._findEntity("ice_maker_bucket_status", "sensor", hints);
      resolved.water_filter_status = rawCfg.water_filter_status || this._findEntity("water_filter_status", "sensor", hints);
      resolved.water_filter_percent = rawCfg.water_filter_percent || this._findEntity("water_filter_status_percent_remaining", "sensor", hints);
      resolved.water_filter_days = rawCfg.water_filter_days || this._findEntity("water_filter_status_days_remaining", "sensor", hints);
      resolved.turbo_cool_switch = rawCfg.turbo_cool_switch || this._findEntity("turbo_cool_status", "switch", hints);
      resolved.turbo_freeze_switch = rawCfg.turbo_freeze_switch || this._findEntity("turbo_freeze_status", "switch", hints);
      resolved.sabbath_mode_switch = rawCfg.sabbath_mode_switch || this._findEntity("sabbath_mode", "switch", hints);
      resolved.hot_water_in_use = rawCfg.hot_water_in_use || this._findEntity("hot_water_in_use", "binary_sensor", hints);
      resolved.hot_water_faulted = rawCfg.hot_water_faulted || this._findEntity("hot_water_status_faulted", "binary_sensor", hints);
      resolved.hot_water_set_temp = rawCfg.hot_water_set_temp || this._findEntity("hot_water_set_temp", "sensor", hints);
      resolved.hot_water_current_temp = rawCfg.hot_water_current_temp || rawCfg.hot_water_status_current_temp || this._findEntity("hot_water_status_current_temp", "sensor", hints);
      resolved.hot_water_status = rawCfg.hot_water_status || this._findEntity("hot_water_status_status", "sensor", hints);
      resolved.hot_water_status_time = rawCfg.hot_water_status_time || this._findEntity("hot_water_status_time_until_ready", "sensor", hints);
      resolved.hot_water_cancel_switch = rawCfg.hot_water_cancel_switch || this._findEntity("k_cup_hot_water", "switch", hints);
    } else if (type === "induction_range") {
      const hints = [prefix, "sqdr174020p"].filter(Boolean);
      const ov = rawCfg.oven || {};
      resolved.oven = {
        upper_control: ov.upper_control || rawCfg.upper_control || this._findEntity("oven", "water_heater", hints),
        lower_control: ov.lower_control || rawCfg.lower_control || this._findEntity("lower_oven", "water_heater", hints),
        upper_raw_temp: ov.upper_raw_temp || rawCfg.upper_raw_temp || this._findByKeywords("sensor", ["sqdr174020p_raw_temperature"]) || this._findEntity("raw_temperature", "sensor", hints),
        lower_raw_temp: ov.lower_raw_temp || rawCfg.lower_raw_temp || this._findEntity("lower_oven_raw_temperature", "sensor", hints),
        upper_display_temp: ov.upper_display_temp || this._findByKeywords("sensor", ["sqdr174020p_display_temperature"]),
        lower_display_temp: ov.lower_display_temp || this._findEntity("lower_oven_display_temperature", "sensor", hints),
        upper_state_entity: ov.upper_state_entity || rawCfg.upper_state_entity || this._findByKeywords("sensor", ["sqdr174020p_current_state"]) || this._findEntity("current_state", "sensor", hints),
        lower_state_entity: ov.lower_state_entity || rawCfg.lower_state_entity || this._findEntity("lower_oven_current_state", "sensor", hints),
        upper_light_entity: ov.upper_light_entity || rawCfg.upper_light_entity || this._findByKeywords(["select", "switch"], ["sqdr174020p_light"]) || this._findEntity("light", "select", hints),
        lower_light_entity: ov.lower_light_entity || rawCfg.lower_light_entity || this._findEntity("lower_oven_light", "select", hints),
        upper_remote_enabled: this._findByKeywords("binary_sensor", ["sqdr174020p_remote_enabled"]),
        lower_remote_enabled: this._findEntity("lower_oven_remote_enabled", "binary_sensor", hints),
        upper_cook_remaining: this._findByKeywords("sensor", ["sqdr174020p_cook_time_remaining"]),
        lower_cook_remaining: this._findEntity("lower_oven_cook_time_remaining", "sensor", hints),
        upper_kitchen_timer: this._findByKeywords("sensor", ["sqdr174020p_kitchen_timer"]),
        lower_kitchen_timer: this._findEntity("lower_oven_kitchen_timer", "sensor", hints),
        upper_elapsed_time: ov.upper_elapsed_time || this._findEntity("upper_oven_elapsed_cook_time", "sensor", hints),
        lower_elapsed_time: ov.lower_elapsed_time || this._findEntity("lower_oven_elapsed_cook_time", "sensor", hints),
        upper_probe_present: ov.upper_probe_present || this._findEntity("upper_oven_probe_present", "binary_sensor", hints),
        lower_probe_present: ov.lower_probe_present || this._findEntity("lower_oven_probe_present", "binary_sensor", hints),
        upper_probe_temp: ov.upper_probe_temp || this._findByKeywords("sensor", ["sqdr174020p_probe_display_temp"]),
        lower_probe_temp: ov.lower_probe_temp || this._findEntity("lower_oven_probe_display_temp", "sensor", hints),
        control_lock: ov.control_lock || this._findEntity("control_lock", "switch", hints),
        convection_conversion: ov.convection_conversion || this._findEntity("convection_conversion", "switch", hints),
        hour_12_shutoff: ov.hour_12_shutoff || this._findEntity("hour_12_shutoff_enabled", "switch", hints),
        sabbath_mode: ov.sabbath_mode || this._findEntity("sabbath_mode", "switch", hints),
        sound_level: ov.sound_level || this._findEntity("sound_level", "select", hints),
        end_tone: ov.end_tone || this._findEntity("end_tone", "select", hints),
        clock_format: ov.clock_format || this._findEntity("clock_format", "select", hints),
      };
      const ct = rawCfg.cooktop || {};
      const defaultBurners = [
        { shortLabel: "LF", label: 'Left Front (8" Sync)', status_entity: this._findEntity("cooktop_status_left_front_on", "binary_sensor", hints), power_entity: this._findEntity("cooktop_status_left_front_power_pct", "sensor", hints) },
        { shortLabel: "LR", label: 'Left Rear (8" Sync)', status_entity: this._findEntity("cooktop_status_left_rear_on", "binary_sensor", hints), power_entity: this._findEntity("cooktop_status_left_rear_power_pct", "sensor", hints) },
        { shortLabel: "WARM", label: 'Center Rear (6" Warm)', status_entity: this._findEntity("cooktop_status_center_rear_on", "binary_sensor", hints), power_entity: null },
        { shortLabel: "RR", label: 'Right Rear (7")', status_entity: this._findEntity("cooktop_status_right_rear_on", "binary_sensor", hints), power_entity: this._findEntity("cooktop_status_right_rear_power_pct", "sensor", hints) },
        { shortLabel: "RF", label: 'Right Front (11" Power)', status_entity: this._findEntity("cooktop_status_right_front_on", "binary_sensor", hints), power_entity: this._findEntity("cooktop_status_right_front_power_pct", "sensor", hints) },
      ];
      const defaultSyncs = {
        left_front: this._findEntity("cooktop_status_left_front_synchronized", "binary_sensor", hints),
        left_rear: this._findEntity("cooktop_status_left_rear_synchronized", "binary_sensor", hints),
        center_rear: this._findEntity("cooktop_status_center_rear_synchronized", "binary_sensor", hints),
        right_front: this._findEntity("cooktop_status_right_front_synchronized", "binary_sensor", hints),
        right_rear: this._findEntity("cooktop_status_right_rear_synchronized", "binary_sensor", hints),
      };
      resolved.cooktop = {
        master_status: ct.master_status || this._findByKeywords("binary_sensor", ["sqdr174020p_cooktop_status"]),
        burners: defaultBurners.map((defB, i) => {
          const cfgB = Array.isArray(ct.burners) && ct.burners[i] ? ct.burners[i] : {};
          return {
            shortLabel: cfgB.shortLabel || defB.shortLabel,
            label: cfgB.label || defB.label,
            status_entity: cfgB.status_entity || defB.status_entity,
            power_entity: cfgB.power_entity !== undefined ? cfgB.power_entity : defB.power_entity,
          };
        }),
        sync_entities: { ...defaultSyncs, ...(ct.sync_entities || {}) },
      };
    } else if (type === "laundry") {
      const w = rawCfg.washer || {};
      const d = rawCfg.dryer || {};
      resolved.laundry_layout = rawCfg.laundry_layout === "stacked" ? "stacked" : "side_by_side";
      resolved.washer_power = rawCfg.washer_power || w.power_entity || this._findByKeywords("switch", ["washer_power"]);
      resolved.washer_status = rawCfg.washer_status || w.current_status || this._findByKeywords("sensor", ["washer_current_status"]);
      resolved.washer_operation = rawCfg.washer_operation || w.operation || this._findByKeywords(["select", "sensor"], ["washer_operation"]);
      resolved.washer_remaining_time = rawCfg.washer_remaining_time || w.remaining_time || this._findByKeywords("sensor", ["washer_remaining_time"]);
      resolved.washer_total_time = this._findByKeywords("sensor", ["washer_total_time"]);
      resolved.washer_remote_start = this._findByKeywords("binary_sensor", ["washer_remote_start"]);
      resolved.washer_delayed_start = this._findByKeywords("number", ["washer_delayed_start"]);
      resolved.washer_cycles = this._findByKeywords("sensor", ["washer_cycles"]);
      resolved.washer_error = this._findByKeywords("event", ["washer_error"]);
      resolved.washer_notification = this._findByKeywords("event", ["washer_notification"]);

      resolved.dryer_power = rawCfg.dryer_power || d.power_entity || this._findByKeywords("switch", ["dryer_power"]);
      resolved.dryer_status = rawCfg.dryer_status || d.current_status || this._findByKeywords("sensor", ["dryer_current_status"]);
      resolved.dryer_operation = rawCfg.dryer_operation || d.operation || this._findByKeywords(["select", "sensor"], ["dryer_operation"]);
      resolved.dryer_remaining_time = rawCfg.dryer_remaining_time || d.remaining_time || this._findByKeywords("sensor", ["dryer_remaining_time"]);
      resolved.dryer_total_time = this._findByKeywords("sensor", ["dryer_total_time"]);
      resolved.dryer_remote_start = this._findByKeywords("binary_sensor", ["dryer_remote_start"]);
      resolved.dryer_error = this._findByKeywords("event", ["dryer_error"]);
      resolved.dryer_notification = this._findByKeywords("event", ["dryer_notification"]);
    } else if (type === "water_heater") {
      resolved.entity = rawCfg.entity || "water_heater.water_heater";
      resolved.power_entity = rawCfg.power_entity || this._findByKeywords("switch", ["water_heater_power"]);
      resolved.native_power_sensor = rawCfg.native_power_sensor || this._findByKeywords("sensor", ["water_heater_power"]);
      resolved.inlet_temp_sensor = rawCfg.inlet_temp_sensor || this._findByKeywords("sensor", ["inlet_temp"]);
      resolved.outlet_temp_sensor = rawCfg.outlet_temp_sensor || this._findByKeywords("sensor", ["hot_water_temp"]);
      resolved.flow_rate_sensor = rawCfg.flow_rate_sensor || this._findByKeywords("sensor", ["hot_water_flow"]);
      resolved.gas_usage_sensor = rawCfg.gas_usage_sensor || this._findByKeywords("sensor", ["current_gas_use"]);
      resolved.heating_power_sensor = rawCfg.heating_power_sensor || this._findByKeywords("sensor", ["heating_power"]);
      resolved.cumulative_gas_sensor = rawCfg.cumulative_gas_sensor || this._findByKeywords("sensor", ["cumulative_gas_use"]);
      resolved.recirc_switch = rawCfg.recirc_switch || this._findByKeywords("switch", ["water_heater_hot_button"]);
      resolved.recirc_last_run = rawCfg.recirc_last_run || this._findByKeywords("sensor", ["water_heater_last_recirc_timestamp"]);
      resolved.recirc_duration = rawCfg.recirc_duration || this._findByKeywords("sensor", ["water_heater_last_recirc_duration"]);
      resolved.recirc_cooldown = this._findByKeywords("timer", ["water_heater_recirc_cooldown"]);
      resolved.recirc_interval = rawCfg.recirc_interval || this._findByKeywords(["input_number", "number"], ["recirc_interval"]);
      resolved.error_code = this._findByKeywords("sensor", ["water_heater", "error_code"]);
      resolved.sub_error_code = this._findByKeywords("sensor", ["water_heater", "sub_error_code"]);
    } else if (type === "smart_hose_timer") {
      resolved.valve_entity = rawCfg.valve_entity || this._findByKeywords("valve", ["pool_zone"]) || Object.keys(this.hass?.states || {}).find((id) => id.startsWith("valve."));
      if (!this._runtimeSyncedFromEntity && resolved.valve_entity) {
        const presetSec = parseFiniteNum(this.hass?.states?.[resolved.valve_entity]?.attributes?.manual_preset_runtime);
        if (presetSec !== null && presetSec > 0) {
          this._manualRuntime = Math.max(1, Math.min(120, Math.round(presetSec / 60)));
          this._runtimeSyncedFromEntity = true;
        }
      }
      resolved.device_mode_select = rawCfg.device_mode_select || this._findByKeywords("select", ["pool_device_mode"]);
      resolved.fault_sensor = rawCfg.fault_sensor || this._findByKeywords("binary_sensor", ["pool_fault"]);
      resolved.state_sensor = rawCfg.state_sensor || this._findByKeywords("sensor", ["pool_state"]);
      resolved.history_sensor = rawCfg.history_sensor || this._findByKeywords("sensor", ["pool_zone_history"]);
      resolved.battery_sensor = rawCfg.battery_sensor || this._findByKeywords("sensor", ["pool_battery_level"]);
      resolved.next_watering_sensor = rawCfg.next_watering_sensor || this._findByKeywords("sensor", ["pool_next_watering"]);
      resolved.smart_watering_switch = rawCfg.smart_watering_switch || this._findByKeywords("switch", ["pool_smart_watering"]);
      resolved.rain_delay_switch = rawCfg.rain_delay_switch || this._findByKeywords("switch", ["pool_rain_delay"]);
    }

    resolved.span = this._resolveSpanEntities(type, rawCfg);

    const watched = new Set();
    const collectIds = (val) => {
      if (!val) return;
      if (typeof val === "string" && val.includes(".")) watched.add(val);
      else if (Array.isArray(val)) val.forEach(collectIds);
      else if (typeof val === "object") Object.values(val).forEach(collectIds);
    };
    collectIds(resolved);
    resolved._watchedIds = watched;
    return resolved;
  }

  _getNormalizedAppliances() {
    const c = this.config || {};
    const stateCount = this.hass?.states ? Object.keys(this.hass.states).length : 0;
    if (
      this._resolvedUnitsCache &&
      this._cachedUnitsConfig === this.config &&
      this._cachedUnitsStateCount === stateCount
    ) {
      return this._resolvedUnitsCache;
    }
    const list =
      Array.isArray(c.appliances) && c.appliances.length > 0
        ? c.appliances.map((item, idx) => this._normalizeUnit({ ...c, ...item, appliances: undefined }, idx))
        : [this._normalizeUnit(c, 0)];
    this._resolvedUnitsCache = list;
    this._cachedUnitsConfig = this.config;
    this._cachedUnitsStateCount = stateCount;
    return list;
  }

  // =========================================================================
  // SERVICE ACTIONS, FEEDBACK & MODAL SCROLL GUARD
  // =========================================================================

  _fireHaptic(type = "light") {
    const event = new Event("haptic", { bubbles: true, composed: true });
    event.detail = type;
    this.dispatchEvent(event);
  }

  _showToast(msg) {
    this._toastMsg = msg;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toastMsg = null;
    }, 2400);
  }

  _getEntity(entityId) {
    if (!entityId || !this.hass?.states?.[entityId]) {
      return { entity_id: entityId || "", state: "unavailable", attributes: {} };
    }
    return this.hass.states[entityId];
  }

  _hasEntity(entityId) {
    return Boolean(entityId && this.hass?.states?.[entityId]);
  }

  _isEntityOn(entityId) {
    const s = String(this._getEntity(entityId).state || "").toLowerCase();
    return s === "on" || s === "true" || s === "open" || s === "high";
  }

  _showMoreInfo(entityId, ev = null) {
    if (ev) ev.stopPropagation();
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

  _toggleEntity(entityId, ev = null) {
    if (ev) ev.stopPropagation();
    if (!entityId || !this.hass) return;
    this._fireHaptic("light");
    this.hass.callService("homeassistant", "toggle", { entity_id: entityId });
  }

  _toggleApplianceLight(lightEntityId, ev = null) {
    if (ev) ev.stopPropagation();
    if (!lightEntityId || !this.hass) return;
    this._fireHaptic("light");
    if (lightEntityId.startsWith("select.")) {
      const obj = this._getEntity(lightEntityId);
      const opts = obj.attributes?.options || ["Off", "High"];
      const isOff = String(obj.state || "").toLowerCase() === "off";
      const onOption = opts.find((o) => String(o).toLowerCase() !== "off") || "High";
      const offOption = opts.find((o) => String(o).toLowerCase() === "off") || "Off";
      const next = isOff ? onOption : offOption;
      this.hass.callService("select", "select_option", { entity_id: lightEntityId, option: next });
      this._showToast(`Oven Light: ${next}`);
    } else {
      this.hass.callService("homeassistant", "toggle", { entity_id: lightEntityId });
    }
  }

  _selectOption(entityId, option, ev = null) {
    if (ev) ev.stopPropagation();
    if (!entityId || !this.hass) return;
    this._fireHaptic("light");
    this.hass.callService(entityId.split(".")[0], "select_option", { entity_id: entityId, option });
  }

  _setNumberValue(entityId, value, ev = null) {
    if (ev) ev.stopPropagation();
    if (!entityId || !this.hass) return;
    this._fireHaptic("light");
    this.hass.callService(entityId.split(".")[0], "set_value", {
      entity_id: entityId,
      value: Number(value),
    });
  }

  _setTemperature(entityId, temp, fallbackMin = -10, fallbackMax = 550) {
    if (!entityId || !this.hass) return;
    this._fireHaptic("medium");
    const obj = this._getEntity(entityId);
    const min = parseFiniteNum(obj.attributes?.min_temp, fallbackMin);
    const max = parseFiniteNum(obj.attributes?.max_temp, fallbackMax);
    const clamped = Math.max(min, Math.min(max, Math.round(Number(temp))));
    const domain = entityId.split(".")[0] || "water_heater";
    this.hass.callService(domain, "set_temperature", {
      entity_id: entityId,
      temperature: clamped,
    });
  }

  _changeWaterHeaterTemp(entityId, targetTemp) {
    this._setTemperature(entityId, targetTemp, 97, 185);
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
    } else if (domain === "select") {
      this._selectOption(entityId, mode);
    }
  }

  _startHold(entityId, delta, min, max, opts = {}) {
    this._wasHolding = false;
    this._stopHold(entityId);
    const base = opts.stagingDefault ?? min;
    const cur = this._getTargetTemp(entityId, base, opts);
    const next = Math.max(min, Math.min(max, cur + delta));
    this._localTemps = { ...this._localTemps, [entityId]: next };
    this._fireHaptic("light");
    this._holdTimeout = setTimeout(() => {
      this._wasHolding = true;
      this._holdInterval = setInterval(() => {
        const cVal = this._localTemps[entityId] ?? next;
        const upd = Math.max(min, Math.min(max, cVal + delta));
        if (upd !== cVal) {
          this._localTemps = { ...this._localTemps, [entityId]: upd };
          this._fireHaptic("selection");
        }
      }, 80);
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
    if (this._wasHolding && this._localTemps[entityId] !== undefined) {
      const finalVal = this._localTemps[entityId];
      this._setTemperature(entityId, finalVal);
      setTimeout(() => {
        const next = { ...this._localTemps };
        delete next[entityId];
        this._localTemps = next;
      }, 1400);
    }
  }

  _adjustTemp(entityId, delta, min, max, opts = {}) {
    const base = opts.stagingDefault ?? min;
    const cur = this._getTargetTemp(entityId, base, opts);
    const upd = Math.max(min, Math.min(max, cur + delta));
    this._localTemps = { ...this._localTemps, [entityId]: upd };
    this._setTemperature(entityId, upd, min, max);
    setTimeout(() => {
      const next = { ...this._localTemps };
      delete next[entityId];
      this._localTemps = next;
    }, 1400);
  }

  _getTargetTemp(entityId, fallback = 150, { allowZeroOrNegative = false } = {}) {
    if (this._localTemps[entityId] !== undefined) return this._localTemps[entityId];
    const obj = this._getEntity(entityId);
    const attrTemp = parseFiniteNum(obj.attributes?.temperature);
    if (attrTemp !== null && (allowZeroOrNegative || attrTemp > 0)) {
      return attrTemp;
    }
    const stateNum = parseFiniteNum(obj.state);
    if (stateNum !== null && (allowZeroOrNegative || stateNum > 0)) {
      return stateNum;
    }
    return fallback;
  }

  _getFridgeSetpoints(u) {
    const fCtrl = this._getEntity(u.fridge_control);
    const zCtrl = this._getEntity(u.freezer_control);
    const fSet =
      this._localTemps[u.fridge_control] ??
      parseFiniteNum(fCtrl.attributes?.temperature) ??
      parseFiniteNum(this._getEntity(u.fridge_temp_setting).state) ??
      37;
    const zSet =
      this._localTemps[u.freezer_control] ??
      parseFiniteNum(zCtrl.attributes?.temperature) ??
      parseFiniteNum(this._getEntity(u.freezer_temp_setting).state) ??
      0;
    return { fSet, zSet };
  }

  _getOvenTargetTemp(ctrlId, dispId, isOn) {
    if (this._localTemps[ctrlId] !== undefined) return this._localTemps[ctrlId];
    const ctrlAttr = parseFiniteNum(this._getEntity(ctrlId).attributes?.temperature);
    if (ctrlAttr !== null && ctrlAttr >= 100) return ctrlAttr;
    const dispVal = parseFiniteNum(this._getEntity(dispId).state);
    if (dispVal !== null && dispVal >= 100) return dispVal;
    return isOn ? 350 : null;
  }

  async _fetchRecircHistory(entityId) {
    if (!this.hass || !entityId) return;
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const end = now.toISOString();
    try {
      const hist = await this.hass.callApi(
        "GET",
        `history/period/${start}?filter_entity_id=${entityId}&end_time=${end}`
      );
      this._historyCache = {
        ...this._historyCache,
        [entityId]: Array.isArray(hist) && hist.length > 0 ? hist[0] : [],
      };
    } catch (e) {
      this._historyCache = { ...this._historyCache, [entityId]: [] };
    }
  }

  _openModal(unitIdx = 0, tab = "primary", ev = null) {
    if (ev) ev.stopPropagation();
    this._fireHaptic("light");
    clearTimeout(this._closeModalTimer);
    clearTimeout(this._swipeResetTimer);
    this._activeUnitIdx = unitIdx;
    this._activeTab = tab || "primary";
    this._animDirection = "none";
    this._modalOpen = true;
    this._lockBackgroundScroll();
    const units = this._getNormalizedAppliances();
    const u = units[unitIdx];
    if (u?.appliance_type === "water_heater" && u.recirc_switch) {
      this._fetchRecircHistory(u.recirc_switch);
    }
  }

  _closeModal() {
    this._fireHaptic("light");
    clearTimeout(this._swipeResetTimer);
    const overlay = this.shadowRoot?.querySelector(".popup-overlay");
    const content = this.shadowRoot?.querySelector(".popup-content");
    if (overlay) overlay.classList.add("closing");
    if (content) content.classList.add("closing");
    clearTimeout(this._closeModalTimer);
    this._closeModalTimer = setTimeout(() => {
      this._modalOpen = false;
      this._detachOverlayScrollGuard();
      this._unlockBackgroundScroll();
    }, 180);
  }

  _lockBackgroundScroll() {
    if (this._scrollLockedElements) return;
    const lockMap = (window.__passableScrollLocks = window.__passableScrollLocks || new Map());
    const targets = new Set();
    if (document.documentElement) targets.add(document.documentElement);
    if (document.body) targets.add(document.body);
    if (document.scrollingElement) targets.add(document.scrollingElement);
    let node = this.parentNode;
    while (node) {
      if (node.nodeType === 1) {
        const oy = window.getComputedStyle(node).overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "overlay" || node.id === "view") targets.add(node);
      }
      node = node.parentNode || node.host || null;
    }
    const locked = [];
    targets.forEach((el) => {
      let entry = lockMap.get(el);
      if (!entry) {
        entry = { count: 0, overflow: el.style.overflow, overflowY: el.style.overflowY, overscrollBehavior: el.style.overscrollBehavior };
        lockMap.set(el, entry);
      }
      if (entry.count === 0) {
        el.style.overflowY = "hidden";
        el.style.overscrollBehavior = "none";
      }
      entry.count += 1;
      locked.push(el);
    });
    this._scrollLockedElements = locked;
  }

  _unlockBackgroundScroll() {
    if (!this._scrollLockedElements) return;
    const lockMap = window.__passableScrollLocks;
    this._scrollLockedElements.forEach((el) => {
      const entry = lockMap && lockMap.get(el);
      if (!entry) return;
      entry.count -= 1;
      if (entry.count <= 0) {
        el.style.overflow = entry.overflow;
        el.style.overflowY = entry.overflowY;
        el.style.overscrollBehavior = entry.overscrollBehavior;
        lockMap.delete(el);
      }
    });
    this._scrollLockedElements = null;
  }

  _attachOverlayScrollGuard() {
    const overlay = this.shadowRoot?.querySelector(".popup-overlay");
    if (overlay === this._scrollGuardOverlay) return;
    this._detachOverlayScrollGuard();
    if (!overlay) return;
    overlay.addEventListener("wheel", this._onOverlayWheel, { passive: false });
    overlay.addEventListener("touchstart", this._onOverlayTouchStart, { passive: true });
    overlay.addEventListener("touchmove", this._onOverlayTouchMove, { passive: false });
    this._scrollGuardOverlay = overlay;
  }

  _detachOverlayScrollGuard() {
    if (!this._scrollGuardOverlay) return;
    this._scrollGuardOverlay.removeEventListener("wheel", this._onOverlayWheel);
    this._scrollGuardOverlay.removeEventListener("touchstart", this._onOverlayTouchStart);
    this._scrollGuardOverlay.removeEventListener("touchmove", this._onOverlayTouchMove);
    this._scrollGuardOverlay = null;
  }

  _findModalScrollContainer(ev, overlay) {
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    const contentEl = overlay ? overlay.querySelector(".popup-content") : null;
    if (!contentEl || !path.includes(contentEl)) return null;
    for (const el of path) {
      if (el === overlay) break;
      if (!el || el.nodeType !== 1 || !contentEl.contains(el)) continue;
      const oy = window.getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return null;
  }

  _onOverlayWheel(ev) {
    const scroller = this._findModalScrollContainer(ev, this._scrollGuardOverlay);
    if (!scroller) {
      if (ev.cancelable) ev.preventDefault();
      return;
    }
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if ((ev.deltaY < 0 && atTop) || (ev.deltaY > 0 && atBottom)) {
      if (ev.cancelable) ev.preventDefault();
    }
  }

  _onOverlayTouchStart(ev) {
    if (ev.touches && ev.touches.length === 1) {
      this._guardTouchY = ev.touches[0].clientY;
      this._guardTouchX = ev.touches[0].clientX;
    }
  }

  _onOverlayTouchMove(ev) {
    if (!ev.touches || ev.touches.length !== 1) return;
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    if (path.some((el) => el?.tagName === "INPUT" && el.type === "range")) return;
    const curY = ev.touches[0].clientY;
    const curX = ev.touches[0].clientX;
    const dy = curY - this._guardTouchY;
    const dx = curX - this._guardTouchX;
    this._guardTouchY = curY;
    this._guardTouchX = curX;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 4) return;
    const scroller = this._findModalScrollContainer(ev, this._scrollGuardOverlay);
    if (!scroller) {
      if (ev.cancelable) ev.preventDefault();
      return;
    }
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
      if (ev.cancelable) ev.preventDefault();
    }
  }

  _handleTouchStart(e) {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    if (path.some((el) => el?.tagName === "INPUT" || el?.tagName === "SELECT")) return;
    const popupContent = e.currentTarget;
    const scrollArea = popupContent.querySelector(".modal-scroll-area");
    if (scrollArea && e.target && scrollArea.contains(e.target) && scrollArea.scrollTop > 0) return;
    clearTimeout(this._swipeResetTimer);
    this._popupTouchStartY = e.touches[0].clientY;
    this._popupTouchStartX = e.touches[0].clientX;
    this._popupTouchCurrentY = this._popupTouchStartY;
    this._popupTouchTarget = popupContent;
    this._popupTouchDragging = false;
    this._popupTouchLockedHorizontal = false;
  }

  _handleTouchMove(e) {
    if (this._popupTouchStartY === undefined || !this._popupTouchTarget || this._popupTouchLockedHorizontal) return;
    const popupContent = this._popupTouchTarget;
    const curY = e.touches[0].clientY;
    const curX = e.touches[0].clientX;
    const dy = curY - this._popupTouchStartY;
    const dx = curX - (this._popupTouchStartX ?? curX);
    if (!this._popupTouchDragging) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        this._popupTouchLockedHorizontal = true;
        return;
      }
      if (dy > 6) {
        this._popupTouchDragging = true;
        popupContent.style.animation = "none";
        popupContent.style.transition = "none";
      } else return;
    }
    if (dy > 0) {
      if (e.cancelable) e.preventDefault();
      this._popupTouchCurrentY = curY;
      popupContent.style.transform = `translateY(${dy}px)`;
    }
  }

  _handleTouchEnd() {
    if (this._popupTouchStartY === undefined || !this._popupTouchTarget) return;
    const popupContent = this._popupTouchTarget;
    const deltaY = this._popupTouchDragging && this._popupTouchCurrentY !== undefined
      ? this._popupTouchCurrentY - this._popupTouchStartY
      : 0;
    const wasDragging = this._popupTouchDragging;
    this._popupTouchStartY = undefined;
    this._popupTouchStartX = undefined;
    this._popupTouchCurrentY = undefined;
    this._popupTouchTarget = null;
    this._popupTouchDragging = false;
    this._popupTouchLockedHorizontal = false;
    if (deltaY > 80) {
      this._closeModal();
    } else if (wasDragging) {
      popupContent.style.transition = "transform 250ms cubic-bezier(0.2, 0, 0, 1)";
      popupContent.style.transform = "translateY(0px)";
      this._swipeResetTimer = setTimeout(() => {
        popupContent.style.transition = "";
        popupContent.style.transform = "";
      }, 250);
    }
  }

  // =========================================================================
  // SNAPSHOT EXTRACTION PER APPLIANCE
  // =========================================================================

  _readSpanTelemetry(u) {
    const pEntId = u.span?.power || u.native_power_sensor;
    const pObj = pEntId ? this._getEntity(pEntId) : null;
    const cObj = u.span?.current ? this._getEntity(u.span.current) : null;
    const eObj = u.span?.energy ? this._getEntity(u.span.energy) : null;
    const watts = pObj ? parseFiniteNum(pObj.state) : null;
    const amps = cObj ? parseFiniteNum(cObj.state) : null;
    const energyWh = eObj ? parseFiniteNum(eObj.state) : null;
    return {
      watts,
      amps,
      energyKwh: energyWh !== null ? energyWh / 1000 : null,
      powerText: watts !== null ? `${watts >= 1000 ? `${(watts / 1000).toFixed(2)} kW` : `${Math.round(watts)} W`}` : amps !== null ? `${amps.toFixed(1)} A` : null,
    };
  }

  _getWaterFilterInfo(u) {
    const pctObj = this._getEntity(u.water_filter_percent);
    const daysObj = this._getEntity(u.water_filter_days);
    const mainObj = this._getEntity(u.water_filter_status);
    let pct = !isNaN(parseFloat(pctObj.state)) ? parseFloat(pctObj.state) : null;
    let days = !isNaN(parseInt(daysObj.state, 10)) ? parseInt(daysObj.state, 10) : null;
    if (pct === null && mainObj.state && String(mainObj.state).includes("percent_remaining")) {
      const m = String(mainObj.state).match(/percent_remaining\s*=\s*(\d+)/i);
      if (m) pct = parseFloat(m[1]);
    }
    if (days === null && mainObj.state && String(mainObj.state).includes("days_remaining")) {
      const m = String(mainObj.state).match(/days_remaining\s*=\s*(\d+)/i);
      if (m) days = parseInt(m[1], 10);
    }
    const status = pct !== null && pct <= 0 ? "Expired" : pct !== null && pct <= 15 ? "Replace" : "Good";
    return { pct, days, status, label: pct !== null ? `${Math.round(pct)}%${days !== null ? ` (${days}d)` : ""}` : "Good" };
  }

  _getDoorStatusInfo(u) {
    const left = this._isEntityOn(u.door_left);
    const right = this._isEntityOn(u.door_right);
    const freezer = this._isEntityOn(u.door_freezer);
    const anyBin = this._isEntityOn(u.door_any);
    const legacy = String(this._getEntity(u.door_status).state || "").toLowerCase();
    const isAnyOpen = left || right || freezer || anyBin || (legacy && legacy !== "closed" && legacy !== "unavailable" && legacy !== "off");
    let label = "Closed";
    if (isAnyOpen) {
      if (left && right) label = "Doors Open";
      else if (left) label = "Left Door Open";
      else if (right) label = "Right Door Open";
      else if (freezer) label = "Freezer Open";
      else label = "Door Open";
    }
    return { isAnyOpen, left, right, freezer, label };
  }

  _computeLaundryTiming(finishTs, totalMinRaw, isActive) {
    const totalMin = parseFloat(totalMinRaw);
    if (!isActive || !finishTs || finishTs === "unavailable" || finishTs === "unknown") {
      return { countdown: "", eta: "", progressPct: null };
    }
    const finish = new Date(finishTs);
    if (isNaN(finish.getTime())) return { countdown: "", eta: "", progressPct: null };
    const remMs = Math.max(0, finish.getTime() - Date.now());
    const remMins = Math.ceil(remMs / 60000);
    const h = Math.floor(remMins / 60);
    const m = remMins % 60;
    const countdown = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const eta = formatShortTime(finish);
    const progressPct = !isNaN(totalMin) && totalMin > 0
      ? Math.max(2, Math.min(99, Math.round(((totalMin - remMins) / totalMin) * 100)))
      : null;
    return { countdown, eta, progressPct };
  }

  _getUnitSnapshot(u) {
    const span = this._readSpanTelemetry(u);
    const type = u.appliance_type;

    if (type === "refrigerator") {
      const fTemp = parseFiniteNum(this._getEntity(u.fridge_temp_current).state);
      const zTemp = parseFiniteNum(this._getEntity(u.freezer_temp_current).state);
      const { fSet, zSet } = this._getFridgeSetpoints(u);
      const doorInfo = this._getDoorStatusInfo(u);
      const filterInfo = this._getWaterFilterInfo(u);
      const iceBucket = this._getEntity(u.ice_bucket_status).state;
      const hwStatus = this._getEntity(u.hot_water_status).state;
      const hwFault = this._isEntityOn(u.hot_water_faulted);
      const isHeating = hwStatus === "Heating";
      const alert = doorInfo.isAnyOpen || hwFault || filterInfo.status === "Expired";
      const tone = alert ? "warning" : isHeating ? "active" : "idle";
      return {
        u,
        span,
        tone,
        isActive: isHeating || doorInfo.isAnyOpen,
        primaryVal: fTemp !== null ? `${Math.round(fTemp)}° / ${zTemp !== null ? Math.round(zTemp) : "--"}°` : "--° / --°",
        primarySub: `Set ${Math.round(fSet)}° / ${Math.round(zSet)}°`,
        statusSub: doorInfo.isAnyOpen
          ? doorInfo.label
          : isHeating
          ? "K-Cup Heating"
          : `Filter ${filterInfo.label}${iceBucket && iceBucket !== "unavailable" ? ` • Ice ${iceBucket}` : ""}`,
        chips: [
          ...(doorInfo.isAnyOpen ? [{ label: doorInfo.label, cls: "warning" }] : []),
          ...(isHeating ? [{ label: "K-Cup Hot", cls: "heat" }] : []),
          ...(hwFault ? [{ label: "Hot Water Fault", cls: "danger" }] : []),
        ],
        ringA: filterInfo.pct !== null ? { pct: filterInfo.pct, val: `${Math.round(filterInfo.pct)}%`, lbl: "Filter", color: filterInfo.pct <= 15 ? "#f59e0b" : "#16a34a" } : null,
        ringB: fTemp !== null ? { pct: 75, val: `${Math.round(fTemp)}°`, lbl: "Fridge", color: "#0284c7" } : null,
        progressPct: null,
      };
    }

    if (type === "induction_range") {
      const ov = u.oven;
      const uCtrl = this._getEntity(ov.upper_control);
      const lCtrl = this._getEntity(ov.lower_control);
      const uRaw = parseFiniteNum(this._getEntity(ov.upper_raw_temp).state);
      const lRaw = parseFiniteNum(this._getEntity(ov.lower_raw_temp).state);
      const uState = this._getEntity(ov.upper_state_entity).state;
      const lState = this._getEntity(ov.lower_state_entity).state;
      const isOff = (s) => !s || ["off", "idle", "unavailable", "unknown"].includes(String(s).toLowerCase());
      const uOn = !isOff(uCtrl.state) || !isOff(uState);
      const lOn = !isOff(lCtrl.state) || !isOff(lState);
      const activeBurners = (u.cooktop?.burners || []).filter((b) => this._isEntityOn(b.status_entity));
      const anyActive = uOn || lOn || activeBurners.length > 0;
      const uTarget = this._getOvenTargetTemp(ov.upper_control, ov.upper_display_temp, uOn);
      const lTarget = this._getOvenTargetTemp(ov.lower_control, ov.lower_display_temp, lOn);

      let primaryVal = "Idle";
      let primarySub = "Ready";
      if (uOn && uRaw !== null) {
        primaryVal = `${Math.round(uRaw)}°F`;
        primarySub = uTarget ? `Upper Set ${Math.round(uTarget)}°` : uState;
      } else if (lOn && lRaw !== null) {
        primaryVal = `${Math.round(lRaw)}°F`;
        primarySub = lTarget ? `Lower Set ${Math.round(lTarget)}°` : lState;
      } else if (activeBurners.length > 0) {
        primaryVal = `${activeBurners.length} On`;
        primarySub = span.powerText || "Cooktop";
      } else if (span.powerText) {
        primaryVal = span.powerText;
        primarySub = "Standby";
      }

      const chips = [];
      if (uOn) chips.push({ label: `Upper ${uState}`, cls: "heat" });
      if (lOn) chips.push({ label: `Lower ${lState}`, cls: "heat" });
      if (activeBurners.length > 0) chips.push({ label: `${activeBurners.length} Burner${activeBurners.length > 1 ? "s" : ""}`, cls: "heat" });
      if (span.amps !== null && span.amps >= 1) chips.push({ label: `${span.amps.toFixed(1)} A`, cls: "info" });

      const activeOvenRaw = uOn && uRaw !== null ? uRaw : lOn && lRaw !== null ? lRaw : (uRaw !== null && lRaw !== null ? Math.max(uRaw, lRaw) : (uRaw ?? lRaw));
      const ringLabel = uOn && !lOn ? "Upper" : lOn && !uOn ? "Lower" : "Oven";

      return {
        u,
        span,
        tone: anyActive ? "heat" : "idle",
        isActive: anyActive,
        primaryVal,
        primarySub,
        statusSub: anyActive
          ? `${uOn ? "Upper " : ""}${lOn ? "Lower " : ""}${activeBurners.length > 0 ? `${activeBurners.length} Burners` : ""}`.trim()
          : `All Elements Off${activeOvenRaw !== null && activeOvenRaw > 120 ? ` • Warm ${Math.round(activeOvenRaw)}°` : ""}`,
        chips,
        ringA: { pct: activeBurners.length * 20, val: `${activeBurners.length}/5`, lbl: "Burners", color: "#f97316" },
        ringB: activeOvenRaw !== null ? { pct: Math.min(100, (activeOvenRaw / 500) * 100), val: `${Math.round(activeOvenRaw)}°`, lbl: ringLabel, color: uOn || lOn ? "#ef4444" : "#94a3b8" } : null,
        progressPct: null,
      };
    }

    if (type === "laundry") {
      const wStatus = this._getEntity(u.washer_status).state;
      const dStatus = this._getEntity(u.dryer_status).state;
      const isOff = (s) => !s || ["off", "power_off", "idle", "end", "standby", "unavailable", "unknown"].includes(String(s).toLowerCase());
      const wOn = !isOff(wStatus);
      const dOn = !isOff(dStatus);
      const wTime = this._computeLaundryTiming(
        this._getEntity(u.washer_remaining_time).state,
        this._getEntity(u.washer_total_time).state,
        wOn
      );
      const dTime = this._computeLaundryTiming(
        this._getEntity(u.dryer_remaining_time).state,
        this._getEntity(u.dryer_total_time).state,
        dOn
      );
      const cycles = parseInt(this._getEntity(u.washer_cycles).state, 10);
      const tubCleanDue = !isNaN(cycles) && cycles >= 30;
      const activeProg = wOn ? wTime.progressPct : dOn ? dTime.progressPct : null;

      return {
        u,
        span,
        tone: wOn || dOn ? "active" : tubCleanDue ? "warning" : "idle",
        isActive: wOn || dOn,
        primaryVal: wOn && wTime.countdown ? wTime.countdown : dOn && dTime.countdown ? dTime.countdown : "Idle",
        primarySub: wOn ? `Washer ${wTime.eta}` : dOn ? `Dryer ${dTime.eta}` : !isNaN(cycles) ? `${cycles} Cycles` : "Ready",
        statusSub: wOn
          ? `Washer: ${formatTitleCase(wStatus)}${dOn ? ` · Dryer: ${formatTitleCase(dStatus)}` : ""}`
          : dOn
          ? `Dryer: ${formatTitleCase(dStatus)}`
          : `Washer & Dryer Ready`,
        chips: [
          ...(wOn ? [{ label: `Wash ${formatTitleCase(wStatus)}`, cls: "info" }] : []),
          ...(dOn ? [{ label: `Dry ${formatTitleCase(dStatus)}`, cls: "heat" }] : []),
          ...(tubCleanDue ? [{ label: `Tub Clean (${cycles})`, cls: "warning" }] : []),
        ],
        ringA: { pct: wOn && wTime.progressPct ? wTime.progressPct : 0, val: wOn && wTime.countdown ? wTime.countdown : formatTitleCase(wStatus), lbl: "Washer", color: "#0284c7" },
        ringB: { pct: dOn && dTime.progressPct ? dTime.progressPct : 0, val: dOn && dTime.countdown ? dTime.countdown : formatTitleCase(dStatus), lbl: "Dryer", color: "#f97316" },
        progressPct: activeProg,
      };
    }

    if (type === "water_heater") {
      const mainObj = this._getEntity(u.entity);
      const flow = parseFloat(this._getEntity(u.flow_rate_sensor).state) || 0;
      const modPct = parseFloat(this._getEntity(u.heating_power_sensor).state) || 0;
      const outTemp = parseFloat(this._getEntity(u.outlet_temp_sensor).state);
      const setTemp = parseFloat(mainObj.attributes?.temperature) || 125;
      const isRecirc = this._isEntityOn(u.recirc_switch);
      const errCode = parseInt(this._getEntity(u.error_code).state, 10);
      const hasErr = !isNaN(errCode) && errCode > 0;
      const active = flow > 0 || modPct > 0 || isRecirc;

      return {
        u,
        span,
        tone: hasErr ? "danger" : active ? "heat" : "idle",
        isActive: active,
        primaryVal: `${Math.round(setTemp)}°F`,
        primarySub: !isNaN(outTemp) ? `Out ${Math.round(outTemp)}°` : `${flow.toFixed(1)} GPM`,
        statusSub: hasErr
          ? `Fault Code ${errCode}`
          : isRecirc
          ? "HotButton Recirculating"
          : flow > 0
          ? `Flowing ${flow.toFixed(1)} GPM • ${Math.round(modPct)}%`
          : `Last Recirc ${formatRelativeTime(this._getEntity(u.recirc_last_run).state)}`,
        chips: [
          ...(hasErr ? [{ label: `Code ${errCode}`, cls: "danger" }] : []),
          ...(isRecirc ? [{ label: "Recirc Active", cls: "info" }] : []),
          ...(modPct > 0 ? [{ label: `Burner ${Math.round(modPct)}%`, cls: "heat" }] : []),
        ],
        ringA: { pct: modPct, val: `${Math.round(modPct)}%`, lbl: "Burner", color: "#f97316" },
        ringB: { pct: Math.min(100, (flow / 6) * 100), val: `${flow.toFixed(1)}`, lbl: "GPM", color: "#0284c7" },
        progressPct: modPct > 0 ? modPct : null,
      };
    }

    // smart_hose_timer
    const valve = this._getEntity(u.valve_entity);
    const isOpen = valve.state === "open" || valve.state === "on";
    const fault = this._isEntityOn(u.fault_sensor);
    const mode = this._getEntity(u.device_mode_select).state;
    const rainDelay = this._isEntityOn(u.rain_delay_switch);
    const histObj = this._getEntity(u.history_sensor);
    const lastMin = histObj.attributes?.run_time ? `${Math.round(parseFloat(histObj.attributes.run_time))}m` : null;
    const lastGal = histObj.attributes?.consumption_gallons !== undefined ? `${histObj.attributes.consumption_gallons} gal` : null;

    return {
      u,
      span,
      tone: fault ? "danger" : isOpen ? "active" : "idle",
      isActive: isOpen,
      primaryVal: isOpen ? "Open" : "Closed",
      primarySub: mode && mode !== "unavailable" ? formatTitleCase(mode) : "Auto",
      statusSub: isOpen
        ? `Watering now`
        : histObj.state && histObj.state !== "unavailable"
        ? `Last: ${formatShortDate(histObj.state)}${lastMin ? ` · ${lastMin}` : ""}${lastGal ? ` · ${lastGal}` : ""}`
        : "Standby",
      chips: [
        ...(fault ? [{ label: "Fault", cls: "danger" }] : []),
        ...(isOpen ? [{ label: "Watering", cls: "info" }] : []),
        ...(rainDelay ? [{ label: "Rain Delay", cls: "warning" }] : []),
      ],
      ringA: null,
      ringB: null,
      progressPct: null,
    };
  }

  // =========================================================================
  // MODEL-ACCURATE SVGs (Used for Summary Thumbnails & Chassis Visuals)
  // =========================================================================

  _renderApplianceThumbSvg(type, snap, size = 38) {
    if (type === "refrigerator") {
      return svg`
        <svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display:block;">
          <rect x="10" y="5" width="28" height="38" rx="4" fill="var(--card-background-color, #f1f5f9)" stroke="var(--divider-color, #94a3b8)" stroke-width="1.8" />
          <line x1="24" y1="5" x2="24" y2="30" stroke="var(--divider-color, #94a3b8)" stroke-width="1.4" />
          <line x1="10" y1="30" x2="38" y2="30" stroke="var(--divider-color, #94a3b8)" stroke-width="1.6" />
          <rect x="13" y="13" width="5" height="9" rx="1.5" fill="${snap?.isActive ? "#f59e0b" : "#334155"}" />
          <line x1="21.5" y1="10" x2="21.5" y2="25" stroke="#b87352" stroke-width="1.8" stroke-linecap="round" />
          <line x1="26.5" y1="10" x2="26.5" y2="25" stroke="#b87352" stroke-width="1.8" stroke-linecap="round" />
          <line x1="16" y1="33" x2="32" y2="33" stroke="#b87352" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `;
    }
    if (type === "induction_range") {
      return svg`
        <svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display:block;">
          <rect x="8" y="6" width="32" height="36" rx="4" fill="var(--card-background-color, #f1f5f9)" stroke="var(--divider-color, #94a3b8)" stroke-width="1.8" />
          <rect x="9" y="7" width="30" height="5" rx="1.5" fill="#27272a" />
          <rect x="12" y="15" width="24" height="9" rx="2" fill="${snap?.isActive ? "#fb923c" : "#334155"}" opacity="${snap?.isActive ? 0.85 : 0.7}" />
          <rect x="12" y="27" width="24" height="12" rx="2" fill="${snap?.isActive ? "#f97316" : "#334155"}" opacity="${snap?.isActive ? 0.9 : 0.7}" />
          <line x1="14" y1="14" x2="34" y2="14" stroke="#b87352" stroke-width="1.6" stroke-linecap="round" />
          <line x1="14" y1="26" x2="34" y2="26" stroke="#b87352" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      `;
    }
    if (type === "laundry") {
      const c = snap?.isActive ? "#0284c7" : "#64748b";
      return svg`
        <svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display:block;">
          <rect x="9" y="6" width="30" height="36" rx="4" fill="var(--card-background-color, #f1f5f9)" stroke="var(--divider-color, #94a3b8)" stroke-width="1.8" />
          <line x1="9" y1="14" x2="39" y2="14" stroke="var(--divider-color, #94a3b8)" stroke-width="1.3" />
          <circle cx="24" cy="10" r="2.2" fill="currentColor" opacity="0.5" />
          <circle cx="24" cy="27" r="9.5" fill="#18181b" stroke="${c}" stroke-width="2.2" />
          <circle cx="24" cy="27" r="5" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 2" />
        </svg>
      `;
    }
    if (type === "water_heater") {
      const c = snap?.isActive ? "#f97316" : "#16a34a";
      return svg`
        <svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display:block;">
          <rect x="12" y="6" width="24" height="34" rx="4" fill="var(--card-background-color, #f8fafc)" stroke="${c}" stroke-width="1.8" />
          <rect x="18" y="16" width="12" height="10" rx="2" fill="#27272a" />
          <line x1="18" y1="40" x2="18" y2="45" stroke="#ef4444" stroke-width="2.4" />
          <line x1="30" y1="40" x2="30" y2="45" stroke="#0284c7" stroke-width="2.4" />
        </svg>
      `;
    }
    return svg`
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" style="display:block;">
        <rect x="17" y="5" width="14" height="6" rx="2" fill="#d97706" />
        <rect x="12" y="11" width="24" height="25" rx="6" fill="#27272a" stroke="#22c55e" stroke-width="1.8" />
        <rect x="17" y="16" width="14" height="8" rx="1.5" fill="#16a34a" opacity="0.85" />
        <rect x="20" y="36" width="8" height="7" rx="1.5" fill="#64748b" />
      </svg>
    `;
  }

  _renderRingMiniGauge(pct, valueText, subText, color) {
    const r = 17;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, pct));
    const dash = (clamped / 100) * c;
    return html`
      <div class="summary-ring-item">
        <div class="summary-ring-wrap">
          ${svg`
            <svg class="summary-ring-svg" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(148, 163, 184, 0.22)" stroke-width="3.4"></circle>
              <circle cx="21" cy="21" r="${r}" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-opacity="${clamped > 0 ? 1 : 0}" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"></circle>
            </svg>
          `}
          <span class="summary-ring-val">${valueText}</span>
        </div>
        <span class="summary-ring-label">${subText}</span>
      </div>
    `;
  }

  // =========================================================================
  // COMPACT SUMMARY MODE (Consolidated Hero, Strip, Active, Tiles, Rows, Rings)
  // =========================================================================

  _computeHubMetrics(snaps) {
    const activeSnaps = snaps.filter((s) => s.isActive);
    const dangerSnaps = snaps.filter((s) => s.tone === "danger");
    const warnSnaps = snaps.filter((s) => s.tone === "warning" || s.tone === "danger");
    const heatSnaps = snaps.filter((s) => s.tone === "heat");
    const totalWatts = snaps.reduce((sum, s) => sum + (s.span.watts || 0), 0);
    const prioritySnap = dangerSnaps[0] || warnSnaps[0] || activeSnaps[0] || snaps[0];
    const priorityIdx = Math.max(0, snaps.indexOf(prioritySnap));
    const whSnap = snaps.find((s) => s.u.appliance_type === "water_heater" && s.u.recirc_switch);
    return {
      total: snaps.length,
      activeSnaps,
      dangerSnaps,
      warnSnaps,
      heatSnaps,
      nominalCount: snaps.length - warnSnaps.length,
      totalWatts,
      priorityIdx,
      whSnap,
    };
  }

  _toggleDrawer(mode, ev = null) {
    if (ev) ev.stopPropagation();
    this._fireHaptic("light");
    const key = mode === null ? null : String(mode);
    if (this._drawerMode === key) {
      this._drawerMode = null;
    } else {
      this._drawerMode = key;
      if (key === "all") this._drawerFilter = "all";
    }
  }

  _getTileToneClass(tone) {
    if (tone === "heat") return "state-heat";
    if (tone === "active") return "state-active";
    if (tone === "warning") return "state-warning";
    if (tone === "danger") return "state-danger";
    return "";
  }

  _renderSummaryMode(units) {
    const c = this.config;
    const snaps = units.map((u) => this._getUnitSnapshot(u));
    const metrics = this._computeHubMetrics(snaps);
    const layout = c.layout || "rows";

    const tone =
      metrics.dangerSnaps.length > 0
        ? "danger"
        : metrics.warnSnaps.length > 0
        ? "warning"
        : metrics.heatSnaps.length > 0
        ? "heat"
        : metrics.activeSnaps.length > 0
        ? "active"
        : "idle";
    const summaryLabel =
      metrics.warnSnaps.length > 0
        ? `${metrics.warnSnaps.length} Attention · ${metrics.warnSnaps[0].u.title}`
        : metrics.activeSnaps.length > 0
        ? `${metrics.activeSnaps.length} Active · ${metrics.activeSnaps.map((s) => s.u.title).slice(0, 2).join(", ")}`
        : snaps.length > 1
        ? `All ${snaps.length} Appliances Nominal`
        : snaps[0].statusSub;

    return html`
      <div class="card-content ${c.show_header === false ? "no-header" : ""}">
        ${c.show_summary_strip !== false && layout !== "strip"
          ? html`
              <div
                class="app-summary-strip ${tone}"
                @click=${() => this._openModal(metrics.priorityIdx, "primary")}
                title="Tap to open Appliance Command Center"
              >
                <div class="summary-strip-left">
                  <span class="summary-status-dot ${tone}"></span>
                  <span class="summary-status-label">${summaryLabel}</span>
                  ${metrics.totalWatts >= 10
                    ? html`
                        <span class="summary-sep">•</span>
                        <span class="summary-meta-pill">
                          ${metrics.totalWatts >= 1000 ? `${(metrics.totalWatts / 1000).toFixed(2)} kW` : `${Math.round(metrics.totalWatts)} W`}
                        </span>
                      `
                    : ""}
                </div>
                <div class="summary-strip-right">
                  <button
                    type="button"
                    class="strip-circle-btn"
                    @click=${(e) => this._openModal(metrics.priorityIdx, "primary", e)}
                    title="Open Appliance Command Center"
                  >
                    <ha-icon icon="mdi:tune-variant" style="--mdc-icon-size:15px;"></ha-icon>
                  </button>
                </div>
              </div>
            `
          : ""}

        ${layout === "compact"
          ? this._renderConsolidatedHero(snaps, metrics)
          : layout === "strip"
          ? this._renderMinimalStripCard(snaps, metrics)
          : layout === "active"
          ? this._renderActiveOnlyUnits(snaps, metrics)
          : layout === "tiles"
          ? this._renderTilesGrid(snaps)
          : layout === "rings" && snaps.length > 1
          ? this._renderRingsGrid(snaps)
          : html`
              <div class="units-stack">
                ${snaps.map((snap, idx) => this._renderSummaryTile(snap, idx))}
              </div>
            `}

        ${this._renderInlineDrawer(snaps, metrics)}

        ${c.show_footer_strip !== false
          ? html`
              <div class="app-footer-strip">
                <div class="footer-chips">
                  ${snaps.map((s, idx) => {
                    if (s.u.appliance_type === "water_heater" && s.u.recirc_switch) {
                      const on = this._isEntityOn(s.u.recirc_switch);
                      return html`
                        <button
                          type="button"
                          class="footer-chip ${on ? "info" : ""}"
                          @click=${(e) => this._toggleEntity(s.u.recirc_switch, e)}
                        >
                          <ha-icon icon="mdi:refresh" style="--mdc-icon-size:13px;"></ha-icon>
                          <span>${on ? "Stop Recirc" : "HotButton"}</span>
                        </button>
                      `;
                    }
                    if (s.u.appliance_type === "refrigerator" && s.u.hot_water_cancel_switch) {
                      return html`
                        <button
                          type="button"
                          class="footer-chip"
                          @click=${(e) => this._openModal(idx, "secondary", e)}
                        >
                          <ha-icon icon="mdi:coffee-outline" style="--mdc-icon-size:13px;"></ha-icon>
                          <span>K-Cup</span>
                        </button>
                      `;
                    }
                    return "";
                  })}
                </div>
                <button
                  type="button"
                  class="footer-command-link"
                  @click=${(e) => this._openModal(0, "primary", e)}
                >
                  Command Center →
                </button>
              </div>
            `
          : ""}
      </div>
    `;
  }

  _renderConsolidatedHero(snaps, metrics) {
    const prioritySnap = snaps[metrics.priorityIdx] || snaps[0];
    const tone =
      metrics.dangerSnaps.length > 0
        ? "danger"
        : metrics.warnSnaps.length > 0
        ? "warning"
        : metrics.heatSnaps.length > 0
        ? "heat"
        : metrics.activeSnaps.length > 0
        ? "active"
        : "idle";
    const tileCls = this._getTileToneClass(tone);
    const heroIcon =
      metrics.warnSnaps.length > 0
        ? APPLIANCE_META[metrics.warnSnaps[0].u.appliance_type]?.icon || "mdi:alert-outline"
        : metrics.activeSnaps.length > 0
        ? APPLIANCE_META[metrics.activeSnaps[0].u.appliance_type]?.icon || "mdi:fridge-outline"
        : this.config?.icon || "mdi:fridge-outline";

    let priorityChip = "";
    const chipCandidate =
      metrics.warnSnaps[0]?.chips?.[0] ||
      metrics.activeSnaps[0]?.chips?.[0] ||
      snaps.find((s) => s.chips.length > 0)?.chips?.[0] ||
      null;
    if (chipCandidate) {
      priorityChip = html`<span class="zone-inline-chip ${chipCandidate.cls}">${chipCandidate.label}</span>`;
    }

    const fridgeSnap = snaps.find((s) => s.u.appliance_type === "refrigerator");
    let statusText = `All ${snaps.length} nominal`;
    if (metrics.warnSnaps.length > 0) {
      const w0 = metrics.warnSnaps[0];
      statusText = `${w0.u.title} · ${w0.statusSub}`;
    } else if (metrics.activeSnaps.length === 1) {
      const a0 = metrics.activeSnaps[0];
      statusText = `${a0.u.title} · ${a0.statusSub}`;
    } else if (metrics.activeSnaps.length > 1) {
      statusText = `${metrics.activeSnaps.length} active · ${metrics.activeSnaps.map((s) => s.u.title).slice(0, 2).join(", ")}`;
    } else if (fridgeSnap && !fridgeSnap.primaryVal.startsWith("--")) {
      statusText = `All nominal · ${fridgeSnap.primaryVal}`;
    }

    const laundrySnap = metrics.activeSnaps.find((s) => s.u.appliance_type === "laundry" && s.primaryVal !== "Idle");
    const rangeSnap = metrics.activeSnaps.find((s) => s.u.appliance_type === "induction_range");
    const whActiveSnap = metrics.activeSnaps.find((s) => s.u.appliance_type === "water_heater");
    const hoseActiveSnap = metrics.activeSnaps.find((s) => s.u.appliance_type === "smart_hose_timer");

    let rightVal = `${metrics.nominalCount}/${metrics.total}`;
    let rightSub = "Nominal";
    if (laundrySnap) {
      rightVal = laundrySnap.primaryVal;
      rightSub = laundrySnap.primarySub;
    } else if (rangeSnap) {
      rightVal = rangeSnap.primaryVal;
      rightSub = rangeSnap.primarySub;
    } else if (whActiveSnap) {
      const recircOn = whActiveSnap.u.recirc_switch && this._isEntityOn(whActiveSnap.u.recirc_switch);
      rightVal = recircOn ? "Recirc" : whActiveSnap.primaryVal;
      rightSub = recircOn ? "HotButton" : whActiveSnap.primarySub;
    } else if (hoseActiveSnap) {
      rightVal = hoseActiveSnap.primaryVal;
      rightSub = "Watering";
    } else if (metrics.warnSnaps.length > 0) {
      rightVal = `${metrics.warnSnaps.length} Alert${metrics.warnSnaps.length > 1 ? "s" : ""}`;
      rightSub = "Attention";
    } else if (metrics.totalWatts >= 50) {
      rightVal = metrics.totalWatts >= 1000 ? `${(metrics.totalWatts / 1000).toFixed(2)} kW` : `${Math.round(metrics.totalWatts)} W`;
      rightSub = "Total Draw";
    }

    let hairlinePct = 0;
    let hairlineColor = "#22c55e";
    const activeWithProg = metrics.activeSnaps.find((s) => s.progressPct !== null);
    if (activeWithProg) {
      hairlinePct = activeWithProg.progressPct;
      hairlineColor = activeWithProg.tone === "heat" ? "#f97316" : "#0284c7";
    } else if (metrics.dangerSnaps.length > 0) {
      hairlinePct = 100;
      hairlineColor = "#ef4444";
    } else if (metrics.warnSnaps.length > 0) {
      hairlinePct = 100;
      hairlineColor = "#f59e0b";
    } else if (metrics.totalWatts >= 50) {
      hairlinePct = Math.max(8, Math.min(100, Math.round((metrics.totalWatts / 4500) * 100)));
      hairlineColor = metrics.heatSnaps.length > 0 ? "#f97316" : "#0284c7";
    }

    const whUnit = metrics.whSnap?.u;
    const recircOn = whUnit?.recirc_switch ? this._isEntityOn(whUnit.recirc_switch) : false;
    const isDrawerOpen = this._drawerMode !== null;

    return html`
      <div
        class="unit-tile-card hero-summary ${tileCls} ${isDrawerOpen ? "selected" : ""}"
        @click=${() => this._openModal(metrics.priorityIdx, "primary")}
        title="Tap to open Appliance Command Center"
      >
        <div class="hero-zone-header">
          <div class="hero-zone-identity">
            <div class="device-icon-wrap ${tileCls}">
              <ha-icon icon="${heroIcon}" style="--mdc-icon-size:21px;"></ha-icon>
            </div>
            <div class="hero-zone-title-wrap">
              <div class="hero-zone-title-row">
                <h3 class="hero-zone-title">${this.config?.title || "Home Appliances"}</h3>
                ${priorityChip}
              </div>
              <div class="hero-zone-subtitle">
                <span class="sub-truncate">${statusText}</span>
                <span class="summary-sep">•</span>
                <button
                  type="button"
                  class="hero-inline-expand-btn ${isDrawerOpen ? "open" : ""}"
                  @click=${(e) => this._toggleDrawer("all", e)}
                  title="${isDrawerOpen ? "Collapse appliances" : "Expand all appliances"}"
                >
                  <span>${snaps.length} ${snaps.length === 1 ? "Appliance" : "Appliances"}</span>
                  <ha-icon
                    icon="${isDrawerOpen ? "mdi:chevron-up" : "mdi:chevron-down"}"
                    style="--mdc-icon-size:14px;"
                  ></ha-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="hero-zone-primary" @click=${(e) => e.stopPropagation()}>
            <div class="hero-primary-stack">
              <div class="hero-primary-val ${tileCls}">${rightVal}</div>
              <div class="hero-primary-sub">${rightSub}</div>
            </div>

            ${whUnit?.recirc_switch
              ? html`
                  <button
                    type="button"
                    class="icon-circle-btn ${recircOn ? "active" : ""}"
                    @click=${(e) => this._toggleEntity(whUnit.recirc_switch, e)}
                    title="${recircOn ? "Stop HotButton Recirculation" : "Start HotButton Recirculation"}"
                  >
                    <ha-icon icon="mdi:refresh" style="--mdc-icon-size:15px;"></ha-icon>
                  </button>
                `
              : ""}

            <button
              type="button"
              class="icon-circle-btn"
              @click=${(e) => this._openModal(metrics.priorityIdx, "primary", e)}
              title="Open ${prioritySnap?.u?.title || "Appliance"} Command Center"
            >
              <ha-icon icon="mdi:tune-variant" style="--mdc-icon-size:15px;"></ha-icon>
            </button>
          </div>
        </div>

        ${hairlinePct > 0
          ? html`
              <div class="tile-hairline">
                <div class="tile-hairline-fill" style="width:${hairlinePct}%; background:${hairlineColor};"></div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  _renderMinimalStripCard(snaps, metrics) {
    const tone =
      metrics.dangerSnaps.length > 0
        ? "danger"
        : metrics.warnSnaps.length > 0
        ? "warning"
        : metrics.heatSnaps.length > 0
        ? "heat"
        : metrics.activeSnaps.length > 0
        ? "active"
        : "idle";
    const isDrawerOpen = this._drawerMode !== null;
    const pillLabel =
      metrics.warnSnaps.length > 0
        ? `${metrics.warnSnaps.length} Attention`
        : metrics.activeSnaps.length > 0
        ? `${metrics.activeSnaps.length} Active`
        : `All ${snaps.length} Nominal`;
    const whUnit = metrics.whSnap?.u;
    const recircOn = whUnit?.recirc_switch ? this._isEntityOn(whUnit.recirc_switch) : false;

    return html`
      <div class="app-summary-strip minimal-strip ${tone}">
        <div class="summary-strip-left">
          <span class="summary-status-dot ${tone}"></span>
          ${this.config?.title
            ? html`<span class="strip-brand-title">${this.config.title}</span>`
            : ""}
          <button
            type="button"
            class="strip-active-pill ${isDrawerOpen ? "drawer-open" : ""} ${tone}"
            @click=${(e) => this._toggleDrawer("all", e)}
            title="${isDrawerOpen ? "Collapse appliances" : "Expand all appliances"}"
          >
            ${pillLabel} ${isDrawerOpen ? "▴" : "▾"}
          </button>
          ${metrics.totalWatts >= 50
            ? html`
                <span class="summary-sep">•</span>
                <span class="summary-meta-pill">
                  ${metrics.totalWatts >= 1000 ? `${(metrics.totalWatts / 1000).toFixed(2)} kW` : `${Math.round(metrics.totalWatts)} W`}
                </span>
              `
            : ""}
        </div>

        <div class="summary-strip-right">
          ${whUnit?.recirc_switch
            ? html`
                <button
                  type="button"
                  class="icon-circle-btn ${recircOn ? "active" : ""}"
                  @click=${(e) => this._toggleEntity(whUnit.recirc_switch, e)}
                  title="${recircOn ? "Stop Recirculation" : "HotButton Recirculation"}"
                >
                  <ha-icon icon="mdi:refresh" style="--mdc-icon-size:15px;"></ha-icon>
                </button>
              `
            : ""}
          <button
            type="button"
            class="icon-circle-btn"
            @click=${(e) => this._openModal(metrics.priorityIdx, "primary", e)}
            title="Open Appliance Command Center"
          >
            <ha-icon icon="mdi:tune-variant" style="--mdc-icon-size:15px;"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  _renderActiveOnlyUnits(snaps, metrics) {
    const activeItems = snaps
      .map((snap, idx) => ({ snap, idx }))
      .filter(({ snap }) => snap.isActive || snap.tone === "warning" || snap.tone === "danger");

    if (activeItems.length > 0) {
      return html`
        <div class="units-grid-2">
          ${activeItems.map(({ snap, idx }, i) => {
            const spanFull = activeItems.length % 2 === 1 && i === activeItems.length - 1;
            return this._renderCompactGridTile(snap, idx, spanFull);
          })}
        </div>
      `;
    }

    return html`
      <div
        class="active-idle-row"
        @click=${(e) => this._toggleDrawer("all", e)}
        title="Tap to expand all appliances"
      >
        <span>All ${snaps.length} appliances nominal${metrics.totalWatts >= 50 ? ` · ${Math.round(metrics.totalWatts)} W` : ""} — tap to expand</span>
        <ha-icon icon="${this._drawerMode === "all" ? "mdi:chevron-up" : "mdi:chevron-down"}" style="--mdc-icon-size:15px;"></ha-icon>
      </div>
    `;
  }

  _renderTilesGrid(snaps) {
    return html`
      <div class="units-grid-2">
        ${snaps.map((snap, idx) => {
          const spanFull = snaps.length > 1 && snaps.length % 2 === 1 && idx === snaps.length - 1;
          return this._renderCompactGridTile(snap, idx, spanFull);
        })}
      </div>
    `;
  }

  _renderCompactGridTile(snap, idx, spanFull = false) {
    const { u } = snap;
    const tileCls = this._getTileToneClass(snap.tone);
    const isSelected = this._drawerMode === String(idx);
    return html`
      <div
        class="unit-tile-card compact-tile ${tileCls} ${spanFull ? "span-2" : ""} ${isSelected ? "selected" : ""}"
        @click=${() => this._openModal(idx, "primary")}
        title="Tap to open ${u.title} Controls"
      >
        <div class="compact-tile-main">
          <div class="compact-tile-id">
            <div class="model-thumb-box mini">
              ${this._renderApplianceThumbSvg(u.appliance_type, snap, 26)}
            </div>
            <div class="compact-tile-text">
              <div class="compact-tile-title">${u.title}</div>
              <div class="compact-tile-sub">${snap.statusSub}</div>
            </div>
          </div>
          <div class="compact-tile-right">
            <span class="compact-tile-val">${snap.primaryVal}</span>
            <button
              type="button"
              class="icon-mini-btn ${isSelected ? "active" : ""}"
              @click=${(e) => this._toggleDrawer(String(idx), e)}
              title="Quick telemetry drawer"
            >
              <ha-icon icon="${isSelected ? "mdi:chevron-up" : "mdi:chevron-down"}" style="--mdc-icon-size:14px;"></ha-icon>
            </button>
          </div>
        </div>
        ${snap.progressPct !== null
          ? html`
              <div class="tile-hairline">
                <div class="tile-hairline-fill" style="width:${snap.progressPct}%; background:${snap.tone === "heat" ? "#f97316" : "#0284c7"};"></div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  _renderRingsGrid(snaps) {
    const r = 16;
    const c = 2 * Math.PI * r;
    const cols = Math.min(5, Math.max(1, snaps.length));
    return html`
      <div class="appliance-rings-grid" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr));">
        ${snaps.map((snap, idx) => {
          const ring = snap.ringA || snap.ringB || {
            pct: snap.isActive ? 100 : 0,
            val: snap.primaryVal,
            lbl: snap.primarySub,
            color: snap.tone === "heat" ? "#f97316" : snap.tone === "danger" ? "#ef4444" : "#0284c7",
          };
          const clamped = Math.max(0, Math.min(100, ring.pct || 0));
          const dash = (clamped / 100) * c;
          const isSelected = this._drawerMode === String(idx);
          return html`
            <button
              type="button"
              class="ring-tile-btn ${isSelected ? "selected" : ""}"
              @click=${(e) => this._toggleDrawer(String(idx), e)}
              title="Tap for ${snap.u.title} quick drawer"
            >
              <div class="ring-wrap">
                ${svg`
                  <svg class="ring-svg" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="${r}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="3.2"></circle>
                    <circle cx="20" cy="20" r="${r}" fill="none" stroke="${ring.color}" stroke-width="3.2" stroke-linecap="round" stroke-opacity="${clamped > 0 ? 1 : 0}" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"></circle>
                  </svg>
                `}
                <span class="ring-val">${ring.val}</span>
              </div>
              <span class="ring-name">${snap.u.title}</span>
              <span class="ring-sub">${ring.lbl}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  _renderDrawerQuickChip(snap, idx) {
    const u = snap.u;
    if (u.appliance_type === "water_heater" && u.recirc_switch) {
      const on = this._isEntityOn(u.recirc_switch);
      return html`
        <button
          type="button"
          class="quick-chip ${on ? "sky" : ""}"
          @click=${(e) => this._toggleEntity(u.recirc_switch, e)}
        >
          ${on ? "Stop Recirc" : "HotButton"}
        </button>
      `;
    }
    if (u.appliance_type === "smart_hose_timer" && u.valve_entity) {
      const open = this._isEntityOn(u.valve_entity);
      return html`
        <button
          type="button"
          class="quick-chip ${open ? "danger" : "sky"}"
          @click=${(e) => {
            e.stopPropagation();
            this._toggleHoseWatering(u);
          }}
        >
          ${open ? "Stop" : `Water ${this._manualRuntime}m`}
        </button>
      `;
    }
    if (u.appliance_type === "refrigerator" && u.hot_water_cancel_switch) {
      return html`
        <button
          type="button"
          class="quick-chip amber"
          @click=${(e) => this._openModal(idx, "secondary", e)}
        >
          K-Cup
        </button>
      `;
    }
    if (u.appliance_type === "induction_range" && u.oven?.upper_light_entity) {
      const lightOn = String(this._getEntity(u.oven.upper_light_entity).state).toLowerCase() !== "off"
        && this._getEntity(u.oven.upper_light_entity).state !== "unavailable";
      return html`
        <button
          type="button"
          class="quick-chip ${lightOn ? "amber" : ""}"
          @click=${(e) => this._toggleApplianceLight(u.oven.upper_light_entity, e)}
        >
          Light
        </button>
      `;
    }
    if (u.appliance_type === "laundry") {
      return html`
        <button
          type="button"
          class="quick-chip ${snap.isActive ? "sky" : ""}"
          @click=${(e) => this._openModal(idx, "primary", e)}
        >
          Controls
        </button>
      `;
    }
    return "";
  }

  _renderInlineDrawer(snaps, metrics) {
    if (!this._drawerMode) return "";

    if (this._drawerMode === "all") {
      const indexed = snaps.map((snap, idx) => ({ snap, idx })).filter(({ snap }) => {
        if (this._drawerFilter === "active") return snap.isActive;
        if (this._drawerFilter === "alerts") return snap.tone === "warning" || snap.tone === "danger";
        return true;
      });
      return html`
        <div class="appliance-inline-drawer">
          <div class="drawer-header">
            <div class="drawer-title-group">
              <span class="drawer-title">All Appliances (${indexed.length})</span>
              ${[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "alerts", label: "Alerts" },
              ].map(
                (f) => html`
                  <button
                    type="button"
                    class="drawer-filter-btn ${this._drawerFilter === f.id ? "active" : ""}"
                    @click=${() => (this._drawerFilter = f.id)}
                  >
                    ${f.label}
                  </button>
                `
              )}
            </div>
            <div class="drawer-actions">
              <button
                type="button"
                class="drawer-manage-btn"
                @click=${(e) => this._openModal(metrics.priorityIdx, "primary", e)}
              >
                <span>Command Center</span>
                <ha-icon icon="mdi:open-in-new" style="--mdc-icon-size:13px;"></ha-icon>
              </button>
              <button
                type="button"
                class="drawer-close-btn"
                @click=${() => (this._drawerMode = null)}
                title="Close drawer"
              >
                <ha-icon icon="mdi:close" style="--mdc-icon-size:16px;"></ha-icon>
              </button>
            </div>
          </div>

          <div class="drawer-list thin-scroll">
            ${indexed.length === 0
              ? html`<div class="drawer-empty">No matching appliances in this filter.</div>`
              : indexed.map(({ snap, idx }) => {
                  const tileCls = this._getTileToneClass(snap.tone);
                  return html`
                    <div class="drawer-device-row ${tileCls}">
                      <div
                        class="drawer-dev-left clickable"
                        @click=${() => (this._drawerMode = String(idx))}
                        title="Tap for ${snap.u.title} telemetry & quick actions"
                      >
                        <div class="model-thumb-box mini">
                          ${this._renderApplianceThumbSvg(snap.u.appliance_type, snap, 26)}
                        </div>
                        <div class="drawer-dev-text">
                          <div class="drawer-dev-name">
                            <span>${snap.u.title}</span>
                            ${snap.chips[0] ? html`<span class="zone-inline-chip ${snap.chips[0].cls}">${snap.chips[0].label}</span>` : ""}
                          </div>
                          <div class="drawer-dev-sub">
                            ${snap.primaryVal} · ${snap.statusSub}${snap.span.powerText ? ` · ${snap.span.powerText}` : ""}
                          </div>
                        </div>
                      </div>
                      <div class="drawer-dev-actions">
                        ${this._renderDrawerQuickChip(snap, idx)}
                        <button
                          type="button"
                          class="icon-mini-btn"
                          @click=${(e) => this._openModal(idx, "primary", e)}
                          title="Open ${snap.u.title} Command Center"
                        >
                          <ha-icon icon="mdi:tune-variant" style="--mdc-icon-size:14px;"></ha-icon>
                        </button>
                      </div>
                    </div>
                  `;
                })}
          </div>
        </div>
      `;
    }

    const idx = parseInt(this._drawerMode, 10);
    const snap = Number.isFinite(idx) ? snaps[idx] : null;
    if (!snap) return "";

    return html`
      <div class="appliance-inline-drawer">
        <div class="drawer-header">
          <div class="drawer-title-group">
            <div class="model-thumb-box mini">
              ${this._renderApplianceThumbSvg(snap.u.appliance_type, snap, 26)}
            </div>
            <div>
              <div class="drawer-title">${snap.u.title}</div>
              <div class="drawer-sub">${snap.primaryVal} · ${snap.primarySub}</div>
            </div>
          </div>
          <div class="drawer-actions">
            ${snaps.length > 1
              ? html`
                  <button
                    type="button"
                    class="drawer-filter-btn"
                    @click=${() => (this._drawerMode = "all")}
                    title="Back to all appliances"
                  >
                    ← All
                  </button>
                `
              : ""}
            ${this._renderDrawerQuickChip(snap, idx)}
            <button
              type="button"
              class="drawer-manage-btn"
              @click=${(e) => this._openModal(idx, "primary", e)}
            >
              <span>Controls</span>
              <ha-icon icon="mdi:open-in-new" style="--mdc-icon-size:13px;"></ha-icon>
            </button>
            <button
              type="button"
              class="drawer-close-btn"
              @click=${() => (this._drawerMode = null)}
              title="Collapse drawer"
            >
              <ha-icon icon="mdi:close" style="--mdc-icon-size:16px;"></ha-icon>
            </button>
          </div>
        </div>

        ${this._renderSummaryTray(snap.u, snap.span)}
      </div>
    `;
  }

  _renderSummaryTile(snap, idx) {
    const { u, span } = snap;
    const layout = this.config?.layout === "rings" ? "rings" : "hero";
    const trayOpen = Boolean(this._expandedTrays[u._key]);
    const tileCls =
      snap.tone === "heat"
        ? "state-heat"
        : snap.tone === "active"
        ? "state-active"
        : snap.tone === "warning"
        ? "state-warning"
        : snap.tone === "danger"
        ? "state-danger"
        : "";

    return html`
      <div
        class="unit-tile-card ${tileCls}"
        @click=${() => this._openModal(idx, "primary")}
        title="Tap to open ${u.title} Controls"
      >
        <div class="unit-tile-header">
          <div class="unit-tile-identity">
            <div class="model-thumb-box">
              ${this._renderApplianceThumbSvg(u.appliance_type, snap, 36)}
            </div>
            <div class="unit-title-stack">
              <div class="unit-title-row">
                <h3 class="unit-title">${u.title}</h3>
                ${snap.chips.map((ch) => html`<span class="zone-inline-chip ${ch.cls}">${ch.label}</span>`)}
              </div>
              <div class="unit-subtitle-row">
                <span class="sub-truncate">${snap.statusSub}</span>
                <span class="summary-sep">•</span>
                <button
                  type="button"
                  class="inline-tray-btn ${trayOpen ? "open" : ""}"
                  @click=${(e) => {
                    e.stopPropagation();
                    this._fireHaptic("light");
                    this._expandedTrays = {
                      ...this._expandedTrays,
                      [u._key]: !this._expandedTrays[u._key],
                    };
                  }}
                >
                  <span>${span.powerText || "Info"}</span>
                  <ha-icon icon="${trayOpen ? "mdi:chevron-up" : "mdi:chevron-down"}"></ha-icon>
                </button>
              </div>
            </div>
          </div>

          ${layout === "rings" && (snap.ringA || snap.ringB)
            ? html`
                <div class="summary-rings-pair">
                  ${snap.ringA ? this._renderRingMiniGauge(snap.ringA.pct, snap.ringA.val, snap.ringA.lbl, snap.ringA.color) : ""}
                  ${snap.ringB ? this._renderRingMiniGauge(snap.ringB.pct, snap.ringB.val, snap.ringB.lbl, snap.ringB.color) : ""}
                </div>
              `
            : html`
                <div class="unit-primary-right">
                  <div class="unit-primary-val">${snap.primaryVal}</div>
                  <div class="unit-primary-sub">${snap.primarySub}</div>
                </div>
              `}
        </div>

        ${trayOpen ? this._renderSummaryTray(u, span) : ""}

        ${snap.progressPct !== null
          ? html`
              <div class="tile-hairline">
                <div class="tile-hairline-fill" style="width:${snap.progressPct}%; background:${snap.tone === "heat" ? "#f97316" : "#0284c7"};"></div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  _renderSummaryTray(u, span) {
    const cells = [];
    if (span.powerText) cells.push({ label: "Draw", val: span.powerText });
    if (span.amps !== null && span.watts !== null) cells.push({ label: "Current", val: `${span.amps.toFixed(1)} A` });
    if (span.energyKwh !== null) cells.push({ label: "Net Energy", val: `${span.energyKwh.toFixed(1)} kWh` });

    if (u.appliance_type === "refrigerator") {
      cells.push({ label: "Ice Bucket", val: this._getEntity(u.ice_bucket_status).state });
      cells.push({ label: "Water Filter", val: this._getWaterFilterInfo(u).label });
    } else if (u.appliance_type === "induction_range") {
      cells.push({ label: "Upper", val: this._getEntity(u.oven.upper_state_entity).state });
      cells.push({ label: "Lower", val: this._getEntity(u.oven.lower_state_entity).state });
    } else if (u.appliance_type === "laundry") {
      cells.push({ label: "Washer", val: formatTitleCase(this._getEntity(u.washer_status).state) });
      cells.push({ label: "Dryer", val: formatTitleCase(this._getEntity(u.dryer_status).state) });
    } else if (u.appliance_type === "water_heater") {
      const gas = parseFloat(this._getEntity(u.gas_usage_sensor).state);
      const inT = this._getEntity(u.inlet_temp_sensor).state;
      if (!isNaN(gas)) cells.push({ label: "Gas Use", val: `${Math.round(gas).toLocaleString()} BTU/h` });
      if (inT !== "unavailable") cells.push({ label: "Inlet", val: `${inT}°F` });
    } else if (u.appliance_type === "smart_hose_timer") {
      const next = this._getEntity(u.next_watering_sensor).state;
      cells.push({ label: "Next Run", val: next !== "unknown" && next !== "unavailable" ? formatShortTime(next) : "None" });
    }

    return html`
      <div class="unit-telemetry-tray" @click=${(e) => e.stopPropagation()}>
        ${cells.map(
          (cell) => html`
            <div class="telemetry-mini-card">
              <span class="t-mini-label">${cell.label}</span>
              <span class="t-mini-val">${cell.val}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  // =========================================================================
  // FULL GRAPHICAL CHASSIS VIEWS (100% Model-Accurate for All 5 Appliances)
  // =========================================================================

  _renderFullUnit(u, idx) {
    switch (u.appliance_type) {
      case "refrigerator":
        return this._renderFullRefrigerator(u, idx);
      case "induction_range":
        return this._renderFullInductionRange(u, idx);
      case "laundry":
        return this._renderFullLaundry(u, idx);
      case "water_heater":
        return this._renderFullWaterHeater(u, idx);
      case "smart_hose_timer":
        return this._renderFullSmartHose(u, idx);
      default:
        return this._renderFullRefrigerator(u, idx);
    }
  }

  // --- 1. CAFÉ CYE22TP2MIS1 REFRIGERATOR ---
  _renderFullRefrigerator(u, idx) {
    const fTemp = this._getEntity(u.fridge_temp_current);
    const zTemp = this._getEntity(u.freezer_temp_current);
    const hwStatus = this._getEntity(u.hot_water_status);
    const hwFault = this._isEntityOn(u.hot_water_faulted);
    const doorInfo = this._getDoorStatusInfo(u);
    const filterInfo = this._getWaterFilterInfo(u);
    const iceBucket = this._getEntity(u.ice_bucket_status).state;
    const { fSet, zSet } = this._getFridgeSetpoints(u);
    const isHeating = hwStatus.state === "Heating";

    const chipText = doorInfo.isAnyOpen
      ? doorInfo.label.toUpperCase()
      : hwFault
      ? "HOT WATER FAULT"
      : isHeating
      ? "K-CUP HEATING"
      : "NORMAL";
    const chipCls = doorInfo.isAnyOpen || hwFault ? "active-alert" : isHeating ? "active-heat" : "idle";

    return html`
      ${this.config.show_header !== false
        ? html`
            <div class="header">
              <div class="header-left">
                <h1 class="title">
                  <ha-icon icon="mdi:fridge-outline" style="margin-right:8px; color:var(--primary-color);"></ha-icon>
                  ${u.title}
                </h1>
                <p class="subtitle">Café CYE22TP2MIS1 • French-Door & K-Cup</p>
              </div>
              <div class="header-right">
                <div class="status-chip ${chipCls}">${chipText}</div>
              </div>
            </div>
          `
        : ""}

      <div class="card-content">
        <div class="cafe-fridge-shell">
          <div class="fridge-body">
            <!-- Left Door + Keurig K-Cup Bay -->
            <div class="fridge-door fridge-left-door ${doorInfo.left ? "door-open" : ""}">
              <div class="cafe-handle left-handle">
                <span class="copper-cuff top"></span>
                <span class="copper-cuff bottom"></span>
              </div>
              <div class="left-door-content">
                <div
                  class="dispenser ${isHeating ? "heating" : ""}"
                  @click=${() => this._openModal(idx, "secondary")}
                  title="Keurig K-Cup & Hot Water Controls"
                >
                  <div class="dispenser-lcd">
                    <span>${isHeating ? "HEATING" : "K-CUP"}</span>
                  </div>
                  <div class="dispenser-lever"></div>
                </div>
              </div>
            </div>

            <!-- Right Door -->
            <div class="fridge-door fridge-right-door ${doorInfo.right ? "door-open" : ""}" @click=${() => this._openModal(idx, "primary")}>
              <div class="cafe-handle right-handle">
                <span class="copper-cuff top"></span>
                <span class="copper-cuff bottom"></span>
              </div>
              <div class="right-door-content">
                <div class="temp-display">
                  <span class="temp-value">${fTemp.state !== "unavailable" ? fTemp.state : "--"}°</span>
                  <span class="temp-setpoint">Set: ${fSet}°</span>
                </div>
                <div class="cafe-badges-col">
                  <span class="mini-chip ${filterInfo.status === "Good" ? "good" : "warn"}">Filter ${filterInfo.label}</span>
                  ${iceBucket && iceBucket !== "unavailable"
                    ? html`<span class="mini-chip info">Ice ${iceBucket}</span>`
                    : ""}
                </div>
              </div>
            </div>
          </div>

          <div class="fridge-freezer-drawer ${doorInfo.freezer ? "door-open" : ""}" @click=${() => this._openModal(idx, "tertiary")}>
            <div class="cafe-freezer-handle">
              <span class="copper-cuff left"></span>
              <span class="copper-cuff right"></span>
            </div>
            <div class="temp-display horizontal">
              <span class="temp-value">${zTemp.state !== "unavailable" ? zTemp.state : "--"}°</span>
              <span class="temp-setpoint">Freezer Set: ${zSet}°</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 2. CAFÉ CHS950P2M1S1 INDUCTION RANGE ---
  _renderFullInductionRange(u, idx) {
    const ov = u.oven;
    const burners = (u.cooktop?.burners || []).map((b) => ({
      shortLabel: b.shortLabel || "EL",
      label: b.label || "Element",
      status: this._getEntity(b.status_entity),
      power: b.power_entity ? this._getEntity(b.power_entity) : null,
    }));
    const anyBurner = burners.some((b) => this._isEntityOn(b.status.entity_id));
    const uCtrl = this._getEntity(ov.upper_control);
    const lCtrl = this._getEntity(ov.lower_control);
    const uState = this._getEntity(ov.upper_state_entity).state;
    const lState = this._getEntity(ov.lower_state_entity).state;
    const uRaw = this._getEntity(ov.upper_raw_temp).state;
    const lRaw = this._getEntity(ov.lower_raw_temp).state;
    const uLightOn = this._isEntityOn(ov.upper_light_entity);
    const lLightOn = this._isEntityOn(ov.lower_light_entity);
    const isOff = (s) => !s || ["off", "idle", "unavailable", "unknown"].includes(String(s).toLowerCase());
    const uOn = !isOff(uCtrl.state) || !isOff(uState);
    const lOn = !isOff(lCtrl.state) || !isOff(lState);
    const uSet = this._getOvenTargetTemp(ov.upper_control, ov.upper_display_temp, uOn);
    const lSet = this._getOvenTargetTemp(ov.lower_control, ov.lower_display_temp, lOn);
    const isSynced =
      this._isEntityOn(u.cooktop?.sync_entities?.left_front) ||
      this._isEntityOn(u.cooktop?.sync_entities?.left_rear);

    const chipCls = anyBurner || uOn || lOn ? "active-heat" : "idle";
    const chipTxt = anyBurner && (uOn || lOn) ? "RANGE ACTIVE" : anyBurner ? "COOKTOP ON" : uOn || lOn ? "OVEN ON" : "IDLE";
    const screenText = uOn && uSet
      ? `UP ${Math.round(uSet)}°F`
      : lOn && lSet
      ? `LO ${Math.round(lSet)}°F`
      : anyBurner
      ? "COOKTOP"
      : "READY";

    const burnerSvgSpec = [
      { cx: 78, cy: 166, r: 40, tag: "LF" },
      { cx: 78, cy: 58, r: 40, tag: "LR" },
      { cx: 184, cy: 52, r: 29, tag: "WARM", warm: true },
      { cx: 286, cy: 52, r: 34, tag: "RR" },
      { cx: 264, cy: 160, r: 48, tag: "RF", dual: true },
    ];

    return html`
      ${this.config.show_header !== false
        ? html`
            <div class="header">
              <div class="header-left">
                <h1 class="title">
                  <ha-icon icon="mdi:stove" style="margin-right:8px; color:var(--primary-color);"></ha-icon>
                  ${u.title}
                </h1>
                <p class="subtitle">Café CHS950P2M1S1 • Induction & Double Oven</p>
              </div>
              <div class="header-right">
                <div class="status-chip ${chipCls}">${chipTxt}</div>
              </div>
            </div>
          `
        : ""}

      <div class="card-content">
        <div class="graphics-container">
          <!-- 5-Burner Induction Ceramic Glass Top (Fixed Proportional SVG Coordinates) -->
          <div class="cooktop-container">
            ${svg`
              <svg class="cooktop-svg" viewBox="0 0 360 224" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cookGlass-${this._cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#222328" />
                    <stop offset="100%" stop-color="#141519" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="356" height="220" rx="12" fill="url(#cookGlass-${this._cardId})" stroke="rgba(148,163,184,0.22)" stroke-width="1.5" />

                <!-- Symmetric SyncBurners Bridge connecting LR (78,58,r=40) & LF (78,166,r=40) -->
                <g class="sync-bridge ${isSynced ? "synced-on" : ""}">
                  <line x1="58" y1="92.6" x2="58" y2="131.4" stroke="${isSynced ? "#f97316" : "#475569"}" stroke-width="4" stroke-linecap="round" />
                  <line x1="98" y1="92.6" x2="98" y2="131.4" stroke="${isSynced ? "#f97316" : "#475569"}" stroke-width="4" stroke-linecap="round" />
                  <rect x="61" y="104" width="34" height="16" rx="8" fill="#18181b" stroke="${isSynced ? "#f97316" : "#475569"}" stroke-width="1.4" />
                  <text x="78" y="112" text-anchor="middle" dominant-baseline="central" font-size="8.5" font-weight="800" letter-spacing="0.06em" fill="${isSynced ? "#fb923c" : "#94a3b8"}">SYNC</text>
                </g>

                ${burnerSvgSpec.map((spec, bIdx) => {
                  const b = burners[bIdx];
                  if (!b) return "";
                  const isOn = this._isEntityOn(b.status.entity_id);
                  const pwr = b.power ? parseFiniteNum(b.power.state) : null;
                  const valText = isOn ? (pwr !== null ? `${Math.round(pwr)}%` : "On") : "Off";
                  const strokeCol = isOn ? "#f97316" : "#64748b";
                  return svg`
                    <g
                      class="burner-group ${isOn ? "burner-on" : "burner-off"}"
                      @click=${() => this._showMoreInfo(b.status.entity_id)}
                    >
                      <circle
                        cx="${spec.cx}"
                        cy="${spec.cy}"
                        r="${spec.r}"
                        fill="${isOn ? "rgba(249,115,22,0.22)" : "rgba(255,255,255,0.02)"}"
                        stroke="${strokeCol}"
                        stroke-width="${isOn ? 2.6 : 2}"
                      />
                      ${spec.dual
                        ? svg`<circle cx="${spec.cx}" cy="${spec.cy}" r="${Math.round(spec.r * 0.62)}" fill="none" stroke="${strokeCol}" stroke-opacity="0.45" stroke-width="1.4" />`
                        : spec.warm
                        ? svg`<circle cx="${spec.cx}" cy="${spec.cy}" r="${Math.round(spec.r * 0.64)}" fill="none" stroke="${strokeCol}" stroke-opacity="0.38" stroke-dasharray="4 3" stroke-width="1.2" />`
                        : ""}
                      <text x="${spec.cx}" y="${spec.cy - 7}" text-anchor="middle" dominant-baseline="central" font-size="8.5" font-weight="700" letter-spacing="0.06em" fill="${isOn ? "#fdba74" : "#94a3b8"}">${spec.tag}</text>
                      <text x="${spec.cx}" y="${spec.cy + 7}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="800" fill="#f8fafc">${valText}</text>
                    </g>
                  `;
                })}
              </svg>
            `}
          </div>

          <!-- Front Knobs & Upper / Lower Ovens -->
          <div class="oven-container">
            <div class="oven-control-panel">
              ${svg`
                <svg width="100%" height="100%" viewBox="0 0 320 40" preserveAspectRatio="xMidYMid meet">
                  ${[26, 58, 90, 230, 262, 294].map(
                    (kx) => svg`
                      <g>
                        <circle cx="${kx}" cy="20" r="10.5" fill="var(--secondary-background-color, #27272a)" stroke="var(--divider-color, #94a3b8)" stroke-width="2" />
                        <circle cx="${kx}" cy="20" r="5" fill="none" stroke="#b87352" stroke-width="1.4" opacity="0.85" />
                        <line x1="${kx}" y1="10" x2="${kx}" y2="15" stroke="var(--primary-text-color, #f8fafc)" stroke-width="1.8" stroke-linecap="round" />
                      </g>
                    `
                  )}
                  <rect x="110" y="6" width="100" height="28" rx="6" fill="#18181b" stroke="${uOn || lOn ? "#f97316" : "var(--divider-color, #475569)"}" stroke-width="1.3" />
                  <text x="160" y="20" text-anchor="middle" dominant-baseline="central" font-size="10.5" font-weight="800" letter-spacing="0.06em" fill="${uOn || lOn ? "#fb923c" : "#94a3b8"}">${screenText}</text>
                </svg>
              `}
            </div>

            <div class="oven upper-oven ${uOn ? "oven-on" : ""} ${uLightOn ? "light-on" : ""}" @click=${() => this._openModal(idx, "primary")}>
              <div class="oven-handle"><span class="copper-cuff left"></span><span class="copper-cuff right"></span></div>
              <div class="oven-info">
                <span class="oven-state">Upper: ${uState !== "unavailable" ? uState : "Off"}</span>
                <span class="oven-temps">
                  ${uRaw !== "unavailable" ? `${Math.round(parseFloat(uRaw))}°F` : "--"}
                  ${uOn && uSet ? ` → ${Math.round(uSet)}°F` : ""}
                </span>
              </div>
            </div>

            <div class="oven lower-oven ${lOn ? "oven-on" : ""} ${lLightOn ? "light-on" : ""}" @click=${() => this._openModal(idx, "secondary")}>
              <div class="oven-handle"><span class="copper-cuff left"></span><span class="copper-cuff right"></span></div>
              <div class="oven-info">
                <span class="oven-state">Lower: ${lState !== "unavailable" ? lState : "Off"}</span>
                <span class="oven-temps">
                  ${lRaw !== "unavailable" ? `${Math.round(parseFloat(lRaw))}°F` : "--"}
                  ${lOn && lSet ? ` → ${Math.round(lSet)}°F` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3. LG THINQ WASHER & DRYER ---
  _renderFullLaundry(u, idx) {
    const wPower = this._getEntity(u.washer_power);
    const dPower = this._getEntity(u.dryer_power);
    const wStatus = this._getEntity(u.washer_status).state;
    const dStatus = this._getEntity(u.dryer_status).state;
    const isOff = (s) => !s || ["off", "power_off", "idle", "end", "standby", "unavailable", "unknown"].includes(String(s).toLowerCase());
    const wOn = !isOff(wStatus);
    const dOn = !isOff(dStatus);
    const wTime = this._computeLaundryTiming(this._getEntity(u.washer_remaining_time).state, this._getEntity(u.washer_total_time).state, wOn);
    const dTime = this._computeLaundryTiming(this._getEntity(u.dryer_remaining_time).state, this._getEntity(u.dryer_total_time).state, dOn);

    const renderDrumUnit = (label, icon, status, powerEnt, timeInfo, isAct, tabTarget) => {
      const mType = label.toLowerCase();
      const isPwrOff = powerEnt.state === "off" && !isAct;
      return html`
        <div class="appliance-container ${isPwrOff ? "unit-power-off" : ""}" @click=${() => this._openModal(idx, tabTarget)}>
          <div class="graphic-header">
            <div class="appliance-header">
              <ha-icon icon="${icon}"></ha-icon>
              <span class="name">${label}</span>
              ${this._hasEntity(powerEnt.entity_id)
                ? html`<button
                    type="button"
                    class="power-btn-header ${powerEnt.state === "on" ? "on" : "off"}"
                    @click=${(e) => this._toggleEntity(powerEnt.entity_id, e)}
                  >
                    <ha-icon icon="mdi:power"></ha-icon>
                  </button>`
                : ""}
            </div>
            <div class="knob-container">
              <svg class="knob-svg" viewBox="0 0 32 32"><circle class="knob" cx="16" cy="16" r="14" /></svg>
            </div>
            <div class="screen-container">
              <div class="screen">
                <span class="screen-time">${isAct && timeInfo.countdown ? timeInfo.countdown : isAct ? "RUN" : "--:--"}</span>
              </div>
            </div>
          </div>

          <div class="graphic-body">
            <div class="laundry-door">
              <div class="laundry-door-inner ${isAct ? `${mType}-active` : ""}"></div>
              ${isAct
                ? html`<svg class="spinner-svg" viewBox="0 0 100 100"><g class="spinner"><circle class="spinner-arc ${mType}-active" cx="50" cy="50" r="45"></circle></g></svg>`
                : ""}
              <div class="door-info">
                <span class="door-state">${isPwrOff ? "Power Off" : formatTitleCase(status)}</span>
                ${isAct && timeInfo.eta ? html`<span class="door-eta">ETA ${timeInfo.eta}</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    return html`
      ${this.config.show_header !== false
        ? html`
            <div class="header">
              <div class="header-left">
                <h1 class="title">
                  <ha-icon icon="mdi:washing-machine" style="margin-right:8px; color:var(--primary-color);"></ha-icon>
                  ${u.title}
                </h1>
                <p class="subtitle">LG ThinQ Washer & Dryer</p>
              </div>
              <div class="header-right">
                <div class="status-chip ${wOn || dOn ? "active-washer" : "idle"}">
                  ${wOn && dOn ? "RUNNING" : wOn ? "WASHING" : dOn ? "DRYING" : "IDLE"}
                </div>
              </div>
            </div>
          `
        : ""}

      <div class="card-content">
        <div class="laundry-pair ${u.laundry_layout}">
          ${renderDrumUnit("Washer", "mdi:washing-machine", wStatus, wPower, wTime, wOn, "primary")}
          ${renderDrumUnit("Dryer", "mdi:tumble-dryer", dStatus, dPower, dTime, dOn, "secondary")}
        </div>
      </div>
    `;
  }

  // --- 4. NAVIEN NPE-240A2 WATER HEATER ---
  _renderFullWaterHeater(u, idx) {
    const mainObj = this._getEntity(u.entity);
    const powerObj = this._getEntity(u.power_entity);
    const flow = parseFloat(this._getEntity(u.flow_rate_sensor).state) || 0;
    const gas = parseFloat(this._getEntity(u.gas_usage_sensor).state) || 0;
    const modPct = parseFloat(this._getEntity(u.heating_power_sensor).state) || 0;
    const inlet = this._getEntity(u.inlet_temp_sensor);
    const outlet = this._getEntity(u.outlet_temp_sensor);
    const recirc = this._getEntity(u.recirc_switch);
    const lastRun = this._getEntity(u.recirc_last_run);
    const lastDur = this._getEntity(u.recirc_duration);
    const errCode = parseInt(this._getEntity(u.error_code).state, 10);

    const isHeating = modPct > 0 || flow > 0;
    const isRecirc = recirc.state === "on";
    const isWorking = isHeating || isRecirc || gas > 0;
    const isPwrOff = powerObj.state === "off" && !isWorking;
    const targetTemp = parseFloat(mainObj.attributes?.temperature) || 125;

    const recircSub =
      lastRun.state !== "unavailable" && lastRun.state !== "unknown"
        ? `• ${formatRelativeTime(lastRun.state)}${lastDur.state !== "unavailable" ? ` (${lastDur.state})` : ""}`
        : "• Ready";

    const recircGradId = `recircGrad-${this._cardId}-${idx}`;
    const heatGradId = `heatGrad-${this._cardId}-${idx}`;

    return html`
      ${this.config.show_header !== false
        ? html`
            <div class="header">
              <div class="header-left">
                <h1 class="title">
                  <ha-icon icon="mdi:water-boiler" style="margin-right:8px; color:var(--primary-color);"></ha-icon>
                  ${u.title}
                </h1>
                <p class="subtitle">Navien NPE-240A2${!isNaN(errCode) && errCode === 0 ? " • Code 0 OK" : ""}</p>
              </div>
              <div class="header-right">
                ${this._hasEntity(u.power_entity)
                  ? html`<button
                      type="button"
                      class="power-btn-header ${powerObj.state === "on" ? "on" : "off"}"
                      @click=${(e) => this._toggleEntity(u.power_entity, e)}
                    >
                      <ha-icon icon="mdi:power"></ha-icon>
                    </button>`
                  : ""}
                <button type="button" class="strip-circle-btn" @click=${() => this._openModal(idx, "tertiary")} title="Flush Guide">
                  <ha-icon icon="mdi:wrench-outline" style="--mdc-icon-size:15px;"></ha-icon>
                </button>
                <div class="status-chip ${isPwrOff ? "power-off" : isHeating ? "heating" : isRecirc ? "active-washer" : "idle"}">
                  ${isPwrOff ? "POWER OFF" : isHeating ? "HEATING" : isRecirc ? "RECIRCULATING" : "IDLE"}
                </div>
              </div>
            </div>
          `
        : ""}

      <div class="card-content ${isPwrOff ? "power-off-card" : ""}">
        <div class="viz-container">
          <svg viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="${recircGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--error-color, #e53e3e)" />
                <stop offset="100%" style="stop-color:var(--info-color, #3182ce)" />
              </linearGradient>
              <radialGradient id="${heatGradId}" cx="50%" cy="50%" r="50%">
                <stop offset="40%" style="stop-color:#334155" />
                <stop offset="100%" style="stop-color:#f97316" />
              </radialGradient>
            </defs>

            <rect
              x="80" y="18" width="140" height="214" rx="12"
              fill="${isHeating ? `url(#${heatGradId})` : "var(--ha-card-background, #fff)"}"
              stroke="${isHeating ? "#f97316" : "var(--divider-color)"}"
              stroke-width="${isHeating ? 3 : 2}"
            />
            <rect x="92" y="198" width="116" height="20" rx="4" fill="#27272a" opacity="0.16" />
            <text x="150" y="212" font-size="11" text-anchor="middle" fill="${isHeating ? "#fff" : "var(--primary-text-color)"}" font-weight="bold">NAVIEN NPE-240A2</text>

            <path d="M260,58 L260,205 L220,205" stroke="url(#${recircGradId})" stroke-width="6" fill="none" stroke-linejoin="round" />
            <path d="M260,58 L260,205 L220,205" stroke="rgba(255,255,255,0.8)" stroke-width="3" stroke-dasharray="6,6" fill="none" class="flow-anim ${isRecirc ? "flowing" : ""}" />
            <path d="M0,175 L80,175" stroke="#0284c7" stroke-width="8" fill="none" />
            <path d="M0,175 L80,175" stroke="rgba(255,255,255,0.75)" stroke-width="4" stroke-dasharray="8,8" fill="none" class="flow-anim ${isHeating || isRecirc ? "flowing" : ""}" />
            <path d="M220,58 L300,58" stroke="#ef4444" stroke-width="8" fill="none" />
            <path d="M220,58 L300,58" stroke="rgba(255,255,255,0.75)" stroke-width="4" stroke-dasharray="8,8" fill="none" class="flow-anim ${isHeating || isRecirc ? "flowing" : ""}" />
          </svg>

          <div class="box-controls">
            <button type="button" class="temp-btn up" @click=${() => this._changeWaterHeaterTemp(u.entity, targetTemp + 1)}>
              <ha-icon icon="mdi:arrow-up"></ha-icon>
            </button>
            <div class="temp-display" @click=${() => this._openModal(idx, "primary")}>
              <span class="temp-val" style="color:${isHeating ? "#fff" : "var(--primary-text-color)"}">${Math.round(targetTemp)}°</span>
              <span class="temp-label">SETPOINT</span>
            </div>
            <button type="button" class="temp-btn down" @click=${() => this._changeWaterHeaterTemp(u.entity, targetTemp - 1)}>
              <ha-icon icon="mdi:arrow-down"></ha-icon>
            </button>
          </div>

          <div class="overlay-stat outlet" style="right:8px; top:34px;" @click=${() => this._showMoreInfo(u.outlet_temp_sensor)}>
            <span>${outlet.state !== "unavailable" ? `${outlet.state}°F` : "--"}</span>
            <span class="label">Outlet</span>
          </div>
          <div class="overlay-stat inlet" style="left:8px; top:146px;" @click=${() => this._showMoreInfo(u.inlet_temp_sensor)}>
            <span>${inlet.state !== "unavailable" ? `${inlet.state}°F` : "--"}</span>
            <span class="label">Inlet</span>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-inline" @click=${() => this._showMoreInfo(u.flow_rate_sensor)}>
            <div class="stat-inline-header"><ha-icon icon="mdi:water-pump"></ha-icon><span>${flow.toFixed(1)} GPM</span></div>
            <div class="progress-bar-bg"><div style="width:${Math.min(100, (flow / 8) * 100)}%; background:#0284c7;"></div></div>
          </div>
          <div class="stat-inline" @click=${() => this._showMoreInfo(u.gas_usage_sensor)}>
            <div class="stat-inline-header"><ha-icon icon="mdi:fire"></ha-icon><span>${Math.round(gas).toLocaleString()} BTU/h · ${Math.round(modPct)}%</span></div>
            <div class="progress-bar-bg"><div style="width:${Math.min(100, modPct)}%; background:#f97316;"></div></div>
          </div>
        </div>

        <div class="controls-container">
          <button
            type="button"
            class="recirc-button ${isRecirc ? "active" : ""}"
            @click=${() => this._toggleEntity(u.recirc_switch)}
          >
            <ha-icon icon="mdi:refresh"></ha-icon>
            <span class="button-content">
              <span class="main-label">${isRecirc ? "STOP RECIRCULATION" : "START RECIRCULATION"}</span>
              <span class="sub-label">${recircSub}</span>
            </span>
          </button>
          <button
            type="button"
            class="settings-btn ${this._showRecircSettings ? "active" : ""}"
            @click=${() => {
              this._showRecircSettings = !this._showRecircSettings;
              if (this._showRecircSettings && u.recirc_switch) this._fetchRecircHistory(u.recirc_switch);
            }}
          >
            <ha-icon icon="mdi:cog"></ha-icon>
          </button>
        </div>

        ${this._showRecircSettings ? this._renderRecircDrawer(u) : ""}
      </div>
    `;
  }

  _renderRecircDrawer(u) {
    const intervalObj = u.recirc_interval ? this._getEntity(u.recirc_interval) : null;
    const intervalVal = intervalObj && !isNaN(parseFloat(intervalObj.state)) ? Math.round(parseFloat(intervalObj.state)) : null;
    const cooldownObj = u.recirc_cooldown ? this._getEntity(u.recirc_cooldown) : null;

    return html`
      <div class="settings-drawer">
        ${intervalVal !== null
          ? html`
              <div class="drawer-row">
                <span>Recirc Interval</span>
                <div class="step-controller-pill">
                  <button class="pill-btn" @click=${() => this._setNumberValue(u.recirc_interval, Math.max(5, intervalVal - 5))}>
                    <ha-icon icon="mdi:minus"></ha-icon>
                  </button>
                  <span class="pill-value">${intervalVal} min</span>
                  <button class="pill-btn" @click=${() => this._setNumberValue(u.recirc_interval, Math.min(120, intervalVal + 5))}>
                    <ha-icon icon="mdi:plus"></ha-icon>
                  </button>
                </div>
              </div>
            `
          : ""}
        ${cooldownObj && cooldownObj.state === "active"
          ? html`
              <div class="drawer-row">
                <span>Recirc Cooldown</span>
                <strong class="tone-warn">Cooldown Active</strong>
              </div>
            `
          : ""}

        <div class="timeline-label">LAST 24 HOURS RECIRCULATION</div>
        <div class="timeline-track">
          ${this._renderRealTimelineBarcode(u.recirc_switch)}
        </div>
        <div class="timeline-axis">
          <span>24h ago</span>
          <span>12h ago</span>
          <span>Now</span>
        </div>
        <div class="segment-info">${this._selectedSegmentText}</div>
      </div>
    `;
  }

  _renderRealTimelineBarcode(entityId) {
    const data = this._historyCache[entityId];
    if (!Array.isArray(data) || data.length === 0) {
      return html`<div class="timeline-empty">No recirculation events recorded in the last 24h</div>`;
    }
    const nowMs = Date.now();
    const totalMs = 24 * 60 * 60 * 1000;
    const startMs = nowMs - totalMs;
    const sorted = [...data].sort((a, b) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());
    const segments = [];
    let lastTime = startMs;
    let lastState = sorted[0].state === "on" ? "off" : "on";

    sorted.forEach((item) => {
      const t = new Date(item.last_changed).getTime();
      if (t > lastTime) {
        const dur = t - lastTime;
        const mins = Math.max(1, Math.round(dur / 60000));
        segments.push({
          width: (dur / totalMs) * 100,
          active: lastState === "on",
          text: `${lastState === "on" ? "Active" : "Idle"}: ${formatShortTime(new Date(lastTime))} - ${formatShortTime(new Date(t))} (${mins}m)`,
        });
      }
      lastState = item.state;
      lastTime = t;
    });
    if (lastTime < nowMs) {
      const dur = nowMs - lastTime;
      const mins = Math.max(1, Math.round(dur / 60000));
      segments.push({
        width: (dur / totalMs) * 100,
        active: lastState === "on",
        text: `${lastState === "on" ? "Active" : "Idle"}: ${formatShortTime(new Date(lastTime))} - Now (${mins}m)`,
      });
    }
    return segments.map(
      (s) => html`
        <div
          class="timeline-segment"
          style="width:${s.width}%; background:${s.active ? "var(--primary-color, #3b82f6)" : "transparent"};"
          title="${s.text}"
          @click=${() => (this._selectedSegmentText = s.text)}
        ></div>
      `
    );
  }

  // --- 5. ORBIT B-HYVE HT25-0000 SMART HOSE TIMER ---
  _renderFullSmartHose(u, idx) {
    const valve = this._getEntity(u.valve_entity);
    const stateSens = this._getEntity(u.state_sensor);
    const hist = this._getEntity(u.history_sensor);
    const bat = this._getEntity(u.battery_sensor);
    const nextW = this._getEntity(u.next_watering_sensor);
    const fault = this._isEntityOn(u.fault_sensor);
    const smartW = this._getEntity(u.smart_watering_switch);
    const rainD = this._getEntity(u.rain_delay_switch);
    const isOpen = valve.state === "open" || valve.state === "on";

    const currentRuntime = valve.attributes?.current_runtime ? Math.floor(valve.attributes.current_runtime / 60) : 0;
    const maxVal = 120;
    const currentVal = isOpen ? Math.min(maxVal, currentRuntime) : this._manualRuntime;
    const pct = currentVal / maxVal;
    const r = 40;
    const circ = 2 * Math.PI * r;
    const dash = `${pct * circ} ${circ}`;
    const rad = pct * 2 * Math.PI - Math.PI / 2;
    const kx = 50 + r * Math.cos(rad);
    const ky = 50 + r * Math.sin(rad);

    const lastRunTxt = hist.attributes?.run_time ? `${Math.round(parseFloat(hist.attributes.run_time))} min` : null;
    const lastGalTxt = hist.attributes?.consumption_gallons !== undefined ? `${hist.attributes.consumption_gallons} gal` : null;
    const lastDateTxt = hist.state && hist.state !== "unavailable" ? formatShortDate(hist.state) : "--";

    return html`
      ${this.config.show_header !== false
        ? html`
            <div class="header">
              <div class="header-left">
                <h1 class="title">
                  <ha-icon icon="${isOpen ? "mdi:sprinkler" : "mdi:sprinkler-variant"}" style="margin-right:8px; color:var(--primary-color);"></ha-icon>
                  ${u.title}
                </h1>
                <p class="subtitle">Orbit B-hyve HT25-0000 • ${stateSens.state !== "unavailable" ? formatTitleCase(stateSens.state) : "Auto"}</p>
              </div>
              <div class="header-right">
                ${bat.state !== "unavailable"
                  ? html`<div class="status-chip ${parseInt(bat.state, 10) < 20 ? "power-off" : "idle"}">
                      <ha-icon icon="mdi:battery" style="--mdc-icon-size:14px;"></ha-icon>
                      <span>${bat.state}%</span>
                    </div>`
                  : ""}
                <div class="status-chip ${fault ? "active-alert" : isOpen ? "active-washer" : "idle"}">
                  ${fault ? "FAULT" : isOpen ? "WATERING" : "IDLE"}
                </div>
              </div>
            </div>
          `
        : ""}

      <div class="card-content">
        <div class="ring-container">
          <div class="ring-slider" @pointerdown=${this._startHoseDrag} @pointermove=${this._onHoseDrag} @pointerup=${this._endHoseDrag}>
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--divider-color, rgba(128,128,128,0.2))" stroke-width="6"></circle>
              <circle cx="50" cy="50" r="${r}" fill="none" stroke="${isOpen ? "#0284c7" : "#16a34a"}" stroke-width="6" stroke-dasharray="${dash}" stroke-linecap="round" transform="rotate(-90 50 50)"></circle>
              ${!isOpen ? html`<circle cx="${kx}" cy="${ky}" r="5" fill="#fff" stroke="#16a34a" stroke-width="2"></circle>` : ""}
            </svg>
            <div class="ring-content">
              <span class="ring-value">${currentVal}</span>
              <span class="ring-label">MIN</span>
            </div>
          </div>
        </div>

        <div class="controls-container">
          <button type="button" class="recirc-button ${isOpen ? "active" : ""}" @click=${() => this._toggleHoseWatering(u)}>
            <ha-icon icon="${isOpen ? "mdi:water-off" : "mdi:water"}"></ha-icon>
            <span class="button-content">
              <span class="main-label">${isOpen ? "STOP WATERING" : "START WATERING"}</span>
              <span class="sub-label">${isOpen ? `• ${currentRuntime} min elapsed` : `• ${this._manualRuntime} min manual run`}</span>
            </span>
          </button>
          <button type="button" class="settings-btn ${this._showHoseSettings ? "active" : ""}" @click=${() => (this._showHoseSettings = !this._showHoseSettings)}>
            <ha-icon icon="mdi:cog"></ha-icon>
          </button>
        </div>

        ${this._showHoseSettings
          ? html`
              <div class="settings-drawer">
                ${smartW.state !== "unavailable"
                  ? html`<div class="drawer-row">
                      <span>Smart Watering</span>
                      <button class="switch-pill ${smartW.state === "on" ? "active" : ""}" @click=${() => this._toggleEntity(u.smart_watering_switch)}>
                        ${smartW.state === "on" ? "ON" : "OFF"}
                      </button>
                    </div>`
                  : ""}
                ${rainD.state !== "unavailable"
                  ? html`<div class="drawer-row">
                      <span>Rain Delay</span>
                      <button class="switch-pill ${rainD.state === "on" ? "active" : ""}" @click=${() => this._toggleEntity(u.rain_delay_switch)}>
                        ${rainD.state === "on" ? "ON" : "OFF"}
                      </button>
                    </div>`
                  : ""}
              </div>
            `
          : ""}

        <div class="stats-row">
          <div class="stat-pill-box" @click=${() => this._showMoreInfo(u.next_watering_sensor)}>
            <span class="stat-pill-lbl">Next Scheduled</span>
            <strong>${nextW.state !== "unavailable" && nextW.state !== "unknown" ? formatShortTime(nextW.state) : "None Scheduled"}</strong>
          </div>
          <div class="stat-pill-box" @click=${() => this._showMoreInfo(u.history_sensor)}>
            <span class="stat-pill-lbl">Last Run (${lastDateTxt})</span>
            <strong>${lastRunTxt && lastGalTxt ? `${lastRunTxt} • ${lastGalTxt}` : lastDateTxt}</strong>
          </div>
        </div>
      </div>
    `;
  }

  _startHoseDrag(e) {
    this._isDragging = true;
    this.shadowRoot?.querySelector(".ring-slider")?.setPointerCapture(e.pointerId);
    this._updateHoseRing(e);
  }
  _onHoseDrag(e) {
    if (this._isDragging) this._updateHoseRing(e);
  }
  _endHoseDrag(e) {
    this._isDragging = false;
    this.shadowRoot?.querySelector(".ring-slider")?.releasePointerCapture(e.pointerId);
  }
  _updateHoseRing(e) {
    const slider = this.shadowRoot?.querySelector(".ring-slider");
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    let angle = (Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    this._manualRuntime = Math.max(1, Math.min(120, Math.round((angle / 360) * 120)));
  }

  _toggleHoseWatering(u) {
    this._fireHaptic("medium");
    const valve = this._getEntity(u.valve_entity);
    const isOpen = valve.state === "open" || valve.state === "on";
    if (isOpen) {
      this.hass.callService("valve", "close_valve", { entity_id: u.valve_entity });
      this._showToast("Closing Pool Zone Valve");
    } else if (this.hass.services?.bhyve?.start_watering) {
      this.hass.callService("bhyve", "start_watering", {
        entity_id: u.valve_entity,
        minutes: this._manualRuntime,
      });
      this._showToast(`Starting ${this._manualRuntime}m watering`);
    } else {
      this.hass.callService("valve", "open_valve", { entity_id: u.valve_entity });
      this._showToast("Opening Pool Zone Valve");
    }
  }

  // =========================================================================
  // COMMAND CENTER POPUP (3 Tabs per Appliance + Unit Switcher)
  // =========================================================================

  _getModalTabsForType(type) {
    if (type === "refrigerator") {
      return [
        { id: "primary", label: "Cooling", icon: "mdi:fridge-outline" },
        { id: "secondary", label: "K-Cup & Ice", icon: "mdi:coffee-outline" },
        { id: "tertiary", label: "Freezer & Filter", icon: "mdi:snowflake" },
      ];
    }
    if (type === "induction_range") {
      return [
        { id: "primary", label: "Upper Oven", icon: "mdi:stove" },
        { id: "secondary", label: "Lower Oven", icon: "mdi:stove" },
        { id: "tertiary", label: "Cooktop & Power", icon: "mdi:flash-outline" },
      ];
    }
    if (type === "laundry") {
      return [
        { id: "primary", label: "Washer", icon: "mdi:washing-machine" },
        { id: "secondary", label: "Dryer", icon: "mdi:tumble-dryer" },
        { id: "tertiary", label: "Care & Power", icon: "mdi:heart-pulse" },
      ];
    }
    if (type === "water_heater") {
      return [
        { id: "primary", label: "Controls", icon: "mdi:water-boiler" },
        { id: "secondary", label: "HotButton", icon: "mdi:refresh" },
        { id: "tertiary", label: "Flush Guide", icon: "mdi:wrench-outline" },
      ];
    }
    return [
      { id: "primary", label: "Watering", icon: "mdi:sprinkler-variant" },
      { id: "secondary", label: "Modes", icon: "mdi:tune" },
      { id: "tertiary", label: "History", icon: "mdi:history" },
    ];
  }

  _renderCommandCenterModal(units) {
    if (!this._modalOpen) return "";
    const u = units[this._activeUnitIdx] || units[0];
    if (!u) return "";
    const snap = this._getUnitSnapshot(u);
    const tabs = this._getModalTabsForType(u.appliance_type);

    return html`
      <div
        class="popup-overlay"
        @click=${(ev) => {
          if (ev.target === ev.currentTarget) this._closeModal();
        }}
      >
        <div
          class="popup-content"
          @click=${(ev) => ev.stopPropagation()}
          @touchstart=${this._handleTouchStart}
          @touchmove=${this._handleTouchMove}
          @touchend=${this._handleTouchEnd}
        >
          <div class="drag-handle"></div>
          <div class="toast ${this._toastMsg ? "show" : ""}">
            <ha-icon icon="mdi:check-circle" style="--mdc-icon-size:16px;"></ha-icon>
            <span>${this._toastMsg}</span>
          </div>

          <div class="popup-header">
            <div class="popup-header-left">
              <div class="model-thumb-box compact">
                ${this._renderApplianceThumbSvg(u.appliance_type, snap, 30)}
              </div>
              <div class="popup-title-stack">
                <h3>${u.title}</h3>
                <div class="popup-header-sub">${snap.primaryVal} • ${snap.statusSub}</div>
              </div>
            </div>
            <button type="button" class="close-button" @click=${() => this._closeModal()}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>

          ${units.length > 1
            ? html`
                <div class="unit-select-bar">
                  <ha-icon icon="${APPLIANCE_META[u.appliance_type]?.icon || "mdi:home-automation"}" style="--mdc-icon-size:18px; color:var(--primary-color);"></ha-icon>
                  <div class="select-wrap full">
                    <select
                      class="passable-select"
                      aria-label="Select appliance"
                      .value=${String(this._activeUnitIdx)}
                      @change=${(e) => {
                        const nextIdx = parseInt(e.target.value, 10) || 0;
                        this._activeUnitIdx = nextIdx;
                        this._activeTab = "primary";
                        const item = units[nextIdx];
                        if (item?.appliance_type === "water_heater" && item.recirc_switch) {
                          this._fetchRecircHistory(item.recirc_switch);
                        }
                      }}
                    >
                      ${units.map((item, i) => html`<option value="${String(i)}">${item.title}</option>`)}
                    </select>
                    <ha-icon icon="mdi:chevron-down" class="select-chevron"></ha-icon>
                  </div>
                </div>
              `
            : ""}

          <div class="popup-tabs">
            ${tabs.map(
              (t) => html`
                <button
                  type="button"
                  class="popup-tab ${this._activeTab === t.id ? "active-tab" : ""}"
                  @click=${() => (this._activeTab = t.id)}
                >
                  <ha-icon icon="${t.icon}"></ha-icon>
                  <span>${t.label}</span>
                </button>
              `
            )}
          </div>

          <div class="modal-scroll-area thin-scroll">
            ${this._renderModalBody(u, snap)}
          </div>
        </div>
      </div>
    `;
  }

  _renderModalBody(u, snap) {
    const t = u.appliance_type;
    if (t === "refrigerator") return this._renderFridgeModalTab(u);
    if (t === "induction_range") return this._renderOvenModalTab(u, snap);
    if (t === "laundry") return this._renderLaundryModalTab(u, snap);
    if (t === "water_heater") return this._renderWaterHeaterModalTab(u);
    return this._renderHoseModalTab(u);
  }

  _renderSelectRow({ label, icon = "mdi:tune", value, options = [], onChange, formatOpt = null, actionPill = null }) {
    const cleanOpts = (options || []).filter((o) => {
      const low = String(o).toLowerCase();
      return (low !== "unknown" && low !== "unavailable") || String(o) === String(value);
    });
    if (cleanOpts.length === 0) return "";
    return html`
      <div class="passable-select-row">
        <div class="select-row-label">
          <ha-icon icon="${icon}" style="--mdc-icon-size:17px; color:var(--primary-color);"></ha-icon>
          <span>${label}</span>
        </div>
        <div class="select-row-controls">
          ${actionPill
            ? html`
                <button type="button" class="switch-pill ${actionPill.active ? "active" : ""}" @click=${actionPill.onClick}>
                  ${actionPill.label}
                </button>
              `
            : ""}
          <div class="select-wrap">
            <select
              class="passable-select"
              aria-label="${label}"
              .value=${String(value ?? cleanOpts[0])}
              @change=${(e) => onChange(e.target.value)}
            >
              ${cleanOpts.map(
                (opt) => html`<option value="${opt}" ?selected=${String(opt).toLowerCase() === String(value).toLowerCase()}>${formatOpt ? formatOpt(opt) : formatTitleCase(opt)}</option>`
              )}
            </select>
            <ha-icon icon="mdi:chevron-down" class="select-chevron"></ha-icon>
          </div>
        </div>
      </div>
    `;
  }

  _renderTempStepperCard({
    title,
    entityId,
    currentTemp,
    min,
    max,
    step = 1,
    presets = [],
    modeConfig = null,
    allowZeroOrNegative = false,
    stagingDefault = null,
    offDisplay = null,
    explicitTarget = undefined,
  }) {
    const resolvedTarget =
      explicitTarget !== undefined
        ? explicitTarget
        : this._getTargetTemp(entityId, stagingDefault ?? min, { allowZeroOrNegative });
    const hasActiveTarget = resolvedTarget !== null && resolvedTarget !== undefined && !isNaN(resolvedTarget);
    const isHeating = modeConfig && String(modeConfig.currentMode).toLowerCase() !== "off";
    const tempOpts = { allowZeroOrNegative, stagingDefault };
    const offOpt = modeConfig?.options?.find((o) => String(o).toLowerCase() === "off");

    return html`
      <div class="passable-section-card">
        <div class="passable-section-header">
          <span class="passable-section-title">${title}</span>
          ${currentTemp !== null && !isNaN(currentTemp)
            ? html`<span class="zone-inline-chip info">Now ${Math.round(currentTemp)}°F</span>`
            : ""}
        </div>

        ${modeConfig && modeConfig.options?.length > 0
          ? this._renderSelectRow({
              label: modeConfig.label || "Mode",
              icon: modeConfig.icon || "mdi:tune",
              value: modeConfig.currentMode,
              options: modeConfig.options,
              onChange: (opt) => modeConfig.onModeChange(opt),
              actionPill:
                offOpt && isHeating
                  ? { label: "Off", active: false, onClick: () => modeConfig.onModeChange(offOpt) }
                  : null,
            })
          : ""}

        <div class="temp-dial-row">
          <button
            class="temp-stepper-btn"
            @mousedown=${() => this._startHold(entityId, -step, min, max, tempOpts)}
            @touchstart=${() => this._startHold(entityId, -step, min, max, tempOpts)}
            @mouseup=${() => this._stopHold(entityId)}
            @touchend=${() => this._stopHold(entityId)}
            @click=${() => !this._wasHolding && this._adjustTemp(entityId, -step, min, max, tempOpts)}
          >
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <div class="temp-dial-center">
            <span class="temp-main-number">${hasActiveTarget ? `${Math.round(resolvedTarget)}°` : (offDisplay || "Off")}</span>
            <span class="temp-main-caption">${hasActiveTarget ? (isHeating ? modeConfig.currentMode : "SETPOINT") : (offDisplay ? "STANDBY" : "OFF")}</span>
          </div>
          <button
            class="temp-stepper-btn"
            @mousedown=${() => this._startHold(entityId, step, min, max, tempOpts)}
            @touchstart=${() => this._startHold(entityId, step, min, max, tempOpts)}
            @mouseup=${() => this._stopHold(entityId)}
            @touchend=${() => this._stopHold(entityId)}
            @click=${() => !this._wasHolding && this._adjustTemp(entityId, step, min, max, tempOpts)}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>

        ${presets.length > 0
          ? html`
              <div class="preset-grid-3">
                ${presets.map(
                  (p) => html`
                    <button
                      class="opt-chip ${hasActiveTarget && Math.round(resolvedTarget) === p.temp ? "active" : ""}"
                      @click=${() => this._setTemperature(entityId, p.temp, min, max)}
                    >
                      ${p.label} (${p.temp}°)
                    </button>
                  `
                )}
              </div>
            `
          : ""}
      </div>
    `;
  }

  _renderFridgeModalTab(u) {
    const { fSet, zSet } = this._getFridgeSetpoints(u);
    if (this._activeTab === "primary") {
      const fCur = parseFiniteNum(this._getEntity(u.fridge_temp_current).state);
      const minF = parseFiniteNum(this._getEntity(u.fridge_min_entity).state, 34);
      const maxF = parseFiniteNum(this._getEntity(u.fridge_max_entity).state, 42);
      const doorInfo = this._getDoorStatusInfo(u);
      return html`
        ${this._renderTempStepperCard({
          title: "Fresh Food Compartment",
          entityId: u.fridge_control,
          currentTemp: fCur,
          min: minF,
          max: maxF,
          explicitTarget: fSet,
          presets: [
            { label: "Coldest", temp: minF },
            { label: "Rec.", temp: 37 },
            { label: "Eco", temp: maxF },
          ],
        })}
        <div class="passable-section-card">
          <div class="passable-section-header"><span class="passable-section-title">Cooling & Door Status</span></div>
          <div class="drawer-row"><span>Doors</span><strong class="${doorInfo.isAnyOpen ? "tone-warn" : "tone-good"}">${doorInfo.label}</strong></div>
          ${this._hasEntity(u.turbo_cool_switch)
            ? html`<div class="drawer-row"><span>Turbo Cool</span><button class="switch-pill ${this._isEntityOn(u.turbo_cool_switch) ? "active" : ""}" @click=${() => this._toggleEntity(u.turbo_cool_switch)}>${this._isEntityOn(u.turbo_cool_switch) ? "ON" : "OFF"}</button></div>`
            : ""}
          ${this._hasEntity(u.sabbath_mode_switch)
            ? html`<div class="drawer-row"><span>Sabbath Mode</span><button class="switch-pill ${this._isEntityOn(u.sabbath_mode_switch) ? "active" : ""}" @click=${() => this._toggleEntity(u.sabbath_mode_switch)}>${this._isEntityOn(u.sabbath_mode_switch) ? "ON" : "OFF"}</button></div>`
            : ""}
        </div>
      `;
    }
    if (this._activeTab === "secondary") {
      const disp = this._getEntity(u.dispenser_control);
      const hwCur = parseFiniteNum(this._getEntity(u.hot_water_current_temp).state);
      const hwSetRaw = parseFiniteNum(disp.attributes?.temperature) || parseFiniteNum(this._getEntity(u.hot_water_set_temp).state) || 0;
      const hwStatus = this._getEntity(u.hot_water_status).state;
      const kCupOn = this._isEntityOn(u.hot_water_cancel_switch);
      const iceBucket = this._getEntity(u.ice_bucket_status).state;
      const activeKcTarget = this._localTemps[u.dispenser_control] ?? (hwSetRaw >= 90 ? hwSetRaw : null);
      return html`
        ${this._renderTempStepperCard({
          title: "Keurig K-Cup & Hot Water Dispenser",
          entityId: u.dispenser_control,
          currentTemp: hwCur,
          min: 90,
          max: 190,
          step: 5,
          stagingDefault: 150,
          explicitTarget: activeKcTarget,
          offDisplay: "Off",
          presets: [
            { label: "Cocoa", temp: 150 },
            { label: "Tea", temp: 170 },
            { label: "Pour", temp: 190 },
          ],
        })}
        <div class="passable-section-card">
          <div class="drawer-row">
            <span>Hot Water State (${disp.attributes?.tank_status || "Full"})</span>
            <strong>${hwStatus}</strong>
          </div>
          ${this._hasEntity(u.hot_water_cancel_switch)
            ? html`<div class="drawer-row">
                <span>K-Cup Heater</span>
                <button class="switch-pill ${kCupOn ? "active" : ""}" @click=${() => this._toggleEntity(u.hot_water_cancel_switch)}>
                  ${kCupOn ? "HEATING (CANCEL)" : "START HEAT"}
                </button>
              </div>`
            : ""}
          <div class="drawer-row"><span>Ice Bucket</span><strong>${iceBucket}</strong></div>
          ${this._hasEntity(u.ice_maker_control)
            ? html`<div class="drawer-row"><span>Ice Maker</span><button class="switch-pill ${this._isEntityOn(u.ice_maker_control) ? "active" : ""}" @click=${() => this._toggleEntity(u.ice_maker_control)}>${this._isEntityOn(u.ice_maker_control) ? "ON" : "OFF"}</button></div>`
            : ""}
          ${this._hasEntity(u.ice_boost_switch)
            ? html`<div class="drawer-row"><span>Ice Boost</span><button class="switch-pill ${this._isEntityOn(u.ice_boost_switch) ? "active" : ""}" @click=${() => this._toggleEntity(u.ice_boost_switch)}>${this._isEntityOn(u.ice_boost_switch) ? "ON" : "OFF"}</button></div>`
            : ""}
        </div>
      `;
    }
    const zCur = parseFiniteNum(this._getEntity(u.freezer_temp_current).state);
    const minZ = parseFiniteNum(this._getEntity(u.freezer_min_entity).state, -6);
    const maxZ = parseFiniteNum(this._getEntity(u.freezer_max_entity).state, 5);
    const filterInfo = this._getWaterFilterInfo(u);
    return html`
      ${this._renderTempStepperCard({
        title: "Freezer Drawer",
        entityId: u.freezer_control,
        currentTemp: zCur,
        min: minZ,
        max: maxZ,
        allowZeroOrNegative: true,
        explicitTarget: zSet,
        presets: [
          { label: "Deep", temp: minZ },
          { label: "Standard", temp: 0 },
          { label: "Soft", temp: maxZ },
        ],
      })}
      <div class="passable-section-card">
        <div class="drawer-row"><span>Water Filter Life</span><strong>${filterInfo.label}</strong></div>
        ${this._hasEntity(u.turbo_freeze_switch)
          ? html`<div class="drawer-row"><span>Turbo Freeze</span><button class="switch-pill ${this._isEntityOn(u.turbo_freeze_switch) ? "active" : ""}" @click=${() => this._toggleEntity(u.turbo_freeze_switch)}>${this._isEntityOn(u.turbo_freeze_switch) ? "ON" : "OFF"}</button></div>`
          : ""}
        ${u.span?.power || u.span?.current
          ? html`<div class="drawer-row"><span>SPAN Circuit Draw</span><strong>${this._readSpanTelemetry(u).powerText || "--"}</strong></div>`
          : ""}
      </div>
    `;
  }

  _renderOvenModalTab(u, snap) {
    const ov = u.oven;
    if (this._activeTab === "primary" || this._activeTab === "secondary") {
      const isUpper = this._activeTab === "primary";
      const ctrlId = isUpper ? ov.upper_control : ov.lower_control;
      const dispId = isUpper ? ov.upper_display_temp : ov.lower_display_temp;
      const ctrlObj = this._getEntity(ctrlId);
      const rawTemp = parseFiniteNum(this._getEntity(isUpper ? ov.upper_raw_temp : ov.lower_raw_temp).state);
      const lightId = isUpper ? ov.upper_light_entity : ov.lower_light_entity;
      const isLightOn = this._isEntityOn(lightId);
      const remoteOn = this._isEntityOn(isUpper ? ov.upper_remote_enabled : ov.lower_remote_enabled);
      const timerRem = this._getEntity(isUpper ? ov.upper_cook_remaining : ov.lower_cook_remaining).state;
      const kitchTimer = this._getEntity(isUpper ? ov.upper_kitchen_timer : ov.lower_kitchen_timer).state;
      const mode = ctrlObj.attributes?.operation_mode || ctrlObj.state || "off";
      const isOn = String(mode).toLowerCase() !== "off";
      const ovenTarget = this._getOvenTargetTemp(ctrlId, dispId, isOn);
      const opList = ctrlObj.attributes?.operation_list || ["off", "Bake", "Convection Roast", "Air Fry"];

      return html`
        ${this._renderTempStepperCard({
          title: isUpper ? "Upper Oven" : "Lower Convection & Air Fry Oven",
          entityId: ctrlId,
          currentTemp: rawTemp,
          min: parseFiniteNum(ctrlObj.attributes?.min_temp, 170),
          max: parseFiniteNum(ctrlObj.attributes?.max_temp, 550),
          step: 5,
          stagingDefault: 350,
          explicitTarget: ovenTarget,
          offDisplay: "Off",
          modeConfig: {
            label: "Cook Mode",
            icon: "mdi:stove",
            currentMode: mode,
            options: opList,
            onModeChange: (newMode) => {
              this._setOperationMode(ctrlId, newMode);
              if (newMode.toLowerCase() !== "off" && this._getTargetTemp(ctrlId, 0) < 170) {
                this._setTemperature(ctrlId, 350, 170, 550);
              }
            },
          },
        })}
        <div class="passable-section-card">
          <div class="drawer-row"><span>Remote Control Ready</span><strong class="${remoteOn ? "tone-good" : "tone-warn"}">${remoteOn ? "Enabled" : "Disabled on Range"}</strong></div>
          ${this._hasEntity(lightId)
            ? html`<div class="drawer-row">
                <span>Oven Cavity Light</span>
                <button class="switch-pill ${isLightOn ? "active" : ""}" @click=${() => this._toggleApplianceLight(lightId)}>
                  ${isLightOn ? "HIGH" : "OFF"}
                </button>
              </div>`
            : ""}
          ${timerRem !== "unavailable" && parseFloat(timerRem) > 0
            ? html`<div class="drawer-row"><span>Cook Time Left</span><strong>${timerRem}</strong></div>`
            : ""}
          ${kitchTimer !== "unavailable" && parseFloat(kitchTimer) > 0
            ? html`<div class="drawer-row"><span>Kitchen Timer</span><strong>${kitchTimer}</strong></div>`
            : ""}
        </div>
      `;
    }

    const soundObj = ov.sound_level ? this._getEntity(ov.sound_level) : null;
    const toneObj = ov.end_tone ? this._getEntity(ov.end_tone) : null;

    return html`
      <div class="passable-section-card">
        <div class="passable-section-header"><span class="passable-section-title">Cooktop Burners & Power</span></div>
        ${(u.cooktop?.burners || []).map((b, i) => {
          const on = this._isEntityOn(b.status_entity);
          const pwr = b.power_entity ? this._getEntity(b.power_entity).state : null;
          const lbl = b.label || `Element ${b.shortLabel || i + 1}`;
          return html`<div class="drawer-row">
            <span>${lbl}</span>
            <strong class="${on ? "tone-heat" : ""}">${on ? (pwr && pwr !== "unavailable" ? `ON · ${pwr}%` : "ON") : "Off"}</strong>
          </div>`;
        })}
        ${snap.span.powerText
          ? html`<div class="drawer-row"><span>SPAN Circuit Draw</span><strong>${snap.span.powerText}${snap.span.amps !== null ? ` (${snap.span.amps.toFixed(1)} A)` : ""}</strong></div>`
          : ""}
        ${this._hasEntity(ov.control_lock)
          ? html`<div class="drawer-row"><span>Control Lock</span><button class="switch-pill ${this._isEntityOn(ov.control_lock) ? "active" : ""}" @click=${() => this._toggleEntity(ov.control_lock)}>${this._isEntityOn(ov.control_lock) ? "LOCKED" : "OFF"}</button></div>`
          : ""}
        ${this._hasEntity(ov.convection_conversion)
          ? html`<div class="drawer-row"><span>Convection Auto-Conversion</span><button class="switch-pill ${this._isEntityOn(ov.convection_conversion) ? "active" : ""}" @click=${() => this._toggleEntity(ov.convection_conversion)}>${this._isEntityOn(ov.convection_conversion) ? "ON" : "OFF"}</button></div>`
          : ""}
        ${soundObj && soundObj.attributes?.options?.length > 0
          ? this._renderSelectRow({
              label: "Sound Level",
              icon: "mdi:volume-high",
              value: soundObj.state,
              options: soundObj.attributes.options,
              onChange: (opt) => this._selectOption(soundObj.entity_id, opt),
            })
          : ""}
        ${toneObj && toneObj.attributes?.options?.length > 0
          ? this._renderSelectRow({
              label: "Timer End Tone",
              icon: "mdi:bell-ring-outline",
              value: toneObj.state,
              options: toneObj.attributes.options,
              onChange: (opt) => this._selectOption(toneObj.entity_id, opt),
            })
          : ""}
      </div>
    `;
  }

  _renderLaundryModalTab(u, snap) {
    if (this._activeTab === "primary" || this._activeTab === "secondary") {
      const isW = this._activeTab === "primary";
      const statusObj = this._getEntity(isW ? u.washer_status : u.dryer_status);
      const opObj = this._getEntity(isW ? u.washer_operation : u.dryer_operation);
      const pwrId = isW ? u.washer_power : u.dryer_power;
      const remoteOk = this._isEntityOn(isW ? u.washer_remote_start : u.dryer_remote_start);
      const remObj = this._getEntity(isW ? u.washer_remaining_time : u.dryer_remaining_time);
      const totObj = this._getEntity(isW ? u.washer_total_time : u.dryer_total_time);
      const isAct = !["off", "power_off", "idle", "end", "unavailable", "unknown"].includes(String(statusObj.state).toLowerCase());
      const timing = this._computeLaundryTiming(remObj.state, totObj.state, isAct);
      const opIcon = (opt) => (opt === "start" ? "mdi:play" : opt === "stop" ? "mdi:stop" : "mdi:power");

      return html`
        <div class="passable-section-card">
          <div class="passable-section-header">
            <span class="passable-section-title">LG ThinQ ${isW ? "Washer" : "Dryer"}</span>
            <span class="zone-inline-chip ${remoteOk ? "good" : "neutral"}">
              ${remoteOk ? "Remote Start Ready" : "Remote Start Off"}
            </span>
          </div>
          <div class="drawer-row"><span>Status</span><strong>${formatTitleCase(statusObj.state)}</strong></div>
          ${isAct && timing.countdown
            ? html`<div class="drawer-row"><span>Time Remaining</span><strong>${timing.countdown} (ETA ${timing.eta})</strong></div>`
            : ""}
          ${this._hasEntity(pwrId)
            ? html`<div class="drawer-row"><span>Power</span><button class="switch-pill ${this._isEntityOn(pwrId) ? "active" : ""}" @click=${() => this._toggleEntity(pwrId)}>${this._isEntityOn(pwrId) ? "ON" : "OFF"}</button></div>`
            : ""}
          ${opObj.attributes?.options?.length > 0
            ? html`
                <div class="laundry-cmd-grid">
                  ${opObj.attributes.options.map(
                    (opt) => html`
                      <button
                        class="cmd-transport-btn ${opObj.state === opt ? "active" : ""}"
                        @click=${() => {
                          if (opt === "start" && !remoteOk) {
                            this._showToast("Enable Remote Start on machine first");
                            return;
                          }
                          this._selectOption(opObj.entity_id, opt);
                          this._showToast(`Sent ${formatTitleCase(opt)}`);
                        }}
                      >
                        <ha-icon icon="${opIcon(opt)}"></ha-icon>
                        <span>${formatTitleCase(opt)}</span>
                      </button>
                    `
                  )}
                </div>
              `
            : ""}
          ${isW && this._hasEntity(u.washer_delayed_start)
            ? html`
                <div class="drawer-row">
                  <span>Delayed Start</span>
                  <div class="step-controller-pill">
                    <button class="pill-btn" @click=${() => this._setNumberValue(u.washer_delayed_start, Math.max(0, (parseInt(this._getEntity(u.washer_delayed_start).state, 10) || 0) - 1))}><ha-icon icon="mdi:minus"></ha-icon></button>
                    <span class="pill-value">${parseInt(this._getEntity(u.washer_delayed_start).state, 10) || 0}h</span>
                    <button class="pill-btn" @click=${() => this._setNumberValue(u.washer_delayed_start, Math.min(19, (parseInt(this._getEntity(u.washer_delayed_start).state, 10) || 0) + 1))}><ha-icon icon="mdi:plus"></ha-icon></button>
                  </div>
                </div>
              `
            : ""}
        </div>
      `;
    }

    const cycles = this._getEntity(u.washer_cycles).state;
    return html`
      <div class="passable-section-card">
        <div class="passable-section-header"><span class="passable-section-title">Care & Power Telemetry</span></div>
        ${cycles !== "unavailable"
          ? html`<div class="drawer-row"><span>Washer Cycle Counter</span><strong class="${parseInt(cycles, 10) >= 30 ? "tone-warn" : ""}">${cycles} cycles ${parseInt(cycles, 10) >= 30 ? "(Tub Clean Due)" : ""}</strong></div>`
          : ""}
        ${snap.span.powerText
          ? html`<div class="drawer-row"><span>Dryer SPAN Draw</span><strong>${snap.span.powerText}${snap.span.energyKwh !== null ? ` · ${snap.span.energyKwh.toFixed(1)} kWh` : ""}</strong></div>`
          : ""}
        <div class="drawer-row"><span>Washer Notification</span><strong>${formatRelativeTime(this._getEntity(u.washer_notification).state)}</strong></div>
        <div class="drawer-row"><span>Dryer Notification</span><strong>${formatRelativeTime(this._getEntity(u.dryer_notification).state)}</strong></div>
      </div>
    `;
  }

  _renderWaterHeaterModalTab(u) {
    if (this._activeTab === "primary") {
      const mainObj = this._getEntity(u.entity);
      const outCur = parseFiniteNum(this._getEntity(u.outlet_temp_sensor).state);
      const gasTot = this._getEntity(u.cumulative_gas_sensor).state;
      const errCode = this._getEntity(u.error_code).state;
      const opList = mainObj.attributes?.operation_list || ["off", "gas"];
      return html`
        ${this._renderTempStepperCard({
          title: "Navien NPE-240A2 Setpoint",
          entityId: u.entity,
          currentTemp: outCur,
          min: parseFiniteNum(mainObj.attributes?.min_temp, 97),
          max: parseFiniteNum(mainObj.attributes?.max_temp, 185),
          step: 1,
          presets: [
            { label: "Eco", temp: 115 },
            { label: "Standard", temp: 125 },
            { label: "Hot", temp: 135 },
          ],
          modeConfig: {
            label: "Operation Mode",
            icon: "mdi:water-boiler",
            currentMode: mainObj.attributes?.operation_mode || mainObj.state,
            options: opList,
            onModeChange: (m) => this._setOperationMode(u.entity, m),
          },
        })}
        <div class="passable-section-card">
          <div class="drawer-row"><span>Burner Modulation</span><strong>${this._getEntity(u.heating_power_sensor).state}%</strong></div>
          <div class="drawer-row"><span>Cumulative Gas</span><strong>${gasTot !== "unavailable" ? `${gasTot} ft³` : "--"}</strong></div>
          <div class="drawer-row"><span>Diagnostic Code</span><strong class="${errCode === "0" ? "tone-good" : "tone-danger"}">Code ${errCode}</strong></div>
        </div>
      `;
    }
    if (this._activeTab === "secondary") {
      const isRecirc = this._isEntityOn(u.recirc_switch);
      return html`
        <div class="passable-section-card">
          <div class="drawer-row">
            <span>HotButton® Recirculation</span>
            <button class="switch-pill ${isRecirc ? "active" : ""}" @click=${() => this._toggleEntity(u.recirc_switch)}>
              ${isRecirc ? "ACTIVE (STOP)" : "START"}
            </button>
          </div>
          <div class="drawer-row"><span>Last Run</span><strong>${formatRelativeTime(this._getEntity(u.recirc_last_run).state)} (${this._getEntity(u.recirc_duration).state})</strong></div>
          ${this._renderRecircDrawer(u)}
        </div>
      `;
    }
    const steps = [
      { n: 1, t: "Isolate", d: "Turn off power & gas; close Blue Cold Inlet and Red Hot Outlet valves." },
      { n: 2, t: "Connect Pump", d: "Pour 4 gal white vinegar in bucket. Connect pump → Cold service port; Hot service port → bucket." },
      { n: 3, t: "Flush (45-60m)", d: "Open both service valves and circulate vinegar for 45–60 minutes." },
      { n: 4, t: "Rinse & Restart", d: "Flush 5 min with fresh cold water, clean inlet filter screen, restore valves, gas, and power." },
    ];
    return html`
      <div class="passable-section-card">
        <div class="passable-section-header"><span class="passable-section-title">NPE-240A2 Annual Flush Guide</span></div>
        ${steps.map((s) => html`<div class="drawer-row" style="align-items:flex-start;"><strong>${s.n}. ${s.t}</strong><span style="max-width:65%; text-align:right; color:var(--secondary-text-color);">${s.d}</span></div>`)}
      </div>
    `;
  }

  _renderHoseModalTab(u) {
    const valve = this._getEntity(u.valve_entity);
    const isOpen = valve.state === "open" || valve.state === "on";
    const modeObj = this._getEntity(u.device_mode_select);
    const hist = this._getEntity(u.history_sensor);
    if (this._activeTab === "primary") {
      return html`
        <div class="passable-section-card">
          <div class="drawer-row"><span>Pool Zone Valve</span><strong class="${isOpen ? "tone-good" : ""}">${isOpen ? "OPEN (Watering)" : "Closed"}</strong></div>
          <div class="drawer-row">
            <span>Manual Duration</span>
            <div class="step-controller-pill">
              <button class="pill-btn" @click=${() => (this._manualRuntime = Math.max(5, this._manualRuntime - 5))}><ha-icon icon="mdi:minus"></ha-icon></button>
              <span class="pill-value">${this._manualRuntime} min</span>
              <button class="pill-btn" @click=${() => (this._manualRuntime = Math.min(120, this._manualRuntime + 5))}><ha-icon icon="mdi:plus"></ha-icon></button>
            </div>
          </div>
          <button type="button" class="recirc-button ${isOpen ? "active" : ""}" @click=${() => this._toggleHoseWatering(u)}>
            <ha-icon icon="${isOpen ? "mdi:water-off" : "mdi:water"}"></ha-icon>
            <span>${isOpen ? "STOP WATERING" : `START WATERING (${this._manualRuntime}m)`}</span>
          </button>
        </div>
      `;
    }
    if (this._activeTab === "secondary") {
      return html`
        <div class="passable-section-card">
          ${modeObj.attributes?.options
            ? this._renderSelectRow({
                label: "Device Mode",
                icon: "mdi:sprinkler-variant",
                value: modeObj.state,
                options: modeObj.attributes.options,
                onChange: (opt) => this._selectOption(modeObj.entity_id, opt),
              })
            : ""}
          ${this._hasEntity(u.smart_watering_switch)
            ? html`<div class="drawer-row"><span>Smart Watering</span><button class="switch-pill ${this._isEntityOn(u.smart_watering_switch) ? "active" : ""}" @click=${() => this._toggleEntity(u.smart_watering_switch)}>${this._isEntityOn(u.smart_watering_switch) ? "ON" : "OFF"}</button></div>`
            : ""}
          ${this._hasEntity(u.rain_delay_switch)
            ? html`<div class="drawer-row"><span>Rain Delay</span><button class="switch-pill ${this._isEntityOn(u.rain_delay_switch) ? "active" : ""}" @click=${() => this._toggleEntity(u.rain_delay_switch)}>${this._isEntityOn(u.rain_delay_switch) ? "ON" : "OFF"}</button></div>`
            : ""}
        </div>
      `;
    }
    return html`
      <div class="passable-section-card">
        <div class="drawer-row"><span>Last Run Date</span><strong>${formatShortDate(hist.state)}</strong></div>
        <div class="drawer-row"><span>Last Duration</span><strong>${hist.attributes?.run_time ? `${Math.round(hist.attributes.run_time)} min` : "--"}</strong></div>
        <div class="drawer-row"><span>Consumption</span><strong>${hist.attributes?.consumption_gallons !== undefined ? `${hist.attributes.consumption_gallons} gal` : "--"}</strong></div>
        <div class="drawer-row"><span>Fault Status</span><strong class="${this._isEntityOn(u.fault_sensor) ? "tone-danger" : "tone-good"}">${this._isEntityOn(u.fault_sensor) ? "Fault Detected" : "Healthy"}</strong></div>
      </div>
    `;
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  render() {
    if (!this.hass || !this.config) return html``;
    const units = this._getNormalizedAppliances();
    const isSummaryMode = this.config.display_mode === "summary";
    const activeFullIdx = Math.min(this._activeUnitIdx, units.length - 1);

    return html`
      <ha-card>
        <div class="toast ${this._toastMsg && !this._modalOpen ? "show" : ""}">
          <ha-icon icon="mdi:check-circle" style="--mdc-icon-size:16px;"></ha-icon>
          <span>${this._toastMsg}</span>
        </div>

        ${isSummaryMode
          ? html`
              ${this.config.show_header
                ? html`
                    <div class="header">
                      <div class="header-left">
                        <h1 class="title">
                          <ha-icon icon="mdi:home-automation" style="margin-right:8px; color:var(--primary-color);"></ha-icon>
                          ${this.config.title || "Home Appliances"}
                        </h1>
                        <p class="subtitle">${units.length} Connected Appliances</p>
                      </div>
                    </div>
                  `
                : ""}
              ${this._renderSummaryMode(units)}
            `
          : html`
              ${units.length > 1
                ? html`
                    <div class="unit-select-bar" style="padding: 12px 12px 0;">
                      <ha-icon icon="${APPLIANCE_META[units[activeFullIdx]?.appliance_type]?.icon || "mdi:home-automation"}" style="--mdc-icon-size:18px; color:var(--primary-color);"></ha-icon>
                      <div class="select-wrap full">
                        <select
                          class="passable-select"
                          aria-label="Select appliance"
                          .value=${String(activeFullIdx)}
                          @change=${(e) => (this._activeUnitIdx = parseInt(e.target.value, 10) || 0)}
                        >
                          ${units.map((item, i) => html`<option value="${String(i)}">${item.title}</option>`)}
                        </select>
                        <ha-icon icon="mdi:chevron-down" class="select-chevron"></ha-icon>
                      </div>
                    </div>
                  `
                : ""}
              ${this._renderFullUnit(units[activeFullIdx], activeFullIdx)}
            `}

        ${this._renderCommandCenterModal(units)}
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host { display: block; width: 100%; box-sizing: border-box; }
      ha-card {
        border-radius: var(--ha-card-border-radius, 12px);
        background: var(--ha-card-background, var(--card-background-color, #fff));
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.1));
        overflow: hidden;
        color: var(--primary-text-color);
        position: relative;
      }

      .toast {
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%) translateY(-14px);
        background: var(--primary-text-color); color: var(--card-background-color, #fff);
        padding: 8px 16px; border-radius: 999px; font-size: 12.5px; font-weight: 700;
        pointer-events: none; opacity: 0; transition: all 0.25s ease; z-index: 10005;
        display: flex; align-items: center; gap: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.28);
      }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

      .header {
        padding: 16px 16px 14px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 10px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        margin-bottom: 12px;
      }
      .header-left { display: flex; flex-direction: column; min-width: 0; }
      .title { font-size: 24px; font-weight: 500; margin: 0; letter-spacing: -0.01em; display: flex; align-items: center; }
      .subtitle { color: var(--secondary-text-color, #757575); font-size: 14px; margin: 4px 0 0; }
      .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

      .card-content { padding: 12px; display: flex; flex-direction: column; gap: 10px; container-type: inline-size; }
      .card-content.no-header { padding: 10px; }
      .header + .card-content { padding-top: 0; }

      .status-chip {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; text-transform: uppercase;
        background: var(--secondary-background-color, rgba(128,128,128,0.14)); color: var(--secondary-text-color);
      }
      .status-chip.active-alert, .status-chip.power-off { background: rgba(239, 68, 68, 0.16); color: #ef4444; }
      .status-chip.active-heat, .status-chip.heating { background: rgba(249, 115, 22, 0.16); color: #ea580c; }
      .status-chip.active-washer { background: rgba(14, 165, 233, 0.16); color: #0284c7; }

      .power-btn-header {
        width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; border: 1px solid var(--divider-color); background: var(--card-background-color, #fff);
      }
      .power-btn-header.on { color: #16a34a; border-color: #16a34a; }
      .power-btn-header.off { color: #ef4444; border-color: #ef4444; }

      /* SUMMARY STRIP, TILES, TRAYS & FOOTER */
      .app-summary-strip {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        padding: 7px 12px; min-height: 36px; border-radius: 12px;
        background: var(--secondary-background-color, rgba(128, 128, 128, 0.1));
        border: 1px solid var(--divider-color, rgba(128, 128, 128, 0.16));
        cursor: pointer; box-sizing: border-box;
      }
      .app-summary-strip.active { background: rgba(14, 165, 233, 0.09); border-color: rgba(14, 165, 233, 0.34); }
      .app-summary-strip.heat { background: rgba(249, 115, 22, 0.09); border-color: rgba(249, 115, 22, 0.36); }
      .app-summary-strip.warning { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.36); }
      .app-summary-strip.danger { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.42); }
      .summary-strip-left { display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; white-space: nowrap; }
      .summary-strip-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .summary-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #22c55e; }
      .summary-status-dot.active { background: #0284c7; }
      .summary-status-dot.heat { background: #f97316; }
      .summary-status-dot.warning { background: #f59e0b; }
      .summary-status-dot.danger { background: #ef4444; }
      .summary-status-label { font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
      .strip-brand-title { font-size: 13px; font-weight: 700; color: var(--primary-text-color); white-space: nowrap; }
      .strip-active-pill {
        padding: 2px 9px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700;
        border: 1px solid var(--divider-color, rgba(128,128,128,0.22));
        background: var(--card-background-color, rgba(128,128,128,0.1)); color: var(--primary-text-color); cursor: pointer;
      }
      .strip-active-pill.heat { background: rgba(249,115,22,0.14); border-color: rgba(249,115,22,0.36); color: #ea580c; }
      .strip-active-pill.active { background: rgba(14,165,233,0.14); border-color: rgba(14,165,233,0.36); color: #0284c7; }
      .strip-active-pill.warning { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #d97706; }
      .strip-active-pill.danger { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #dc2626; }
      .strip-active-pill.drawer-open { box-shadow: 0 0 0 1px var(--primary-color, #0284c7); }
      .summary-sep { opacity: 0.4; font-size: 12px; }
      .summary-meta-pill { font-size: 12px; font-weight: 700; color: var(--secondary-text-color); }
      .strip-circle-btn, .icon-circle-btn {
        width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
        background: var(--card-background-color, #fff); border: 1px solid var(--divider-color); color: var(--primary-text-color);
        cursor: pointer; padding: 0;
      }
      .icon-circle-btn.active { color: #0284c7; border-color: rgba(14,165,233,0.45); background: rgba(14,165,233,0.14); }

      .units-stack { display: flex; flex-direction: column; gap: 8px; }
      .units-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
      @container (max-width: 340px) { .units-grid-2 { grid-template-columns: 1fr; } }
      .unit-tile-card {
        position: relative; overflow: hidden;
        background: var(--secondary-background-color, rgba(128, 128, 128, 0.08));
        border: 1px solid var(--divider-color, rgba(128, 128, 128, 0.16));
        border-radius: 14px; padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; cursor: pointer;
      }
      .unit-tile-card.compact-tile { padding: 8px 10px 10px; }
      .unit-tile-card.compact-tile.span-2 { grid-column: span 2; }
      @container (max-width: 340px) { .unit-tile-card.compact-tile.span-2 { grid-column: span 1; } }
      .unit-tile-card.hero-summary { padding: 10px 12px 12px; }
      .unit-tile-card.selected { border-color: var(--primary-color, #0284c7); box-shadow: 0 0 0 1px var(--primary-color, #0284c7); }
      .unit-tile-card.state-active { background: rgba(14, 165, 233, 0.09); border-color: rgba(14, 165, 233, 0.4); }
      .unit-tile-card.state-heat { background: rgba(249, 115, 22, 0.09); border-color: rgba(249, 115, 22, 0.4); }
      .unit-tile-card.state-warning { background: rgba(245, 158, 11, 0.09); border-color: rgba(245, 158, 11, 0.44); }
      .unit-tile-card.state-danger { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.5); }

      /* CONSOLIDATED HERO LAYOUT */
      .hero-zone-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-width: 0; }
      .hero-zone-identity { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; overflow: hidden; }
      .device-icon-wrap {
        width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        background: rgba(128,128,128,0.14); color: var(--secondary-text-color); border: 1px solid var(--divider-color, rgba(128,128,128,0.16));
      }
      .device-icon-wrap.state-active { background: rgba(14,165,233,0.18); color: #0284c7; border-color: rgba(14,165,233,0.42); }
      .device-icon-wrap.state-heat { background: rgba(249,115,22,0.18); color: #ea580c; border-color: rgba(249,115,22,0.42); }
      .device-icon-wrap.state-warning { background: rgba(245,158,11,0.2); color: #d97706; border-color: rgba(245,158,11,0.45); }
      .device-icon-wrap.state-danger { background: rgba(239,68,68,0.2); color: #dc2626; border-color: rgba(239,68,68,0.45); }
      .hero-zone-title-wrap { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; overflow: hidden; }
      .hero-zone-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; }
      .hero-zone-title {
        font-size: 16px; font-weight: 700; color: var(--primary-text-color); margin: 0;
        line-height: 1.2; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .hero-zone-subtitle {
        display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600;
        color: var(--secondary-text-color); min-width: 0; line-height: 1.25;
      }
      .hero-inline-expand-btn {
        display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px;
        background: var(--card-background-color, rgba(128,128,128,0.12));
        border: 1px solid var(--divider-color, rgba(128,128,128,0.22));
        color: var(--primary-text-color); font-family: inherit; font-size: 11.5px; font-weight: 700;
        cursor: pointer; white-space: nowrap; flex-shrink: 0;
      }
      .hero-inline-expand-btn.open, .hero-inline-expand-btn:hover {
        border-color: var(--primary-color, #0284c7); background: rgba(14,165,233,0.12);
      }
      .hero-zone-primary { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
      .hero-primary-stack { display: flex; flex-direction: column; align-items: flex-end; margin-right: 2px; font-variant-numeric: tabular-nums; }
      .hero-primary-val { font-size: 18px; font-weight: 800; line-height: 1.05; color: var(--primary-text-color); }
      .hero-primary-val.state-active { color: #0284c7; }
      .hero-primary-val.state-heat { color: #ea580c; }
      .hero-primary-val.state-warning { color: #d97706; }
      .hero-primary-val.state-danger { color: #dc2626; }
      .hero-primary-sub { font-size: 11px; font-weight: 700; color: var(--secondary-text-color); }

      /* COMPACT 2-COL TILES, ACTIVE IDLE, MULTI-RINGS */
      .compact-tile-main { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
      .compact-tile-id { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
      .compact-tile-text { min-width: 0; flex: 1; }
      .compact-tile-title { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .compact-tile-sub { font-size: 11px; font-weight: 600; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .compact-tile-right { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
      .compact-tile-val { font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
      .model-thumb-box.mini { width: 32px; height: 32px; border-radius: 9px; }

      .active-idle-row {
        display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-radius: 12px;
        background: var(--secondary-background-color, rgba(128,128,128,0.08));
        border: 1px solid var(--divider-color, rgba(128,128,128,0.16));
        font-size: 12.5px; font-weight: 600; color: var(--secondary-text-color); cursor: pointer;
      }
      .appliance-rings-grid { display: grid; gap: 4px; }
      .ring-tile-btn {
        display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px;
        border-radius: 11px; background: transparent; border: 1px solid transparent; font-family: inherit; cursor: pointer;
      }
      .ring-tile-btn.selected { background: var(--secondary-background-color, rgba(128,128,128,0.12)); border-color: var(--primary-color, #0284c7); }
      .ring-wrap { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
      .ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .ring-val { position: absolute; font-size: 10px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary-text-color); }
      .ring-name { font-size: 11.5px; font-weight: 700; color: var(--primary-text-color); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ring-sub { font-size: 10.5px; color: var(--secondary-text-color); }

      /* INLINE QUICK DRAWER */
      @keyframes pacSlideDown { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
      .appliance-inline-drawer {
        border-top: 1px dashed var(--divider-color, rgba(128,128,128,0.25)); padding-top: 8px;
        display: flex; flex-direction: column; gap: 8px; animation: pacSlideDown 0.18s ease-out forwards;
      }
      .drawer-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
      .drawer-title-group { display: flex; align-items: center; gap: 6px; min-width: 0; flex-wrap: wrap; }
      .drawer-title { font-size: 13px; font-weight: 700; }
      .drawer-sub { font-size: 11.5px; color: var(--secondary-text-color); }
      .drawer-actions { display: flex; align-items: center; gap: 5px; }
      .drawer-filter-btn {
        display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 6px;
        border: 1px solid var(--divider-color, rgba(128,128,128,0.24)); background: transparent;
        color: var(--secondary-text-color); font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
      }
      .drawer-filter-btn.active { border-color: rgba(14,165,233,0.45); background: rgba(14,165,233,0.14); color: #0284c7; }
      .drawer-manage-btn {
        display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px;
        border: 1px solid var(--divider-color, rgba(128,128,128,0.22));
        background: var(--secondary-background-color, rgba(128,128,128,0.1));
        color: var(--primary-text-color); font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
      }
      .drawer-close-btn { background: none; border: none; padding: 2px; color: var(--secondary-text-color); cursor: pointer; display: inline-flex; }
      .drawer-list { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
      .drawer-device-row {
        display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px;
        border-radius: 10px; border: 1px solid var(--divider-color, rgba(128,128,128,0.16));
        background: var(--card-background-color, rgba(128,128,128,0.06));
      }
      .drawer-device-row.state-active { border-color: rgba(14,165,233,0.36); background: rgba(14,165,233,0.08); }
      .drawer-device-row.state-heat { border-color: rgba(249,115,22,0.36); background: rgba(249,115,22,0.08); }
      .drawer-device-row.state-warning { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.08); }
      .drawer-device-row.state-danger { border-color: rgba(239,68,68,0.42); background: rgba(239,68,68,0.09); }
      .drawer-dev-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
      .drawer-dev-left.clickable { cursor: pointer; }
      .drawer-dev-text { min-width: 0; flex: 1; }
      .drawer-dev-name { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-size: 12.5px; font-weight: 700; }
      .drawer-dev-sub { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .drawer-dev-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
      .drawer-empty { padding: 12px 8px; text-align: center; font-size: 12.5px; color: var(--secondary-text-color); }
      .quick-chip {
        padding: 4px 10px; border-radius: 999px; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
        border: 1px solid var(--divider-color, rgba(128,128,128,0.24));
        background: var(--card-background-color, rgba(128,128,128,0.08)); color: var(--primary-text-color);
      }
      .quick-chip.sky { background: rgba(14,165,233,0.14); border-color: rgba(14,165,233,0.38); color: #0284c7; }
      .quick-chip.amber { background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.38); color: #d97706; }
      .quick-chip.danger { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.38); color: #dc2626; }
      .icon-mini-btn {
        width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
        border: 1px solid var(--divider-color, rgba(128,128,128,0.22));
        background: var(--card-background-color, rgba(128,128,128,0.08)); color: var(--secondary-text-color); cursor: pointer; padding: 0;
      }
      .icon-mini-btn.active { color: #0284c7; border-color: rgba(14,165,233,0.45); background: rgba(14,165,233,0.14); }

      .unit-tile-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .unit-tile-identity { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
      .model-thumb-box {
        width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
        background: var(--card-background-color, #fff); border: 1px solid var(--divider-color); flex-shrink: 0;
      }
      .model-thumb-box.compact { width: 38px; height: 38px; border-radius: 10px; }
      .unit-title-stack { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
      .unit-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
      .unit-title { font-size: 15.5px; font-weight: 700; margin: 0; }
      .unit-subtitle-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--secondary-text-color); min-width: 0; }
      .sub-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .inline-tray-btn {
        display: inline-flex; align-items: center; gap: 2px; padding: 2px 7px; border-radius: 999px;
        background: var(--card-background-color, #fff); border: 1px solid var(--divider-color);
        color: var(--primary-text-color); font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0;
      }
      .inline-tray-btn ha-icon { --mdc-icon-size: 13px; }
      .unit-primary-right { text-align: right; flex-shrink: 0; }
      .unit-primary-val { font-size: 19px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
      .unit-primary-sub { font-size: 11.5px; font-weight: 600; color: var(--secondary-text-color); }

      .summary-rings-pair { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .summary-ring-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
      .summary-ring-wrap { position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; }
      .summary-ring-svg { width: 42px; height: 42px; transform: rotate(-90deg); }
      .summary-ring-val { position: absolute; font-size: 10px; font-weight: 800; }
      .summary-ring-label { font-size: 10px; font-weight: 700; color: var(--secondary-text-color); }

      .unit-telemetry-tray {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 6px;
        padding-top: 8px; border-top: 1px dashed var(--divider-color);
      }
      .telemetry-mini-card {
        display: flex; flex-direction: column; gap: 1px; padding: 6px 8px; border-radius: 10px;
        background: var(--card-background-color, #fff); border: 1px solid var(--divider-color);
      }
      .t-mini-label { font-size: 10px; font-weight: 700; color: var(--secondary-text-color); text-transform: uppercase; }
      .t-mini-val { font-size: 12.5px; font-weight: 700; }
      .tile-hairline { position: absolute; left: 0; right: 0; bottom: 0; height: 2.5px; background: rgba(148,163,184,0.18); }
      .tile-hairline-fill { height: 100%; transition: width 0.4s ease; }

      .app-footer-strip { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding-top: 2px; }
      .footer-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
      .footer-chip {
        display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px;
        border: 1px solid var(--divider-color); background: var(--secondary-background-color, rgba(128,128,128,0.08));
        color: var(--primary-text-color); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .footer-chip.info { background: rgba(14,165,233,0.14); border-color: rgba(14,165,233,0.34); color: #0284c7; }
      .footer-command-link { background: none; border: none; color: var(--primary-color, #03a9f4); font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }

      .zone-inline-chip { display: inline-flex; padding: 2px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; }
      .zone-inline-chip.good { background: rgba(34,197,94,0.16); color: #16a34a; }
      .zone-inline-chip.info { background: rgba(14,165,233,0.16); color: #0284c7; }
      .zone-inline-chip.heat { background: rgba(249,115,22,0.16); color: #ea580c; }
      .zone-inline-chip.warning { background: rgba(245,158,11,0.18); color: #d97706; }
      .zone-inline-chip.danger { background: rgba(239,68,68,0.18); color: #ef4444; }
      .zone-inline-chip.neutral { background: rgba(128,128,128,0.15); color: var(--secondary-text-color); }

      /* CAFÉ REFRIGERATOR CHASSIS */
      .cafe-fridge-shell { display: flex; flex-direction: column; }
      .fridge-body { display: flex; height: 290px; }
      .fridge-door {
        flex: 1; background: var(--secondary-background-color); border: 2px solid var(--divider-color);
        position: relative; display: flex; flex-direction: column; cursor: pointer;
      }
      .fridge-left-door { border-right-width: 1px; border-top-left-radius: 12px; }
      .fridge-right-door { border-left-width: 1px; border-top-right-radius: 12px; }
      .fridge-freezer-drawer {
        height: 130px; background: var(--secondary-background-color); border: 2px solid var(--divider-color); border-top: none;
        border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; position: relative;
        display: flex; justify-content: center; align-items: center; cursor: pointer;
      }
      .door-open { background: rgba(245, 158, 11, 0.16) !important; border-color: #f59e0b !important; }
      .cafe-handle {
        position: absolute; top: 20px; bottom: 20px; width: 10px; background: var(--disabled-text-color, #94a3b8);
        border-radius: 6px; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; box-sizing: border-box;
      }
      .left-handle { right: 10px; }
      .right-handle { left: 10px; }
      .cafe-freezer-handle {
        position: absolute; top: 14px; left: 22px; right: 22px; height: 10px; background: var(--disabled-text-color, #94a3b8);
        border-radius: 6px; display: flex; justify-content: space-between; padding: 0 8px; align-items: center;
      }
      .copper-cuff { width: 100%; height: 6px; background: #b87352; border-radius: 2px; }
      .cafe-freezer-handle .copper-cuff { width: 8px; height: 100%; }
      .left-door-content { padding: 20px 30px 18px 12px; height: 100%; display: flex; align-items: flex-end; justify-content: center; box-sizing: border-box; }
      .right-door-content { padding: 14px 14px 14px 28px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; box-sizing: border-box; }
      .dispenser {
        width: 82px; height: 118px; background: var(--ha-card-background, #fff); border: 1px solid var(--divider-color);
        border-radius: 8px; display: flex; flex-direction: column; align-items: center; padding: 8px; cursor: pointer;
      }
      .dispenser.heating { border-color: #f97316; box-shadow: 0 0 12px rgba(249,115,22,0.35); }
      .dispenser-lcd {
        width: 100%; height: 34px; background: #18181b; color: #f8fafc; border-radius: 4px;
        display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; margin-bottom: 8px;
      }
      .dispenser-lever { width: 18px; flex: 1; background: var(--disabled-text-color, #94a3b8); border-radius: 4px; }
      .temp-display { display: flex; flex-direction: column; align-items: center; background: var(--ha-card-background, #fff); border: 1px solid var(--divider-color); padding: 8px 14px; border-radius: 10px; }
      .temp-display.horizontal { flex-direction: row; gap: 12px; margin-top: 16px; }
      .temp-value { font-size: 2rem; font-weight: 800; line-height: 1; }
      .temp-setpoint { font-size: 0.85rem; color: var(--secondary-text-color); font-weight: 600; }
      .cafe-badges-col { display: flex; flex-direction: column; gap: 4px; align-items: center; }
      .mini-chip { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(128,128,128,0.14); }
      .mini-chip.good { background: rgba(34,197,94,0.16); color: #16a34a; }
      .mini-chip.warn { background: rgba(245,158,11,0.16); color: #d97706; }
      .mini-chip.info { background: rgba(14,165,233,0.16); color: #0284c7; }

      /* CAFÉ INDUCTION RANGE CHASSIS */
      .graphics-container { display: flex; flex-wrap: wrap; gap: 16px; }
      .cooktop-container, .oven-container { flex: 1; min-width: 240px; }
      .cooktop-container { aspect-ratio: 360 / 224; background: #18181b; border: 1px solid var(--divider-color); border-radius: 14px; position: relative; overflow: hidden; }
      .cooktop-svg { width: 100%; height: 100%; display: block; }
      .burner-group { cursor: pointer; }
      .oven-container { min-height: 232px; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 14px; display: flex; flex-direction: column; padding: 8px; gap: 8px; box-sizing: border-box; }
      .oven-control-panel { height: 42px; background: var(--ha-card-background, #fff); border-radius: 10px; border: 1px solid var(--divider-color); padding: 2px 6px; box-sizing: border-box; }
      .oven { position: relative; border: 2px solid var(--divider-color); border-radius: 8px; background: var(--ha-card-background, #fff); display: flex; justify-content: center; align-items: center; cursor: pointer; }
      .upper-oven { flex: 0.7; }
      .lower-oven { flex: 1.3; }
      .oven.oven-on { border-color: #f97316; background: rgba(249,115,22,0.14); }
      .oven.light-on { box-shadow: inset 0 0 20px rgba(251,191,36,0.35); }
      .oven-handle { position: absolute; top: 8px; left: 16px; right: 16px; height: 9px; background: var(--disabled-text-color, #94a3b8); border-radius: 6px; display: flex; justify-content: space-between; padding: 0 6px; }
      .oven-handle .copper-cuff { width: 8px; height: 100%; }
      .oven-info { display: flex; flex-direction: column; align-items: center; padding-top: 16px; }
      .oven-state { font-weight: 700; font-size: 13px; }
      .oven-temps { font-size: 12px; color: var(--secondary-text-color); }

      /* LAUNDRY PAIR */
      .laundry-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
      .laundry-pair.stacked { grid-template-columns: 1fr; }
      .appliance-container {
        display: flex; flex-direction: column; align-items: center; background: var(--secondary-background-color);
        border: 1px solid var(--divider-color); border-radius: 14px; padding: 12px; cursor: pointer;
      }
      .graphic-header { display: flex; width: 100%; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .appliance-header { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
      .knob-svg { width: 32px; height: 32px; }
      .knob { fill: var(--card-background-color, #fff); stroke: var(--divider-color); stroke-width: 2; }
      .screen { padding: 4px 10px; background: #18181b; color: #38bdf8; border-radius: 6px; font-family: monospace; font-weight: 700; font-size: 12px; }
      .graphic-body { width: 100%; max-width: 150px; }
      .laundry-door { width: 100%; padding-top: 100%; position: relative; border-radius: 50%; background: var(--ha-card-background, #fff); border: 2px solid var(--divider-color); }
      .laundry-door-inner { position: absolute; inset: 14%; border-radius: 50%; background: #18181b; opacity: 0.85; }
      .spinner-svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
      .spinner { animation: spin 1.6s linear infinite; transform-origin: center; }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      .spinner-arc { fill: transparent; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 212; stroke-dashoffset: 70; }
      .spinner-arc.washer-active { stroke: #0284c7; }
      .spinner-arc.dryer-active { stroke: #f97316; }
      .door-info { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f8fafc; text-align: center; }
      .door-state { font-weight: 700; font-size: 13px; }
      .door-eta { font-size: 10.5px; opacity: 0.85; }

      /* NAVIEN WATER HEATER */
      .viz-container { position: relative; width: 100%; max-width: 320px; height: 250px; margin: 0 auto; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 12px; }
      .box-controls { position: absolute; top: 36px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .temp-btn { width: 38px; height: 38px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
      .temp-btn.up { background: #f97316; }
      .temp-btn.down { background: #0284c7; }
      .temp-val { font-size: 2rem; font-weight: 800; line-height: 1; }
      .temp-label { font-size: 10px; font-weight: 700; color: var(--secondary-text-color); }
      .overlay-stat { position: absolute; display: flex; flex-direction: column; align-items: center; font-size: 12px; font-weight: 700; background: var(--ha-card-background, #fff); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--divider-color); cursor: pointer; }
      .overlay-stat.outlet { color: #ef4444; }
      .overlay-stat.inlet { color: #0284c7; }
      .overlay-stat .label { font-size: 10px; color: var(--secondary-text-color); }
      .flow-anim { stroke-dasharray: 8; opacity: 0; }
      .flow-anim.flowing { opacity: 1; animation: flow 1s linear infinite; }
      @keyframes flow { from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; } }

      .stats-row { display: flex; gap: 10px; }
      .stat-inline, .stat-pill-box { flex: 1; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 12px; padding: 10px 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
      .stat-inline-header { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; }
      .stat-pill-lbl { font-size: 11px; color: var(--secondary-text-color); }
      .progress-bar-bg { height: 6px; background: rgba(128,128,128,0.2); border-radius: 999px; overflow: hidden; }
      .progress-bar-bg > div { height: 100%; border-radius: 999px; }

      .controls-container { display: flex; gap: 8px; }
      .recirc-button {
        flex: 1; background: var(--primary-color, #2196f3); color: var(--text-primary-color, #fff); border: none;
        padding: 10px 16px; border-radius: 999px; font-family: inherit; font-weight: 700; font-size: 13px;
        cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .recirc-button.active { background: #16a34a; }
      .button-content { display: flex; flex-direction: column; align-items: flex-start; }
      .sub-label { font-size: 10.5px; opacity: 0.85; font-weight: 500; }
      .settings-btn {
        background: var(--secondary-background-color); border: 1px solid var(--divider-color); color: var(--primary-text-color);
        width: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .settings-drawer { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--divider-color); }
      .step-controller-pill { display: flex; align-items: center; gap: 8px; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 999px; padding: 3px 8px; }
      .pill-btn { background: none; border: none; color: var(--primary-text-color); cursor: pointer; display: flex; padding: 2px; }
      .pill-value { font-weight: 700; font-size: 13px; }
      .timeline-label { font-size: 10.5px; font-weight: 700; color: var(--secondary-text-color); }
      .timeline-track { height: 24px; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 6px; display: flex; overflow: hidden; }
      .timeline-segment { height: 100%; cursor: pointer; }
      .timeline-empty { width: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--secondary-text-color); }
      .timeline-axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--secondary-text-color); }
      .segment-info { text-align: center; font-size: 12px; font-weight: 600; color: var(--primary-color); }

      /* ORBIT B-HYVE DIAL */
      .ring-container { display: flex; justify-content: center; padding: 6px 0; }
      .ring-slider { position: relative; width: 156px; height: 156px; touch-action: none; cursor: pointer; }
      .ring-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .ring-value { font-size: 2.3rem; font-weight: 800; line-height: 1; }
      .ring-label { font-size: 11px; color: var(--secondary-text-color); font-weight: 700; }

      /* MODAL POPUP SHELL */
      .popup-overlay {
        position: fixed; inset: 0; background: var(--mdc-dialog-scrim-color, rgba(0,0,0,0.45));
        backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 9999;
      }
      .popup-content {
        background: var(--ha-card-background, var(--card-background-color, #fff)); color: var(--primary-text-color);
        border: 1px solid var(--divider-color); border-radius: 24px; width: min(94vw, 520px); max-height: 88vh;
        padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 20px 48px rgba(0,0,0,0.35); box-sizing: border-box;
      }
      .drag-handle { display: none; }
      .popup-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .popup-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .popup-title-stack h3 { margin: 0; font-size: 16px; font-weight: 700; }
      .popup-header-sub { font-size: 12px; color: var(--secondary-text-color); }
      .close-button { background: none; border: none; padding: 6px; border-radius: 50%; color: var(--primary-text-color); cursor: pointer; display: flex; }

      .unit-select-bar { display: flex; align-items: center; gap: 8px; }
      .passable-select-row {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 7px 9px; border-radius: 10px; background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color); font-size: 12.5px;
      }
      .select-row-label { display: flex; align-items: center; gap: 7px; font-weight: 600; min-width: 0; }
      .select-row-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .select-wrap { position: relative; display: inline-flex; align-items: center; }
      .select-wrap.full { flex: 1; width: 100%; }
      .passable-select {
        appearance: none; -webkit-appearance: none;
        padding: 6px 28px 6px 10px; border-radius: 9px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(128,128,128,0.1));
        color: var(--primary-text-color); font-family: inherit; font-size: 12.5px; font-weight: 700;
        cursor: pointer; max-width: 210px; text-overflow: ellipsis;
      }
      .select-wrap.full .passable-select { width: 100%; max-width: 100%; }
      .select-chevron { position: absolute; right: 7px; pointer-events: none; color: var(--secondary-text-color); --mdc-icon-size: 16px; }

      .preset-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .laundry-cmd-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .cmd-transport-btn {
        display: flex; align-items: center; justify-content: center; gap: 5px;
        padding: 8px 6px; border-radius: 10px; border: 1px solid var(--divider-color);
        background: var(--card-background-color, #fff); color: var(--primary-text-color);
        font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      }
      .cmd-transport-btn ha-icon { --mdc-icon-size: 16px; }
      .cmd-transport-btn.active { background: var(--primary-color, #3b82f6); border-color: var(--primary-color, #3b82f6); color: var(--text-primary-color, #fff); }

      .popup-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: var(--secondary-background-color); padding: 4px; border-radius: 14px; gap: 4px; }
      .popup-tab {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
        padding: 7px 4px; border-radius: 10px; background: transparent; border: none;
        font-family: inherit; color: var(--secondary-text-color); font-size: 11.5px; font-weight: 600; cursor: pointer;
      }
      .popup-tab ha-icon { --mdc-icon-size: 16px; }
      .popup-tab.active-tab { background: var(--primary-color, #3b82f6); color: var(--text-primary-color, #fff); font-weight: 700; }

      .modal-scroll-area { overflow-y: auto; max-height: 64vh; display: flex; flex-direction: column; gap: 10px; padding-right: 3px; }
      .thin-scroll::-webkit-scrollbar { width: 5px; }
      .thin-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.35); border-radius: 999px; }

      .passable-section-card {
        background: var(--secondary-background-color, rgba(128,128,128,0.08));
        border: 1px solid var(--divider-color); border-radius: 16px; padding: 12px 13px; display: flex; flex-direction: column; gap: 9px;
      }
      .passable-section-header { display: flex; justify-content: space-between; align-items: center; }
      .passable-section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
      .temp-dial-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px; }
      .temp-stepper-btn {
        width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--divider-color);
        background: var(--card-background-color, #fff); color: var(--primary-text-color); cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .temp-dial-center { display: flex; flex-direction: column; align-items: center; }
      .temp-main-number { font-size: 2.5rem; font-weight: 800; line-height: 1; }
      .temp-main-caption { font-size: 11px; font-weight: 700; color: var(--secondary-text-color); text-transform: uppercase; }

      .chip-select-row { display: flex; flex-wrap: wrap; gap: 6px; }
      .opt-chip {
        flex: 1; min-width: 72px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--divider-color);
        background: var(--card-background-color, #fff); color: var(--primary-text-color); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .opt-chip.active { background: var(--primary-color, #3b82f6); border-color: var(--primary-color, #3b82f6); color: var(--text-primary-color, #fff); }
      .drawer-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border-radius: 10px; background: var(--card-background-color, #fff); border: 1px solid var(--divider-color); font-size: 12.5px; }
      .switch-pill { border: 1px solid var(--divider-color); padding: 4px 12px; border-radius: 999px; font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer; background: var(--secondary-background-color); color: var(--secondary-text-color); }
      .switch-pill.active { background: var(--primary-color, #3b82f6); border-color: var(--primary-color, #3b82f6); color: var(--text-primary-color, #fff); }

      .tone-good { color: #16a34a; }
      .tone-warn { color: #d97706; }
      .tone-danger { color: #ef4444; }
      .tone-heat { color: #ea580c; }
      .power-off-card, .unit-power-off { opacity: 0.6; }

      @media (max-width: 768px) {
        .popup-overlay { align-items: flex-end; padding: 0; }
        .popup-content { width: 100%; max-width: 100%; border-radius: 24px 24px 0 0; padding-bottom: max(24px, env(safe-area-inset-bottom, 24px)); }
        .drag-handle { display: block; width: 36px; height: 5px; background: var(--secondary-text-color, #888); border-radius: 3px; margin: -2px auto 4px; opacity: 0.6; }
      }
    `;
  }
}

// ===========================================================================
// VISUAL GUI EDITOR (Collapsible Passable Sections + Multi-Appliance Hub)
// ===========================================================================
class PassableApplianceCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  setConfig(config) {
    this.config = config || {};
  }

  _emit(next) {
    this.config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _updateField(key, val) {
    const next = { ...this.config };
    if (val === "" || val === undefined || val === null) delete next[key];
    else next[key] = val;
    this._emit(next);
  }

  _addHubAppliance() {
    const existing = Array.isArray(this.config.appliances) ? [...this.config.appliances] : [];
    existing.push({ appliance_type: "refrigerator", title: "New Appliance" });
    this._emit({ ...this.config, display_mode: "summary", appliances: existing });
  }

  _removeHubAppliance(idx) {
    const existing = [...(this.config.appliances || [])];
    existing.splice(idx, 1);
    const next = { ...this.config };
    if (existing.length === 0) delete next.appliances;
    else next.appliances = existing;
    this._emit(next);
  }

  _updateHubAppliance(idx, field, val) {
    const existing = [...(this.config.appliances || [])];
    if (!existing[idx]) return;
    existing[idx] = { ...existing[idx], [field]: val };
    this._emit({ ...this.config, appliances: existing });
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    const displayMode = c.display_mode === "summary" ? "summary" : "full";
    const rawLayout = String(c.layout || "").toLowerCase();
    const layout = rawLayout === "hero"
      ? "rows"
      : ["compact", "strip", "active", "tiles", "rows", "rings"].includes(rawLayout)
      ? rawLayout
      : Array.isArray(c.appliances) && c.appliances.length > 1
      ? "compact"
      : "rows";
    const defaultStrips = !["compact", "strip"].includes(layout);
    const showHeaderChecked =
      c.show_header !== undefined ? c.show_header !== false : displayMode === "full";
    const hubList = Array.isArray(c.appliances) ? c.appliances : [];

    return html`
      <div class="editor-container">
        <details class="section-card" open>
          <summary class="section-header">Display & Layout</summary>
          <div class="section-content">
            <div class="grid-2">
              <div class="field-col">
                <label class="field-label">Display Mode</label>
                <select
                  class="input-select"
                  .value=${displayMode}
                  @change=${(e) => this._updateField("display_mode", e.target.value)}
                >
                  <option value="full">Full Appliance Graphic (Default)</option>
                  <option value="summary">Compact Summary + Command Center</option>
                </select>
              </div>
              <div class="field-col">
                <label class="field-label">Summary Layout</label>
                <select
                  class="input-select"
                  .value=${layout}
                  @change=${(e) => {
                    const nextLayout = e.target.value;
                    const next = { ...(this.config || {}), layout: nextLayout };
                    if (["compact", "strip"].includes(nextLayout)) {
                      delete next.show_summary_strip;
                      delete next.show_footer_strip;
                    }
                    this._emit(next);
                  }}
                >
                  <option value="compact">Consolidated Hero Card — 1 Summary Tile (Recommended)</option>
                  <option value="strip">Minimal Single Bar — Ultra-Compact 1-Line Strip</option>
                  <option value="active">Active Only — Hide Idle Appliances</option>
                  <option value="tiles">Compact 2-Column Tiles (All Appliances)</option>
                  <option value="rows">Stacked Appliance Rows (All Appliances)</option>
                  <option value="rings">Circular Progress Rings (All Appliances)</option>
                </select>
              </div>
            </div>

            <div class="field-col">
              <label class="field-label">Appliance Type (Single-Appliance Mode)</label>
              <select
                class="input-select"
                .value=${c.appliance_type || "auto"}
                @change=${(e) => this._updateField("appliance_type", e.target.value)}
              >
                <option value="auto">Auto-Detect</option>
                <option value="refrigerator">Refrigerator (Café French-Door)</option>
                <option value="induction_range">Induction Range & Oven</option>
                <option value="laundry">Laundry (Washer & Dryer)</option>
                <option value="water_heater">Water Heater (Navien Tankless)</option>
                <option value="smart_hose_timer">Smart Hose Timer (B-hyve)</option>
              </select>
            </div>

            <ha-textfield
              label="Card Title"
              .value=${c.title || ""}
              @input=${(e) => this._updateField("title", e.target.value)}
            ></ha-textfield>

            <ha-textfield
              label="Default Expanded Drawer (index or 'all')"
              .value=${c.default_expanded_drawer || ""}
              @input=${(e) => this._updateField("default_expanded_drawer", e.target.value)}
            ></ha-textfield>

            <div class="toggle-row">
              <span>Show Card Header</span>
              <ha-switch
                .checked=${showHeaderChecked}
                @change=${(e) => this._updateField("show_header", e.target.checked)}
              ></ha-switch>
            </div>
            <div class="toggle-row">
              <span>Show Summary Strip (Summary Mode)</span>
              <ha-switch
                .checked=${c.show_summary_strip !== undefined ? Boolean(c.show_summary_strip) : defaultStrips}
                @change=${(e) => this._updateField("show_summary_strip", e.target.checked)}
              ></ha-switch>
            </div>
            <div class="toggle-row">
              <span>Show Footer Strip (Summary Mode)</span>
              <ha-switch
                .checked=${c.show_footer_strip !== undefined ? Boolean(c.show_footer_strip) : defaultStrips}
                @change=${(e) => this._updateField("show_footer_strip", e.target.checked)}
              ></ha-switch>
            </div>
            <div class="toggle-row">
              <span>Auto-Discover SPAN Panel Power</span>
              <ha-switch
                .checked=${c.auto_discover_span !== false}
                @change=${(e) => this._updateField("auto_discover_span", e.target.checked)}
              ></ha-switch>
            </div>
          </div>
        </details>

        <details class="section-card">
          <summary class="section-header">Multi-Appliance Hub (${hubList.length || "Single Mode"})</summary>
          <div class="section-content">
            <button type="button" class="btn-add" @click=${() => this._addHubAppliance()}>+ Add Appliance Tile</button>
            ${hubList.map(
              (item, idx) => html`
                <div class="hub-row">
                  <select
                    class="input-select"
                    .value=${item.appliance_type || "refrigerator"}
                    @change=${(e) => this._updateHubAppliance(idx, "appliance_type", e.target.value)}
                  >
                    <option value="refrigerator">Refrigerator</option>
                    <option value="induction_range">Induction Range</option>
                    <option value="laundry">Laundry</option>
                    <option value="water_heater">Water Heater</option>
                    <option value="smart_hose_timer">Hose Timer</option>
                  </select>
                  <input
                    class="input-select"
                    .value=${item.title || ""}
                    placeholder="Tile Title"
                    @input=${(e) => this._updateHubAppliance(idx, "title", e.target.value)}
                  />
                  <button type="button" class="btn-del" @click=${() => this._removeHubAppliance(idx)}>×</button>
                </div>
              `
            )}
          </div>
        </details>

        <details class="section-card">
          <summary class="section-header">SPAN & Primary Entity Overrides</summary>
          <div class="section-content">
            <ha-entity-picker
              .hass=${this.hass}
              .value=${c.power_sensor || ""}
              .label=${"SPAN Power Sensor (W)"}
              .includeDomains=${["sensor"]}
              @value-changed=${(e) => this._updateField("power_sensor", e.detail?.value)}
              allow-custom-entity
            ></ha-entity-picker>
            <ha-entity-picker
              .hass=${this.hass}
              .value=${c.current_sensor || ""}
              .label=${"SPAN Current Sensor (A)"}
              .includeDomains=${["sensor"]}
              @value-changed=${(e) => this._updateField("current_sensor", e.detail?.value)}
              allow-custom-entity
            ></ha-entity-picker>
          </div>
        </details>
      </div>
    `;
  }

  static get styles() {
    return css`
      .editor-container { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
      .section-card { border: 1px solid var(--divider-color); border-radius: 10px; background: var(--secondary-background-color, rgba(128,128,128,0.06)); }
      .section-header { padding: 11px 14px; font-weight: 700; font-size: 13px; cursor: pointer; }
      .section-content { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--divider-color); }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .field-col { display: flex; flex-direction: column; gap: 4px; }
      .field-label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
      .input-select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--card-background-color, #fff); color: var(--primary-text-color); font-family: inherit; width: 100%; box-sizing: border-box; }
      .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; }
      .hub-row { display: grid; grid-template-columns: 1fr 1fr 34px; gap: 6px; align-items: center; }
      .btn-add { background: var(--primary-color, #3b82f6); color: #fff; border: none; border-radius: 8px; padding: 7px 12px; font-weight: 700; cursor: pointer; }
      .btn-del { background: transparent; border: 1px solid var(--error-color, #ef4444); color: var(--error-color, #ef4444); border-radius: 8px; height: 34px; cursor: pointer; font-weight: 700; }
      ha-textfield, ha-entity-picker { display: block; width: 100%; }
    `;
  }
}

if (!customElements.get("passable-appliance-card")) {
  customElements.define("passable-appliance-card", PassableApplianceCard);
}
if (!customElements.get("passable-appliance-card-editor")) {
  customElements.define("passable-appliance-card-editor", PassableApplianceCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "passable-appliance-card",
  name: "Passable Appliance Card",
  preview: true,
  documentationURL: "https://github.com/GBear09/passable-appliance-card",
  description:
    "Passable design-system appliance suite supporting Café Refrigerator & Induction Range, LG ThinQ Laundry, Navien Tankless Water Heater, and Orbit B-hyve Hose Timer in Full Graphic or Summary Hub modes.",
});
