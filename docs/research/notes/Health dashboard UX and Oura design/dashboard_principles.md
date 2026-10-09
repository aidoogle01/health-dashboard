# Evidence-based dashboard and data-visualisation principles for a personal health dashboard (Today / Habits / Insights / Trends)

Research note: perceptualedge.com, nngroup.com, courses.cs.washington.edu and terpconnect.umd.edu did not resolve from the research environment (DNS failure), so I could not fetch those primary PDFs or pages directly. Findings attributed to them come from search-result extracts of the primary pages, or from secondary summaries, and are flagged where relevant. Items marked "[background, not verified this session]" are well-established in the literature but were not re-checked against a fetched source. Treat them as lower confidence.

## 1. Stephen Few and Edward Tufte: single screen, glanceability, data-ink, bullet graphs, sparklines

### Takeaway
Few defines a dashboard as an at-a-glance, single-screen monitoring display. Its main enemies are scrolling, excess precision, meaningless variety and decorative gauges. Its preferred building blocks are bullet graphs, sparklines and small bars that encode with length and position. Tufte's "max data, min design" and word-sized sparklines map well onto a "Today" view: many metrics, each with a tiny trend, in little space.

### Cited Findings
- Few's 2006 white paper "Common Pitfalls in Dashboard Design" lists 13 pitfalls. They include "Exceeding the boundaries of a single screen", "Displaying excessive detail or precision" and "Introducing meaningless variety". The rationale given: viewers should take in the information without scrolling or switching screens, related context should sit together, and short-term memory holds only a few chunks. — [The Data School summary of Few's 13 mistakes](https://www.thedataschool.co.uk/anh-vu/are-you-making-these-13-dashboard-design-mistakes/); original PDF: [perceptualedge.com Common_Pitfalls.pdf](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf) (could not fetch)
- Few's *Information Dashboard Design* argues that a dashboard should fit on one screen and answer questions at a glance. It favours ruthless prioritisation and display forms that use position and length (bullet graphs, sparklines, small bars) over decorative gauges and 3D charts. The 2013 2nd edition adds in-depth design instruction for bullet graphs and sparklines. — [Bookshop listing / book description](https://bookshop.org/p/books/information-dashboard-design-displaying-data-for-at-a-glance-monitoring-stephen-few/7738264) (via search summary)
- Few designed the bullet graph as a replacement for dashboard meters and gauges. It is "linear and no-frills" and gives "a rich display of data in a small space". It shows one featured measure compared with a target or a prior value, against qualitative ranges (e.g. poor/satisfactory/good). — [BetterEvaluation summary of Few's Bullet Graph spec](https://betterevaluation.org/node/401); spec: [Bullet_Graph_Design_Spec.pdf](http://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf) (not fetched)
- Bullet graph formatting: the qualitative range bands are background, muted (greyscale intensities), and the target marker must stand out. Implementations follow the spec with actual, projected, target, ranges and a prior-period marker. — [BetterEvaluation](https://betterevaluation.org/node/401); [Porzak, useR! 2009 slides](https://user2009.r-project.org/slides/Porzak.pdf)
- Tufte: "A sparkline is a small intense, simple, word-sized graphic with typographic resolution." Sparklines can be embedded "in a sentence, table, headline, map, spreadsheet, graphic". His principle is "max[data], min[design]": "design minimization, not data minimization". — [Tufte, "Sparkline theory and practice"](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- Tufte's site shows a "sparkline small multiple" example, a grid of repeated same-scale sparklines. — [edwardtufte.com](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- Data-ink ratio (share of ink that encodes data) and small multiples (the same chart repeated for different subsets on shared axes) come from *The Visual Display of Quantitative Information* (1983) and *Envisioning Information* (1990). [background, not verified this session]

### Inferences
- **Today tab = Few-style dashboard.** It should fit roughly one desktop viewport, or one or two phone screen-heights for the key tiles. Each tile: big current value, unit, a 7–14-day sparkline, and a reference (goal tick or personal baseline band). That is effectively a "bullet graph + sparkline" per metric (calories/protein vs target, sleep duration vs baseline, HRV/RHR vs baseline, steps vs goal).
- Bullet graphs fit nutrition macros vs target, where a qualitative range exists (e.g. under/within/over target). They replace rings/gauges while keeping the "progress to goal" meaning.
- **Trends tab = small multiples.** Stack the sleep, HRV, RHR, calories, protein and steps series on a shared, aligned time axis, each with its own y-scale and baseline band. Cross-source comparison then happens by vertical alignment instead of dual-axis charts.
- Avoid "meaningless variety": use one chart type per metric family, applied the same way across tabs.
- Avoid "excessive precision": show "7.4 h" or "7 h 24 m", not "7.3972 h", and "2,140 kcal", not "2,139.6".

### Gaps
- I could not fetch the full Few PDFs (perceptualedge.com unreachable), so the exact list wording for all 13 pitfalls and the bullet graph spec dimensions are not verified here.

## 2. Glanceability, at-a-glance vs drill-down, progressive disclosure, Shneiderman's mantra

### Takeaway
Persistent, glanceable summaries measurably help maintain behaviour (UbiFit Garden). Dashboards should be consumable "with a minimum of interaction". Detail should be layered: overview first, details on demand, with secondary content deferred to subsidiary screens.

### Cited Findings
- UbiFit Garden (Consolvo et al., CHI 2008): on-body sensing plus a glanceable display on the phone's background screen. A stylised garden (flowers = activities, butterflies = goals) acted as "a subtle but persistent and easily accessible reminder". In the 3-week field trial (n=12) and the 3-month follow-up, participants with the glanceable display maintained their activity level, including over holiday weeks. Activity dropped significantly for those without it. — [Consolvo et al. CHI 2008 PDF](https://makeabilitylab.cs.washington.edu/media/publications/Consolvo_ActivitySensingInTheWildAFieldTrialOfUbifitGarden_CHI2008.pdf); [consolvo.org/ubifit](https://www.consolvo.org/ubifit)
- The design rationale for the glanceable display (abstract and aesthetic rather than numeric) is in the companion UbiComp 2008 paper "Flowers or a robot army?". — [search summary referencing Consolvo et al.](https://www.consolvo.org/ubifit)
- NN/g defines dashboards as "collections of data visualizations, presented in a single-page view that imparts at-a-glance information on which users can act quickly", consumable "with a minimum of interaction or cognitive processing". NN/g distinguishes operational dashboards (time-sensitive) from analytical ones (at-a-glance for analysis, less time-sensitive). — [NN/g, Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/)
- NN/g: use visualisation styles that exploit preattentive processing. Encode quantities with length and 2D position for fast, reliable reading. — [NN/g video: Data Visualizations for Dashboards](https://www.nngroup.com/videos/data-visualizations-dashboards/); [NN/g article](https://www.nngroup.com/articles/dashboards-preattentive/)
- Preattentive features (colour, orientation, intensity, size, shape, curvature, line length) are detected without focused attention (Healey, Booth & Enns 1992). — [UBC TR-92-39](https://www.cs.ubc.ca/tr/1992/tr-92-39)
- NN/g progressive disclosure: defer secondary options to a subsidiary screen to focus attention on primary options. Benefits: easier learning, fewer errors. — [NN/g Progressive Disclosure video](https://www.nngroup.com/videos/progressive-disclosure/); article at [nngroup.com/articles/progressive-disclosure](https://www.nngroup.com/articles/progressive-disclosure/) (not fetched). NN/g's article also advises getting the initial/secondary split right and generally keeping it to at most two levels. [background, not verified this session]
- One secondary source notes the empirical base for progressive disclosure is limited, pointing to Carroll & Rosson's "training wheels" work. — [skills.cat summary](https://skills.cat/skills/bfmcneill/agi-marketplace/progressive-disclosure) (secondary; low confidence)
- Shneiderman (1996), Visual Information-Seeking Mantra: "Overview first, zoom and filter, then details-on-demand". The task-by-data-type taxonomy adds relate, history and extract, and lists temporal data as one of 7 data types. — [Shneiderman 1996, UMD DRUM](https://drum.lib.umd.edu/handle/1903/5784)
- Apple HIG: "Keep a chart simple, letting people choose when they want additional details. Resist the temptation to pack as much data as possible into a chart." For dense data, reveal detail progressively (levels of detail or subsets). — [Apple HIG, Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data) (via search extract)

### Inferences
- **Map the tabs onto the mantra.** Today = overview (status of each metric vs baseline or goal). Trends = zoom/filter (time-range selector 7D/30D/90D/1Y, metric filter). Insights = relate (cross-metric correlations). Tapping any tile = details on demand (a metric detail sheet with full chart, definition and data source).
- Keep at most 2 disclosure levels: tile → detail sheet. Avoid nested drill-downs.
- Glanceability means status should be readable preattentively: one colour or position cue per tile ("below your usual") rather than requiring number comparison.
- A persistent, ambient summary helps (UbiFit). That suggests a compact "Today" summary or widget/PWA badge, beyond the in-app view.

### Gaps
- NN/g full article text was not retrievable, so exact NN/g wording on the number of disclosure levels is unverified.

## 3. Personal informatics research: stages, lived informatics, reflection, multi-source integration

### Takeaway
Self-tracking systems fail mostly at integration and reflection. People struggle to combine data from multiple tools and to find relationships across them. Tracking is also intermittent (lapses), so the dashboard must handle gaps gracefully. Supporting temporal comparison and cross-source timelines yields diverse insight types.

### Cited Findings
- Li, Dey & Forlizzi (CHI 2010) define five stages: preparation, collection, integration, reflection, action. Barriers in earlier stages cascade to later ones. Stages are iterative, user- and/or system-driven, and uni- or multi-faceted. The model is based on surveys and interviews with self-trackers, largely from the Quantified Self community. — [Ian Li project page](https://ianli.owlstown.net/projects/16); [paper PDF](https://courses.cs.washington.edu/courses/cse440/15au/readings/PersonalInformatics-Li2010.pdf) (not fetched); [Quantified Self blog](https://quantifiedself.com/blog/a-stage-based-model-of-personal-informatics-systems/)
- Li et al. also report that multi-faceted systems (several data types and tools) create integration barriers. Users found it hard to explore relationships between data collected in separate tools, and reflection barriers included a lack of time and an inability to see relationships or patterns. [background, not verified this session; check the PDF]
- Epstein, Ping, Fogarty & Munson (UbiComp 2015), "A Lived Informatics Model of Personal Informatics": based on surveys of 105, 99 and 83 trackers (activity, finances, location) and 22 interviews. It adds deciding to track and selecting tools, and it adds lapsing and resuming as a normal part of tracking. It won the UbiComp 2025 10-Year Impact runner-up award. — [Epstein et al. 2015 PDF](https://my.eng.utah.edu/~cs5540/au16/readings/PersonalInformatics-Epstein2015.pdf); [UW HCDE award news](https://www.hcde.washington.edu/index.php/news/article/2025-10-15/professor-sean-munson-and-collaborators-recognized-10-year-impact-award)
- The follow-up "Reconsidering the Device in the Drawer" (Epstein et al., survey of 141 lapsed Fitbit users) treats lapses as a design opportunity. — [library.selfresearch.org](https://library.selfresearch.org/research/a-lived-informatics-model-of-personal-informatics/) (search summary)
- Choe et al., "Understanding Self-Reflection" (PervasiveHealth 2017/2018): the Visualized Self web app integrates data from multiple PI systems with timeline visualisations and temporal comparisons. In a think-aloud study (n=11) it helped participants identify many types of personal insights. The authors note that most self-tracking tools lack support for reflection beyond simple feedback. — [Microsoft Research page](https://www.microsoft.com/en-us/research/publication/understanding-self-reflection-people-reflect/); [DOI 10.1145/3154862.3154881](https://eudl.eu/doi/10.1145/3154862.3154881)
- Choe, Lee & schraefel analysed 30 Quantified Self presentations and identified 8 insight types: detail, self-reflection, trend, comparison, correlation, data summary, distribution, outlier (IEEE CG&A). — [Choe Visualized Self presentation](https://terpconnect.umd.edu/~choe/download/PervasiveHealth-2017-Choe-VisualizedSelf-Presentation.pdf) (via search summary)
- Jones & Kelly (CHI 2016 EA), "Finding interesting correlations in multi-faceted personal informatics systems", addresses automated correlation discovery across data streams. — cited in [Choe et al.](https://www.microsoft.com/en-us/research/publication/understanding-self-reflection-people-reflect/) (abstract not retrieved)

### Inferences
- **Insights tab** should explicitly support the 8 insight types. At minimum: trend (7- vs 30-day), comparison (this week vs last, weekdays vs weekends), correlation (e.g. late-eating days vs sleep score), outlier ("highest protein in 30 days"), and distribution. Present each insight as a plain-language sentence plus a small supporting chart. Do not make users find correlations themselves.
- Integration is the main barrier. Put all sources on one shared daily timeline (date as the join key). Show the data source and sync status per metric so users trust merged data.
- Design for lapses. Show gaps explicitly as breaks in lines, not interpolated or zero. Don't punish missed days in streaks too harshly (Habits tab). Offer an easy "welcome back" state rather than empty or broken charts.
- Correlational insights should be worded as associations with sample size ("on 9 of 12 nights after dinner past 21:00, sleep was shorter"), not as causal claims.

### Gaps
- Li et al.'s survey statistics and exact barrier lists were not verified (PDF host unreachable).

## 4. Uncertainty, personal baselines/normal ranges, and comparisons (vs self, vs goal)

### Takeaway
Show "is this normal for me?" by plotting the value against a personal baseline band derived from the user's own history. Superimposing observed values on an average range is a task people do equally well in linear and radial layouts on mobile. Be cautious with population norms and smoothing: they can feel medicalising and mismatched to lived experience. Show uncertainty and missing data explicitly, and avoid causal or clinical framing.

### Cited Findings
- Brehmer, Lee, Isenberg & Choe (IEEE InfoVis 2018 / TVCG 2019) ran a crowdsourced study of ranges over time on phones (n=87). It used self-tracked sleep data and temperature ranges at week (7), month (≤31) and year (365) granularity. Linear layouts were faster than radial, with little difference in error. Tasks comparing superimposed observed and average ranges performed similarly in both layouts. — [Microsoft Research](https://www.microsoft.com/en-us/research/publication/visualizing-ranges-over-time-on-mobile-phones-a-task-based-crowdsourced-evaluation/); [HAL record](https://hal-univ-tlse3.archives-ouvertes.fr/INRIA/hal-01857469); code/data: [github.com/microsoft/rangesonmobile](https://github.com/microsoft/rangesonmobile)
- Schneider et al. (CHI 2019) tested fertility tracking that visualises uncertainty (4-week field study, n=9). Showing predicted and detected phases side by side helped people grasp uncertainty without much negative emotion. Some participants read prediction accuracy as a sign of health. — [Schneider et al. CHI 2019](https://www.mmi.ifi.lmu.de/pubdb/publications/pub/schneider2019chi/schneider2019chi.pdf)
- Snyder et al., on self-tracking in bipolar disorder: chart conventions like normative baselines and statistical smoothing can conflict with how people experience their own data. They carry assumptions about "normal progress" and medicalised interpretation. — [Snyder, tmilab.colorado.edu](https://tmilab.colorado.edu/socialpi/wp-content/uploads/2018/10/Snyder.pdf)
- An interview study (DIS 2020) found uncertainty in self-tracking data can block decisions but also prompt reflection. It recommends letting users adjust expectations within the tool. — [ACM via springerprofessional](https://www.springerprofessional.de/doi/10.1145/3357236.3395448)
- A 2026 co-design paper on personal health interfaces recommends making uncertainty and missing context visible, and not presenting observed patterns as causal or clinical conclusions. It also warns that combining streams can reveal sensitive inferences. — [arXiv 2609.15046](https://arxiv.org/pdf/2609.15046) (recent preprint; not peer-reviewed as far as I could tell)
- Few's bullet graph supports comparison to a target and/or a prior-period value, against qualitative ranges. — [BetterEvaluation](https://betterevaluation.org/node/401)

### Inferences
- **"Normal for me" pattern.** Draw a personal baseline band, e.g. the user's rolling 30–60-day median ± IQR or ±1 SD, as a muted background band behind the daily value or line. Label the current state in words: "Within your usual range", "Lower than usual". This puts the comparison in position, so it is preattentive.
- Separate the two comparison types visually: vs goal (target tick or line, e.g. protein target) and vs self (band). Don't merge them into a single colour score without explanation.
- Show the baseline's provenance ("based on your last 30 nights") and a "calibrating" state when there are too few days (e.g. fewer than 7–14).
- Prefer personal baselines over population norms for wearable-derived metrics (HRV, RHR). Where population guidance is used (e.g. sleep 7–9 h), label it as general guidance.
- Uncertainty: mark estimated values (e.g. AI-estimated meal calories) with a "~" or a range ("~650 kcal, ±150"), use hollow/dashed marks for estimated or incomplete days, and mark the current partial day as incomplete.

### Gaps
- I found no study directly comparing how lay users interpret population reference ranges vs personal baseline bands in consumer wearables.

## 5. Chart choice, colour, number formatting

### Takeaway
Use linear, position- or length-based encodings: bars for daily totals, lines with rolling averages for noisy daily metrics, range or band charts for sleep windows and baselines, bullet graphs for vs-target. Rings and radial charts are slower or less accurate than linear equivalents. Calendar heatmaps suit habit adherence. Use colour sparingly and semantically, with a colourblind-safe palette and redundant non-colour cues.

### Cited Findings
- Waldner et al. (IEEE TVCG 2019), crowdsourced with 92 non-experts, radial vs linear for daily periodic patterns: "the most elementary 24-hours linear bar chart is most accurate and efficient and is also preferred by the users". This is "strong evidence for the use of linear layouts – even for visualizing periodical daily patterns". — [TU Wien publication page](https://cg.tuwien.ac.at/research/publications/2019/waldner-2019-rld); [arXiv 1907.13534](https://ar5iv.arxiv.org/html/1907.13534)
- Brehmer et al. 2019: linear range charts were faster than radial on phones at week, month and year granularity, with similar error. — [Microsoft Research](https://www.microsoft.com/en-us/research/publication/visualizing-ranges-over-time-on-mobile-phones-a-task-based-crowdsourced-evaluation/)
- Kiesel et al.: for circle-sector fill levels, both area and radius drive estimates. Area dominates below ~65%, with a shift towards length perception above. Partial rings/sectors are therefore read inconsistently. — [diglib.eg.org](https://diglib.eg.org/bitstreams/90e4016f-7cd4-45af-a855-809e79eb524a/download) (via search summary)
- Cleveland & McGill: aligned bars beat stacked bars, and adjacent comparisons beat distant ones. Setlur et al. (Tableau Research) largely confirmed this. — [Tableau Research, Four Experiments on the Perception of Bar Charts](https://www.tableau.com/sv-se/research/publications/four-experiments-perception-bar-charts)
- NN/g: use length and 2D position for quantities on dashboards. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)
- Apple HIG: reserve charts for surfacing insight, and use a list or table when users just need the data. Prefer common chart types, and explain novel ones with descriptive text. Keep related charts consistent. Make every chart accessible, with labels for values and components and interactive accessibility elements (Audio Graphs). — [Apple HIG, Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data); [WWDC22 "Design an effective chart"](https://developer.apple.com/videos/play/wwdc2022-110340)
- Colour, Datawrapper: blue vs orange/red is easily distinguished by colourblind readers ("when in doubt, use an orange/red with blue"). Avoid pairs like red/green/brown, pink/turquoise/grey, purple/blue. Use non-colour cues: labels, symbols, patterns, line width/dash, direct labels. — [Datawrapper colorblindness part 2](https://www.datawrapper.de/blog/colorblindness-part2); [part 1](https://www.datawrapper.de/blog/colorblindness-part1); [beautiful colors](https://www.datawrapper.de/blog/beautifulcolors)
- Andy Kirk (Visualising Data): alternatives to red/green include pink-red ↔ lime-green, or blue ↔ red, or keeping red/green but adding arrows or +/− signs. — [Five ways to design for red-green colour-blindness](https://visualisingdata.com/2019/08/five-ways-to-design-for-red-green-colour-blindness/)
- For continuous colour scales (e.g. calendar heatmap intensity), use perceptually uniform, colourblind-tested scales such as viridis. — [NCEAS colorblind-safe schemes PDF](https://nceas.ucsb.edu/sites/default/files/2022-06/Colorblind%20Safe%20Color%20Schemes.pdf)
- Mobile colour guidance: limit to roughly 3–7 colours and don't place red and green side by side. — [Infragistics, Five basic rules for mobile data visualization](https://www.infragistics.com/community/blogs/b/mobileman/posts/five-basic-rules-for-mobile-data-visualization) (practitioner blog; lower authority)

### Inferences
- **Chart-by-metric map:**
  - Daily totals (calories, protein, steps, active minutes): vertical bars per day, a horizontal target line, and an optional 7-day rolling average line.
  - Noisy physiological metrics (HRV, RHR, weight): thin daily dots or line, a bold 7-day rolling average, and a personal baseline band.
  - Sleep timing: floating range bars (bedtime→wake) per night, as in Brehmer's range charts, with the average range superimposed.
  - Habit adherence and streaks: calendar heatmap / GitHub-style grid (binary or sequential single hue).
  - Macros vs targets: horizontal bullet graphs or aligned bars, not three concentric rings.
  - Cross-metric relationships (Insights): small scatter or aligned small multiples. Avoid dual-axis charts.
- **Rings.** If rings are kept for brand reasons (Apple/Oura-style), pair each with the exact number and a "% of target" label, and never rely on ring comparison across metrics. The evidence favours linear bars for accuracy.
- **Semantic colour.** Neutral grey or brand colour for normal data. Reserve one accent for "attention" (outside your usual range) and one for "on target". Use a colourblind-safe pair (blue/orange) plus icons or text, never colour alone. Avoid red for "over calorie target" if it reads as moralising. Use neutral language and amber.
- **Number formatting.** Round to meaningful precision, show units consistently, use thousands separators, and use tabular figures in tiles so digits don't jump. Show deltas with sign and direction words ("+12 ms vs usual").

### Gaps
- No controlled study found that directly compares activity rings/gauges vs bars for personal goal-progress tasks. Evidence is extrapolated from radial-vs-linear and angle/area perception research.
- No primary evidence retrieved on calendar heatmap effectiveness. It is recommended by convention.

## 6. Mobile dashboard design: cards, vertical scroll, thumb reach, density, dark mode

### Takeaway
On phones, stack KPIs at the top and charts below in a single vertical scroll. Use linear charts with reduced labels and legends, and design for touch (tap for details rather than hover). Display size measurably affects perception accuracy, so mobile charts must be redesigned for the size, not just shrunk.

### Cited Findings
- Badam & Elmqvist (2021), "Effects of Screen-Responsive Visualization on Data Comprehension": a lab study found significant correctness differences in perceiving changes depending on display size, with similar completion times. The paper offers guidelines for screen-responsive visualisation. — [cs.au.dk (Elmqvist)](https://cs.au.dk/~elm/pdf/touchinsight.pdf) (via search summary; exact link/paper mapping not fully verified)
- The CHI 2018 workshop on mobile data visualisation noted that existing visualisation guidelines "do not transfer well" to mobile. Topics included glanceable and responsive visualisation. — [CFP on ieee_vis list](https://listserv.uni-tuebingen.de/pipermail/ieee_vis/2018/001221.html)
- Brehmer et al. was the first crowdsourced vis experiment run exclusively on phones. Linear layouts were faster. — [Microsoft Research](https://www.microsoft.com/en-us/research/publication/visualizing-ranges-over-time-on-mobile-phones-a-task-based-crowdsourced-evaluation/)
- Mobile dashboards: stack KPIs, charts and tables vertically for scrolling, KPIs at top. Avoid legends and redundant labels. — [Infor Birst mobile design guidelines](https://docs.infor.com/birst/2024.x/en-us/birstolh/mobile_user/nsc1655271156432.html) (vendor docs)
- Apple HIG: keep charts simple and reveal detail progressively (e.g. tap or scrub to inspect values). — [Apple HIG, Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data)

### Inferences
- Use a card per metric family with a consistent internal anatomy: label, value, status words, sparkline or bullet bar, and a chevron to the detail view. On desktop, the same cards reflow into a 2–4-column grid so Today fits one screen (Few). On mobile, use a single column, most important first.
- Replace hover tooltips with tap/press-and-drag scrubbing on mobile. Make the touch target the whole card (at least 44 pt per Apple HIG / 48 dp per Material — [background, not verified this session]).
- Put primary navigation (Today/Habits/Insights/Trends) in a bottom tab bar on mobile for thumb reach, and use a time-range segmented control near the chart. [background, not verified this session: thumb-zone findings are from Hoober's research]
- Use direct labels instead of legends on small screens.
- Dark mode: define colour tokens for both themes. Re-check chart colours' contrast and colourblind separability in dark mode, because saturated status colours on dark backgrounds can vibrate. Use desaturated or lighter variants. Avoid pure black (#000) behind thin chart lines (Material dark theme guidance recommends dark grey surfaces — [background, not verified this session]).

### Gaps
- I did not retrieve primary sources on thumb-reach zones (Hoober), Material Design data-vis guidance, or dark-mode effects specific to health apps. These remain unverified.

## 7. Dashboard anti-patterns

### Takeaway
The main failures are too much on one view, decorative or low-accuracy encodings, variety for its own sake, excess precision, and missing context (no baseline, target, definition or source). Personal-health-specific anti-patterns include ignoring lapses and implying causation or clinical meaning.

### Cited Findings
- Few's 13 pitfalls include exceeding a single screen, excessive detail/precision, and meaningless variety. Summaries also list misplaced key information and showing too much information. — [The Data School](https://www.thedataschool.co.uk/anh-vu/are-you-making-these-13-dashboard-design-mistakes/); [Few, Common Pitfalls PDF](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf) (not fetched)
- Apple HIG: "Resist the temptation to pack as much data as possible into a chart." Use tables or lists when no insight is being conveyed. Explain novel charts. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/charting-data)
- Gauges are what Few designed bullet graphs to replace. — [BetterEvaluation](https://betterevaluation.org/node/401)
- Most self-tracking tools offer little reflection support beyond simple feedback. — [Choe et al.](https://www.microsoft.com/en-us/research/publication/understanding-self-reflection-people-reflect/)
- Normative baselines and smoothing can impose "normal progress" assumptions. — [Snyder](https://tmilab.colorado.edu/socialpi/wp-content/uploads/2018/10/Snyder.pdf)
- Presenting patterns as causal or clinical conclusions is discouraged. — [arXiv 2609.15046](https://arxiv.org/pdf/2609.15046)
- Lapses are normal and should be designed for. — [Epstein et al. 2015](https://my.eng.utah.edu/~cs5540/au16/readings/PersonalInformatics-Epstein2015.pdf)

### Inferences
Anti-pattern checklist for the redesign:
1. More than ~5–7 headline KPIs on Today.
2. A metric without a reference (goal or baseline).
3. An unexplained proprietary score with no "how it's calculated" and no inputs breakdown.
4. Rings or gauges as the only encoding.
5. Dual-axis charts for cross-metric comparisons.
6. Colour-only status.
7. Over-precise numbers.
8. Interpolating over or zero-filling missing days.
9. Causal language in insights.
10. Different chart styles for the same metric across tabs.
11. A partial "today" compared against full past days without marking it.
12. Decorative illustration competing with data on Today.

### Gaps
- No quantitative evidence found on the optimal KPI count for personal dashboards. The ~5–7 figure is a heuristic inferred from Few's short-term-memory rationale, not a tested threshold.
