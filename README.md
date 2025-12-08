# Purpose
Fantasy Zoning exists to allow users to create versions of San Francisco zoning to meet our housing goals as set by the state's RHNA process. In Nov 2025, the City Economist projected that the Family Zoning Plan will generate 8-14k housing by 203X, missing the state's goal of 30k+ units.

This tool allows users to decide which areas to upzone and uses the City Economist's reported methodolog to project the number of units expected to be generated under the user's proposed plan.

# How to use
The application is hosted [here](fantasyzoning.mozhu.io). Please use it on a laptop screen, large tablet, or monitor as this application is not designed for phones.

Users will be able to enter upzoning criteria on the left side of the screen and the effect (expected number of units built) will be displayed numerically on the bottom and visually on the map, where the more intense the color, the higher the height increase.

# Notes
- The map begins with the Family Zoning Plan applied.
- The applied version does not include the November 2025 amendments added in the Board of Supervisors Land Use Committee.
- When two upzoning criteria collide (e.g. one parcel has two different max heights allowed, the taller height prevails).

# Sources
- Predictive model and data from City Economist's Office
-- [data](https://docs.google.com/spreadsheets/d/1DBPD81pmFEYFMKj4cmiq-Qyg9Lrfk_3F/edit?usp=sharing&ouid=102702719400652445235&rtpof=true&sd=true)
-- [model presentation](https://media.api.sf.gov/documents/250700_economic_impact_final.pdf)
- Overall SF parcel map comes from (here)[https://data.sfgov.org/Geographic-Locations-and-Boundaries/Parcels-Active-and-Retired/acdm-wktn/about_data]

# Attribution
This app is derived from https://github.com/sdamerdji/rezoner
