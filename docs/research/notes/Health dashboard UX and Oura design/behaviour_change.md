# Behaviour-change design for health and self-tracking dashboards

Scope: what evidence says drives lasting improvement in sleep, activity, nutrition and recovery in self-tracking apps, what backfires, and how that maps to a personal dashboard with tabs Today / Habits / Insights / Trends, using data from MyFitnessPal (MFP), Oura and Garmin.

Note on sourcing: items marked "(canonical, not re-fetched this session)" are well-established citations from the literature that I did not re-verify with a live fetch during this research run. The report writer should treat their exact numbers as needing a check. Everything else was confirmed from search results in this session.

---

## 1. Behaviour-change frameworks used in digital health (Fogg, COM-B/BCW/BCT taxonomy, SDT, habit formation)

### Takeaway
Self-monitoring alone is weak. It works much better combined with other self-regulation techniques: goal setting, feedback on performance, action planning and review of goals (control-theory "loop"). Habits form through repeating a behaviour in a stable context over weeks to months (median about 66 days, range 18 to 254), so the dashboard should reinforce cue-anchored, consistent behaviour, not just display numbers.

### Cited Findings
- Michie et al. 2009 meta-regression (122 evaluations, N = 44,747) of healthy-eating and physical-activity interventions: pooled effect size 0.31. Self-monitoring explained the most between-study heterogeneity (13%). Interventions that combined self-monitoring with at least one other control-theory technique (goal setting, feedback, review of goals) were significantly more effective (effect size 0.42 vs 0.26). The review notes publication bias in funnel plots, and the comparison is between trials, not within them. — [PubMed 19916637](https://pubmed.ncbi.nlm.nih.gov/19916637/); [CRD/NCBI summary](https://www.ncbi.nlm.nih.gov/books/NBK77075/)
- BCT Taxonomy v1 (Michie et al. 2013, Annals of Behavioral Medicine) defines 93 behaviour-change techniques in 16 groups. Relevant ones include 1.1 goal setting (behaviour), 1.3 goal setting (outcome), 1.4 action planning (including implementation intentions), 1.5 review behaviour goals, 2.2 feedback on behaviour, 2.3 self-monitoring of behaviour, 2.4 self-monitoring of outcomes, 8.1 behavioural practice/rehearsal, 8.3 habit formation and 10.x rewards. (canonical, not re-fetched this session) — [PubMed 23512568](https://pubmed.ncbi.nlm.nih.gov/23512568/)
- COM-B / Behaviour Change Wheel (Michie, van Stralen & West 2011, Implementation Science): behaviour arises from Capability, Opportunity and Motivation. Intervention functions include education, persuasion, incentivisation, training, environmental restructuring, modelling and enablement. (canonical, not re-fetched this session) — [Implementation Science 6:42](https://implementationscience.biomedcentral.com/articles/10.1186/1748-5908-6-42)
- Fogg Behavior Model: Behaviour = Motivation x Ability x Prompt, all at the same moment. If ability is low (high friction), the prompt fails unless motivation is very high, so the design lever is to make the behaviour easier and time the prompt well. (canonical, not re-fetched this session) — [behaviormodel.org](https://behaviormodel.org/)
- Implementation intentions ("If situation X, then I will do Y"): Gollwitzer & Sheeran's 2006 meta-analysis of 94 tests found a medium-to-large effect on goal attainment (d about 0.65). (canonical, not re-fetched this session) — [Gollwitzer & Sheeran 2006, Adv Exp Soc Psychol](https://doi.org/10.1016/S0065-2601(06)38002-1)
- Self-determination theory (Ryan & Deci 2000): sustained, internalised motivation depends on autonomy, competence and relatedness. Controlling external rewards can undermine intrinsic motivation. (canonical, not re-fetched this session) — [Ryan & Deci 2000, Am Psychol](https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf)
- Lally et al. 2010 (Eur J Soc Psychol 40:998–1009). Ninety-six volunteers repeated a self-chosen daily health behaviour tied to a consistent cue for 84 days and self-reported automaticity. Among the 39 participants with good model fits, median time to 95% of plateau automaticity was 66 days, ranging from 18 to 254 days. Missing a single day did not materially affect habit formation. Behaviour complexity mattered: exercise took longer than drinking water. Values past 84 days are extrapolations. — [UCL press release](https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit); [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit); [critical summary](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit)

### Inferences
- **Today tab:** pair each metric with a goal, feedback on that goal, and a next action, which closes the control-theory loop. A tile that shows a number with no goal or next step is self-monitoring only, the weakest form.
- **Habits tab:** let the user write an if-then plan for each habit, for example "After I finish dinner (cue) → log the meal in MFP" or "When Oura says bedtime window → phone in kitchen". Show the cue next to the habit, not just a checkbox.
- Show habit formation as a long arc of "Week 3 of ~10" with a note that the range is wide (18–254 days). Avoid implying a habit is "done" at day 21 or day 66.
- Because Lally found one missed day did not derail habit formation, the UI should not treat a single miss as failure (see section 2).
- **Fogg / ability:** cut logging friction with auto-imported Oura and Garmin data, one-tap MFP meal repeats, and prompts at natural moments (after waking for the readiness check, evening for wind-down).
- **SDT / autonomy:** let users choose their own goals and which metrics are shown, and offer suggestions rather than mandates ("You could try…", not "You must…").

### Gaps
- I found no meta-analysis isolating which BCTs drive retention specifically in commercial wearable apps, as opposed to trial interventions.
- The Fogg model has limited direct experimental validation in peer-reviewed literature. It is mostly a practitioner framework.

---

## 2. Goal setting: specific vs vague goals, goal gradient, streaks, progress framing, weekly vs daily

### Takeaway
Use specific, personalised, adaptive goals with built-in slack, such as weekly targets with "reserve days". Show progress that builds momentum, for example a head start or "3 of 5". Treat streaks carefully: intact streaks motivate, but highlighting broken streaks drives drop-off, so offer repair or freeze options and never call out a break.

### Cited Findings
- **Goal gradient (Kivetz, Urminsky & Zheng 2006, J Marketing Research 43:39–58).** Café customers on a buy-10-get-1 card bought coffee more often as they neared the reward. A 12-stamp card with 2 pre-filled "bonus" stamps was completed faster than a 10-stamp card needing the same 10 purchases (the "illusion of progress"). Effort dropped right after a reward, then rose again toward the next one. — [Columbia paper PDF](https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf); [Columbia summary](https://business.columbia.edu/faculty/research/goal-gradient-hypothesis-resurrected-purchase-acceleration-illusionary-goal)
- **Streaks (Silverman & Barasch 2023, J Consumer Research 49(6):1095–1117, 7 studies).** Showing an intact streak in a behavioural log increased later engagement compared with showing a broken one. The effect was independent of actual past behaviour and depended only on how the log represented it. It was stronger when people blamed themselves for the break, and weaker when they could "repair" the streak. Barasch said messages calling out a broken streak generally backfire because people drop off. Silverman recommended avoiding broken-streak alerts and offering alternate ways to keep streaks going. — [CU Boulder news](https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch); [UDaily](https://udel.edu/udaily/2024/march/power-of-streaks-motivation-jackie-silverman); [UD repository](https://udspace.udel.edu/handle/19716/34160)
- **Emergency reserves / slack (Sharif & Shu, OBHDP 2019; field experiment plus 4 lab studies).** A goal such as "gym 7 days/week with 2 emergency skip days" beat both an easy 5-day goal and a hard 7-day goal on persistence. A hard goal with no slack becomes unattainable after one miss, and people give up. In the field study (more than 240 participants, pedometer app, 5 weeks), the reserves condition took up to 20% more steps and hit goals more often. The mechanism was higher perceived progress after a subgoal failure. — [UCLA Anderson Review](https://anderson-review.ucla.edu/emergency-reserves/); [paper PDF](https://anderson-review.ucla.edu/wp-content/uploads/2021/03/Sharif-Shu_EmergencyReserveFailure_OBHDP2019.pdf); [Wharton field-experiment working paper](https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Designing-More-Effective-Goals-by-Using-Emergency-Reserves-A-Field-Experiment.pdf)
- **What-the-hell / abstinence-violation effect.** It is the belief that one has failed, more than the actual lapse, that disrupts self-control (Polivy & Herman's dieting work). One summary says the effect is more likely with short-horizon goals (today vs this week) and with "stop doing X" goals. — [EFPSA summary](https://more.efpsa.org/rpblog/?p=1172); goal-disengagement review: [Motivation & Emotion 2022 (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9643924/)
- **Adaptive vs static goals (Adams et al.).** In a 2013 pilot (n = 20), percentile-rank adaptive step goals beat a static 10,000-step goal by 1,130 steps/day (d = 0.74). In the 2017 BMC Public Health 2x2 factorial RCT (n = 96, 4 months, Fitbit Zip), adaptive-goal participants' step decline during the intervention was less than half the rate of static-goal participants. However, the initial baseline-to-intervention gain was larger for static goals (2,630 vs 2,149 steps/day, p = .095, not significant). — [PubMed 24349392 (2013)](https://pubmed.ncbi.nlm.nih.gov/24349392/); [BMC Public Health 2017](https://bmcpublichealth.biomedcentral.com/track/pdf/10.1186/s12889-017-4197-8)
- **Gamified STEP UP trial (Patel et al. 2019, JAMA Intern Med).** Participants were 602 overweight/obese adults: 24-week intervention, 12-week follow-up. Gamified arms used points with loss framing (start each week with 70 points and lose 10 per missed day), pre-commitment, a ramp-up period and a "fresh start" each week. Step increases versus control were +920/day in the competition arm (95% CI 513–1,328) and +689/day in the support arm. Only competition stayed significant in follow-up. Loss framing was bundled with other elements and not isolated. — [ACC summary](https://acc.org/latest-in-cardiology/articles/2019/11/26/08/23/key-takeaways-regarding-gamification-to-increase-physical-activity); [Penn veterans follow-on (+1,224 steps)](https://pennmedicine.org/news/news-releases/2021/july/combining-gamification-cash-incentive-increases-veterans-exercise)
- **Specific vs vague goals.** Locke & Latham's goal-setting theory, from decades of studies, finds specific, challenging goals beat "do your best" goals. (canonical, not re-fetched this session) — [Locke & Latham 2002, Am Psychol](https://doi.org/10.1037/0003-066X.57.9.705)

### Inferences
- **Weekly over daily for most goals.** Frame goals as "5 of 7 days ≥ 8,000 steps", "protein in range 5 of 7 days" or "bedtime within 30 min of target 5 nights". A weekly window gives built-in slack (emergency reserves) and avoids "today is ruined" thinking. Show it as a 7-dot row on the Habits tab with progress labelled "3 of 5".
- **Count-based framing ("3 of 5 days") over percentages** for discrete habits. It is concrete and shows remaining distance, which drives the goal-gradient effect. Use percentages only for continuous targets such as protein grams.
- **Head start.** When a weekly goal starts, count anything already done (for example, Monday's walk) so the ring is not at zero. Consider "fresh start" framing on Mondays and the 1st of the month, as in STEP UP.
- **Streaks:**
  - Show the streak while it is intact.
  - Build in repair options: "streak freeze" or reserve days, plus weekly streaks (consecutive weeks hitting 5 of 7) rather than daily streaks.
  - When a streak breaks, don't send an alert or show a "0". Fall back to a cumulative or "best week" view ("You've hit this 41 of the last 50 days").
  - Attribute misses to circumstance where the data supports it, for example "Travel day; Garmin shows 3 time zones".
- **Adaptive goals.** Base the default step, active-minutes and sleep targets on the user's own recent percentile, for example 60th percentile of the last 10 days, rather than fixed 10,000 or 8 h. Users can override (autonomy).
- **Loss framing and competition** are powerful but come with SDT and anxiety costs. For a personal, single-user dashboard, prefer self-competition ("beat your 4-week average") over leaderboards.

### Gaps
- I found no peer-reviewed RCT that directly compares "3 of 5 days" with percentage framing of progress. The recommendation is inferred from goal-gradient and slack research.
- I found no peer-reviewed study on Duolingo-style "streak freeze" specifically. Silverman & Barasch's "repair" moderator is the closest evidence.
- I did not verify the full STEP UP sample size (602) or the collaboration-arm effect in a primary source this session.

---

## 3. Feedback framing: positive vs negative, loss aversion, social vs self-comparison, shame, orthosomnia, low-score days

### Takeaway
Feedback changes how people feel and function, independent of reality. Negative sleep feedback alone worsened next-day alertness (d = 0.79). Perfectionist score-chasing ("orthosomnia") can worsen sleep. Use supportive, non-judgemental phrasing, compare to the user's own baseline, show ranges and trends rather than single-night verdicts, and always pair a low score with a concrete, doable step.

### Cited Findings
- **Gavriloff et al. 2018, J Sleep Res 27 (DOI 10.1111/jsr.12726).** Sixty-three people with insomnia got randomised sham "positive" or "negative" sleep-efficiency feedback from an actigraphy watch. The negative-feedback group (n = 32) showed lower evening alertness (d = 0.79) and more sleepiness and fatigue (d = 0.55). The positive group gained more in mood and alertness by midday. Feedback shaped daytime symptom reports regardless of actual sleep. — [Oxford Health NHS record](https://www.oxfordhealth.nhs.uk/orka/title/sham-sleep-feedback-delivered-via-actigraphy-biases-daytime-symptom-reports-in-people-with-insomnia-implications-for-insomnia-disorder-and-wearable-devices/); [Oxford NDCN](https://www.ndcn.ox.ac.uk/publications/854408)
- **Contrasting pilot.** Poor false sleep feedback did not affect pre-sleep cognitive arousal or subjective sleep continuity in healthy sleepers. So the effect may be strongest in people with existing sleep complaints. — [PMC10899903](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10899903/)
- **Orthosomnia (Baron et al. 2017, J Clin Sleep Med 13(2):351–354, case series).** Patients sought insomnia treatment because trackers said their sleep was inadequate. They fixated on a perfect 8 hours, reported irritability and cognitive difficulty on "bad data" days, and their efforts to perfect sleep, such as spending longer in bed, sometimes led to less sleep. The authors liken it to orthorexia and note that tracker accuracy is limited, especially for sleep staging. This is a case series, not prevalence data. — [Rush University news](https://www.rushu.rush.edu/news/sleep-trackers-can-prompt-sleep-problems); [PubMed 27855740](https://pubmed.ncbi.nlm.nih.gov/27855740/); [Sleep Foundation overview](https://www.sleepfoundation.org/sleep-hygiene/orthosomnia)
- **Feelings after tracking.** Research on life after tracking found emotions ranging from guilt over not keeping it up to relief from the "tyranny of self-tracking". — [UW News on Epstein et al. CHI 2016](https://www.washington.edu/news/2016/09/08/life-after-fitbit-appealing-to-those-who-feel-guilty-vs-free/)
- **Social comparison.** In STEP UP, competition produced the largest and most durable effect, but participants were in pre-formed social groups. — [ACC summary](https://acc.org/latest-in-cardiology/articles/2019/11/26/08/23/key-takeaways-regarding-gamification-to-increase-physical-activity)
- **Loss aversion.** Patel summarised the trials as "Loss aversion is a very powerful motivator." Evidence comes from bundled interventions (points, money) in trials, not from score-display wording. — [Penn Medicine](https://pennmedicine.org/news/news-releases/2021/july/combining-gamification-cash-incentive-increases-veterans-exercise)
- **Calorie and fitness tracking.** This feedback is associated with eating-disorder symptoms in some users (see section 6), a further reason to avoid red/over and failure language around food.

### Inferences
- **Low-score copy pattern** (Today tab, sleep and readiness): (1) neutral fact with context ("Sleep score 62, below your 30-day typical range of 74–85"); (2) a non-blaming probable factor, if any ("Late meal logged at 22:40; HRV lower than usual"); (3) one small action for today ("Keep training light; aim to be in bed by 22:45"); (4) reassurance grounded in data ("One short night has little effect on your weekly average. Your 7-day trend is stable.").
- Avoid "poor", "bad", "failed", red warning colours and exclamation marks for normal day-to-day variation. Keep red for truly abnormal readings (for example, a resting HR spike that may signal illness), and say so explicitly.
- Show the score as a band relative to the user's personal baseline, not as a grade against a population ideal, to weaken the 8-hour or 100-point perfectionism.
- Give an "accuracy note" affordance for sleep stages (wearable staging is approximate). Consider letting users hide sleep-stage detail, or switch to a "subjective first" mode that asks "How rested do you feel?" before showing the score. This mitigates the Gavriloff and orthosomnia effects.
- Prefer self-comparison (this week vs your 4-week average) to social comparison in a single-user dashboard.
- Positive framing as default: lead with what went well ("You hit protein 4 of the last 5 days") before the gap.

### Gaps
- I found no RCT that directly A/B tests supportive vs neutral wording of low readiness or sleep scores in a commercial app.
- I found no prevalence estimate for orthosomnia. Evidence is mainly case series and commentary.
- Oura, Whoop and Garmin do not publish evidence on how their score wording affects anxiety.

---

## 4. Actionable insights: n-of-1 self-experiments, correlation pitfalls, communicating uncertainty

### Takeaway
People naturally read correlations in their own data as causes, and adding an explanatory narrative makes that worse. Actionable insights should (a) state one concrete, low-cost behaviour, (b) state how much data supports it and how uncertain it is, and (c) offer a structured 1–2 week self-experiment to test it, with rigour balanced against everyday life.

### Cited Findings
- **TummyTrials (Karkar et al., CHI 2017).** A guided n-of-1 single-case-design app helped 15 IBS patients reliably run self-experiments on food triggers. People lack the skills to design rigorous experiments without scaffolding. The authors found tension between scientific validity and lived experience: participants valued rigour but wanted flexibility. — [PMC5432136](https://pmc.ncbi.nlm.nih.gov/articles/PMC5432136); [author PDF](https://people.cs.umass.edu/~rkarkar/pubs/conf-chi2017-tummytrials.pdf)
- **Correlation vs causation in personal data.** One worked example: a BMI-vs-sleep correlation invites "poor sleep causes weight gain", but the result depends on an arbitrary time window and the causal direction is ambiguous. — [arXiv 2308.08556](https://arxiv.org/pdf/2308.08556)
- **Readers' causal bias.** Participants tended to read correlation as causation, and a scatterplot alongside a claim reduced disagreement with unreasonable causal claims. A simple correlation-vs-causation warning made them more cautious. — [arXiv 2012.14477](https://arxiv.org/pdf/2012.14477)
- **Explanations increase causal reading.** Adding an explanation to an inferential analysis raised causal interpretation by 15.2% in a randomized MOOC study. — [bioRxiv 218784](https://www.biorxiv.org/content/10.1101/218784v1.full)
- **DeepStress (CHI 2024).** A quasi-experimental causal-analysis approach over 6 weeks of personal data helped users consider multiple contexts when investigating stress causes. — [KAIST PDF](https://ic.kaist.ac.kr/files/papers/jung2024deepstress.pdf)
- **Randomised trials in the wild.** These are largely infeasible with personal monitoring devices, which limits correlation-based conclusions. — [FedCSIS 2018 paper](https://annals-csis.org/proceedings/2018/drp/pdf/378.pdf)

### Inferences
- **Insight card anatomy (Insights tab):**
  - Headline as an observation, not a cause: "On days you ate dinner after 9pm, your HRV the next morning was lower."
  - An evidence line with sample and strength: "Based on 23 late vs 41 earlier dinners over 90 days; difference about 6 ms; moderate confidence."
  - A caveat line: "Could also reflect other things on those days (alcohol, travel, late training)." Name likely confounders actually present in the data, such as Garmin training load, MFP alcohol entries and weekends.
  - An action: "Try: dinner before 8pm on weeknights for 2 weeks." Include a [Start experiment] button.
- **Thresholds:** don't surface correlation insights below a minimum sample (for example, at least 10 days in each condition) or below a minimum effect size. Label confidence as Low / Medium / High in words, not p-values. Rank insights by actionability (is the behaviour under the user's control?) times confidence.
- **Experiments flow** (Insights → Habits):
  - Choose one variable.
  - Choose a duration of 14 days, or alternating ABAB weeks.
  - The app reminds the user and auto-collects outcomes from Oura (sleep, HRV, resting HR) and Garmin.
  - At the end, show a before/after comparison with a range ("HRV +4 ms; typical day-to-day noise ±7 ms → inconclusive").
  - Allow "pause" or "skip a day" without voiding the experiment, as TummyTrials users wanted flexibility.
- Keep the text explanation short and present it as a hypothesis. Narrative explanations increase over-interpretation.
- Account for lag: next-night sleep, next-morning HRV and readiness.

### Gaps
- I found no study that directly tests uncertainty displays (confidence words, intervals, ranges) inside a personal-informatics UI.
- I did not verify how Oura, Whoop or Garmin phrase their correlation "insights" or uncertainty from primary sources in this session.

---

## 5. Wearable effectiveness, abandonment, and features that improve retention

### Takeaway
Wearable-based interventions produce modest but real increases in activity (about 1,800 steps/day, SMD about 0.3–0.45), mostly in deliberate walking or MVPA. Gains fade and device use collapses without ongoing support. Personalisation, messaging and combining trackers with other BCTs help. Tracking alone does not reliably improve weight or health outcomes.

### Cited Findings
- **Umbrella review (Ferguson et al., Lancet Digital Health 2022).** It covered 39 systematic reviews, 390 studies and 163,841 participants. Effect sizes for activity were 0.28–0.57 (IQR), or about +1,800 steps/day, about +40 min/day walking and about +6 min/day MVPA. — [Patient Care summary](https://www.patientcareonline.com/view/physical-activity-trackers-umbrella-analysis-finds-significant-positive-impact-on-walking-weight-loss)
- **BJSM/BMJ meta-analysis (2021).** It covered 28 studies and 7,454 participants: SMD 0.350 (95% CI 0.236–0.465), about 1,850 steps/day (1,247–2,457), with I² = 69%. Text messaging and personalisation features were significantly more effective. Longer studies are needed. — [search summary of BJSM 2021; see also run.unl.pt copy](https://run.unl.pt/bitstream/10362/147424/1/422.full.pdf)
- **Tang et al. 2020, JMIR mHealth uHealth.** Twelve studies, 1,693 participants: SMD 0.449 (95% CI 0.10–0.80) for physical activity, but subgroup analyses showed no clear benefit. — [JMIR mHealth 2020;8(7):e15576](https://mhealth.jmir.org/2020/7/e15576/)
- **Li, Chen & Bi 2021 (Int J Med Inform; 44 trials).** Trackers increased steps and MVPA but had no effect on light activity or sedentary time. — [NTU repository](https://dr.ntu.edu.sg/server/api/core/bitstreams/a214eb20-98d2-4410-9d81-0c3a31bca745/content)
- **IDEA trial (Jakicic et al., JAMA 2016).** About 470 adults aged 18–35 with BMI 25–39 were in a behavioural weight-loss program. Adding a wearable led to *less* weight loss at 24 months than standard self-monitoring. — [Pitt EDC](https://www.edc.pitt.edu/?p=2013); [MedicalXpress](https://m.medicalxpress.com/news/2016-09-trackers-ineffective-sustaining-weight-loss.html)
- **TRIPPA (Finkelstein et al., Lancet Diabetes Endocrinol 2016).** About 800 Singapore employees: Fitbit Zip alone, Fitbit + cash, Fitbit + charity, or control.
  - At 6 months, the cash group was +29 MVPA min/week vs control. Tracker-only was +16, not significant.
  - At 12 months, the cash group's gain vanished after payments stopped. Tracker-only and charity groups "stemmed decline" vs control.
  - There was no improvement in weight, blood pressure or other health outcomes.
  - Device use at 6 months was 88% in the cash group and 62% in other groups. After incentives ended, only about 10% across all groups still used the device. — [TCTMD](https://www.tctmd.com/news/money-gadgets-incentivizing-healthy-behaviors-questioned-once-again); [HealthDay](https://www.healthday.com/healthpro-news/exercise-and-fitness/no-evidence-activity-tracker-devices-raise-fitness-levels-715516.html)
- **Abandonment (Epstein et al., CHI 2016 "Beyond Abandonment to Next Steps").** A survey of 193 people plus 12 interviews identified six reasons people stop tracking and five perspectives on life after tracking. Reasons in the wider literature include:
  - forgetting or charging problems
  - incomplete data leading to giving up
  - data that is not useful
  - goal achieved
  - feeling obsessed or burdened

  A companion UbiComp 2016 study surveyed 141 lapsed Fitbit users. — [UW News](https://www.washington.edu/news/2016/09/08/life-after-fitbit-appealing-to-those-who-feel-guilty-vs-free/); [selfresearch library](https://library.selfresearch.org/research/beyond-abandonment-to-next-steps-understanding-and-designing-for-life-after-personal-informatics-tool-use/); [eScholarship PDF](https://www.escholarship.org/content/qt51k9h1mg/qt51k9h1mg.pdf?t=rwq9vt); [UbiComp 2016 PDF](https://homes.cs.washington.edu/~jfogarty/publications/ubicomp2016.pdf)

### Inferences
- Trackers move deliberate activity, not sedentary time. On Today and Trends, emphasise a planned walk or workout ("20-min walk scheduled 12:30?") over all-day passive step-chasing.
- **Retention features supported by the evidence:**
  - Personalised messaging, delivered as a short daily briefing on Today: last night's sleep, readiness, today's one focus, and the remaining weekly goal.
  - A weekly review on Trends, for example Sunday: wins, one pattern, and a goal adjustment prompt (BCT 1.5 "review goals").
  - Adaptive goals.
- **Design for lapses:**
  - When data is missing (ring not worn, no MFP log), don't show zeros or broken charts. Show a gap and a gentle "welcome back" with no backlog guilt.
  - Allow quick "estimate" logging for missed days.
- **Design for "graduation":** offer a lightweight maintenance mode once a habit is stable, for example weekly check-ins instead of daily logging. Epstein found some people quit because the goal was met or tracking felt burdensome. Fewer metrics is a feature.
- Don't promise weight or health outcomes from tracking alone. Frame the dashboard as support for planned behaviours.

### Gaps
- I could not fetch Epstein et al.'s exact six abandonment reasons or percentages (the PMC fetch failed). The report writer should cite the paper as "six reasons" and not enumerate them as the paper's own list.
- I found no independent, peer-reviewed data on Oura- or Garmin-specific retention, or on the effect of daily briefings or reflection prompts in those apps.
- The commonly cited "one-third abandon within 6 months" industry figure (Endeavour Partners 2014) was not verified in this session.

---

## 6. Nutrition tracking: logging burden, calorie vs macro framing, disordered-eating risk, flexible ranges

### Takeaway
Food logging carries a real burden and a documented association with eating-disorder symptoms in vulnerable users. Most MFP users with diagnosed eating disorders felt it contributed to their disorder. Design should minimise exactness and judgement: use ranges, weekly averages, food-quality and protein/fibre "add" goals rather than restriction, and give users an easy off-switch for calories.

### Cited Findings
- **Levinson et al. 2017 (Int J Eat Disord; N = 105 people diagnosed with an eating disorder).** About 75% used MFP, and 73% of those users perceived it as contributing to their eating disorder. Perceptions correlated with symptoms. — [PubMed 28843591](https://pubmed.ncbi.nlm.nih.gov/28843591/); [National Elf Service summary](https://www.nationalelfservice.net/mental-health/eating-disorders/myfitnesspal-eating-disorders/)
- **Simpson & Mazzeo 2017 (Eating Behaviors; college sample, about 493).** Calorie-tracking and fitness-tracking use were associated with higher eating-disorder symptomatology. The design was cross-sectional. — [PMC5700836 (citing)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/); [Center for Research summary](https://www.center4research.org/fitness-tracking-apps-eating-disorders/)
- **Linardon & Messer 2019 (men).** MFP users reported higher dichotomous thinking, restraint and binge eating than non-users. Nearly 40% of users felt MFP contributed to disordered-eating symptoms to some extent. — [PMC5700836 / related summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/)
- **Mixed evidence overall.** Research is inconsistent and mostly cross-sectional, so causation is unproven. — [Center for Research](https://www.center4research.org/fitness-tracking-apps-eating-disorders/)
- **Short-horizon "stop" goals.** These are especially prone to the what-the-hell effect; reframing as longer-horizon "acquire" goals is suggested. — [EFPSA](https://more.efpsa.org/rpblog/?p=1172)

### Inferences
- **Ranges, not exact targets.** Show calories as a band (for example 2,100–2,400) and macros as ranges (protein 120–150 g). Use neutral colour inside the band and avoid red "over" states. Evaluate on a 7-day rolling average, not per day, which limits the what-the-hell effect after one heavy meal.
- **"Add" framing over "restrict" framing.** Make protein, fibre, vegetables and water goals the primary nutrition habits. Make calories secondary, collapsible, or hideable via a setting.
- **No calorie "earning" from Garmin exercise.** Don't show "you earned 500 more calories" from workouts, which reinforces compensatory exercise. Keep activity and food separate unless the user opts in.
- **Reduce logging burden:**
  - Accept partial days ("Logged 2 of 3 meals"; don't infer under-eating).
  - Offer quick-add and "same as yesterday".
  - Allow "rough day, didn't log" with no penalty.
- **Low-intake guardrails:** if logged intake is persistently very low, or there are patterns like compensatory exercise, show a gentle, non-numeric check-in and resources rather than praise.
- **Protect sensitive users:** avoid weight-loss celebration animations and "perfect day" badges for hitting exactly the calorie target.
- **Connect nutrition to outcomes the user cares about** via n-of-1 experiments, for example protein or dinner timing vs Oura sleep or HRV, rather than moralising food.

### Gaps
- I found no RCT that directly compares calorie-range vs exact-target display, or macro vs calorie framing, on adherence or eating-disorder outcomes.
- I did not verify food-logging adherence-decay data (for example, the steep drop in MFP logging over weeks) this session.
- I found no peer-reviewed guideline from eating-disorder organisations on tracker UI design. The recommendations above are inferences.

---

## Summary: concrete UI recommendations by tab (synthesised from the sections above)

- **Today:**
  - A daily briefing with the sleep/readiness band vs personal baseline, one focus action and remaining weekly progress ("3 of 5").
  - Supportive low-score copy (fact → likely factor → one action → reassurance).
  - An optional "how do you feel?" prompt before revealing the sleep score.
  - Gaps shown neutrally when data is missing.
- **Habits:**
  - User-chosen habits with an if-then cue.
  - Weekly targets with reserve days, plus weekly streaks with freeze or repair.
  - No broken-streak alerts; a cumulative "41 of last 50" view.
  - Adaptive default targets.
  - A habit-formation arc ("week 3; most people need ~2–3 months, varies widely").
  - A maintenance or graduate mode.
- **Insights:**
  - Observation-not-cause headlines, with sample size, effect size, confidence word and named confounders.
  - Minimum-data thresholds.
  - A "Try for 2 weeks" experiment button and an end-of-experiment result with a noise band ("inconclusive" is a valid outcome).
- **Trends:**
  - Rolling 7- and 28-day averages with personal-baseline bands; ranges for nutrition.
  - Self-comparison (this month vs last).
  - A Sunday weekly review: wins first, one pattern, goal adjustment.
  - No red for normal variation.
