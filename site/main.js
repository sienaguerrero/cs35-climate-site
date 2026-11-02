import { dataTable, lineChart, loadCsv, scatterChart } from "./charts.js";

const BLUE = "var(--series-1)";
const ORANGE = "var(--series-2)";
const CFC12_PEAK_YEAR = 2002;

const signed = (value, digits) => {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}`;
};
const fixed = (digits) => (value) => value.toFixed(digits);

function drawOzone(ozone) {
  lineChart(document.getElementById("ozone-chart"), {
    rows: ozone,
    x: "year",
    series: [{ key: "hole_area_million_km2", color: BLUE, format: (v) => `${v.toFixed(1)} million km²` }],
    yDomain: [0, 30],
    yUnit: "million km²",
    markers: [{ at: 1987, text: "Montreal Protocol" }],
    annotations: [
      { at: 2006, text: "2006: 26.6", dy: -12 },
      { at: 2002, text: "2002: 12.0", dy: 22 },
      { at: 2019, text: "2019: 9.3", dy: 22 },
    ],
    ariaLabel:
      "Line chart of Antarctic ozone hole area from 1979 to 2025. It grows from near zero to about 24 million " +
      "square kilometers by 1993, then stays mostly between 17 and 27, with small holes in 2002 (12.0) and 2019 (9.3).",
  });
  dataTable(document.getElementById("ozone-table"), ozone, [
    { key: "year", label: "Year" },
    { key: "hole_area_million_km2", label: "Hole area (million km²)", format: fixed(1) },
  ]);
}

function drawCfc12(ozone, cfc12) {
  const cfc12ByYear = new Map(cfc12.map((row) => [row.year, row.cfc12_ppt]));
  const paired = ozone.map((row) => ({
    year: row.year,
    cfc12_ppt: cfc12ByYear.get(row.year) ?? null,
    hole_area_million_km2: row.hole_area_million_km2,
  }));

  scatterChart(document.getElementById("cfc12-chart"), {
    rows: paired,
    x: "cfc12_ppt",
    y: "hole_area_million_km2",
    id: "year",
    groups: [
      { color: BLUE, contains: (row) => row.year <= CFC12_PEAK_YEAR },
      { color: ORANGE, contains: (row) => row.year > CFC12_PEAK_YEAR },
    ],
    xDomain: [250, 560],
    yDomain: [0, 30],
    xUnit: "CFC-12, ppt",
    yUnit: "Ozone hole, million km²",
    tooltipRows: (row, group) => [
      { color: group.color, value: `${row.hole_area_million_km2.toFixed(1)} million km²`, label: "ozone hole" },
      { value: `${row.cfc12_ppt.toFixed(1)} ppt`, label: "CFC-12" },
    ],
    annotations: [
      { at: 1988, text: "1988", dy: 20 },
      { at: 2002, text: "2002", dx: 10, dy: 4, anchor: "start" },
      { at: 2019, text: "2019", dy: 20 },
    ],
    ariaLabel:
      "Scatter plot of ozone hole area against CFC-12 for each year from 1979 to 2025. As CFC-12 rises from 275 " +
      "to 541 parts per trillion, the hole grows quickly at first, then levels off. Since CFC-12 began falling " +
      "after 2002, the hole has stayed mostly between 17 and 26 million square kilometers.",
  });
  dataTable(document.getElementById("cfc12-table"), paired, [
    { key: "year", label: "Year" },
    { key: "cfc12_ppt", label: "CFC-12 (ppt)", format: fixed(1) },
    { key: "hole_area_million_km2", label: "Hole area (million km²)", format: fixed(1) },
  ]);
}

function drawTemperature(chile) {
  lineChart(document.getElementById("temperature-chart"), {
    rows: chile,
    x: "year",
    series: [
      {
        key: "anomaly_c",
        color: BLUE,
        format: (v, row) => `${signed(v, 2)} °C (±${row.uncertainty_95_c.toFixed(2)})`,
      },
    ],
    band: { center: "anomaly_c", spread: "uncertainty_95_c" },
    yDomain: [-3, 3],
    yUnit: "°C, difference from 1951 to 1980",
    formatY: (v) => signed(v, Number.isInteger(v) ? 0 : 1),
    reference: { value: 0 },
    annotations: [{ at: 2015, text: "2015: +1.48", dy: -12 }],
    ariaLabel:
      "Line chart of Chile's June to July land temperature from 1860 to 2020, as the difference from the 1951 " +
      "to 1980 average, with a 95% uncertainty band that narrows over time. Values mostly sit within a degree of " +
      "zero before 1980 and run above zero in most recent years, reaching +1.48 °C in 2015.",
  });
  dataTable(document.getElementById("temperature-table"), chile, [
    { key: "year", label: "Year" },
    { key: "anomaly_c", label: "Difference (°C)", format: (v) => signed(v, 2) },
    { key: "uncertainty_95_c", label: "95% uncertainty (±°C)", format: fixed(2) },
  ]);
}

function drawCo2(co2) {
  lineChart(document.getElementById("co2-chart"), {
    rows: co2,
    x: "year",
    series: [
      { key: "chile_t_per_person", label: "Chile", tooltipLabel: "Chile", color: BLUE, format: (v) => `${v.toFixed(2)} t` },
      { key: "world_t_per_person", label: "World", tooltipLabel: "World", color: ORANGE, format: (v) => `${v.toFixed(2)} t` },
    ],
    yDomain: [0, 6],
    yUnit: "metric tons per person",
    endLabels: true,
    annotations: [
      { at: 1975, key: "chile_t_per_person", text: "1975", dy: 22 },
      { at: 1982, key: "chile_t_per_person", text: "1982", dy: 22 },
      { at: 2019, key: "chile_t_per_person", text: "2019: 4.96", dy: -12 },
    ],
    ariaLabel:
      "Line chart of carbon dioxide emissions per person from 1970 to 2024 for Chile and the world. The world " +
      "average stays between about 4.0 and 4.8 metric tons. Chile falls from 3.15 in 1973 to below 2 from 1982 " +
      "to 1987, reaches the world average in 2013, peaks at 4.96 in 2019, and falls to 3.94 in 2024.",
  });
  dataTable(document.getElementById("co2-table"), co2, [
    { key: "year", label: "Year" },
    { key: "chile_t_per_person", label: "Chile (t per person)", format: fixed(2) },
    { key: "world_t_per_person", label: "World (t per person)", format: fixed(2) },
  ]);
}

try {
  const [ozone, cfc12, chile, co2] = await Promise.all(
    [
      "data/ozone_hole.csv",
      "data/cfc12_southern_hemisphere.csv",
      "data/chile_june_july_temperature.csv",
      "data/co2_per_person.csv",
    ].map(loadCsv),
  );
  drawOzone(ozone);
  drawCfc12(ozone, cfc12);
  drawTemperature(chile);
  drawCo2(co2);
} catch (error) {
  for (const plot of document.querySelectorAll(".chart-plot")) {
    plot.textContent = "The chart data didn't load. The CSV links below still work.";
  }
  console.error(error);
}
