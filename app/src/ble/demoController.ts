/**
 * Ware - demo controller
 *
 * A pure-JS simulator of the EGBLE firmware, used for Demo Mode: it accepts the
 * same JSON command packets the real controller does, keeps six channels of
 * fake state, and animates their levels so every screen works with no hardware
 * attached. This lets a first-time user (and an App Review tester) see the full
 * app without a controller, and makes screenshots easy.
 *
 * It exposes the same method surface as the BLE controller (bleManager), so the
 * store can swap between the two transparently.
 */

import { BleCallbacks } from './bleManager';
import { DeviceState, ChannelState, SceneList, BatteryState } from './protocol';
import { PatternConfig, PatternType, DEFAULT_PATTERN } from '../constants/patterns';

interface DemoChannel {
  enabled: boolean;
  groupId: number;
  scale: number;
  cfg: PatternConfig;
  startMs: number;
  flameLevel: number;
  flameTarget: number;
  flameNextMs: number;
}

const BUILTINS = ['Fade 6s', 'Bike Vest', 'Retail Sequence', 'SOS', 'All On', 'All Off'];

function frac(bri: number, num: number, den: number): number {
  if (den <= 0) return bri;
  return Math.min(255, Math.round((bri * num) / den));
}

class DemoController {
  private cb: BleCallbacks | null = null;
  private channels: DemoChannel[] = [];
  private slots: (string | null)[] = new Array(8).fill(null);
  private timer: ReturnType<typeof setInterval> | null = null;
  private batStartMs = 0;

  init(cb: BleCallbacks) {
    this.cb = cb;
  }

  /** Enter demo mode: fabricate a connected controller and start animating. */
  connect() {
    this.channels = Array.from({ length: 6 }, () => ({
      enabled: true,
      groupId: 0,
      scale: 100,
      cfg: { ...DEFAULT_PATTERN, type: 'FADE_PULSE', fadeInMs: 3000, holdMs: 0, fadeOutMs: 3000, gapMs: 0 },
      startMs: Date.now(),
      flameLevel: 0,
      flameTarget: 0,
      flameNextMs: 0,
    }));
    this.batStartMs = Date.now();
    this.cb?.onStatus('connected', 'Demo Controller');
    this.emitScenes();
    this.emitState();
    if (!this.timer) this.timer = setInterval(() => this.emitState(), 120);
  }

