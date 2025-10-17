# FDS_TMS — Context (Codex Operational Brief)

**Purpose (for Codex):** ship a deterministic, modular **Traffic Management System** for FDS, with bounded tick cost, clear debugging, and clean seams to providers (FGEAR now) and Scoring (external).  
**Scope:** TMS runtime + editor authoring + optional FGEAR bridge + scoring bridge. **Not** global FPS tuning or full physics.

---

## 0) Snapshot

### What’s Done (stable)
- **Pluginization & Module Split:** Runtime vs Editor separation; plugin boots via `FDS_TMS.uplugin`.  
- **Provider Seam:** `IFDS_TMS_VehicleProvider` + default **FGEAR** implementation; selectable via `fds.tms.vehicle.provider`.  
- **World/Registry:** `UFDS_TMS_WorldSubsystem` + `UFDS_TMS_TrafficRegistrySubsystem` as source of truth (no world scans).  
- **Tick Budgeting:** Manager runs on timer, aborts early if over budget; fixed-rate determinism posture.  
- **Lane Checker (initial):** Player-side component emits wrong-way / off-lane / grazing events (editor preview available).

### Current Situation (truths Codex must preserve)
- Provider seam must remain clean; **no FGEAR headers** outside bridge.  
- Editor-only utilities are gated with `#if WITH_EDITOR`.  
- Debug is centralized under `fds.tms.*` CVars & log categories.  
- TMS owns **its** time slice: target ≤ **1 ms avg per tick** at normal density.

### What’s Changing Now
- **Scoring is a separate plugin.** TMS will only publish **events** and (optionally) host a tiny **ScoringBridge** component to forward penalties.  
- Large functional pushes:
  1. **Debug Lane Draw** (clear, togglable)  
  2. **Spline Generation & Cleanup** (junction-aware, auto-connect)  
  3. **Traffic Light Phasing** (multi-junction cycles)  
  4. **AI Driving Behavior** (polite baseline + lane change etiquette + chaos tuning; motorcycles later)  
  5. **TMS⇄Scoring Bridge** (unified penalty surface)  
  6. **Real Traffic System** (100+ logical vehicles, 5-ish rendered near player)  
  7. **Pedestrian Manager** (simple crosswalk logic; render-culled)

---

## 1) Modules (authoritative)

```txt
/Plugins/FDS_TMS
  /FDS_TMS_Core            # subsystems, registry, provider API, CVars/logs
  /FDS_TMS_TrafficRuntime  # manager, AutoDrive, lane/LOD/despawn, compliance checks
  /FDS_TMS_SignalsRuntime  # traffic lights, walls, junction topology + phases
  /FDS_TMS_FGEARBridge     # provider impl for FGEAR (optional at build/runtime)
  /FDS_TMS_Editor          # baking, spline tools, debug overlays & CallInEditor

# Separate repo/plugin:
Plugins/FDS_Scoring        # scoring runtime, UI, analytics, persistence (out of TMS)

# Thin coupling (inside TMS):
FDS_TMS_ScoringBridge.h/.cpp  # emits events & optional forwarders; no scoring logic here
```

**Cross-module rules:**  
- Runtime modules depend only on **Core**.  
- **No** FGEAR includes outside `FGEARBridge`.  
- TMS does **not** depend on `FDS_Scoring`; Bridge uses **interfaces/events** only.

---

## 2) Guardrails (do not regress)
- ❌ No `GetAllActorsOfClass` in runtime paths.  
- ⚙️ Timer-driven manager; fixed tick where needed; seeded RNG for reproducibility.  
- ⚙️ Always validate weak refs from the registry.  
- ⚙️ Debug toggles via `fds.tms.debug.*`; no hidden editor-time side effects.  
- ⚙️ Runtime compiles standalone; FGEAR is optional via provider selection.

---

## 3) Design Details for the Next Work

