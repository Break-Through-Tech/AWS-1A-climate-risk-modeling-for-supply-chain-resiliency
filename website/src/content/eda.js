// Text and image list for the EDA page. The images are exported from the team's
// notebooks by scripts/export_eda_figures.py, so they are the real EDA charts.

const AUTHORS = {
  sdhari: { name: "S'dhari Hardy", notebook: 'eda_temporal_analysis.ipynb' },
  jennifer: { name: 'Jennifer Yamashita', notebook: 'eda_space_and_data_quality.ipynb' },
  karina: { name: 'Karina Villalobos Hernandez', notebook: 'eda_visuals.ipynb' },
}

// The five charts that tell the main story, in reading order.
export const storyCharts = [
  {
    image: 'monthly-ssta.png',
    title: 'El Niño and La Niña show up clearly in the raw data',
    body: 'Average sea surface temperature anomaly across all buoys, 1980–1998. The spikes are the 1982–83 and 1997–98 El Niños, and the dip in 1988 is La Niña. The break in 1983 is missing data.',
    decision: 'Our anomaly calculation reproduces known El Niño and La Niña events.',
    author: AUTHORS.sdhari,
    alt: 'Line chart of the average sea surface temperature anomaly from 1980 to 1998, with large positive spikes in 1982–83 and 1997–98, a sharp dip in 1988, and a gap in 1983.',
  },
  {
    image: 'ssta-by-longitude-year.png',
    title: 'Warming and cooling sweep across the Pacific',
    body: 'Mean anomaly by longitude and year. Red is warmer than normal, blue is cooler. The strongest swings are in the eastern Pacific, blank cells had too little data, and the vertical line marks where the validation years begin.',
    decision: 'Showed that location matters, so the model gets regional signals like basin-wide averages, but not raw coordinates it could memorize.',
    author: AUTHORS.jennifer,
    featured: true,
    alt: 'Heatmap of mean sea surface temperature anomaly with longitude on the vertical axis and years 1980 to 1996 on the horizontal axis, red for warm and blue for cool, strongest in the eastern Pacific.',
  },
  {
    image: 'class-distribution-splits.png',
    title: 'Extreme months are rare',
    body: 'Share of each risk class in the training, validation and test years. Extremes make up under 10% of months in most splits, but extreme warm jumps to about 21% in the 1997–98 test years.',
    decision: 'Why we score with macro F1, which weighs every risk class equally, and why we check the extreme classes separately.',
    author: AUTHORS.sdhari,
    alt: 'Grouped bar chart of the five risk classes for the training, validation and testing data. Neutral is the largest class; the extreme classes are small except extreme warm in testing, at about 21%.',
  },
  {
    image: 'ssta-autocorrelation.png',
    title: 'The ocean remembers about 3 months',
    body: 'How closely this month’s anomaly matches the anomaly 1 to 12 months later. The link is still strong at 3 months (0.72) and has faded by 8.',
    decision: 'Why we forecast 3 months ahead instead of 9.',
    author: AUTHORS.sdhari,
    alt: 'Bar chart of sea surface temperature anomaly autocorrelation for lags of 1 to 12 months, falling from about 0.9 at 1 month to near zero at 8 months and slightly negative after.',
  },
  {
    image: 'wind-leads-sst.png',
    title: 'Wind shifts before the ocean warms',
    body: 'Western Pacific wind anomalies line up best with the Niño 3.4 sea temperature 2 months later (r = 0.75).',
    decision: 'Why western Pacific wind is a model input. SHAP later ranked it among the model’s top 3 drivers.',
    author: AUTHORS.karina,
    alt: 'Bar chart of the correlation between western Pacific wind anomaly and later Niño 3.4 sea temperature anomaly for leads of −6 to 9 months, peaking at 0.75 when the wind comes 2 months first.',
  },
]

// Extra charts for technical readers, shown in a collapsed section.
export const moreCharts = [
  {
    image: 'missing-data-humidity.png',
    title: 'Missing humidity data, by buoy and month',
    caption: 'White = reading present, orange = missing value, black = no row. Humidity has no real readings before 1989.',
    author: AUTHORS.jennifer,
  },
  {
    image: 'missing-data-ssta-lag6.png',
    title: 'Missing 6-month-lag values, by buoy and month',
    caption: 'Gaps in the history leave the 6-month lag blank, so the model has to handle missing inputs.',
    author: AUTHORS.jennifer,
  },
  {
    image: 'class-share-longitude-train.png',
    title: 'Risk class share by longitude (training years)',
    caption: 'Extreme classes appear mostly in the eastern Pacific. Hatched bars have fewer than 30 months.',
    author: AUTHORS.jennifer,
  },
  {
    image: 'class-share-longitude-val.png',
    title: 'Risk class share by longitude (validation years)',
    caption: 'The same view for 1994–96, after many western buoys came online.',
    author: AUTHORS.jennifer,
  },
  {
    image: 'equatorial-hovmoller.png',
    title: 'Equatorial wind and temperature anomalies over time',
    caption: 'Hovmöller diagrams for 2°S–2°N, training years: longitude across, time down.',
    author: AUTHORS.karina,
  },
  {
    image: 'ssta-feature-correlations.png',
    title: 'SSTA history features vs. future SSTA',
    caption: 'How strongly each temperature-history feature tracks the anomaly 3 months later.',
    author: AUTHORS.sdhari,
  },
  {
    image: 'climate-feature-correlations.png',
    title: 'Air and wind features vs. future SSTA',
    caption: 'Air temperature anomalies track future SSTA closely; local winds barely do.',
    author: AUTHORS.sdhari,
  },
  {
    image: 'mutual-information.png',
    title: 'Which features tell us about the class 3 months ahead',
    caption: 'Mutual information also catches non-linear links that correlation misses.',
    author: AUTHORS.karina,
  },
]
