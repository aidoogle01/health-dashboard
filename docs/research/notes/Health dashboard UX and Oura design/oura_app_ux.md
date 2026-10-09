# Oura Ring app UX and visual design (current app, 2024–2026)

> Method note: support.ouraring.com, ouraring.com and 9to5google.com could not be fetched directly from this environment (egress proxy blocked them / DNS failure). All findings below come from search-engine summaries of those pages plus third-party reviews. Treat quoted wording as "as reported in search snippets"; anything not verified is placed in Gaps or Inferences.

## Information architecture: tabs, glance-to-detail hierarchy, and the redesign

### Takeaway
The current app has three tabs: **Today** (daily glance and "One Big Thing"), **Vitals** (customisable list of biometric cards compared with personal baselines, from days to years) and **My Health** (long-term trends, Habits/Routines, Stress Management, Oura Advisor). These replaced the older five tabs (Home, Readiness, Sleep, Activity, Resilience). The hierarchy runs: rings and colour cues at a glance, then focused metric views, then interactive long-term charts.

### Cited Findings
- Oura's blog: the redesign condenses the five tabs (**Home, Readiness, Sleep, Activity, Resilience**) into three tabs: **Today, Vitals, My Health** — [Oura blog, "Introducing the New Oura App Design"](https://ouraring.com/blog/new-oura-app-experience/)
- Today: "need-to-know health insights throughout the day, from when you wake up to when you're winding down for bed". Vitals: "a more detailed snapshot of your overall health, allowing you to dive deeper into your data as needed". My Health: "showcases trends and provid[es] valuable insights, helping you understand how your daily data impacts your future well-being" — [Oura blog](https://ouraring.com/blog/new-oura-app-experience/)
- Today is described as a daily feed of the most timely insights, "modeled on a news app's front page". Readiness, Sleep and Activity scores sit at the top, with one main insight highlighted, which Oura calls **"One Big Thing"** — [Oura blog](https://ouraring.com/blog/new-oura-app-experience/); [9to5Google, Oct 20 2025](https://9to5google.com/2025/10/20/oura-app-redesign/); [Android Police](https://www.androidpolice.com/oura-redesigned-app-brings-new-health-tracking-powers/)
- "One big thing" is "the most critical score or insight you need to act on right now", and depending on context it may be Readiness or a stress metric — [TechBetweenTheLines](https://www.techbetweenthelines.com/oura-rings-major-app-redesign-and-cumulative-stress-feature-now-rolling-out/); [AOL/Tom's Guide syndication](https://www.aol.com/articles/oura-ring-app-getting-redesign-175941544.html)
- Droid-Life: "a lot of the clutter has been cut back, instead showing you your most important score and a quick snapshot of your body's readiness levels" — [Droid-Life, Nov 2025](https://www.droid-life.com/2025/11/13/oura-ring-app-gets-big-facelift-ai-gets-more-access-to-your-metrics/)
- Vitals breaks down stress, sleep and cardiovascular data "between timeframes, from days to years". Parts of the screen change colour with your biometrics — [9to5Google](https://9to5google.com/2025/10/20/oura-app-redesign/). Vitals uses colour-coded cards to show which areas need attention — [TechCrunch, Oct 20 2025](https://www.techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature)
- Vitals lets you "drill down into the clinical core of your daily stats", comparing resting heart rate, HRV, respiratory rate and skin-temperature deviation against your personal historical baselines — [Wareable, Oura Ring 5 review](https://www.wareable.com/wearable-tech/oura-ring-5-review)
- Vitals menu is **user-customisable**, so the metrics you care about sit at the top. Items can be specific metrics (HRV, resting HR) or composites such as "heart health age". Tapping an icon opens charts — [Trusted Reviews, Oura Ring 5](https://www.trustedreviews.com/reviews/oura-ring-5)
- My Health: long-term overview at the top of the page (the most overhauled tab), plus **"Habits"** and **"Routines"** sections showing how daily actions affect health over time, and easy access to Oura Advisor (the AI) — [TechCrunch](https://www.techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature); [9to5Google](https://9to5google.com/2025/10/20/oura-app-redesign/); [AOL](https://www.aol.com/articles/oura-ring-app-getting-redesign-175941544.html)
- Navigation path example: My Health → Stress Management → Cumulative Stress (under "Key metric") — [Oura support, Cumulative Stress](https://support.ouraring.com/hc/en-us/articles/45979919957395-Cumulative-Stress)
- Three-level visualisation framework: (1) **at-a-glance indicators** using abstract rings, bars and simple colour cues; (2) **focused metric views** for short-term patterns; (3) **exploratory visualisations** with precise, interactive charts for long-term trends. Built on progressive disclosure — [Instrument case study](https://www.instrument.com/work/oura-app); [Shorty Awards entry](https://shortyawards.com/18th/test-2)
- Instrument names the original problem: daily signals, long-term patterns and personalised guidance had become "increasingly difficult for users to find, interpret, and act on" — [Instrument](https://www.instrument.com/work/oura-app)
- Pratt design critique (Sep 2026) describes five interpretable metrics (Readiness, Sleep, Activity, Heart Rate, Stress) across the three tabs. It praises Today's **shortcut group** of metrics: tapping one moves the group to the bottom of the screen in the same order, with strong visual feedback. It calls the conceptual model simple — [IXD@Pratt, "Design Critique: Oura"](https://ixd.prattsi.org/2026/09/design-critique-oura/)
- Redesign timing conflicts. TechCrunch and 9to5Google date the three-tab redesign (with Cumulative Stress) to **October 20, 2025**. Wareable refers to a redesign introduced "alongside the Oura Ring 4 launch last October" (Oct 2024), and liveworksleep says "late 2024" — [TechCrunch](https://www.techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature); [Wareable](https://www.wareable.com/wearable-tech/oura-cumulative-stress-cycle-insights-advisor-update-rollout-app-redesign); [liveworksleep](https://liveworksleep.com/oura-app-features/); [GSMArena, Ring 4 + redesigned app](https://m.gsmarena.com/oura_ring_4_announced_sleeker_design_updated_sensors_and_redesigned_app_-news-64774.php)
- Older app (pre-redesign, mark as older): HRV and resting HR night graphs sat "further down" the **Readiness tab**. The top of the **Sleep tab** showed Total Sleep Time, Time in Bed, Sleep Efficiency and Resting Heart Rate, followed by a stage summary — [Oura blog, sleep tracking](https://ouraring.com/blog/how-does-the-oura-ring-track-my-sleep/)

### Inferences
- The most likely reading of the timing conflict: the Ring 4 launch (Oct 2024) brought the Today/Vitals/My Health structure, and Oct 2025 brought a second visual refresh (biometric-driven colour, Liquid Glass on iOS, Cumulative Stress, a reworked My Health). A designer should model the 3-tab IA either way.
- Dashboard mapping: Today = hero row of three score rings plus one prioritised insight card plus a timeline/feed. Vitals = a reorderable grid of metric tiles, each tinted by its state against baseline. My Health = long-horizon trend modules plus an AI chat entry point.

### Gaps
- I could not get exact on-screen order of Today cards (e.g. timeline of tags/workouts/meals) from primary sources.
- I could not confirm whether SpO2 appears in Vitals.

## Scores: rings, bands, labels and contributors

### Takeaway
Readiness, Sleep and Activity are 0–100 scores. Each is built from contributors that show their own 0–100 bar and a qualitative label. Bands: **85–100 Optimal, 70–84 Good, 60–69 Fair, 0–59 Pay attention** (support docs). Older blog copy uses a 3-band scheme where everything under 70 is "Pay attention". A contributor rated "Pay attention" shows a **red progress bar**.

### Cited Findings
- "Readiness, Activity, and Sleep Scores, and their contributors, are rated on a scale of 0-100": **85-100 Optimal, 70-84 Good, 60-69 Fair, 0-59 Pay Attention**. An 85 or higher "may be a sign that you are ready to take on new challenges" — [Oura support, article 360057791533](https://support.ouraring.com/hc/en-us/articles/360057791533)
- Conflicting older scheme on Oura's blog: 85+ Optimal; **70–84 Good** ("you've recovered well enough"); **under 70 Pay attention** ("you're not fully recovered") — [Oura blog, Readiness score](https://ouraring.com/blog/readiness-score/)
- A contributor showing a "pay attention" message with a **red progress bar** is an area for potential improvement. Scores of 100 "are designed to be rare" — [Oura blog, Readiness score](https://ouraring.com/blog/readiness-score/) (via search summary)
- **Readiness contributors (9):** Resting heart rate, HRV balance, Body temperature, Recovery index, Previous night (sleep), Sleep balance, Sleep regularity, Previous day activity, Activity balance. They are phrased as questions in Oura copy, e.g. "Is my body temperature higher or substantially lower than usual?", "How well did I sleep last night compared to normal?", and Recovery index as "how many hours of recovery sleep did I get after my heart rate reached its baseline". On Recovery index, "Pay attention" means resting HR took longer than usual to stabilise — [Oura blog, Readiness score](https://ouraring.com/blog/readiness-score/); [MyDataHelps export format](https://support.mydatahelps.org/oura-daily-readiness-export-format); [sahha.ai analysis](https://sahha.ai/blog/how-readiness-scores-are-calculated/)
- Note: some Oura blog text says "seven daily Readiness Contributors", which conflicts with the nine listed in current docs. The count has changed over time (Sleep regularity was added) — [Oura blog](https://ouraring.com/blog/readiness-score/); [sahha.ai](https://sahha.ai/blog/how-readiness-scores-are-calculated/)
- **Sleep contributors (7):** Total Sleep, Efficiency, Restfulness, REM Sleep, Deep Sleep, Latency, Timing. Efficiency is the "percentage of time you actually spend asleep after going to bed". Timing is alignment with circadian rhythm — [Oura support, Sleep Contributors](https://support.ouraring.com/hc/en-us/articles/360057792293-Sleep-Contributors); [Oura blog, Sleep score](https://ouraring.com/blog/sleep-score/)
- Activity score uses the same 0–100 and band system — [Oura support](https://support.ouraring.com/hc/en-us/articles/360057791533); [Oura blog, Activity score](https://ouraring.com/blog/activity-score/)
- A **crown icon** marks a metric that is within optimal range. A critic found it off-theme and suggested a star — [IXD@Pratt](https://ixd.prattsi.org/2026/09/design-critique-oura/)
- Colour palette for Readiness, Sleep and Activity is visually consistent, while Heart Rate and Stress use slightly different views — [IXD@Pratt](https://ixd.prattsi.org/2026/09/design-critique-oura/)

### Inferences
- Pattern to reuse: score ring (number in centre), then a qualitative label (Optimal/Good/Fair/Pay attention), then a contributor list of horizontal bars, each with a label and the bar coloured by band (red/attention colour only for "Pay attention"). The qualitative word carries meaning, so colour is not the only signal.
- Phrasing contributors as plain-language questions is a reusable copy pattern for explanation sheets.

### Gaps
- Exact hex colours for each band or score (I recall from use that colours are muted and bands are not traffic-light bright, but found no source).
- Whether the current app shows ring arcs or a different glyph for scores after the 2025 refresh. Agency copy only says "abstract rings, bars".

## Colour system and typography

### Takeaway
Oura's visual identity is calm, reductive and warm-neutral. The 2025 app adds a **semantic colour system anchored to personal baselines**: tiles and screen areas shift colour according to body state. The iOS app uses Liquid Glass styling on the three main tabs. Oura does not document exact app colour tokens publicly.

### Cited Findings
- Instrument introduced "a unified semantic color system" with "dynamic color cues [that] direct attention to what matters most and make it easier to scan, compare, and act" — [Instrument](https://www.instrument.com/work/oura-app)
- "Color adapts to personalized baselines, signaling how the body is responding rather than simply displaying raw values" — [Shorty Awards](https://shortyawards.com/18th/test-2)
- The colour system signals body states from biometrics, anchored to "your unique, personalized baselines". The feedback runs across all three tabs — [TechBetweenTheLines](https://www.techbetweenthelines.com/oura-overhauls-app-experience-and-introduces-cumulative-stress-tracking/); [Digital Reviews Network](https://www.digitalreviews.net/news/industry-news/oura-app-redesign-cumulative-stress/). Pocket-lint calls Vitals' colour indicators an "immediate visual status report" — [Pocket-lint](https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/)
- Reviewers' reactions: "gorgeous"; the top of Today "almost feels inspired by iOS 26's Liquid Glass" — [Pocket-lint](https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/). "Super slick" — [Droid-Life](https://www.droid-life.com/2025/11/13/oura-ring-app-gets-big-facelift-ai-gets-more-access-to-your-metrics/). iOS uses Liquid Glass elements on the three core tabs, and fonts, colours and card distribution were all rethought — [Wareable, Ring 5 review](https://www.wareable.com/wearable-tech/oura-ring-5-review)
- Oura describes its app's "intuitive design, calming color schemes, and approachable graphics" — [Oura IP notice](https://ouraring.com/intellectual-property-notice)
- Brand palette, mainly from web extraction (not official): warm neutrals with cream ground (#f7f1e8) and dark sandstone ink (#4a4741) — [Refero styles](https://styles.refero.design/style/9decde51-2a8b-4212-bba5-be9457efc62e). Primary brand blue #2A72DE, plus "Dawn Pink" #EFE7DB — [Brandfetch](https://brandfetch.com/ouraring.com)
- Typography (web, third-party extraction): **Akkurat LL** grotesque for functional text, **Editorial New** serif italic for emotional headlines — [shadcn.io Oura design system](https://www.shadcn.io/design/oura); [dembrandt](https://www.dembrandt.com/explorer/oura). The brand case study describes typography as "quiet and reductive, projecting a feeling of simplicity and calm" — [Muse Award, Brand Identity OURA](https://www.museaward.com/winner-info.php?id=2499)
- 2020 brand guidelines: "always use the logo in white on dark backgrounds" — [Oura API Brand Guidelines v1, 2020](https://static.ouraring.com/pdfs/Oura_BrandGuidelines_v1.pdf)

### Inferences
- For a web dashboard: use a dark, near-black/deep-navy canvas with soft gradients for the app look, a sans-serif grotesque for numbers and UI, an optional serif italic for one editorial headline, and low-saturation state colours keyed to deviation from baseline rather than absolute values.

### Gaps
- No official source on the app's dark theme tokens or per-score colours. My recollection of the older app is a dark navy/black background with soft gradients, a teal/blue for sleep and a warm tone for activity, but this is unverified, so do not cite it as fact.

## Tone of voice and copy

### Takeaway
Copy is supportive, hedged and non-judgmental. The vocabulary runs "Optimal / Good / Fair / Pay attention" rather than "bad/poor". Contributors are explained as plain questions about your own normal. Advisor speaks in softened, contextual language. Oura reportedly added more "compassionate" messaging and Rest Mode to address score anxiety.

### Cited Findings
- Band labels use **"Pay attention"** instead of negative words. Good = "you've recovered well enough"; Pay attention = "you're not fully recovered"; 85+ "may be a sign that you are ready to take on new challenges" — [Oura blog](https://ouraring.com/blog/readiness-score/); [Oura support](https://support.ouraring.com/hc/en-us/articles/360057791533)
- Advisor sample phrasing: morning data "suggests you might be waking up feeling a bit depleted", with demanding days framed as expected given life context. When a user felt calm but was shown "stressed", Advisor explained the score is based on physiological signals, so "even if mentally you may feel calm" — [LinkedIn, "Why Oura Needs to Rename its 'Stress' Metric"](https://www.linkedin.com/pulse/why-oura-needs-rename-its-stress-metric-andy-proctor-xu7vc)
- Member quote on Advisor: it "has been good about reminding me to do some breathing exercises and take quiet moments". 60% of Labs testers agreed Advisor helped them understand metrics they did not fully grasp (self-reported) — [Oura blog, How to use Oura Advisor](https://ouraring.com/blog/how-to-use-oura-advisor/)
- Daytime Stress copy marks post-workout stress as **"Post-activity stress"**. Symptom Radar shows status text such as **"Minor signs"** with a "Learn more" button — [Oura support, Daytime Stress](https://support.ouraring.com/hc/en-us/articles/21205822135315-Daytime-Stress); [Oura store page](https://ouraring.com/store/rings/oura-ring-4-ceramic)
- App Store framing: scores give "a clear understanding of the state of your body with actionable guidance on how to stay balanced" — [App Store listing](https://apps.apple.com/us/app/-/id1043837948)
- Reported (secondary, unverified): Oura updated its interface in 2025 to include "Rest Mode" and more "compassionate" messaging "to combat the score anxiety" — [AOL](https://www.aol.com/articles/oura-ring-judging-160543237.html)

### Inferences
- Copy formula: state label (neutral word), then one-sentence "what this means vs your normal", then a gentle suggestion ("consider", "might"), never moralising. Each claim is tied to the user's own baseline ("than usual", "compared to normal").

### Gaps
- I could not retrieve verbatim daily Today messages or "One Big Thing" example cards. Search returned only non-Oura copy (Vitra Health's "You're ready. Train hard this morning." / "Take it easy." is a third-party app, NOT Oura).

## Detail views: hypnogram, night HR/HRV, temperature, trends

### Takeaway
Sleep detail shows a stage hypnogram (Awake / REM / Light / Deep) plus the night's heart rate and HRV curves. Temperature is shown as a deviation from personal baseline, not an absolute value. Vitals and My Health add day/week/month/year timeframes.

### Cited Findings
- Hypnogram: graph of stages across the night (awake, light, deep, REM). Oura's algorithm labels 30-second windows. A third-party analysis says 5-minute classification is recorded (conflict; likely display vs API granularity) — [Oura blog, sleep tracking](https://ouraring.com/blog/how-does-the-oura-ring-track-my-sleep/); [irenevdb blog](https://irenevdb.rbind.io/blog/trackers/01-oura/)
- Full-night HRV and resting HR graphs: "Oura is the only wearable that gives you your entire night of HRV data". HRV is a time series across sleep stages — [Oura blog](https://ouraring.com/blog/how-does-the-oura-ring-track-my-sleep/); [openwearables](https://openwearables.io/blog/oura-api-accessing-ring-data-sleep-hrv-readiness)
- Heart rate graph has its own support article — [Oura support, Heart Rate Graph](https://support.ouraring.com/hc/en-us/articles/4410656562579-Heart-Rate-Graph)
- Temperature: reports how much last night differed from the user's mean, not absolute skin temperature. More than +0.5 °C often signals immune response, stress or luteal phase — [openwearables](https://openwearables.io/blog/oura-api-accessing-ring-data-sleep-hrv-readiness)
- Vitals trends span "days to years" — [9to5Google](https://9to5google.com/2025/10/20/oura-app-redesign/)
- Oura doesn't tell you "how many bpm or ms is the optimal or even typical amount" — [Tom's Guide, Ring 5](https://www.tomsguide.com/wellness/smart-rings/oura-ring-5-hands-on-review-ive-worn-the-worlds-smallest-smart-ring-for-a-week-and-it-changes-fitness-tracking-forever)

### Inferences
- Dashboard detail-page recipe: step-chart hypnogram (4 lanes) over a shared time axis with HR and HRV line charts beneath it; temperature as a diverging bar chart around 0 °C; a period switcher (D/W/M/Y).

### Gaps
- No primary description of the exact layout of the temperature or Activity (daily movement) charts in the current app.

## Personal baselines

### Takeaway
Everything is relative to the user's own normal. Readiness weighs nightly HRV, RHR and temperature against "normal ranges". Stress has no fixed thresholds. The 2025 colour system is anchored to personal baselines.

### Cited Findings
- Readiness factors in deviation of nightly HRV, RHR and skin temperature compared with their normal ranges — [Oura blog, sleep tracking](https://ouraring.com/blog/how-does-the-oura-ring-track-my-sleep/) (via search summary)
- Oura "does not use fixed thresholds for stress. Your scores are relative to you" — [Oura support, Daytime Stress](https://support.ouraring.com/hc/en-us/articles/21205822135315-Daytime-Stress)
- Vitals compares metrics against "personal historical baselines" — [Wareable](https://www.wareable.com/wearable-tech/oura-ring-5-review)
- Activity balance uses about two months of history; Sleep balance and Sleep regularity use two weeks — [sahha.ai](https://sahha.ai/blog/how-readiness-scores-are-calculated/); [Oura blog](https://ouraring.com/blog/readiness-score/)

### Gaps
- I found no source describing the visual form of the baseline band (e.g. a shaded range on charts) or exact phrases like "within your typical range" in the current app.

## Named features: Symptom Radar, Resilience, Stress, Cardiovascular age, Meals/Glucose

### Takeaway
Newer features add qualitative-level and trend displays (Resilience levels, Daytime Stress colour graph, Symptom Radar status) alongside the 0–100 scores. My Health groups them into themes such as Stress Management.

### Cited Findings
- **Daytime Stress:** colour-coded graph updated every 15 min while awake, wearing the ring and relatively inactive. Reported scale: Low / Medium / High plus a trend line (third-party) — [Oura support](https://support.ouraring.com/hc/en-us/articles/21205822135315-Daytime-Stress); [Kygo](https://www.kygo.app/post/oura-ring-stress-tracking-explained)
- **Resilience:** based on the stress/recovery balance over recent weeks. A **Trend** graph has one dot per day; a **Map** graph plots stress vs recovery over 14 days, and you can long-press each level. Reported five levels (third-party): **Limited, Adequate, Solid, Strong, Exceptional** — [Oura support, Resilience](https://support.ouraring.com/hc/en-us/articles/25358829055251-Resilience); [Kygo](https://www.kygo.app/post/oura-ring-stress-tracking-explained); [TechCrunch 2024](https://techcrunch.com/2024/01/31/oura-launches-a-new-feature-to-mesure-your-resilience-against-stress)
- **Cumulative Stress** (Oct 2025): uses 31 days of data, updates weekly, and needs at least 21 days. Five factors: sleep continuity, heart stress-response, sleep micro-motions, temperature regulation, activity impact. It sits in My Health → **Stress Management**, which unites Daytime Stress, Resilience and Cumulative Stress — [Oura support](https://support.ouraring.com/hc/en-us/articles/45979919957395-Cumulative-Stress); [TechCrunch](https://www.techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature); [Oura blog](https://ouraring.com/blog/what-is-cumulative-stress/)
- **Symptom Radar:** looks at cardiovascular and respiratory signals and may alert "before symptoms of a cold or flu are even felt". Status card e.g. "Minor signs" — [Oura store](https://ouraring.com/store/rings/oura-ring-4-ceramic); [Healthline](https://www.healthline.com/health/fitness/what-does-oura-ring-track)
- **Cardiovascular Age:** estimates "the biological age of your vascular system compared to your chronological age". **Cardio Capacity** (VO2 max estimate) — [Oura blog, the Oura difference](https://ouraring.com/blog/the-oura-difference/)
- **Meals & Glucose** (May 2025): photo-based meal logging with AI analysis; glucose from Dexcom Stelo shown in the context of meals, sleep, stress and activity; "Time Above Range" metric — [Business Wire, May 6 2025](https://www.businesswire.com/news/home/20250506997981/en/URA-Redefines-Metabolic-Health-Tracking-with-Two-New-AI-Driven-Features-Meals-and-Glucose); [MobiHealthNews](https://www.mobihealthnews.com/news/oura-ring-now-syncs-dexcoms-stelo-cgm)
- **Tags:** user tags add context but don't alter ratings — [IXD@Pratt](https://ixd.prattsi.org/2026/09/design-critique-oura/)

### Gaps
- Exact visual of Cardiovascular Age (years vs. a ± delta), Cumulative Stress levels, and the stress-graph colours were not found in primary sources.

## Known criticisms and user complaints

### Takeaway
The main critiques are score anxiety (orthosomnia), metrics that conflict with how users feel (especially "stressed"), proliferating scores and features, a subscription paywall ($5.99/mo), and lack of reference values. I found no well-sourced Reddit evidence about the redesign specifically.

### Cited Findings
- Stress metric shows "stressed" when the user felt relaxed. The author argues it should be renamed — [LinkedIn](https://www.linkedin.com/pulse/why-oura-needs-rename-its-stress-metric-andy-proctor-xu7vc)
- Sleep-tracker anxiety: a "preoccupation with such data may lead to poor sleep quality" — [TechRadar opinion](https://www.techradar.com/opinion/sorry-oura-im-not-ready-to-turn-sleep-into-a-competition-just-yet). A cited study found participants given sham "slept poorly" feedback did worse on cognitive tests — [AOL](https://www.aol.com/articles/oura-ring-judging-160543237.html)
- No guidance on typical/optimal bpm or ms values — [Tom's Guide](https://www.tomsguide.com/wellness/smart-rings/oura-ring-5-hands-on-review-ive-worn-the-worlds-smallest-smart-ring-for-a-week-and-it-changes-fitness-tracking-forever)
- Crown-icon metaphor inconsistent — [IXD@Pratt](https://ixd.prattsi.org/2026/09/design-critique-oura/)
- Subscription $5.99/month is required for the app — [Tom's Guide](https://tomsguide.com/wellness/fitness-trackers/forget-oura-ring-4-oura-ring-3-users-can-access-all-of-these-new-features-in-the-oura-app)
- The redesign's own motivation admits data had become hard "to find, interpret, and act on" — [Instrument](https://www.instrument.com/work/oura-app)

### Inferences
- Adding Cumulative Stress, Resilience and Daytime Stress alongside the three core scores increases the "too many scores" risk. Oura's answer is to curate (One Big Thing) instead of removing metrics.

### Gaps
- Direct Reddit r/ouraring threads about the 2025 redesign (e.g. "can't find X anymore") were not surfaced by search, and Reddit could not be fetched.