### (1) Debug Lane Draw (Editor-only)
- **Goal:** crisp, per-lane overlays to validate lane metadata & road type.  
- **API:** `AFDS_TMS_TrafficManager::PreviewLaneDebug(CallInEditor=true)` accepts filters: road type, lane id, direction.  
- **Render:** `PDI->DrawLine` + `DrawDirectionalArrow` with width scaling by lane class; labels show `LaneId`, `Dir`, `SpeedLimit`, `ChangePolicy`.  
- **CVar:** `fds.tms.debug.lanes=0/1/2` (off/basic/full).  
- **Acceptance:** lanes are visually unambiguous in orthographic top-down and perspective views.

### (2) Spline Generation & Cleanup
**Goal:** automatic lane splines that correctly connect through **4-way** and **T-junctions**, with merge/cleanup passes.

- **Topology detection:**  
  - Build junction signature from lane endpoints within ε radius; degree 3 = T-junction, degree 4 = cross; >4 = complex.  
- **Connection rules (per approach lane):**  
  - Always connect to **same-direction forward** lane (straight).  
  - If permitted, connect **right** and **left** turn lanes (two curved splines).  
- **Auto-joint connectors:** if an orphan road edge abuts an existing road within ε and headings align within θ°, spawn connector splines.  
- **Auto-merge touching splines:** touching or overlapping splines with matching lane attrs are merged into a single longer spline segment.  
- **Cleanup button:** decimates redundant control points using RDP (Ramer–Douglas–Peucker) with curvature guard; straight segments collapse to 2 points.  
- **CVars:**  
  - `fds.tms.spline.auto_connect=1`  
  - `fds.tms.spline.merge_epsilon=50cm`  
  - `fds.tms.spline.decimate_epsilon=5cm`  
- **Acceptance:** straight roads reduce to 2 points; junctions produce 1 straight + up to 2 turn splines per approach when allowed.

### (3) Traffic Light Phasing
- **Asset:** `UFDS_TMS_SignalPhaseAsset` with cycles per junction (min green, yellow, all-red clearance, pedestrian phase).  
- **Controller:** `AFDS_TMS_JunctionSignalController` owns lanes→phase mapping; emits **state** (R/Y/G) events to lanes.  
- **Strategy:** start with **fixed-time** cycles; future upgrade path for adaptive timing.  
- **CVar:** `fds.tms.signals.mode=fixed` (future: `adaptive`).  
- **Acceptance:** vehicles respect red; no opposing greens on conflicting movements; pedestrian phase holds turning vehicles.

### (4) AI Driving Behavior
- **Spawner spec:** array of blueprint classes with `{Rarity, MaxActive, Tag}`.  
- **Behavior params:**  
  - `Patience` (time-gap tolerance), `Courtesy` (yield propensity), `Aggression`, `SignalDiscipline`.  
  - **Chaos** scalar multiplies deviations from polite baseline.  
- **Lane change etiquette:**  
  - Always indicate first; check target-lane window; abort if density > threshold; allow “slip-in” only if `Aggression` high and gap > min.  
- **Acceptance:** polite defaults, realistic signaling, no lane change into a full lane; chaos visibly increases hesitations/cut-ins.

### (5) TMS ⇄ Scoring Bridge (rename + surface)
- **Rename:** keep `UFDS_TMS_LaneCheckerComponent` for adherence telemetry.  
- **Add:** `UFDS_TMS_ScoringBridgeComponent` (single component on player car) exposes **penalty events**:  
  - Lane: wrong-way, continuous line cross, illegal lane change, no signal.  
  - Signals: red-light violation, rolling stop.  
  - Collisions: impact/graze with AI/props.  
- **Interface-only:** Bridge fires `OnPenalty(FPenaltyEvent)` multicast; the **Scoring** plugin listens and records—TMS remains agnostic.  
- **Acceptance:** all penalties routable without hard dependency on Scoring.

### (6) Real Traffic System (scale up + render budget)
- **Logical cap:** **100–200** active simulated vehicles world-wide.  
- **Render cap near player:** **~5** fully simulated & rendered; others culled or downgraded (LOD 0→2, then culled).  
- **Spawn/Despawn:** per-lane spawn points w/ safe radius; despawn at sinks or beyond far clip; never pop in within camera frustum.  
- **LOD scheduler:** distance and occlusion-aware intervals; physics throttled for far LODs (or actor disabled).  
- **Acceptance:** stable ~1 ms tick; no obvious popping; registry always consistent.

