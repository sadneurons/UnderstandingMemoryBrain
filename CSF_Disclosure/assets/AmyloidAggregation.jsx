// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            width, height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite,
  Stage, PlaybackBar,
});




// ============================================================================
//  Amyloid-β 1–42 aggregation — monomers → soluble oligomer  (tweakable)
//  Props: moleculeCount, durationSec, textPosition('bottom'|'overlay')
//  Timeline is expressed as fractions of the total duration, so the piece
//  retimes cleanly to any length.
// ============================================================================

const N = 11;                 // backbone beads per coarse-grained monomer
const WCX = 960, WCY = 540;
const ROW_SPACING = 33;
const STRAND_STEP = 24, STRAND_AMP = 7;

function _lerp(a, b, t) { return a + (b - a) * t; }
function _hash(s) { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const STRAND = (() => {
  const p = [];
  for (let i = 0; i < N; i++) p.push({ x: (i - (N - 1) / 2) * STRAND_STEP, y: (i % 2 ? STRAND_AMP : -STRAND_AMP) });
  return p;
})();

function makeCoil(seed) {
  const pts = []; let ang = _hash(seed) * 6.2832, x = 0, y = 0;
  for (let i = 0; i < N; i++) {
    pts.push({ x, y });
    ang += (_hash(seed + i * 1.37) - 0.5) * 2.4;
    x += Math.cos(ang) * 19; y += Math.sin(ang) * 19;
  }
  const cx = pts.reduce((a, p) => a + p.x, 0) / N, cy = pts.reduce((a, p) => a + p.y, 0) / N;
  return pts.map(p => ({ x: p.x - cx, y: p.y - cy }));
}

// Six monomers dock (centre-out) into a 6-strand β-sheet. Dock windows are
// fractions of the total duration.
const DOCKERS = [
  { row: 3, dsF: 0.22, deF: 0.31, home: { x: 770,  y: 565 } },
  { row: 2, dsF: 0.24, deF: 0.33, home: { x: 1150, y: 520 } },
  { row: 4, dsF: 0.37, deF: 0.46, home: { x: 745,  y: 755 } },
  { row: 1, dsF: 0.45, deF: 0.54, home: { x: 1175, y: 340 } },
  { row: 5, dsF: 0.57, deF: 0.66, home: { x: 980,  y: 815 } },
  { row: 0, dsF: 0.66, deF: 0.75, home: { x: 980,  y: 255 } },
];

// Spread free monomers around the field, avoiding the central sheet zone.
function freeHome(i) {
  const a = _hash(i * 1.9) * 6.2832;
  const rad = 340 + _hash(i * 2.7) * 250;
  let x = WCX + Math.cos(a) * rad * 1.4;
  let y = WCY + Math.sin(a) * rad;
  return { x: clamp(x, 150, 1770), y: clamp(y, 130, 950) };
}

function buildMonomers(count) {
  const dockers = DOCKERS.map((d, i) => ({ ...d, dock: true, id: i }));
  const nFree = Math.max(0, count - dockers.length);
  const frees = Array.from({ length: nFree }, (_, i) => ({ home: freeHome(i + 1), dock: false, row: null, id: 100 + i }));
  return [...dockers, ...frees].map((m) => {
    const s = m.id + 1;
    return {
      ...m, coil: makeCoil(s * 3.3), phase: _hash(s) * 6.2832,
      baseRot: _hash(s + 9) * 360, spin: (_hash(s + 5) - 0.5) * 7,
      baseHue: 196 + (_hash(s + 2) - 0.5) * 16, driftA: 24 + _hash(s + 7) * 14,
    };
  });
}

function freeCenter(m, t) {
  return {
    x: m.home.x + Math.sin(t * 0.55 + m.phase) * m.driftA + Math.cos(t * 0.27 + m.phase * 1.7) * 16,
    y: m.home.y + Math.cos(t * 0.47 + m.phase * 1.3) * m.driftA * 0.85 + Math.sin(t * 0.33 + m.phase) * 14,
  };
}
function rowY(row) { return WCY + (row - 2.5) * ROW_SPACING; }

function monomerState(m, t, dur) {
  const ds = (m.dsF || 0) * dur, de = (m.deF || 0) * dur;
  if (!m.dock || t <= ds) {
    const c = freeCenter(m, t);
    return { center: c, rot: m.baseRot + t * m.spin, morph: 0, glow: 0 };
  }
  const target = { x: WCX, y: rowY(m.row) };
  if (t < de) {
    const raw = (t - ds) / (de - ds);
    const p = Easing.easeInOutCubic(clamp(raw, 0, 1));
    const start = freeCenter(m, ds);
    let nr = ((m.baseRot + ds * m.spin) % 360 + 360) % 360; if (nr > 180) nr -= 360;
    return {
      center: { x: _lerp(start.x, target.x, p), y: _lerp(start.y, target.y, p) },
      rot: _lerp(nr, 0, p),
      morph: Easing.easeInOutCubic(clamp(raw * 1.05, 0, 1)),
      glow: Math.sin(clamp(raw, 0, 1) * Math.PI),
    };
  }
  const br = Math.sin(t * 1.3 + m.phase);
  return { center: { x: target.x, y: target.y + br * 0.7 }, rot: Math.sin(t * 0.6 + m.phase) * 0.8, morph: 1, glow: 0 };
}

function Molecule({ m, t, dur }) {
  const st = monomerState(m, t, dur);
  const bonds = [], beads = [];
  let prev = null;
  for (let i = 0; i < N; i++) {
    const cp = m.coil[i], sp = STRAND[i];
    const x = _lerp(cp.x, sp.x, st.morph), y = _lerp(cp.y, sp.y, st.morph);
    const hue = m.baseHue - (i / (N - 1)) * 30;
    if (prev) {
      const dx = x - prev.x, dy = y - prev.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
      bonds.push(React.createElement('div', { key: 'b' + i, style: {
        position: 'absolute', left: prev.x, top: prev.y, width: len, height: 4,
        background: 'hsla(' + (((hue + prev.hue) / 2) | 0) + ',45%,52%,0.55)', borderRadius: 2,
        transform: 'rotate(' + ang + 'deg)', transformOrigin: '0 50%', marginTop: -2,
      } }));
    }
    const glow = 6 + st.glow * 16;
    beads.push(React.createElement('div', { key: 'd' + i, style: {
      position: 'absolute', left: x - 11, top: y - 11, width: 22, height: 22, borderRadius: '50%',
      background: 'radial-gradient(circle at 33% 30%, hsl(' + hue + ' 85% 86%), hsl(' + hue + ' 72% 55%) 45%, hsl(' + hue + ' 78% 26%) 100%)',
      boxShadow: '0 0 ' + glow + 'px hsla(' + hue + ',85%,62%,' + (0.35 + st.glow * 0.4) + '), inset 0 0 4px hsla(' + hue + ',80%,90%,0.5)',
    } }));
    prev = { x, y, hue };
  }
  return React.createElement('div', {
    style: { position: 'absolute', left: st.center.x, top: st.center.y, transform: 'rotate(' + st.rot + 'deg)', transformOrigin: '0 0' },
  }, ...bonds, ...beads);
}

function HBonds({ t, dur }) {
  const dashes = [];
  for (let r = 0; r < 5; r++) {
    const a = DOCKERS.find(d => d.row === r), b = DOCKERS.find(d => d.row === r + 1);
    if (!a || !b) continue;
    const ready = Math.max(a.deF, b.deF) * dur;
    const op = clamp((t - ready) / 0.9, 0, 1) * 0.5;
    if (op <= 0) continue;
    const yA = rowY(r), yB = rowY(r + 1);
    for (let i = 0; i < N; i++) {
      const x = WCX + STRAND[i].x;
      const y1 = yA + STRAND[i].y, y2 = yB + STRAND[i].y;
      const top = Math.min(y1, y2), h = Math.abs(y2 - y1);
      dashes.push(React.createElement('div', { key: r + '_' + i, style: {
        position: 'absolute', left: x - 1, top: top, width: 2, height: h,
        borderLeft: '2px dashed hsla(190,70%,78%,' + op + ')',
      } }));
    }
  }
  return React.createElement('div', { style: { position: 'absolute', inset: 0 } }, ...dashes);
}

const BOKEH = Array.from({ length: 14 }, (_, i) => {
  const s = i + 1;
  return {
    x: _hash(s * 1.7) * 1920, y: _hash(s * 2.3) * 1080, r: 50 + _hash(s * 3.1) * 150,
    hue: 195 + _hash(s * 4.2) * 20, ph: _hash(s * 5.5) * 6.28, a: 0.04 + _hash(s * 6.6) * 0.05,
    spd: 0.05 + _hash(s * 7.7) * 0.08, drift: 30 + _hash(s * 8.8) * 60,
  };
});
function Bokeh({ t }) {
  return React.createElement('div', { style: { position: 'absolute', inset: 0, filter: 'blur(6px)' } },
    BOKEH.map((b, i) => React.createElement('div', { key: i, style: {
      position: 'absolute',
      left: b.x + Math.sin(t * b.spd + b.ph) * b.drift - b.r,
      top: b.y + Math.cos(t * b.spd * 0.8 + b.ph) * b.drift - b.r,
      width: b.r * 2, height: b.r * 2, borderRadius: '50%',
      background: 'radial-gradient(circle, hsla(' + (b.hue | 0) + ',65%,55%,' + b.a + ') 0%, transparent 70%)',
    } })));
}

function cameraState(t, dur) {
  const f = [0, 0.17, 0.27, 0.5, 0.74, 0.9, 1.0];
  const sc = interpolate(f.map(x => x * dur), [1.06, 1.08, 1.5, 1.28, 1.0, 1.0, 0.82], Easing.easeInOutCubic)(t);
  return { sc, tx: Math.sin(t * 0.1) * 8, ty: Math.cos(t * 0.08) * 6 };
}

function fadeIO(lt, dur, ind, outd) {
  if (lt < ind) return clamp(lt / ind, 0, 1);
  if (lt > dur - outd) return clamp((dur - lt) / outd, 0, 1);
  return 1;
}

const BOTTOM = { position: 'absolute', left: 64, bottom: 72 };

function TitleCard({ bottom }) {
  const { localTime, duration } = useSprite();
  const op = fadeIO(localTime, duration, 0.6, 0.7);
  const tx = (1 - Easing.easeOutCubic(clamp(localTime / 0.7, 0, 1))) * -18;
  if (bottom) {
    return React.createElement('div', { style: { ...BOTTOM, opacity: op, transform: 'translateX(' + tx + 'px)' } },
      React.createElement('div', { style: { fontSize: 54, fontWeight: 600, letterSpacing: '-0.02em', color: '#eaf6fb', textShadow: '0 0 30px rgba(90,180,220,0.3)' } }, 'Amyloid-β 1–42'),
      React.createElement('div', { style: { marginTop: 10, fontSize: 20, fontWeight: 400, letterSpacing: '0.05em', color: 'rgba(180,210,225,0.72)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' } }, 'aggregation of the 42-residue peptide')
    );
  }
  const ty = (1 - Easing.easeOutCubic(clamp(localTime / 0.9, 0, 1))) * 14;
  return React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, top: '37%', textAlign: 'center', opacity: op, transform: 'translateY(' + ty + 'px)' } },
    React.createElement('div', { style: { fontSize: 74, fontWeight: 600, letterSpacing: '-0.02em', color: '#eaf6fb', textShadow: '0 0 34px rgba(90,180,220,0.32)' } }, 'Amyloid-β 1–42'),
    React.createElement('div', { style: { marginTop: 14, fontSize: 23, fontWeight: 400, letterSpacing: '0.05em', color: 'rgba(180,210,225,0.72)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' } }, 'aggregation of the 42-residue peptide')
  );
}

