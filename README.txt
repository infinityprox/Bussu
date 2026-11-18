BUS TRACK INDIA — COIMBATORE DATASET

Upload the contents of this folder to the ROOT of your GitHub Pages repository.
Do not rename or move the data folder.

Included:
- data/routes.json: route-number + origin/destination entries transcribed from CCMC's published Bus Services directory.
- data/stops.json: unique route endpoint names only; not a complete intermediate stop directory and no coordinates.
- data/timings.json: intentionally empty because no route-specific departure times were supported by the source.
- data/sources.json: provenance and source URLs.

Data policy:
- Official route endpoint data is labelled CCMC.
- Do not infer intermediate stops from endpoint pairs.
- Do not invent departure times.
- Third-party timings must be separately sourced and labelled UNVERIFIED before adding them.
- The linked bus-stop map is a map reference, not a machine-readable stop/coordinate feed.
- This is not live GPS tracking.

Sources:
CCMC: https://ccmc.gov.in/index.php/createpage/bus-services
Bus stop map: https://gacbe.ac.in/pdf/SPATIAL%20DATA/BUSSTOPS__COIMBATORE%20CORPORATION.pdf
Secondary finder: https://coimbatorejunction.in/coimbatore-bus-routes/
