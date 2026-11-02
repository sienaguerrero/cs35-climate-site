#!/usr/bin/env python3
import csv
import json
import math
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "site" / "data"

OZONE_URL = "https://ozonewatch.gsfc.nasa.gov/statistics/annual_data.txt"
CFC12_URL = "https://gml.noaa.gov/aftp/data/hats/cfcs/cfc12/combined/HATS_global_F12.txt"
CHILE_TEMPERATURE_URL = (
    "https://berkeley-earth-temperature.s3.us-west-1.amazonaws.com/Regional/TAVG/chile-TAVG-Trend.txt"
)
WORLD_BANK_URL = (
    "https://api.worldbank.org/v2/country/{country}/indicator/EN.GHG.CO2.PC.CE.AR5"
    "?format=json&per_page=200"
)


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "cs35-climate-site data build"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", errors="replace")


def ozone_hole_rows(text):
    areas = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[0].isdigit():
            areas[int(parts[0])] = float(parts[1])
    return [
        {"year": year, "hole_area_million_km2": areas.get(year)}
        for year in range(min(areas), max(areas) + 1)
    ]


def cfc12_rows(text):
    header = None
    monthly = {}
    for line in text.splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split()
        if header is None:
            header = parts
            continue
        record = dict(zip(header, parts))
        value = float(record["HATS_SH_F12"])
        if not math.isnan(value):
            monthly.setdefault(int(record["HATS_F12_YYYY"]), []).append(value)
    return [
        {"year": year, "cfc12_ppt": round(sum(values) / 12, 1)}
        for year, values in sorted(monthly.items())
        if len(values) == 12
    ]


def chile_june_july_rows(text):
    months = {}
    for line in text.splitlines():
        parts = line.split()
        if line.startswith("%") or len(parts) < 4:
            continue
        year, month = int(parts[0]), int(parts[1])
        anomaly, uncertainty = float(parts[2]), float(parts[3])
        if month in (6, 7) and not math.isnan(anomaly):
            months.setdefault(year, {})[month] = (anomaly, uncertainty)
    return [
        {
            "year": year,
            "anomaly_c": round((pair[6][0] + pair[7][0]) / 2, 2),
            "uncertainty_95_c": round((pair[6][1] + pair[7][1]) / 2, 2),
        }
        for year, pair in sorted(months.items())
        if len(pair) == 2
    ]


def world_bank_series(country):
    payload = json.loads(fetch(WORLD_BANK_URL.format(country=country)))
    return {int(row["date"]): row["value"] for row in payload[1] if row["value"] is not None}


def co2_rows(chile, world):
    def rounded(value):
        return None if value is None else round(value, 2)

    return [
        {
            "year": year,
            "chile_t_per_person": rounded(chile.get(year)),
            "world_t_per_person": rounded(world.get(year)),
        }
        for year in sorted(set(chile) | set(world))
    ]


def write_csv(name, rows):
    path = DATA_DIR / name
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: "" if value is None else value for key, value in row.items()})
    print(f"{name}: {len(rows)} rows, {rows[0]['year']} to {rows[-1]['year']}")


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_csv("ozone_hole.csv", ozone_hole_rows(fetch(OZONE_URL)))
    write_csv("cfc12_southern_hemisphere.csv", cfc12_rows(fetch(CFC12_URL)))
    write_csv("chile_june_july_temperature.csv", chile_june_july_rows(fetch(CHILE_TEMPERATURE_URL)))
    write_csv("co2_per_person.csv", co2_rows(world_bank_series("CHL"), world_bank_series("WLD")))


if __name__ == "__main__":
    main()
