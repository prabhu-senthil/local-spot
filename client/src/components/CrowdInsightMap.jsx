

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function heatColour(busyCount, maxBusy) {
  if (maxBusy === 0 || busyCount === 0) return "#f1f5f9";
  const t = busyCount / maxBusy;
  const h = Math.round(20 - t * 20);
  const s = Math.round(70 + t * 30);
  const l = Math.round(90 - t * 55);
  return `hsl(${h},${s}%,${l}%)`;
}

function hourLabel(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

export default function CrowdInsightMap({ insightData = [] }) {
  const lookup = new Map(
    insightData.map((d) => [`${d.day}_${d.hour}`, d])
  );

  const busyCounts = insightData.map((d) => d.busyCount);
  const maxBusy = Math.max(0, ...busyCounts);
  const hasData = maxBusy > 0;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `3.5rem repeat(24, minmax(0, 1fr))`,
    gap: "2px",
  };

  return (
    <div className="w-full overflow-x-auto">
      <div style={gridStyle} className="mb-1">
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="text-center text-[9px] font-medium text-slate-400 leading-none"
          >
            {h % 3 === 0 ? hourLabel(h) : ""}
          </div>
        ))}
      </div>

      {DAY_ORDER.map((dayIdx) => (
        <div key={dayIdx} style={gridStyle} className="mb-0.5">
          <div className="flex items-center justify-end pr-2 text-[10px] font-semibold text-slate-500 leading-none">
            {DAY_LABELS[dayIdx]}
          </div>

          {Array.from({ length: 24 }, (_, hour) => {
            const entry = lookup.get(`${dayIdx}_${hour}`);
            const busy = entry?.busyCount ?? 0;
            const quiet = entry?.quietCount ?? 0;
            const total = entry?.total ?? 0;
            const colour = hasData ? heatColour(busy, maxBusy) : "#f1f5f9";

            return (
              <div
                key={hour}
                title={
                  hasData && total > 0
                    ? `${DAY_LABELS[dayIdx]} ${hourLabel(hour)}\nBusy: ${busy}  Quiet: ${quiet}  Total: ${total}`
                    : `${DAY_LABELS[dayIdx]} ${hourLabel(hour)} — no data`
                }
                style={{ backgroundColor: colour }}
                className="rounded-sm aspect-square cursor-default transition-opacity hover:opacity-80"
              />
            );
          })}
        </div>
      ))}

      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-[10px] text-slate-400">Low</span>
        <div
          className="h-2 w-24 rounded-full"
          style={{
            background:
              "linear-gradient(to right, #f1f5f9, hsl(20,70%,65%), hsl(0,100%,35%))",
          }}
        />
        <span className="text-[10px] text-slate-400">Busy</span>
      </div>

      {!hasData && (
        <p className="text-center text-xs text-slate-400 mt-3">
          No crowd reports yet — the grid will fill as users check in.
        </p>
      )}
    </div>
  );
}
