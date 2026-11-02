const SVG_NS = "http://www.w3.org/2000/svg";
const YEAR_STEPS = [1, 2, 5, 10];
const VALUE_STEPS = [1, 2, 2.5, 5, 10];

export async function loadCsv(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const [header, ...lines] = (await response.text()).trim().split("\n");
  const columns = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(
      columns.map((column, i) => [column, cells[i] === "" ? null : Number(cells[i])]),
    );
  });
}

function svgNode(tag, attributes, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  parent.appendChild(node);
  return node;
}

function svgText(parent, attributes, text) {
  const node = svgNode("text", attributes, parent);
  node.textContent = text;
  return node;
}

function htmlNode(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

function linearScale([d0, d1], [r0, r1]) {
  const scale = (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  scale.invert = (pixel) => d0 + ((pixel - r0) / (r1 - r0)) * (d1 - d0);
  return scale;
}

function niceStep(span, count, steps) {
  const raw = span / Math.max(count, 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  return steps.find((step) => step * power >= raw) * power;
}

function tickValues([low, high], count, steps) {
  const step = niceStep(high - low, count, steps);
  const values = [];
  for (let value = Math.ceil(low / step - 1e-9) * step; value <= high + step * 1e-9; value += step) {
    values.push(Math.round(value * 1e6) / 1e6);
  }
  return values.length < 3 && count < 10 ? tickValues([low, high], count + 1, steps) : values;
}

function niceDomain([low, high], count) {
  const step = niceStep(high - low || 1, count, VALUE_STEPS);
  return [Math.floor(low / step + 1e-9) * step, Math.ceil(high / step - 1e-9) * step];
}

function mount(container, draw) {
  const plot = htmlNode("div", "chart-svg", container);
  const tooltip = htmlNode("div", "chart-tooltip", container);
  tooltip.hidden = true;
  tooltip.setAttribute("aria-hidden", "true");
  const live = htmlNode("div", "visually-hidden", container);
  live.setAttribute("aria-live", "polite");

  let drawnWidth = 0;
  const render = () => {
    const width = Math.round(plot.clientWidth);
    if (width === 0 || width === drawnWidth) return;
    drawnWidth = width;
    plot.replaceChildren();
    tooltip.hidden = true;
    draw({ plot, width, tooltip, live });
  };
  new ResizeObserver(render).observe(plot);
  render();
}

function frame(plot, width, { ariaLabel, xUnit, rightMargin = 16 }) {
  const height = Math.round(Math.min(360, Math.max(250, width * 0.5)));
  const margin = { top: 28, right: rightMargin, bottom: xUnit ? 50 : 30, left: 44 };
  const root = svgNode(
    "svg",
    { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": ariaLabel, tabindex: 0 },
    plot,
  );
  return {
    root,
    width,
    height,
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
  };
}

function drawAxes(box, { xScale, yScale, xDomain, yDomain, formatX, formatY, xUnit, yUnit, xSteps }) {
  const { root, left, right, top, bottom, height } = box;
  const grid = svgNode("g", { class: "chart-grid" }, root);
  for (const value of tickValues(yDomain, Math.max(3, Math.floor((bottom - top) / 50)), VALUE_STEPS)) {
    const y = yScale(value);
    svgNode("line", { x1: left, x2: right, y1: y, y2: y }, grid);
    svgText(root, { x: left - 8, y, dy: "0.32em", "text-anchor": "end", class: "chart-tick" }, formatY(value));
  }
  svgNode("line", { x1: left, x2: right, y1: bottom, y2: bottom, class: "chart-axis" }, root);
  for (const value of tickValues(xDomain, Math.max(3, Math.floor((right - left) / 72)), xSteps)) {
    const x = xScale(value);
    svgNode("line", { x1: x, x2: x, y1: bottom, y2: bottom + 4, class: "chart-axis" }, root);
    svgText(root, { x, y: bottom + 18, "text-anchor": "middle", class: "chart-tick" }, formatX(value));
  }
  svgText(root, { x: 0, y: 12, class: "chart-unit" }, yUnit);
  if (xUnit) {
    svgText(root, { x: (left + right) / 2, y: height - 6, "text-anchor": "middle", class: "chart-unit" }, xUnit);
  }
}

function dot(parent, cx, cy, color, r = 4) {
  const node = svgNode("circle", { cx, cy, r, class: "chart-dot" }, parent);
  node.style.fill = color;
  return node;
}

function drawLabel(parent, cx, cy, { text, dx = 0, dy = -12, anchor = "middle" }) {
  svgText(parent, { x: cx + dx, y: cy + dy, "text-anchor": anchor, class: "chart-label" }, text);
}

function showTooltip(tooltip, plotWidth, content, x, y) {
  tooltip.replaceChildren();
  htmlNode("div", "chart-tooltip-title", tooltip, content.title);
  for (const row of content.rows) {
    const line = htmlNode("div", "chart-tooltip-row", tooltip);
    const key = htmlNode("span", "chart-tooltip-key", line);
    if (row.color) key.style.background = row.color;
    htmlNode("strong", null, line, row.value);
    if (row.label) htmlNode("span", "chart-tooltip-label", line, row.label);
  }
  tooltip.hidden = false;
  const { width, height } = tooltip.getBoundingClientRect();
  let left = x + 14;
  if (left + width > plotWidth - 4) left = x - width - 14;
  tooltip.style.left = `${Math.max(4, left)}px`;
  tooltip.style.top = `${Math.max(0, y - height - 10)}px`;
}

function bindNavigation(root, count, start, { show, hide, nearest }) {
  let current = start;
  root.addEventListener("pointermove", (event) => {
    const bounds = root.getBoundingClientRect();
    const index = nearest(event.clientX - bounds.left, event.clientY - bounds.top);
    if (index === null) {
      if (event.pointerType === "mouse") hide();
      return;
    }
    current = index;
    show(current, false);
  });
  root.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") hide();
  });
  root.addEventListener("focus", () => show(current, true));
  root.addEventListener("blur", hide);
  root.addEventListener("keydown", (event) => {
    const moves = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    current = Math.max(0, Math.min(count - 1, current + moves[event.key]));
    show(current, true);
  });
}

function announce(live, content) {
  live.textContent = `${content.title}: ${content.rows
    .map((row) => (row.label ? `${row.label} ${row.value}` : row.value))
    .join(", ")}`;
}

function runs(rows, isPresent) {
  const groups = [];
  let run = [];
  for (const row of rows) {
    if (isPresent(row)) {
      run.push(row);
    } else if (run.length) {
      groups.push(run);
      run = [];
    }
  }
  if (run.length) groups.push(run);
  return groups;
}

export function lineChart(container, options) {
  const {
    rows,
    x,
    series,
    band = null,
    yDomain: fixedYDomain,
    yUnit,
    formatY = (value) => String(value),
    ariaLabel,
    annotations = [],
    markers = [],
    reference = null,
    endLabels = false,
  } = options;

  mount(container, ({ plot, width, tooltip, live }) => {
    const box = frame(plot, width, { ariaLabel, rightMargin: endLabels ? 60 : 16 });
    const { root, left, right, top, bottom } = box;

    const xDomain = [rows[0][x], rows[rows.length - 1][x]];
    const values = rows.flatMap((row) => {
      const found = series.map((s) => row[s.key]).filter((value) => value !== null);
      if (band && row[band.center] !== null) {
        found.push(row[band.center] - row[band.spread], row[band.center] + row[band.spread]);
      }
      return found;
    });
    const yDomain = fixedYDomain ?? niceDomain([Math.min(...values), Math.max(...values)], 5);
    const xScale = linearScale(xDomain, [left, right]);
    const yScale = linearScale(yDomain, [bottom, top]);

    drawAxes(box, {
      xScale,
      yScale,
      xDomain,
      yDomain,
      formatX: String,
      formatY,
      yUnit,
      xSteps: YEAR_STEPS,
    });

    for (const marker of markers) {
      const mx = xScale(marker.at);
      svgNode("line", { x1: mx, x2: mx, y1: top, y2: bottom, class: "chart-marker" }, root);
      svgText(root, { x: mx + 5, y: top + 4, dy: "0.7em", class: "chart-label" }, marker.text);
    }

    if (reference) {
      const ry = yScale(reference.value);
      svgNode("line", { x1: left, x2: right, y1: ry, y2: ry, class: "chart-reference" }, root);
      if (reference.text) {
        svgText(root, { x: right, y: ry - 6, "text-anchor": "end", class: "chart-label" }, reference.text);
      }
    }

    if (band) {
      const color = series[0].color;
      for (const run of runs(rows, (row) => row[band.center] !== null)) {
        const upper = run.map((row) => `${xScale(row[x])},${yScale(row[band.center] + row[band.spread])}`);
        const lower = run
          .slice()
          .reverse()
          .map((row) => `${xScale(row[x])},${yScale(row[band.center] - row[band.spread])}`);
        const area = svgNode("path", { d: `M${upper.join("L")}L${lower.join("L")}Z`, class: "chart-band" }, root);
        area.style.fill = color;
      }
    }

    for (const s of series) {
      for (const run of runs(rows, (row) => row[s.key] !== null)) {
        const d = run.map((row, i) => `${i ? "L" : "M"}${xScale(row[x])},${yScale(row[s.key])}`).join("");
        const path = svgNode("path", { d, class: "chart-line" }, root);
        path.style.stroke = s.color;
      }
      if (endLabels) {
        const last = rows.filter((row) => row[s.key] !== null).at(-1);
        dot(root, xScale(last[x]), yScale(last[s.key]), s.color);
        svgText(
          root,
          { x: xScale(last[x]) + 9, y: yScale(last[s.key]), dy: "0.32em", class: "chart-end-label" },
          s.label,
        );
      }
    }

    for (const note of annotations) {
      const row = rows.find((r) => r[x] === note.at);
      const s = series.find((candidate) => candidate.key === (note.key ?? series[0].key));
      const cx = xScale(row[x]);
      const cy = yScale(row[s.key]);
      dot(root, cx, cy, s.color);
      drawLabel(root, cx, cy, note);
    }

    const hover = svgNode("g", { class: "chart-hover", visibility: "hidden" }, root);
    const crosshair = svgNode("line", { y1: top, y2: bottom, class: "chart-crosshair" }, hover);
    const hoverDots = series.map((s) => dot(hover, 0, 0, s.color, 5));

    const contentFor = (row) => ({
      title: String(row[x]),
      rows: series.map((s) => ({
        color: s.color,
        value: row[s.key] === null ? "no data" : s.format(row[s.key], row),
        label: s.tooltipLabel ?? "",
      })),
    });

    bindNavigation(root, rows.length, rows.length - 1, {
      nearest: (px) => {
        if (px < left - 10 || px > right + 10) return null;
        const target = xScale.invert(px);
        let best = 0;
        rows.forEach((row, i) => {
          if (Math.abs(row[x] - target) < Math.abs(rows[best][x] - target)) best = i;
        });
        return best;
      },
      show: (index, speak) => {
        const row = rows[index];
        const px = xScale(row[x]);
        crosshair.setAttribute("x1", px);
        crosshair.setAttribute("x2", px);
        let highest = bottom;
        series.forEach((s, i) => {
          const present = row[s.key] !== null;
          hoverDots[i].setAttribute("visibility", present ? "visible" : "hidden");
          if (present) {
            const py = yScale(row[s.key]);
            hoverDots[i].setAttribute("cx", px);
            hoverDots[i].setAttribute("cy", py);
            highest = Math.min(highest, py);
          }
        });
        hover.setAttribute("visibility", "visible");
        const content = contentFor(row);
        showTooltip(tooltip, width, content, px, highest);
        if (speak) announce(live, content);
      },
      hide: () => {
        hover.setAttribute("visibility", "hidden");
        tooltip.hidden = true;
      },
    });
  });
}

export function scatterChart(container, options) {
  const {
    rows,
    x,
    y,
    id,
    groups,
    xDomain,
    yDomain,
    xUnit,
    yUnit,
    formatX = String,
    formatY = String,
    tooltipRows,
    ariaLabel,
    annotations = [],
  } = options;

  mount(container, ({ plot, width, tooltip, live }) => {
    const box = frame(plot, width, { ariaLabel, xUnit });
    const { root, left, right, top, bottom } = box;
    const xScale = linearScale(xDomain, [left, right]);
    const yScale = linearScale(yDomain, [bottom, top]);

    drawAxes(box, { xScale, yScale, xDomain, yDomain, formatX, formatY, xUnit, yUnit, xSteps: VALUE_STEPS });

    const points = rows
      .filter((row) => row[x] !== null && row[y] !== null)
      .map((row) => ({
        row,
        px: xScale(row[x]),
        py: yScale(row[y]),
        group: groups.find((group) => group.contains(row)),
      }));

    for (const point of points) dot(root, point.px, point.py, point.group.color, 5);

    for (const note of annotations) {
      const point = points.find((p) => p.row[id] === note.at);
      drawLabel(root, point.px, point.py, note);
    }

    const hover = svgNode("g", { class: "chart-hover", visibility: "hidden" }, root);
    const ring = svgNode("circle", { r: 9, class: "chart-focus-ring" }, hover);

    bindNavigation(root, points.length, points.length - 1, {
      nearest: (px, py) => {
        let best = null;
        let bestDistance = 36;
        points.forEach((point, i) => {
          const distance = Math.hypot(point.px - px, point.py - py);
          if (distance < bestDistance) {
            best = i;
            bestDistance = distance;
          }
        });
        return best;
      },
      show: (index, speak) => {
        const point = points[index];
        ring.setAttribute("cx", point.px);
        ring.setAttribute("cy", point.py);
        hover.setAttribute("visibility", "visible");
        const content = { title: String(point.row[id]), rows: tooltipRows(point.row, point.group) };
        showTooltip(tooltip, width, content, point.px, point.py);
        if (speak) announce(live, content);
      },
      hide: () => {
        hover.setAttribute("visibility", "hidden");
        tooltip.hidden = true;
      },
    });
  });
}

export function dataTable(details, rows, columns) {
  details.addEventListener("toggle", () => {
    if (!details.open || details.querySelector("table")) return;
    const wrapper = htmlNode("div", "chart-table-scroll", details);
    const table = htmlNode("table", null, wrapper);
    const headRow = htmlNode("tr", null, htmlNode("thead", null, table));
    for (const column of columns) htmlNode("th", null, headRow, column.label).setAttribute("scope", "col");
    const body = htmlNode("tbody", null, table);
    for (const row of rows) {
      const tableRow = htmlNode("tr", null, body);
      columns.forEach((column, i) => {
        const value = row[column.key];
        const text = value === null ? "no data" : column.format ? column.format(value) : String(value);
        const cell = htmlNode(i === 0 ? "th" : "td", null, tableRow, text);
        if (i === 0) cell.setAttribute("scope", "row");
      });
    }
  });
}