function LowerThird({ tag, text, accent }) {
  const { localTime, duration } = useSprite();
  const op = fadeIO(localTime, duration, 0.6, 0.6);
  const tx = (1 - Easing.easeOutCubic(clamp(localTime / 0.7, 0, 1))) * -18;
  const ac = accent || 'hsl(190 75% 60%)';
  return React.createElement('div', { style: { ...BOTTOM, opacity: op, transform: 'translateX(' + tx + 'px)', display: 'flex', alignItems: 'center', gap: 16 } },
    React.createElement('div', { style: { width: 3, height: 46, background: ac, boxShadow: '0 0 12px ' + ac } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(150,185,205,0.7)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 5 } }, tag),
      React.createElement('div', { style: { fontSize: 30, fontWeight: 500, color: '#eaf6fb', letterSpacing: '-0.01em' } }, text)
    )
  );
}

function EndCaption({ bottom }) {
  const { localTime, duration } = useSprite();
  const op = fadeIO(localTime, duration, 0.7, 0.6);
  if (bottom) {
    return React.createElement('div', { style: { ...BOTTOM, opacity: op } },
      React.createElement('div', { style: { fontSize: 38, fontWeight: 500, color: '#eaf6fb', letterSpacing: '-0.01em' } }, 'Soluble oligomer'),
      React.createElement('div', { style: { marginTop: 8, fontSize: 20, color: 'hsl(35 85% 66%)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.03em' } }, 'the principal neurotoxic species')
    );
  }
  return React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, top: '45%', textAlign: 'center', opacity: op } },
    React.createElement('div', { style: { fontSize: 42, fontWeight: 500, color: '#eaf6fb', letterSpacing: '-0.01em' } }, 'Soluble oligomer'),
    React.createElement('div', { style: { marginTop: 12, fontSize: 22, color: 'hsl(35 85% 66%)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.03em' } }, 'the principal neurotoxic species')
  );
}

