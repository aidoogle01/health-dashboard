# Competitor health/fitness app dashboard UX (Whoop, Garmin Connect, Apple Health/Fitness, MyFitnessPal, Fitbit/Google), compared with Oura

Research date: 2026-10-09. Method note: most findings come from web search summaries of the pages cited. Direct fetches of whoop.com and dcrainmaker.com failed (DNS errors), so Whoop and DC Rainmaker details rely on search-result extracts of those pages. Where sources disagree, both are given.

## Whoop: dials, colour bands, coaches, journal impact analysis, reports

### Takeaway
Whoop is built around three dials: Sleep, Recovery and Strain. Recovery uses a hard traffic-light band (green 67%+, yellow 34–66%, red 33% or below). The coaches turn the scores into a daily target: a strain target that depends on recovery, and a bedtime set from "Peak/Perform/Get by" sleep goals. Behaviour-to-outcome impact comes from a yes/no Journal, shown as a list of behaviours with their average positive or negative effect on Recovery. It needs at least 5 "yes" and 5 "no" logs in 90 days, and the Monthly Performance Assessment (MPA) repeats the analysis over a longer window. Whoop labels the results as correlation.

### Cited Findings
- **Recovery colour bands:** green 67–100%, yellow 34–66%, red 0–33%. Score is 0–100% — [WHOOP developer docs, "WHOOP 101"](https://developer.whoop.com/docs/whoop-101). The Locker gives green as 67–99% and red as 1–33%, with this copy: GREEN "You are well recovered and primed to perform"; YELLOW "Your body is maintaining and ready to take on moderate amounts of strain"; RED "Rest is likely what your body needs" — [WHOOP Locker: How does WHOOP Recovery work](https://www.whoop.com/thelocker/how-does-whoop-recovery-work-101)
- A WHOOP podcast summary says the colours simplify a continuous scale, so a 66 and a 67 are physiologically close — [WHOOP podcast 40](https://www.whoop.com/thelocker/podcast-40-whoop-recovery-maximize-readiness/)
- **Strain** runs on a 0–21 scale. Strain Coach recommends an exertion level "based on your recovery … and strain you've already accumulated". The first recommendation is "based on an optimal state to maintain your fitness level". Users can change the goal, for example to taper or to overreach. Copy: "When you're in the green, you're ready for strain, when you're in the yellow or red, you may want to evaluate your training program" — [WHOOP Locker: Strain Coach](https://whoop.com/thelocker/strain-coach)
- No numeric strain-target band per recovery level was found in the sources.
- **Sleep Coach / Sleep Planner:**
  - Sleep need is calculated from recent sleep, the day's strain, accrued sleep debt and naps: "The more Strain you accumulate during the day, the more sleep you need at night."
  - The user picks a goal for each night: "Peak (100% of your sleep need), Perform (85%) or Get by (70%)". The app then sets the ideal bed and wake times. One regional page gives "Get by" as 75%.
  - Average member sleep need is 8:34.
  - Sources: [WHOOP: How much sleep do I need](https://whoop.com/thelocker/how-much-sleep-do-i-need); [WHOOP: Sleep Coach with haptic alerts](https://www.whoop.com/thelocker/new-whoop-4-0-feature-sleep-coach-with-haptic-alerts); [WHOOP: Sleep Planner](https://www.whoop.com/au/en/thelocker/feature-update-whoop-app-sleep-planner/)
- **Journal:** users log 300+ behaviours across categories: Hormonal Health, Nutrition, Mental Wellbeing, Sleep, Supplements and Recovery — [WHOOP: The WHOOP Journal](https://www.whoop.com/thelocker/the-whoop-journal/)
- **Behaviour Impact / Insights:**
  - Needs at least 5 "yes" and 5 "no" entries for a behaviour within 90 days.
  - Users then see how often the behaviour appears, how it is associated with changes in Recovery, and how many more logs are needed before analysis is available.
  - WHOOP says this shows correlation, not causation.
  - Sources: [WHOOP: A new way to see insights on which behaviors affect your recovery](https://www.whoop.com/ca/en/thelocker/a-new-way-to-see-insights-on-which-behaviors-affect-your-recovery/)
- Older Insights screen: users can tap each factor to see the number of logs and the average positive or negative effect on Recovery, plus background reading and advice — [Wareable: Whoop launches new Insights feature](https://www.wareable.com/fitness-trackers/whoop-launches-new-insights-featur)
- Location has changed: Insights sat under Coaching in older app versions and under Plan in newer ones. It can also be reached from the Journal and from the Recovery dial (same sources as above).
- **Accuracy complaints:** a user reported an impact figure built only from "yes" entries. Whoop staff replied that with no "no" responses the app estimates impact from other Journal details, which can be less reliable — [WHOOP community: Issues with insights impacts accuracy](https://community.whoop.com/t/issues-with-insights-impacts-accuracy/929)
- **Monthly Performance Assessment (MPA):**
  - The old method compared average Recovery on days a behaviour was logged with days it was not.
  - The upgraded method uses up to a year of data to isolate each behaviour's longer-term effect. It summarises the distribution of daily recoveries and highlights the most positive and most negative behaviours.
  - Whoop's example: top positives were 85%+ sleep performance and blue-light-blocking glasses; top negatives were alcohol and tobacco.
  - The MPA also compares the month with the previous month, including sleep deprivation and restorative sleep.
  - Sources: [WHOOP: MPA enhanced recovery analysis](https://whoop.com/eu/en/thelocker/monthly-performance-assessment-now-features-enhanced-recovery-analysis); [WHOOP: Monthly Performance Assessment](https://www.whoop.com/thelocker/monthly-performance-assessment)
- **2025 home screen refresh:** puts "Sleep, Recovery, and Strain front and center, with new dials that make daily trends easier to interpret". Members had asked for "a more intuitive experience, easier-to-find shortcuts, and more ways to see your insights and coaching tips" — [WHOOP: Everything WHOOP launched in 2025](https://www.whoop.com/thelocker/everything-whoop-launched-in-2025); [WHOOP: The all-new WHOOP home screen](https://www.whoop.com/thelocker/the-all-new-whoop-home-screen)
- **2025 tiers and Healthspan:**
  - Three membership tiers: WHOOP One, Peak and Life (Life pairs with WHOOP MG for medical-grade and cardiovascular features).
  - Healthspan shows "WHOOP Age" and "Pace of Aging", updated weekly, on Peak and Life only.
  - The AI coach uses strain, sleep, stress and lab results, plus context such as travel and weather.
  - Source: [WHOOP: Everything launched in 2025](https://www.whoop.com/thelocker/everything-whoop-launched-in-2025)

### Inferences
- Whoop's behaviour-to-outcome pattern (log a binary behaviour → wait for enough yes/no samples → show signed average effect on the headline score, with a correlation caveat) maps directly onto a nutrition × sleep dashboard. For example: "On days with >X g protein / late meals / alcohol logged in MFP, your Oura readiness averaged +/-N".
- Two parts are worth copying: the explicit minimum-sample gate ("N more logs needed") and the progress indicator toward it.
- A strain target that changes with recovery is a "today's target" pattern. It is the activity analogue of a calorie budget.
- Moving Insights from Coaching to Plan, and the 2025 refresh request for "easier-to-find shortcuts", suggest discoverability of insights was a problem.

### Gaps
- Could not fetch whoop.com directly, so the exact chart type in Impact/MPA (bar or diverging bar) and the exact 2025 home-screen layout are unconfirmed.
- No numeric strain-target ranges were found.
- No independent validation of the MPA method was found.

## Garmin Connect: My Day cards, Body Battery, Training Readiness, HRV status, Morning Report, redesign and clutter

### Takeaway
Garmin offers many separate metrics, each with its own published bands: Body Battery 0–100 in four bands, Training Readiness with five labelled tiers, and HRV Status relative to a personal 3-week baseline. The 2024 Connect redesign replaced the dense "My Day" list with larger, customisable cards and sections. Users complained this meant more scrolling and less at-a-glance density. In 2025 Garmin launched Connect+ ($6.99/mo), which set off a paywall backlash.

### Cited Findings
- **2024 redesign (announced at CES 2024):**
  - The new Home has customisable sections, starting with "Today's Activity" (logged activities, upcoming workouts, events).
  - Other sections: In Focus, At a Glance, Events, Training Plans, Challenges.
  - At a Glance is "up to five customizable panels" that users swipe through.
  - Sources: [Garmin blog: The New Garmin Connect Mobile](https://www.garmin.com/en-US/blog/fitness/new-garmin-connect-mobile/); [DC Rainmaker walkthrough](https://www.dcrainmaker.com/2024/01/garmin-connect-mobile-revamp-walk-through.html)
- **Reviewer criticism:** Garmin "decided it was going to put the single feature I find least useful in that spot (Sleep Coach)", and that slot could not be changed directly — [DC Rainmaker](https://www.dcrainmaker.com/2024/01/garmin-connect-mobile-revamp-walk-through.html) (via search extract)
- One reviewer called it "a fantastically simplified landing tab" — [Android Central](https://www.androidcentral.com/wearables/garmin-connect-beta-redesign-is-long-overdue); see also [T3: Garmin simplifies Connect app](https://www.t3.com/news/garmin-simplifies-connect-app-0124)
- **User complaints about the redesign:**
  - The cards for stats like heart rate, Body Battery, Sleep Score and Training Status got bigger and need more scrolling.
  - Data that used to be condensed is harder to see at a glance.
  - Custom dashboards were lost on Garmin Connect web.
  - Forum users asked how to revert.
  - Source: [Advnture: Garmin Connect feedback](https://www.advnture.com/news/garmin-connect-feedback) (article undated; likely 2024)
- **Body Battery:**
  - Scale 0–100: 0–25 low, 26–50 medium, 51–75 high, 76–100 very high reserve energy — [Garmin manual: Body Battery](https://www8.garmin.com/manuals/webhelp/GUID-C3225F6F-DF15-4404-9E20-05C4FDCD1207/EN-US/GUID-87E1392B-2C55-40B7-A1FF-3AB9252DA0A0.html)
  - The glance shows a graph since midnight. A combined stress view uses blue bars for rest, orange for stress, and grey for "too active to determine".
  - Newer models (vívoactive 5, Forerunner 165) use a 5–100 range with different labels — [Garmin vívoactive 5 manual](https://www8.garmin.com/manuals-apac/webhelp/vivoactive5/EN-SG/GUID-6631B5F9-2C4D-4696-8FB8-218B07D65C7E-5404.html)
  - The widget shows the current number plus "+charged" and "−drained" figures — [Wareable](https://www.wareable.com/?p=36595) (third-party; not in Garmin manuals)
- **Training Readiness tiers** (Garmin manual):

  | Score | Tier | Label |
  |---|---|---|
  | 95–100 | Prime | "Best possible" |
  | 75–94 | High | "Ready for challenges" |
  | 50–74 | Moderate | "Good to go" |
  | 25–49 | Low | "Time to slow down" |
  | 1–24 | Poor | "Let your body recover" |

  - Six inputs: sleep score, recovery time, HRV status, acute load, sleep history (3 nights) and stress history (3 days).
  - Colour zones (as summarised): purple, blue, green, orange, red.
  - Third-party sites publish conflicting cutoffs (e.g. "80–100 = Prime"); the manual ranges are authoritative.
  - Sources: [Garmin manual: Training Readiness](https://www8.garmin.com/manuals/webhelp/GUID-31D23DBB-57C2-4DF7-A0C9-8D1A00AB4BE7/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html); [rundida guide](https://rundida.com/guide/garmin-training-readiness/)
- **HRV Status** (compares the 7-day average with a personal baseline range):
  - Balanced: within the personal range.
  - Unbalanced: outside it.
  - Low: well below it.
  - Poor: the baseline is below age-based norms, and then no baseline is shown.
  - The baseline needs about 3 weeks of nightly wear.
  - Sources: [Garmin blog: Understanding HRV Status](https://www.garmin.com/en-PH/blog/fitness/understanding-the-hrv-status-on-your-garmin-smartwatch/); [Tom's Guide](https://tomsguide.com/how-to/how-to-use-the-hrv-status-feature-on-your-garmin-watch); [Wareable](https://www.wareable.com/garmin/garmin-hrv-status-explained-what-is-it-how-to-use)
- **Morning Report:**
  - Can include weather, Body Battery, steps, women's health, calendar events and sleep, and is customisable — [Garmin manual: Morning Report](https://www8.garmin.com/manuals-apac/webhelp/lily2/EN-SG/GUID-B1C347E8-727F-4309-9FB0-27AE2A2D05E5-9742.html)
  - Third-party list of options: Training Readiness, HRV Status, Workouts, Sleep, Weather, Calendar, Body Battery, Intensity Minutes, Steps — [Gadgets & Wearables](https://gadgetsandwearables.com/2022/08/01/garmin-morning-report/)
  - Newer watches (e.g. Venu 4) add an Evening Report with customisable order and type of data — [Garmin Venu 4 manual: Evening Report](https://www8.garmin.com/manuals-apac/webhelp/venu4/EN-SG/GUID-AB715A12-F0BF-442C-81A3-FAC971FE0091-1791.html)
- **Connect+ paywall (March 2025):**
  - Price: $6.99/mo or $69.99/yr. Features: AI insights ("Active Intelligence"), a performance dashboard, and LiveTrack upgrades.
  - Garmin said existing features stay free. On the Q1 2025 earnings call the CEO said some future features "we will likely reserve for premium offerings".
  - Reddit backlash; a poll of more than 1,000 users found threats to switch brands.
  - Sources: [TechRadar: Connect+ features](https://www.techradar.com/health-fitness/garmin-connect-plus); [Tom's Guide](https://www.tomsguide.com/wellness/smartwatches/bad-news-for-garmin-users-future-features-could-go-behind-the-connect-paywall-according-to-ceo); [TechRadar poll](https://www.techradar.com/health-fitness/ill-switch-to-another-brand-i-polled-over-1-000-garmin-users-to-see-what-they-thought-of-garmins-connect-premium-tier-one-year-after-its-launch)
  - TechRadar called the AI insights "hilariously bad" so far — [TechRadar](https://www.techradar.com/health-fitness/smartwatches/garmins-new-subscription-ai-feature-is-hilariously-bad-so-far)
  - One roundup claimed Body Battery and sleep went behind the paywall. Garmin's statements contradict this — [Pelcro roundup](https://www.get.pelcro.com/blog/top-3-paywall-stories-from-march-2025)

### Inferences
- Garmin's HRV Status, a 7-day average plotted against a shaded personal baseline band, is the clearest "relative to your normal" pattern. It suits nutrition metrics too, such as a 7-day protein average against the user's own range.
- The redesign backlash shows that power users value density. A combined dashboard should offer a compact or density toggle and let users choose and reorder cards, rather than fixing a slot like Garmin's Sleep Coach.
- Five tiers with five colours (Training Readiness) plus four Body Battery bands plus four HRV labels means each metric uses a different vocabulary. A combined dashboard should standardise one band vocabulary.

### Gaps
- The Body Battery graph and HRV baseline chart could not be checked visually; the DC Rainmaker fetch failed.
- No confirmed details were found on 2025–2026 Connect UI changes beyond Connect+.

## Apple Health / Fitness: Activity rings, Trends, Vitals, sleep

### Takeaway
Apple relies on simple goal completion (three rings), slow long-window trend arrows (90 days against 365 days), and outlier-against-your-typical-range displays (Vitals). It avoids one composite readiness score, but added a 0–100 Sleep Score in watchOS 26. watchOS 11 added Pause Rings and goals that can differ by day of the week, a response to streak pressure.

### Cited Findings
- **Fitness Trends:**
  - Compares the last 90 days with the last 365 days. An up arrow means "you're maintaining or improving"; a down arrow means the 90-day average "has started to decline".
  - Needs 180 days of data.
  - Metrics: active calories, exercise minutes, stand hours, stand minutes, walking distance, cardio fitness, walking pace, running pace.
  - Sources: [Apple Support: Track your trends](https://apple.co/36ggRsf); [Apple Support: Track daily activity](https://support.apple.com/108359)
- Down arrows come with plain-language coaching, e.g. "Walk an extra quarter of a mile a day". A single unusual day "won't ruin your trends" — [Macworld](https://www.macworld.com/article/233093/ios-13-and-apple-watch-activity-trends-give-you-the-big-picture.html)
- **Vitals app (watchOS 11, 2024):**
  - Tracks overnight heart rate, respiratory rate, wrist temperature, blood oxygen and sleep duration.
  - Each metric is shown against the user's typical range and labelled "Typical" or "Outlier"; an outlier appears as a highlighted dot outside the band.
  - Needs about 7 nights to build a baseline.
  - A notification is sent only if two or more vitals are outliers. Apple says the method draws on the Apple Heart & Movement Study.
  - Sources: [Wareable](https://www.wareable.com/apple/how-vitals-app-finally-makes-apple-watch-a-wellness-powerhouse); [Tom's Guide](https://www.tomsguide.com/wellness/smartwatches/watchos-11-public-beta-i-tried-the-new-apple-watch-vitals-health-app-heres-how-it-works-and-first-impressions); [MacStories review](https://www.macstories.net/stories/watchos-11-the-macstories-review/3); [heise](https://heise.de/-9980130) (heise questions how often early-illness detection is accurate)
  - Sources disagree on whether the range is based on the past 7 days or also on age-based norms (Tom's Guide says both).
- **Pause Rings (watchOS 11):**
  - Pause for today, a week, a month, or a custom period; the streak survives.
  - Ring goals can differ by day of the week.
  - Sources disagree on the maximum: one month ([Macworld](https://www.macworld.com/article/2446605/how-to-pause-apple-watch-activity-rings.html)) against 90 days ([iPhone Life](https://iphonelife.com/content/pause-activity-rings)).
  - BGR headline: "Pausing My Activity Rings Won't Make Me Feel Bad About Myself Anymore" — [BGR](https://bgr.com/tech/with-watchos-11-pausing-my-activity-rings-wont-make-me-feel-bad-about-myself-anymore/)
- **Sleep Score (watchOS 26, 2025):**
  - Scored out of 100: duration up to 50, bedtime consistency up to 30, interruptions up to 20.
  - Bands changed in watchOS 26.2 from Very Low 0–29 / Low 30–49 / OK 50–69 / High 70–89 / Excellent 90–100 to Very Low 0–40 / Low 41–60 / OK 61–80 / High 81–95 / Very High 96–100.
  - The Health app shows W/M/6M charts, "Levels" (nights per band) and "Elements" (average of each component).
  - Sources: [AppleInsider](https://appleinsider.com/articles/25/09/12/how-sleep-score-works-on-apple-watch-with-watchos-26); [9to5Mac: 26.2 changes](https://9to5mac.com/2025/11/04/watchos-26-2-sleep-score-changes-apple-watch/)
  - Macworld critique: "I don't trust my Apple Watch's sleep score and neither should you" — [Macworld](https://www.macworld.com/article/2947066/i-dont-trust-my-apple-watchs-sleep-score-and-neither-should-you.html)

### Inferences
- Apple's 26.2 band change (a 70 went from "High" to "OK") shows that band labels shape how users feel. Changing them after launch confuses users.
- Rings work because each goal is simple, personal and closable, and the visual shows progress toward completion rather than a judgement. MFP macro rings use the same idea, which supports using rings for nutrition targets on the dashboard.
- The Vitals "typical band + outlier dot + alert only when several metrics deviate" pattern is a strong anti-anxiety design worth reusing.

### Gaps
- No primary Apple page was retrieved on how Health Summary and Highlights are worded or chosen.
- The sleep stages chart was not researched in detail.
- Apple's own Vitals documentation was not retrieved.

## MyFitnessPal and Fitbit/Google

### Takeaway
MyFitnessPal replaced its long-standing Diary with a "Today" screen (late 2025, then v26.16.0 in April 2026). Users objected that macros are no longer visible at a glance, that the change added taps, and that there was no way to revert. In October 2025 Fitbit/Google moved to a Today tab built around a Gemini "Coach", with an emphasis on weekly trends. Fitbit's Daily Readiness (1–100) and monthly Sleep Profile animals are Premium features.

### Cited Findings
- **MyFitnessPal "Today" tab:**
  - MFP's support FAQ "Introducing the brand new Today tab" (linked on Reddit, 21 Nov 2025) promises "an improved layout and enhanced functionality".
  - In April 2026, v26.16.0 replaced the Diary with Today. Reported effects: average rating fell 1.7 stars; copying individual foods between meals was removed; step-based calorie adjustment was hidden; MFP called it "the path forward" with no revert option.
  - Source: [mwm.ai market intelligence](https://mwm.ai/articles/myfitnesspal-v26-16-0-replaces-diary-with-new-ui-sparking-rating-drop-in-april-2026) (single source; figures unverified)
- **Common MFP complaints:**
  - Macros are not visible at a glance; users must tap into each meal.
  - Extra navigation steps.
  - Calorie and macro goals don't update correctly.
  - A July 2026 sample: 202 of 300 Google Play reviews rated 1–3 stars, against lifetime averages of 4.40 (Google Play) and 4.71 (App Store).
  - Sources: [unstar.app analysis](https://unstar.app/fr/blog/is-myfitnesspal-premium-worth-it-paywall-app-reviews-2026); [Kimola feedback report](https://kimola.com/reports/unlock-insights-with-myfitnesspal-customer-feedback-report-trustpilot-en-ca-154114)
  - Older UX case study: [UX Collective MFP case study](https://uxdesign.cc/ui-ux-case-study-designing-an-improved-myfitnesspal-experience-3492bbe4923c/)
- **Fitbit Daily Readiness:**
  - Current bands: 65+ high ("recovered"), 30–64 moderate ("typical"), 29 or lower ("needs restoration").
  - Older labels: Low 1–29, Good 30–64, Excellent 65–100.
  - Inputs: HRV and RHR from last night, plus sleep over 7 nights. Needs a 7-night baseline.
  - Sources: [Google Fitbit Help](https://support.google.com/fitbit/answer/14236710); [Android Central](https://www.androidcentral.com/what-fitbit-daily-readiness-score-and-how-do-i-use-it)
  - DC Rainmaker found a score of 30 labelled "Good" in the app but "Low" in Fitbit's PR mockups — [DC Rainmaker Fitbit Readiness review](https://dcrainmaker.com/2021/11/fitbit-readiness-review.html) (2021, older)
- **Fitbit Sleep Profile:**
  - Six animals: parrot, dolphin, bear, tortoise, giraffe, hedgehog.
  - Assigned monthly on the 1st and needs 14+ nights. Premium only.
  - Population shares: giraffe 23.77% (most common), tortoise 11.12% (least).
  - Sources: [Google blog: science behind Sleep Profile animals](https://blog.google/products/fitbit/fitbit-sleep-profile-animals/); [Google Store](https://store.google.com/intl/en/ideas/articles/fitbit-sleep-profile)
  - The launch article mentioned 10 categories — [TechRadar](https://www.techradar.com/news/fitbits-new-sleep-profile-tells-you-what-kind-of-animal-you-are-based-on-your-sleep) (2023)
- **Fitbit app redesign (public preview from 27/28 Oct 2025):**
  - US Android Premium first.
  - Bottom bar: Today / Fitness / Sleep / Health.
  - Today combines key metrics with AI feedback and weekly cardio load. Metrics are user-customisable, with "a stronger focus on weekly trends".
  - The Gemini "Coach" is onboarded through a 5–10 minute voice or text conversation.
  - Users can switch back to the old UI.
  - Sources: [TechCrunch](https://techcrunch.com/2025/10/27/fitbits-revamped-app-with-gemini-powered-health-coach-rolls-out-to-premium-users/); [9to5Google](https://9to5google.com/2025/08/20/fitbit-app-coach-redesign/); [TechRadar](https://www.techradar.com/health-fitness/fitness-apps/fitbits-new-ai-powered-personal-coach-app-is-now-rolling-out-to-some-heres-whats-new)
  - Critique: the redesign "prioritizes content over community" — [TechRadar](https://www.techradar.com/health-fitness/im-disappointed-the-slick-looking-fitbit-app-redesign-prioritizes-content-over-community)

### Inferences
- The MFP backlash is directly relevant: for a nutrition dashboard, daily macro totals against targets must be visible without drilling in, and fast logging and editing must not get slower.
- Fitbit offering a revert option, where MFP did not, softened the backlash.
- The Sleep Profile animals reframe monthly sleep data as identity rather than a grade. It is less anxiety-inducing but harder to act on.
- The industry trend for 2025–26 is a Today tab, an AI coach, and weekly rather than daily emphasis (Fitbit, Whoop, Garmin Connect+).

### Gaps
- No primary MFP screenshots or design spec were retrieved.
- Macro-ring visual details are based on general knowledge, not a cited source.
- Descriptions of the dolphin and tortoise animals were not retrieved.

## Cross-app patterns and criticisms (score overload, orthosomnia, opacity, paywalls, clutter)

### Takeaway
Every app studied has moved toward a single headline score per domain, colour bands, and personal baselines. Apple and Fitbit are adding "typical range" and weekly-trend framing to lower anxiety. The main criticisms are:
- orthosomnia and score anxiety
- doubtful accuracy of sleep staging
- band thresholds that are opaque or change
- paywalls (Whoop tiers, Garmin Connect+, Fitbit Premium, MFP Premium)
- clutter and loss of density after redesigns (Garmin 2024, MFP 2026)

### Cited Findings
- **Orthosomnia:**
  - Not a formal diagnosis. Signs are "exaggerated trust of sleep tracker data" and a focus on perfect tracked sleep.
  - The term comes from a case series by Baron et al. in which patients spent excess time in bed to raise their numbers.
  - Sleep trackers identified deep sleep accurately only 59% of the time in a 2021 study.
  - Sources: [Sleep Foundation: Orthosomnia](https://www.sleepfoundation.org/sleep-hygiene/orthosomnia)
- A 2024 study of 523 adults estimated orthosomnia prevalence at 3–14% — [Sahha blog](https://sahha.ai/blog/orthosomnia-sleep-tracker-anxiety/) (secondary; primary paper not checked)
- A Stanford clinician suggests viewing data weekly rather than daily if it causes stress — [Stanford Lifestyle Medicine](https://lifestylemedicine.stanford.edu/?p=46193)
- A "sham feedback" study found that people told they slept poorly performed worse on cognitive tests — [AOL: Oura ring judging](https://www.aol.com/articles/oura-ring-judging-160543237.html) (secondary)
- Fitbit's research director in 2019 called the anxiety "overblown" — [Advisory Board](https://advisory.com/daily-briefing/2019/06/17/sleep-tracker) (older)
- **Personal baselines across apps:**
  - Garmin HRV: 3 weeks
  - Apple Vitals: about 7 nights
  - Fitbit Readiness: 7 nights
  - Whoop Impact: 5 yes + 5 no logs in 90 days
  - Apple Trends: 180 days
  - Sources: see the sections above
- **Traffic-light colour use:**
  - Whoop: 3 bands, green/yellow/red
  - Garmin Training Readiness: 5 tiers, purple/blue/green/orange/red
  - Apple Sleep Score: 5 bands (relabelled in 26.2)
  - Fitbit Readiness: 3 bands
  - Sources: see the sections above
- **Streak forgiveness:** Apple Pause Rings (above).
- **Daily briefing patterns:** Garmin Morning and Evening Reports; Whoop coaching on the home screen; Fitbit Today with AI feedback. See the sections above.

### Inferences
Recommendations for the combined MFP + Oura + Garmin web dashboard:
1. Use one headline per domain (Fuel, Recover, Move), each with a consistent 3-band vocabulary. Show the number next to the colour, as Whoop's continuous-scale note recommends.
2. Show metrics against personal typical-range bands, as Garmin HRV and Apple Vitals do. Flag only multi-metric deviations.
3. Show behaviour-to-outcome insights in Whoop Impact style: nutrition behaviours against next-day Oura readiness, with a minimum-sample gate and a correlation disclaimer.
4. Default to a weekly view to reduce orthosomnia.
5. Use customisable cards with a compact or density option (lesson from Garmin).
6. Keep macros visible at a glance (lesson from MFP).
7. Add streak forgiveness, as Apple's Pause Rings do.

### Gaps
- Oura-specific "compassionate messaging / Rest Mode in 2025" is from a low-quality aggregator and is unverified. See the Oura notes from other researchers.
- No quantitative study of "score overload" was found.
- Reddit threads were not fetched directly.