### (7) Crowd / Pedestrian Manager
- **Splines:** dedicated pedestrian splines with crosswalk tags.  
- **When:** spawn on pedestrian phase; despawn on end or when out of range.  
- **Params:** crowd intensity, mesh set, idle anim set.  
- **Acceptance:** pedestrians wait; cross on walk; render-culled when player far.

---

## 4) Public API & CVars (delta you can rely on)
- **Subsystems:**  
  - `UFDS_TMS_WorldSubsystem::GetVehicleProvider()`  
  - `UFDS_TMS_TrafficRegistrySubsystem::FindLaneById(...)`
- **Manager:**  
  - `AFDS_TMS_TrafficManager::PreviewLaneDebug(...)` *(Editor)*  
- **Components:**  
  - `UFDS_TMS_LaneCheckerComponent` (telemetry)  
  - `UFDS_TMS_ScoringBridgeComponent` (events for scoring)
- **CVars (non-exhaustive):**  
  - `fds.tms.tickrate` (Hz)  
  - `fds.tms.debug.lanes` (0/1/2)  
  - `fds.tms.spline.*` (connect/merge/decimate)  
  - `fds.tms.signals.mode` (`fixed`)  
  - `fds.tms.max.logical_vehicles` (default 120)  
  - `fds.tms.max.rendered_near_player` (default 5)

---

## 5) Acceptance Criteria (agent-checkable)

| Area | Must Hold |
|---|---|
| **Budget** | ≤ **1 ms** avg TMS tick at normal density on target machine. |
| **Lanes** | Editor overlay clearly shows lane direction/type; straight roads auto-decimate to 2 points. |
| **Junctions** | 4-way & T-junctions emit correct straight/left/right connections when allowed. |
| **Signals** | No conflicting greens; pedestrian phase respected; vehicles stop on red. |
| **Behavior** | Polite baseline w/ proper signaling; chaos knob produces visible variance without deadlocks. |
| **Traffic Scale** | 100–200 logical vehicles; ≤5 rendered near player; no visible pop-in. |
| **Bridge** | All penalties emitted through `ScoringBridge` without linking Scoring plugin. |
| **Provider** | Runs with or without FGEAR by switching provider CVar. |

---

## 6) Immediate Work Orders (M0 → M1)

**M0 (today)**
1. **Debug Lane Draw:** implement overlay & CVar; label set; filters.  
2. **Spline Cleanup Tool:** RDP decimator + merge pass; `CallInEditor` button.  
3. **ScoringBridge:** implement component + events; hook LaneChecker & signals.  
4. **Traffic Light (fixed-time):** junction controller + phase asset + per-lane state feed.

**M1 (next)**
5. **Auto-Connect Generator:** junction detection + straight/turn spline creation + orphan jointing.  
6. **AI Behavior Pass 1:** polite defaults, signaling discipline, safe gap logic; chaos scalar.  
7. **Traffic Scaling:** registry-driven spawner/collector, LOD bands, near-player render cap.  
8. **Pedestrians v0:** crosswalk splines; spawn on walk; cull with distance.

**Telemetry & QA for both M0/M1**
- Add cycle of automated previews/screenshots for lanes & phases.  
- Log tick micro-timings; assert registry invariants each tick in `-dev` builds.

---

## 7) Naming Decisions

- Keep: `UFDS_TMS_LaneCheckerComponent` (clear purpose: lane adherence telemetry).  
- New: `UFDS_TMS_ScoringBridgeComponent` (single surface for penalties/events).  
- Junction controller: `AFDS_TMS_JunctionSignalController`.  
- Phase data: `UFDS_TMS_SignalPhaseAsset`.

---

## 8) Non-Goals (explicit)
- Scoring logic, UI, or data persistence (lives in **FDS_Scoring**).  
- Full motorcycle logic (planned after car behaviors stabilize).  
- Global FPS / renderer optimization beyond TMS’s own budget.

---

## 9) Revision Notes
- **2025-10-16:** This brief supersedes older context items that embedded scoring into TMS; scoring is now external, with only a Bridge in TMS. Junction-aware spline generation, fixed-time signals, and traffic scale targets added as top priorities.