function Labels({ dur, bottom }) {
  const W = (a, b) => ({ start: a * dur, end: b * dur });
  return React.createElement(React.Fragment, null,
    React.createElement(Sprite, W(0.02, 0.15), React.createElement(TitleCard, { bottom })),
    React.createElement(Sprite, W(0.16, 0.24), React.createElement(LowerThird, { tag: 'Stage 01 · Monomer', text: 'Intrinsically disordered peptide' })),
    React.createElement(Sprite, W(0.25, 0.42), React.createElement(LowerThird, { tag: 'Stage 02 · Nucleation', text: 'β-strand conversion → dimer' })),
    React.createElement(Sprite, W(0.43, 0.73), React.createElement(LowerThird, { tag: 'Stage 03 · Oligomerisation', text: 'β-sheet assembly grows' })),
    React.createElement(Sprite, W(0.74, 0.9), React.createElement(LowerThird, { tag: 'Stage 04 · Soluble oligomer', text: 'Ordered β-sheet core', accent: 'hsl(35 85% 62%)' })),
    React.createElement(Sprite, W(0.9, 1.0), React.createElement(EndCaption, { bottom }))
  );
}

function Readout({ t, bottom }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace', fontSize: 14, letterSpacing: '0.06em', color: 'rgba(150,185,205,0.6)', lineHeight: 1.7 };
  const frame = React.createElement('div', { style: { position: 'absolute', inset: 34, border: '1px solid rgba(120,160,185,0.14)', pointerEvents: 'none' } });
  if (bottom) {
    return React.createElement(React.Fragment, null,
      React.createElement('div', { style: { position: 'absolute', right: 64, bottom: 74, textAlign: 'right', ...mono } },
        React.createElement('div', null, 'Aβ42 · pH 7.4 · 37 °C'),
        React.createElement('div', null, 't = ' + t.toFixed(1) + ' s · self-assembly')
      ),
      frame
    );
  }
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { position: 'absolute', left: 64, top: 54, ...mono } },
      React.createElement('div', null, 'Aβ42 · in vitro'),
      React.createElement('div', null, 'pH 7.4 · 37 °C')
    ),
    React.createElement('div', { style: { position: 'absolute', right: 64, top: 54, textAlign: 'right', ...mono } },
      React.createElement('div', null, 't = ' + t.toFixed(1) + ' s'),
      React.createElement('div', null, 'self-assembly')
    ),
    frame
  );
}

