# CS35 climate site

Four Southern Hemisphere climate charts from a spring 2017 Harvey Mudd CS35 final project, rebuilt in 2026 with current data. Hosted at https://austral.siena.codes.

The charts cover the Antarctic ozone hole, CFC-12 in Southern Hemisphere air, winter land temperature in Chile, and carbon dioxide emissions per person in Chile against the world average. The page also lists what changed from the 2017 version and why.

## What's here

- `site/`: the static site. `main.js` loads the data and sets up each chart, and `charts.js` draws them as SVG with no libraries.
- `site/data/`: the four CSV files the charts read.
- `site/2017/`: the original 2017 site, archived with its contact page removed.
- `scripts/build_data.py`: downloads each source and rewrites the CSV files.
- `scripts/check_data.py`: checks the CSV columns, years, and value ranges. It runs before every deploy.

## Run it locally

The page loads its scripts as ES modules, so open it through a local server rather than as a file:

```bash
python3 -m http.server 8000 --directory site
```

Then open http://localhost:8000.

## Refresh the data

Both scripts use only the Python standard library.

```bash
python3 scripts/build_data.py
```

```bash
python3 scripts/check_data.py
```

The page text quotes specific values and a retrieval date, so recheck it against the new CSV files after a refresh.

## Methods

- **Ozone hole:** NASA Ozone Watch's yearly average area from September 7 to October 13. There are no satellite data for 1995, so that year is blank.
- **CFC-12:** NOAA's combined Southern Hemisphere monthly means (column `HATS_SH_F12`), averaged by calendar year. Years without all 12 months are left out.
- **Chile temperature:** Berkeley Earth's monthly anomalies for June and July, averaged for each year. The band averages the two months' 95% uncertainties, which assumes their errors are fully correlated. That is the cautious choice.
- **Carbon dioxide:** World Bank series `EN.GHG.CO2.PC.CE.AR5` for Chile (`CHL`) and the world (`WLD`). It comes from the EDGAR database and excludes land use and forestry.

## Data licenses

- NASA Ozone Watch and NOAA data are US government works. NOAA asks users to cite the dataset DOI, which the page does.
- Berkeley Earth data are licensed CC BY-NC 4.0.
- World Bank data are licensed CC BY 4.0.

## History

Pratyush Kapur, Hannah Slocumb, and Siena Guerrero built the original for CS35 at Harvey Mudd College in spring 2017. Siena's commits from then are under her old GitHub account, `elithie`. This repo starts fresh instead of carrying the 2017 history, and `site/2017/` is the record of what the team shipped.

The 2017 site used the "An Ocean of Sky" template by Bryant Smith, released under Creative Commons Attribution 2.5.

## Deploys

Every push to `main` runs the data check and deploys `site/` to GitHub Pages through `.github/workflows/pages.yml`.
