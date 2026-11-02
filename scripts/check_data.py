#!/usr/bin/env python3
import csv
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "site" / "data"

EXPECTED = {
    "ozone_hole.csv": {
        "first_year": 1979,
        "ranges": {"hole_area_million_km2": (0, 35)},
        "allowed_blank_years": {1995},
    },
    "cfc12_southern_hemisphere.csv": {
        "first_year": 1978,
        "ranges": {"cfc12_ppt": (200, 600)},
        "allowed_blank_years": set(),
    },
    "chile_june_july_temperature.csv": {
        "first_year": 1860,
        "ranges": {"anomaly_c": (-5, 5), "uncertainty_95_c": (0, 3)},
        "allowed_blank_years": set(),
    },
    "co2_per_person.csv": {
        "first_year": 1970,
        "ranges": {"chile_t_per_person": (0, 15), "world_t_per_person": (0, 15)},
        "allowed_blank_years": set(),
    },
}


def check(name, spec):
    with (DATA_DIR / name).open(newline="") as handle:
        reader = csv.DictReader(handle)
        expected_columns = ["year", *spec["ranges"]]
        if reader.fieldnames != expected_columns:
            return [f"{name}: columns {reader.fieldnames}, expected {expected_columns}"]
        rows = list(reader)

    problems = []
    years = [int(row["year"]) for row in rows]
    if years[0] != spec["first_year"]:
        problems.append(f"{name}: starts in {years[0]}, expected {spec['first_year']}")
    if years != list(range(years[0], years[0] + len(years))):
        problems.append(f"{name}: years are not consecutive")

    for row in rows:
        year = int(row["year"])
        for column, (low, high) in spec["ranges"].items():
            if row[column] == "":
                if year not in spec["allowed_blank_years"]:
                    problems.append(f"{name}: {column} is blank in {year}")
            elif not low <= float(row[column]) <= high:
                problems.append(f"{name}: {column} is {row[column]} in {year}, outside {low} to {high}")
    return problems


def main():
    problems = [problem for name, spec in EXPECTED.items() for problem in check(name, spec)]
    for problem in problems:
        print(problem, file=sys.stderr)
    if problems:
        sys.exit(1)
    print(f"{len(EXPECTED)} data files look right")


if __name__ == "__main__":
    main()