function Content({ monomers, dur, bottom }) {
  const t = useTime();
  const cam = cameraState(t, dur);
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 45%, #0c1116 0%, #070a0e 55%, #04060a 100%)' } }),
    React.createElement(Bokeh, { t }),
    React.createElement('div', { style: { position: 'absolute', inset: 0, transform: 'translate(' + cam.tx + 'px,' + cam.ty + 'px) scale(' + cam.sc + ')', transformOrigin: '960px 540px' } },
      React.createElement(HBonds, { t, dur }),
      ...monomers.map(m => React.createElement(Molecule, { key: m.id, m, t, dur }))
    ),
    React.createElement('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 65% 62% at 50% 48%, transparent 54%, rgba(0,0,0,0.58) 100%)' } }),
    React.createElement(Readout, { t, bottom }),
    React.createElement(Labels, { dur, bottom })
  );
}

function AmyloidAggregation(props) {
  const p = props || {};
  const count = clamp(parseInt(p.moleculeCount, 10) || 18, 6, 40);
  const dur = clamp(parseFloat(p.durationSec) || 20, 6, 60);
  const bottom = (p.textPosition || 'bottom') !== 'overlay';
  const monomers = React.useMemo(() => buildMonomers(count), [count]);
  return React.createElement(Stage, { width: 1920, height: 1080, duration: dur, background: '#04060a', persistKey: 'amyloid' },
    React.createElement(Content, { monomers, dur, bottom }));
}

window.AmyloidAggregation = AmyloidAggregation;
if (typeof module !== 'undefined') module.exports = { AmyloidAggregation };