  disconnect() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.cb?.onStatus('idle');
  }

  // These exist so the interface matches bleManager; scanning is a no-op in demo.
  startScan() {}
  stopScan() {}

  async sendCommand(json: string): Promise<void> {
    this.handle(json);
    this.emitState();
  }

  async sendScene(json: string): Promise<void> {
    this.handle(json);
    this.emitScenes();
    this.emitState();
  }

  async readState(): Promise<void> {
    this.emitState();
  }

  async readScenes(): Promise<void> {
    this.emitScenes();
  }

  // ---- Command handling (mirrors the firmware) ----

  private cfgFromJson(o: any): PatternConfig {
    const c: PatternConfig = { ...DEFAULT_PATTERN };
    const t = o.type as PatternType | undefined;
    if (t) c.type = t;
    for (const k of ['bri', 'onMs', 'offMs', 'fadeInMs', 'holdMs', 'fadeOutMs', 'gapMs', 'stepMs', 'overlapMs'] as const) {
      if (typeof o[k] === 'number') (c as any)[k] = o[k];
    }
    return c;
  }

  private setChannelPattern(ch: DemoChannel, cfg: PatternConfig) {
    ch.cfg = cfg;
    ch.startMs = Date.now();
    ch.flameNextMs = 0;
    ch.flameLevel = 0;
  }

  private handle(json: string) {
    let o: any;
    try {
      o = JSON.parse(json);
    } catch {
      return;
    }
    switch (o.cmd) {
      case 'pattern': {
        const cfg = this.cfgFromJson(o);
        if (o.all) this.channels.forEach((c) => this.setChannelPattern(c, cfg));
        else if (typeof o.grp === 'number')
          this.channels.forEach((c) => c.groupId === o.grp && this.setChannelPattern(c, cfg));
        else if (typeof o.ch === 'number' && this.channels[o.ch])
          this.setChannelPattern(this.channels[o.ch], cfg);
        break;
      }
      case 'enable':
        if (this.channels[o.ch]) this.channels[o.ch].enabled = !!o.on;
        break;
      case 'group':
        if (this.channels[o.ch]) this.channels[o.ch].groupId = o.gid ?? 0;
        break;
      case 'scale':
        if (this.channels[o.ch]) this.channels[o.ch].scale = Math.max(0, Math.min(100, o.pct ?? 100));
        break;
      case 'trigger': {
        const map: Record<string, PatternConfig> = {
          sos: { ...DEFAULT_PATTERN, type: 'SOS', onMs: 200 },
          left: { ...DEFAULT_PATTERN, type: 'TURN_SIGNAL', onMs: 180, offMs: 180 },
          right: { ...DEFAULT_PATTERN, type: 'TURN_SIGNAL', onMs: 180, offMs: 180 },
          stop: { ...DEFAULT_PATTERN, type: 'OFF' },
        };
        const cfg = map[o.action];
        if (cfg) this.channels.forEach((c) => this.setChannelPattern(c, cfg));
        break;
      }
      case 'scene':
        this.handleScene(o);
        break;
    }
  }

  private handleScene(o: any) {
    if (o.action === 'recall') this.applyBuiltin(o.name);
    else if (o.action === 'save' && typeof o.slot === 'number') this.slots[o.slot] = o.name ?? 'Scene';
    else if (o.action === 'delete' && typeof o.slot === 'number') this.slots[o.slot] = null;
    else if (o.action === 'load') this.applyBuiltin('Fade 6s'); // demo: slots replay a pleasant default
  }

  private applyBuiltin(name: string) {
    const all = (cfg: PatternConfig) => this.channels.forEach((c) => { c.groupId = 0; this.setChannelPattern(c, cfg); });
    switch (name) {
      case 'All On': all({ ...DEFAULT_PATTERN, type: 'SOLID', bri: 255 }); break;
      case 'All Off': all({ ...DEFAULT_PATTERN, type: 'OFF' }); break;
      case 'SOS': all({ ...DEFAULT_PATTERN, type: 'SOS', onMs: 200 }); break;
      case 'Fade 6s': all({ ...DEFAULT_PATTERN, type: 'FADE_PULSE', fadeInMs: 3000, holdMs: 0, fadeOutMs: 3000, gapMs: 0 }); break;
      case 'Retail Sequence':
        this.channels.forEach((c) => { c.groupId = 1; this.setChannelPattern(c, { ...DEFAULT_PATTERN, type: 'SEQUENCE', stepMs: 220, overlapMs: 90 }); });
        break;
      case 'Bike Vest':
        this.channels.forEach((c, i) => {
          c.groupId = i < 3 ? 1 : 2;
          this.setChannelPattern(c, i < 3
            ? { ...DEFAULT_PATTERN, type: 'SOLID', bri: 200 }
            : { ...DEFAULT_PATTERN, type: 'FADE_PULSE', fadeInMs: 800, holdMs: 200, fadeOutMs: 1000, gapMs: 300 });
        });
        break;
    }
  }

  // ---- Level animation (mirrors the firmware pattern engine) ----

  private computeLevel(ch: DemoChannel, idx: number, now: number): number {
    if (!ch.enabled) return 0;
    const c = ch.cfg;
    const t = now - ch.startMs;
    switch (c.type) {
      case 'OFF': return 0;
      case 'SOLID': return c.bri;
      case 'BLINK':
      case 'TURN_SIGNAL': {
        const p = c.onMs + c.offMs;
        return p === 0 ? c.bri : (t % p) < c.onMs ? c.bri : 0;
      }
      case 'FADE_PULSE': {
        const p = c.fadeInMs + c.holdMs + c.fadeOutMs + c.gapMs;
        if (p === 0) return c.bri;
        let ph = t % p;
        if (ph < c.fadeInMs) return frac(c.bri, ph, c.fadeInMs);
        ph -= c.fadeInMs;
        if (ph < c.holdMs) return c.bri;
        ph -= c.holdMs;
        if (ph < c.fadeOutMs) return frac(c.bri, c.fadeOutMs - ph, c.fadeOutMs);
        return 0;
      }
      case 'SOS': {
        const seg = [1, 1, 1, 1, 1, 3, 3, 1, 3, 1, 3, 3, 1, 1, 1, 1, 1, 7];
        const on = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
        const unit = c.onMs || 200;
        const total = seg.reduce((a, b) => a + b, 0) * unit;
        const pos = t % total;
        let acc = 0;
        for (let i = 0; i < seg.length; i++) {
          acc += seg[i] * unit;
          if (pos < acc) return on[i] ? c.bri : 0;
        }
        return 0;
      }
      case 'SEQUENCE': {
        const members = this.channels
          .map((c2, i) => ({ c2, i }))
          .filter((m) => m.c2.enabled && m.c2.groupId === ch.groupId && m.c2.cfg.type === 'SEQUENCE');
        const n = members.length;
        const k = members.findIndex((m) => m.i === idx);
        if (n === 0 || c.stepMs === 0 || k < 0) return 0;
        const period = n * c.stepMs;
        const pos = now % period;
        const start = k * c.stepMs;
        const end = start + c.stepMs + c.overlapMs;
        let on = pos >= start && pos < end;
        if (!on && end > period) on = pos < end - period;
        return on ? c.bri : 0;
      }
      case 'FLAME': {
        const interval = c.onMs || 80;
        if (now >= ch.flameNextMs) {
          const lo = Math.round((c.bri * 45) / 100);
          ch.flameTarget = lo + Math.floor(Math.random() * (c.bri - lo + 1));
          ch.flameNextMs = now + interval / 2 + Math.random() * interval;
        }
        const delta = ch.flameTarget - ch.flameLevel;
        ch.flameLevel += Math.trunc(delta / 4) || (delta > 0 ? 1 : delta < 0 ? -1 : 0);
        return Math.max(0, Math.min(255, ch.flameLevel));
      }
      default:
        return 0;
    }
  }

  // Demo battery: drains ~1% every 2s and wraps, so a show-floor demo cycles
  // through the white / orange / red tiers over a couple of minutes.
  private demoBattery(now: number): BatteryState {
    let pct = 95 - Math.floor((now - this.batStartMs) / 2000);
    pct = ((pct % 100) + 100) % 100;
    return { present: true, pct, charging: false };
  }

  private buildState(): DeviceState {
    const now = Date.now();
    const channels: ChannelState[] = this.channels.map((ch, i) => ({
      enabled: ch.enabled,
      groupId: ch.groupId,
      pattern: ch.cfg.type,
      bri: ch.cfg.bri,
      scale: ch.scale,
      level: this.computeLevel(ch, i, now),
    }));
    return { version: 'demo', channels, battery: this.demoBattery(now) };
  }

  private emitState() {
    this.cb?.onState(this.buildState());
  }

  private emitScenes() {
    const scenes: SceneList = {
      builtins: BUILTINS,
      slots: this.slots.map((name, slot) => ({ slot, name })),
    };
    this.cb?.onScenes(scenes);
  }
}

export const demo = new DemoController();
