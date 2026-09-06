# Shorts for the ML track: 23 scripts (English)

One short per module. Each links to its own continuation page at
`/en/lesson/<slug>`. Filmed the same way: you on camera plus screen cutaways.

The Russian set lives in [shorts-ml-track.md](shorts-ml-track.md). These are not
translations — spoken English carries a different rhythm, and a literal
translation of a Russian hook lands flat. The numbers are identical because they
come from the same modules.

---

## How this works

**The video and the page speak different languages, deliberately.** On camera a
viewer hears "A model that is 99.2% accurate and caught zero fraudsters." Into a
search box that same person later types "why is accuracy a bad metric precision
recall". The first sentence never appears in search; the second never works as a
hook.

| Surface | Optimised for |
| --- | --- |
| What you say on camera | retention in the first three seconds |
| Video title and description | search inside YouTube |
| The lesson page | search in Google |

**The video gives the insight, the page gives the method.** A short ends on a
claim the viewer wants to check; it does not hand over the procedure.

**Message match.** Each page's `h1` repeats its video's line verbatim — it is
stored in `content/en/modules.json` under `seo.h1`. Do not change one without
the other: the viewer has to recognise the page within half a second.

---

## The 45–55 second frame

| Beat | Time | On screen | Job |
| --- | --- | --- | --- |
| Hook | 0–3 s | you, close | A claim or a question. No greeting, no "my name is". |
| Stake | 3–10 s | you + a number | What this costs the business. |
| Explanation | 10–35 s | cutaway: diagram or module screen | The short technical reason. |
| Rule | 35–48 s | you | What to do about it. One usable idea. |
| Call | 48–55 s | you + a card | "Full walkthrough — link in the description." |

Three rules that do not bend:

1. **No run-up.** Never "today we're going to talk about".
2. **One idea per video.** A second insight kills retention.
3. **Only real numbers.** Every figure below comes from the modules and stays
   consistent across them — the churn model's ROC-AUC runs 0.834 → 0.874 → 0.879
   through modules 5, 8 and 10, which gives the series continuity and natural
   reasons to reference neighbouring videos.

---

## Hashtags

YouTube shows only the first three above the title, so order matters.

**Core on every video:** `#shorts` `#machinelearning` `#datascience`

**Plus one or two by topic:** `#mlengineer` `#datascientist` `#python`
`#techcareer` `#interviewprep` `#mlops` `#deeplearning` `#computervision` `#nlp`

Never more than five — it blurs the topic without helping the ranking.

## The link in the description

```
<domain>/en/lesson/<slug>?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=<video id>
```

The video id goes in `utm_content`: the server's allowlist drops `utm_term`, and
`utm_content` is what already joins page views to signups in the admin panel.
**Put the same id into `seo.short`** for that module in
`content/en/modules.json`, or the two numbers will never line up.

Note `utm_campaign=ml_en` rather than `ml` — it keeps the two language funnels
apart in the stats.

### Ready links for all 23 lessons

Replace `ID` with the video id after upload, and write the same id into
`seo.short` for that module — otherwise page views and signups never join up.

| № | Module | The line from the video (also the page h1) | Link for the description |
| --- | --- | --- | --- |
| 01 | m01 | Half the “ML tasks” you are handed are solved by an if-else | `https://mlsimulator.com/en/lesson/machine-learning-vs-rules-when-to-use-ml?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 02 | m02 | Revenue grew, profit did not. We found out why without a model | `https://mlsimulator.com/en/lesson/exploratory-data-analysis-eda-pandas?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 03 | m03 | The discount lifted conversion — and brought in less money | `https://mlsimulator.com/en/lesson/ab-testing-and-p-value-explained?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 04 | m04 | The first model saved millions — and it was a linear regression | `https://mlsimulator.com/en/lesson/linear-regression-mae-vs-rmse?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 05 | m05 | The insight turned out to be worth more than the model | `https://mlsimulator.com/en/lesson/customer-churn-prediction-model?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 06 | m06 | 99.2% accurate — and it caught zero fraudsters | `https://mlsimulator.com/en/lesson/precision-recall-roc-auc-explained?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 07 | m07 | A weak model on strong features beats a strong model on weak ones | `https://mlsimulator.com/en/lesson/feature-engineering-and-target-leakage?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 08 | m08 | On tabular data, boosting beats neural networks | `https://mlsimulator.com/en/lesson/gradient-boosting-vs-random-forest?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 09 | m09 | 0.97 on the test set, 0.61 in production | `https://mlsimulator.com/en/lesson/data-leakage-and-overfitting?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 10 | m10 | A gain of 0.005 against a spread of 0.004 is noise | `https://mlsimulator.com/en/lesson/hyperparameter-tuning-optuna?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 11 | m11 | 93% of the alerts are false — and the economics still work | `https://mlsimulator.com/en/lesson/imbalanced-classes-and-threshold?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 12 | m12 | A cluster without a name is not a result | `https://mlsimulator.com/en/lesson/customer-segmentation-k-means-rfm?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 13 | m13 | The model learned that phones go with cases, knowing nothing about products | `https://mlsimulator.com/en/lesson/recommender-systems-collaborative-filtering?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 14 | m14 | A naive forecast gets you 80% of the way to a complex model | `https://mlsimulator.com/en/lesson/demand-forecasting-time-series-validation?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 15 | m15 | The bigger model is more accurate — and does not pay for itself | `https://mlsimulator.com/en/lesson/text-classification-tfidf-vs-transformers?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 16 | m16 | If you have never overfitted a network, you cannot train one | `https://mlsimulator.com/en/lesson/neural-networks-backpropagation-overfitting?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 17 | m17 | Four thousand photos. Training from scratch will not fly | `https://mlsimulator.com/en/lesson/computer-vision-cnn-transfer-learning?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 18 | m18 | What separates a mid-level engineer is designing the whole system | `https://mlsimulator.com/en/lesson/ml-system-design-interview?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 19 | m19 | A model without monitoring is an incident that has not happened yet | `https://mlsimulator.com/en/lesson/mlops-monitoring-and-data-drift?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 20 | m20 | Business problem first, then the data, and only then the model | `https://mlsimulator.com/en/lesson/end-to-end-ml-project-middle-engineer?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 21 | m21 | The best project is the one you decided not to build | `https://mlsimulator.com/en/lesson/ml-design-doc-problem-space?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 22 | m22 | Half an hour spent reading errors beats a week of tuning | `https://mlsimulator.com/en/lesson/metric-hierarchy-and-baselines?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |
| 23 | m23 | Who fixes the model at three in the morning | `https://mlsimulator.com/en/lesson/ab-testing-ml-systems-and-ownership?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=ID` |

---

# The scripts

## 1 · Module m01 — `machine-learning-vs-rules-when-to-use-ml`

**Title:** Half your "ML tasks" are just an if-else | When you don't need a model

- **Hook:** "Half the things that land on an ML engineer's desk as machine learning problems are solved by an ordinary if-else."
- **Stake:** "The product manager brings four ideas. Block an order over a hundred thousand from an account less than a day old. Recommendations on the homepage. A 'we miss you' email after thirty days of silence. And checking that a product photo matches its category."
- **Explanation** *(cutaway: the project lifecycle diagram)*: "One and three are rules. The condition is known up front, it doesn't drift, and you can explain it to a lawyer. Machine learning earns its place where the rule can't be written down: where there are hundreds of signals and the weight of each has to be learned from data. Recommendations and image checks are exactly that."
- **Rule:** "Google's first rule of machine learning says it plainly — don't be afraid to launch a product without ML. If a rule solves it, ship the rule."
- **Call:** "I walked through all four cases and the full project lifecycle — link in the description."

**Description:**
```
Blocking an expensive order from a brand-new account is a rule. Homepage recommendations are ML. We work through four real requests from a product manager, and why 60–80% of an ML project is spent nowhere near the model.

Full walkthrough → <link>

#shorts #machinelearning #datascience #techcareer #python
```

---

## 2 · Module m02 — `exploratory-data-analysis-eda-pandas`

**Title:** Revenue up, profit flat — found the cause without a model | EDA

- **Hook:** "Revenue is growing. Profit isn't. We found the reason in a day, without training anything."
- **Stake:** "Fifty thousand orders over twelve months. The product manager wants to know what is happening to electronics."
- **Explanation** *(cutaway: the skewed order-value distribution)*: "Data quality first: four hundred and twelve duplicate order ids — pipeline retries — three thousand missing discount values, and eighty-nine price outliers. The outliers turned out to be real: business purchases of servers, and deleting them would have been the actual mistake. Then the finding. Average discount climbed from four per cent in March to almost seventeen in June. Margin fell from twenty-two per cent to seven."
- **Rule:** "Exploratory analysis is often worth more than a model. You haven't trained anything yet and the business already has its answer."
- **Call:** "How to catch duplicates on a business key and what to do with missing values — link in the description."

**Description:**
```
Sales climbing, profit flat. One EDA pass over 50,000 orders finds the cause: average discount went from 4.2% to 16.8% and margin fell from 22% to 7%. Plus 412 duplicates from pipeline retries and outliers you must not delete.

Full walkthrough → <link>

#shorts #machinelearning #datascience #python #dataanalysis
```

---

## 3 · Module m03 — `ab-testing-and-p-value-explained`

**Title:** The discount lifted conversion and lost money | A/B testing and p-value

- **Hook:** "The discount lifted conversion. And brought in less money."
- **Stake:** "Twenty thousand users split in half. One group saw a fifteen per cent discount, the other didn't. Conversion six point four against five point eight. Marketing is celebrating."
- **Explanation** *(cutaway: two overlapping distributions)*: "Run the numbers. P-value of zero point zero seven. The confidence interval on the effect covers zero, which means there may be no real difference at all. To detect an effect this small you'd need thirty thousand users per group, not ten. But here's the part that matters. Revenue per user: forty-one roubles in the discount group against forty-nine without it."
- **Rule:** "The job isn't to report a p-value of zero point zero seven. The job is to say: the discount doesn't pay for itself, and here's what to do next."
- **Call:** "How to compute significance and sample size properly — link in the description."

**Description:**
```
Conversion rose from 5.8% to 6.4% and revenue per user fell from 48.9 to 41.2. A real A/B test: what a p-value actually means, why the confidence interval matters more than the raw lift, and why you size the sample before you start.

Full walkthrough → <link>

#shorts #machinelearning #datascience #dataanalysis #abtesting
```

---

## 4 · Module m04 — `linear-regression-mae-vs-rmse`

**Title:** The first model saved millions — a linear regression | MAE vs RMSE

- **Hook:** "The first model I shipped saved the company millions. It was a linear regression."
- **Stake:** "Logistics was charging a city average for delivery and losing money on every long, heavy order. Eighty thousand deliveries of history."
- **Explanation** *(cutaway: the regression line and the descent curve)*: "The city average was off by a hundred and thirty-seven roubles. The linear model, by forty-eight. And here's the part people underrate — you can read it out loud. Base rate, plus thirty-four for weight, plus fifty-nine for distance, plus a hundred and twelve for urgency. That's a fair tariff, not a black box."
- **Rule:** "Start with the simple baseline. Not because neural networks are bad, but because finance signs off on what they can check."
- **Call:** "The difference between MAE and RMSE and how to read coefficients — link in the description."

**Description:**
```
A city-average tariff was off by 137, a linear regression by 48. The first working model: gradient descent, standardisation, MAE against RMSE, and how to explain coefficients to a finance team so the model actually gets approved.

Full walkthrough → <link>

#shorts #machinelearning #datascience #python #mlengineer
```

---

## 5 · Module m05 — `customer-churn-prediction-model`

**Title:** The insight was worth more than the model | Churn prediction

- **Hook:** "The model wasn't in production yet, and the company had already made money. Off a single coefficient."
- **Stake:** "Eight per cent monthly churn on a base of two hundred thousand. Keeping a customer costs five times less than winning a new one, but you can't call everybody."
- **Explanation** *(cutaway: the sigmoid with its threshold)*: "We fit a logistic regression and read the coefficients. The longer since the last login, the higher the risk. More support complaints, higher risk. And the strongest protective factor is having autopay switched on. That's a marketing campaign, right there, before anything ships."
- **Rule:** "And retention doesn't want a yes-or-no answer. It wants a probability, so the list can be sorted and called from the top until the budget runs out."
- **Call:** "Why a threshold of zero point five breaks this — link in the description."

**Description:**
```
Logistic regression for churn: ROC-AUC 0.834 and a call list of 5,000. But the real value came from a coefficient — autopay is the strongest thing keeping people. Why the business needs probabilities rather than class labels.

Full walkthrough → <link>

#shorts #machinelearning #datascience #dataanalysis #mlengineer
```

---

## 6 · Module m06 — `precision-recall-roc-auc-explained`

**Title:** 99% accurate and completely useless | Classification metrics

- **Hook:** "This model caught zero fraudsters. Its accuracy is ninety-nine point two per cent."
- **Stake:** "That's not a bug. Fraud is zero point eight per cent of the data. The model answers 'not fraud' every single time and is right ninety-nine times out of a hundred."
- **Explanation** *(cutaway: confusion matrix and ROC curve)*: "Accuracy treats every answer as equal. The business doesn't. A missed fraudster is money out of an account. A blocked honest customer is a support call and an angry person. So you look at two numbers instead. Recall: of all the fraud, how much did we catch. Precision: of everything we flagged, how much was really fraud."
- **Rule:** "And you don't take zero point five as the threshold. You derive it from the cost of each error. In this case a threshold of zero point three one is worse on precision and better on money by nearly ten million."
- **Call:** "How that threshold is calculated, step by step — link in the description."

**Description:**
```
99.2% accuracy when fraud is 0.8% of the data means a model that always says no. An anti-fraud walkthrough: the confusion matrix, precision against recall, why PR-AUC is more honest than ROC-AUC, and how the threshold comes out of the cost of errors.

Full walkthrough with the threshold maths → <link>

#shorts #machinelearning #datascience #interviewprep #mlengineer
```

---

## 7 · Module m07 — `feature-engineering-and-target-leakage`

**Title:** The feature that kills your model in production | Feature engineering

- **Hook:** "A weak model on strong features beats a strong model on weak ones. Every time."
- **Stake:** "Credit scoring. Three tables: applications, wallet history, past instalment plans. Turning them into features is the work that actually decides quality."
- **Explanation** *(cutaway: the point-in-time timeline)*: "We build aggregates over thirty, ninety and a hundred and eighty day windows. The strongest single feature turns out to be requested amount over income. But there's a trap. A feature called 'number of collections calls' looks spectacular — and it only exists for people who already defaulted. On history the model looks brilliant. In production it collapses."
- **Rule:** "The rule is simple: a feature has to be knowable at the moment the model makes its decision. Not earlier, not later."
- **Call:** "Category encoding, missing values and the full list of traps — link in the description."

**Description:**
```
The best model on weak features loses to a simple model on strong ones. Building features for credit scoring: aggregates over 30/90/180-day windows, category encoding, missing values, and dodging the leak from the future that breaks models in production.

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlengineer #python
```

---

## 8 · Module m08 — `gradient-boosting-vs-random-forest`

**Title:** Why boosting beats neural nets on tabular data

- **Hook:** "On tabular data, gradient boosting almost always beats a neural network. Here's why."
- **Stake:** "The churn model: logistic regression gave zero point eight three, random forest zero point eight six, boosting zero point eight seven. In the top five thousand of the call list, eighteen per cent more people were actually leaving."
- **Explanation** *(cutaway: bagging against boosting)*: "The difference is in how the ensembles are built. A forest trains trees independently and averages them, which cuts variance. Boosting builds a chain where each tree fixes the errors of the ones before it. But the deeper reason is the data itself: relationships in tables are sharp and piecewise. Thirty days past due and the risk jumps. A tree captures that with a single split. A network has to learn it."
- **Rule:** "And the logistic regression stays in production as a fallback. The complex model doesn't replace the simple one, it sits on top of it."
- **Call:** "Which hyperparameters actually move the needle — link in the description."

**Description:**
```
Logistic regression 0.834 → random forest 0.861 → LightGBM 0.874. How bagging differs from boosting, which hyperparameters genuinely matter, and the real reason trees beat neural networks on tabular data.

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlengineer #deeplearning
```

---

## 9 · Module m09 — `data-leakage-and-overfitting`

**Title:** 0.97 on the test set, 0.61 in production | Data leakage

- **Hook:** "Zero point nine seven on the test set. Zero point six one in production. Worse than the hand-written rules it replaced."
- **Stake:** "An incident review. Three pieces of evidence, and all three show up in real projects constantly."
- **Explanation** *(cutaway: train and validation curves)*: "First: two years of data split at random, when it's a time series — the model was reading the future. Second: normalisation fitted before the split, so test statistics leaked into training. Third, and the big one: account status at export time was in the features. For everyone who defaulted it reads 'blocked'. The model was just reading the answer."
- **Rule:** "Afterwards the team added a rule: if one feature carries more than forty per cent of the importance, that's an alert, not a celebration. A metric that looks too good almost always means a leak."
- **Call:** "Five kinds of leakage and the validation schemes that survive them — link in the description."

**Description:**
```
ROC-AUC 0.97 offline, 0.61 in production. Investigating a real failure: a random split of time-ordered data, a scaler fitted before the split, and a feature that didn't exist when the decision was made. Five kinds of leakage and honest validation.

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlengineer #interviewprep
```

---

## 10 · Module m10 — `hyperparameter-tuning-optuna`

**Title:** Your tuning improved nothing | Hyperparameter search

- **Hook:** "The tuning gained five thousandths. The spread of the cross-validation is four thousandths. That's not an improvement, that's noise."
- **Stake:** "One day, and one server shared between three teams. Sixty trials, an hour total."
- **Explanation** *(cutaway: grid search against random search)*: "Two things. A grid wastes trials: twenty-five points on a grid is only five distinct values per axis. Twenty-five random points is twenty-five distinct values on every axis. Bayesian search goes further and picks the next point from what it has already seen. But none of it saves you when the gain is smaller than the metric's own variance."
- **Rule:** "The order of effort is always the same: data, then features, then the model, and hyperparameters last. The real improvement here would have come from new features. Tuning never substitutes for data."
- **Call:** "What to tune on a boosting model and in what order — link in the description."

**Description:**
```
CV 0.8815 against 0.8742 with a spread of 0.004 — a gain sitting inside the noise. Why random search beats a grid, what Optuna actually does, and why the priority is always data > features > model > hyperparameters.

Full walkthrough → <link>

#shorts #machinelearning #datascience #python #mlengineer
```

---

## 11 · Module m11 — `imbalanced-classes-and-threshold`

**Title:** 93% of the alerts are false — and that's correct | Imbalanced classes

- **Hook:** "Ninety-three per cent of this anti-fraud system's alerts are false positives. And it is correctly configured."
- **Stake:** "Four hundred thousand transactions a day, fraud at one tenth of one per cent. A missed case costs eighteen thousand roubles. A false block costs four hundred. That's a forty-five to one ratio."
- **Explanation** *(cutaway: the PR curve under imbalance)*: "At that skew ROC-AUC flatters you: zero point nine seven looks magnificent, while PR-AUC is zero point four one — and PR-AUC is the one telling the truth. Class weights took recall from forty-four per cent to sixty-two. SMOTE, incidentally, did worse than plain weights."
- **Rule:** "And the threshold doesn't come from a metric. It comes from money and from capacity. The review team handles five hundred alerts a day — that's the real constraint. Tuned that way the system is worth about fourteen and a half million a month."
- **Call:** "How to derive a threshold from a cost matrix — link in the description."

**Description:**
```
A 1:1000 imbalance in fraud detection: PR-AUC 0.412 while ROC-AUC reads 0.972 — you can see how much the second one flatters. Class weights against SMOTE, probability calibration, and deriving the threshold in money rather than metrics.

Full walkthrough → <link>

#shorts #machinelearning #datascience #dataanalysis #mlengineer
```

---

## 12 · Module m12 — `customer-segmentation-k-means-rfm`

**Title:** A cluster without a name is garbage | Customer segmentation

- **Hook:** "A cluster you can't name isn't a result. It's noise with a number on it."
- **Stake:** "Marketing splits customers into 'new' and 'existing'. There are no labels and no correct answer. The question is what types of customer actually exist."
- **Explanation** *(cutaway: clusters in RFM space)*: "This is unsupervised learning — no target, no accuracy. We build recency, frequency and monetary features, then cluster. The number of clusters isn't chosen by the elbow alone; it's chosen by whether marketing can act on that many. We landed on five. Dormant, a third of the base. New. Middle. VIP at eight per cent. And discount hunters: fifteen per cent of the base, with eighty-seven per cent of their purchases on promotion."
- **Rule:** "That last segment closed a loop. Remember the discounts eating the margin? They now have a specific audience."
- **Call:** "How to choose the number of clusters and describe the segments — link in the description."

**Description:**
```
Five segments instead of "new and existing": dormant at 31%, VIP at 8%, and discount hunters — 15% of the base making 87% of their purchases on promotion. RFM features, K-Means, the elbow and silhouette, and why unnamed clusters are worthless.

Full walkthrough → <link>

#shorts #machinelearning #datascience #dataanalysis #marketing
```

---

## 13 · Module m13 — `recommender-systems-collaborative-filtering`

**Title:** It learned phones go with cases, knowing nothing about products

- **Hook:** "The model recommended a case, a screen protector and earbuds next to a phone. It knows nothing about any of them — not the name, not the category."
- **Stake:** "The 'you might like' block was four per cent of revenue and showed everyone the same bestsellers. Competitors running real personalisation lift conversion fifteen to twenty per cent."
- **Explanation** *(cutaway: the matrix splitting in two)*: "Take the users-by-products matrix, which is less than a hundredth of a per cent filled, and factor it into two narrow ones: one describing people's tastes, the other describing product properties. Nobody defined those properties — they fell out of what gets bought together. NDCG went from three per cent to nine, and catalogue coverage from a tenth of a per cent to twelve."
- **Rule:** "And the most common recommender bug in production: remember to filter out what the person has already bought."
- **Call:** "Cold start and ranking metrics — link in the description."

**Description:**
```
Matrix factorisation learned product affinity without a single word of product data: NDCG@10 from 0.037 to 0.093, catalogue coverage from 0.1% to 12.4%. Collaborative filtering, embeddings, the cold start, and precision@k, recall@k and NDCG.

Full walkthrough → <link>

#shorts #machinelearning #datascience #recommendersystems #mlengineer
```

---

## 14 · Module m14 — `demand-forecasting-time-series-validation`

**Title:** A naive forecast gets 80% of a complex model | Time series

- **Hook:** "In demand forecasting a naive baseline gets you about eighty per cent of what a complex model does. If yours can't beat it, you've wasted the sprint."
- **Stake:** "The warehouse is full of winter stock while the fast movers run out three days before delivery. We need a four-week forecast across two thousand products."
- **Explanation** *(cutaway: the seasonal series and the rolling scheme)*: "Seasonal naive — literally 'same day last week' — is off by twenty-seven per cent. A moving average, twenty-four. Boosting with lag features, eighteen. But the model isn't the interesting part. Validation is. In time series the order of the data is information, and the test set must always sit in the future relative to training."
- **Rule:** "And the line of code that decides it: shift first, then roll. Get that backwards and your feature peeks at the very day you're predicting."
- **Call:** "Why MAPE is a bad choice in retail — link in the description."

**Description:**
```
WAPE: seasonal naive 27.4%, moving average 24.1%, LightGBM 17.8%. Forecasting 2000 SKUs: trend and seasonality, lag features, rolling validation, and why ordinary cross-validation quietly lies on time series.

Full walkthrough → <link>

#shorts #machinelearning #datascience #dataanalysis #forecasting
```

---

## 15 · Module m15 — `text-classification-tfidf-vs-transformers`

**Title:** The bigger model won on accuracy and lost on money | NLP

- **Hook:** "The most accurate model lost. Not on quality — on economics."
- **Stake:** "Five thousand support tickets a day. An agent spends the first forty seconds of each one working out where it belongs. That's fifty-five person-hours a day spent purely on sorting."
- **Explanation** *(cutaway: one ticket taking two routes)*: "Three options. TF-IDF with a linear model: F1 of zero point eight six, two milliseconds, plain CPU. A small Russian transformer: zero point nine one, forty milliseconds, still CPU. A large BERT: zero point nine two five, but three hundred milliseconds and a GPU. Fifteen thousandths of F1 is not worth a GPU. The gap between the first two, though, is about two hundred and fifty tickets a day landing in the right queue immediately."
- **Rule:** "And don't automate everything. Where the model isn't confident, the ticket goes to a human. We automate the confident eighty-five per cent."
- **Call:** "How to pick the confidence threshold — link in the description."

**Description:**
```
TF-IDF: F1 0.86 at 2 ms. A small transformer: 0.91 at 40 ms. A large BERT: 0.925, but 300 ms and a GPU. How production models are chosen on quality together with latency, and why a confidence threshold beats automating everything.

Full walkthrough → <link>

#shorts #machinelearning #datascience #nlp #mlengineer
```

---

## 16 · Module m16 — `neural-networks-backpropagation-overfitting`

**Title:** If you've never overfitted a network, you can't train one

- **Hook:** "Anyone who has never deliberately overfitted a neural network doesn't really know how to train one. That's not a paradox."
- **Stake:** "Take a thousand-neuron network, five per cent of the data, two hundred epochs and no regularisation whatsoever."
- **Explanation** *(cutaway: train and validation curves diverging)*: "At epoch ten, training loss zero point three one, validation zero point three five — honest. At sixty: zero point zero four against zero point five eight. At two hundred: one thousandth against zero point nine four. The network has memorised the training set. Add dropout, weight decay and early stopping, and validation settles around a third."
- **Rule:** "And on that same tabular churn problem the network scored zero point eight six against boosting's zero point eight seven. Networks earn their place where features can't be hand-built: images, text, audio."
- **Call:** "Neurons, layers and backpropagation without the magic — link in the description."

**Description:**
```
Epoch 10: train 0.31 / val 0.35. Epoch 200: train 0.001 / val 0.94. A deliberate overfitting experiment and the cure — dropout, weight decay, early stopping. Plus an honest answer to why we learn networks at all when boosting wins on tables.

Full walkthrough → <link>

#shorts #machinelearning #datascience #deeplearning #python
```

---

## 17 · Module m17 — `computer-vision-cnn-transfer-learning`

**Title:** Four thousand photos. From scratch won't fly | Transfer learning

- **Hook:** "Four thousand photographs. Training a network from scratch on that is pointless. And unnecessary."
- **Stake:** "Cameras on the packing line. Dented boxes reach customers, which means returns and bad reviews, and the inspector physically cannot check everything."
- **Explanation** *(cutaway: a filter sliding over a box photo)*: "First, the scale of the problem. A two-twenty-four by two-twenty-four image is a hundred and fifty thousand numbers. A dense layer of a thousand neurons would be a hundred and fifty million weights. Convolution solves that by sliding one small filter across the whole image. Transfer learning solves the second half: take a network trained on millions of images and fine-tune the last layers. Recall went from seventy-one per cent to ninety-three."
- **Rule:** "And the threshold, again, comes from money: a missed defect costs more than an extra check, so we push to ninety-six per cent recall. The inspector now looks at about fifty boxes an hour instead of all of them."
- **Call:** "Augmentations and Grad-CAM — link in the description."

**Description:**
```
4000 photos, 400 of them defective. How convolution works and why it saves 150 million weights, why transfer learning is the answer on a small dataset (recall 0.71 → 0.93), and how to set the threshold from the cost of a missed defect.

Full walkthrough → <link>

#shorts #machinelearning #datascience #computervision #deeplearning
```

---

## 18 · Module m18 — `ml-system-design-interview`

**Title:** What separates a mid-level engineer | ML system design

- **Hook:** "What separates a mid-level engineer from a junior isn't knowing more algorithms. It's being able to design the whole system."
- **Stake:** "A one-sentence brief, exactly as it arrives in an interview: build a smart product feed for the mobile app. Two million monthly users, three thousand requests a second at peak, a hundred and fifty millisecond budget for the response."
- **Explanation** *(cutaway: the retrieval-to-ranking funnel)*: "You cannot score three hundred thousand products in a hundred and fifty milliseconds. So it's two stages: a fast retrieval step down to five hundred candidates, about ten milliseconds, then heavy ranking of those five hundred into a top twenty, another thirty. And a fallback on every stage: if anything misses its budget, serve a cached top list. The feed never goes down."
- **Rule:** "The interviewer's favourite follow-up: what if the test shows clicks up and revenue down? You believe revenue. Clicks are a proxy, and the feed may simply have pushed people towards cheap, clickable items."
- **Call:** "The seven-step framework — link in the description."

**Description:**
```
"Build a smart feed" — a one-sentence brief, exactly as it lands in an interview. Unpacked with a framework: the metric chain from business to offline, a retrieval → ranking architecture inside a 150 ms budget, guardrail metrics, fallbacks and the rollout plan.

Full walkthrough → <link>

#shorts #machinelearning #datascience #interviewprep #mlengineer
```

---

## 19 · Module m19 — `mlops-monitoring-and-data-drift`

**Title:** A model without monitoring is a future incident | MLOps

- **Hook:** "A model without monitoring is an incident that simply hasn't happened yet."
- **Stake:** "A real case. Six quiet weeks. In week seven one feature — days since last login — shifts its distribution sharply."
- **Explanation** *(cutaway: PSI bars by week)*: "The population stability index catches it. Below zero point one, fine. Between zero point one and zero point two five, pay attention. Above that, alert. Here it hit zero point three one. And the cause was neither the data nor the model: the mobile app had shipped auto-login, and the feature collapsed to zero for everyone. The model had no idea and kept treating those people as active."
- **Rule:** "Monitor three layers: the service itself, drift in the inputs, and delayed prediction quality. And ship through shadow mode and a canary, with a rollback that's a config change and takes a minute."
- **Call:** "How to set up all three layers — link in the description."

**Description:**
```
Six quiet weeks, then PSI hits 0.31 on one feature. The cause was auto-login in the mobile app, not the data. How a model becomes a service: FastAPI and Docker, versioning, three layers of monitoring, and shadow → canary → rollback.

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlops #mlengineer
```

---

## 20 · Module m20 — `end-to-end-ml-project-middle-engineer`

**Title:** What they ask when you defend an ML project | Getting to mid-level

- **Hook:** "Business problem first, then the data, and only then the model. The tools will keep changing. That order never does."
- **Stake:** "Defending an end-to-end project in front of the CTO and the product manager. Predict whether an order will be late — so delivery dates are honest at checkout and customers get warned in advance."
- **Explanation** *(cutaway: the project stages timeline)*: "One point two million deliveries. Straight away, two per cent duplicates and eight per cent of orders with negative delivery time — time zones. A rule-based baseline gave an F1 of forty-one per cent, logistic regression zero point seven eight, tuned boosting zero point eight six. The threshold was set at eighty-five per cent recall, because a missed delay costs more than an unnecessary warning."
- **Rule:** "And when they ask what to trust: not the metric, the process. The offline metric is a filter. The decision comes from the experiment — a pilot on ten per cent of traffic cut SLA breaches by twenty-two per cent."
- **Call:** "The full defence, question by question — link in the description."

**Description:**
```
Defending the capstone in front of the CTO: 1.2M deliveries, 8% of records with negative delivery time from time zones, ROC-AUC 0.86, and a 10% pilot that cut SLA breaches by 22%. Framing, leak-free features, a cost-matrix threshold and an operations plan.

Full walkthrough → <link>

#shorts #machinelearning #datascience #techcareer #mlengineer
```

---

## 21 · Module m21 — `ml-design-doc-problem-space`

**Title:** The best ML project is the one you didn't build | Design doc

- **Hook:** "The best ML project I've worked on is the one we decided not to build."
- **Stake:** "The client is a chain of two thousand stores and forty-seven distribution centres, losing around eight hundred million dollars a year on the gap between what was stocked and what sold. And we're not writing code for another month."
- **Explanation** *(cutaway: problem space against solution space)*: "First the design doc. It prices the error in both directions, and they are not symmetrical: overstock is easy to count, a lost sale is nearly impossible because it never appeared in the data. Then anti-goals: we don't forecast new products, we don't touch routing, we stay out of pricing. And a stopping criterion — if a plain moving average with seasonality lands within three per cent of the model, the project closes."
- **Rule:** "A junior starts with a model. A mid-level engineer starts by asking whether the problem exists and whether it's worth solving. 'Don't build it' is a successful outcome for a design doc, and a very cheap one."
- **Call:** "The structure of the doc, section by section — link in the description."

**Description:**
```
Before any code, a design doc. Worked through on a retail contract: problem space against solution space, the cost of error in both directions, anti-goals that stop scope creep, and a stopping criterion. Based on "Machine Learning System Design" (Manning).

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlengineer #techcareer
```

---

## 22 · Module m22 — `metric-hierarchy-and-baselines`

**Title:** Half an hour reading errors beats a week of tuning | Metrics

- **Hook:** "Half an hour spent reading your worst predictions produces more ideas than a week of hyperparameter tuning."
- **Stake:** "Two thousand stores, thirty thousand products, three years of history. The place to start is not the model."
- **Explanation** *(cutaway: the metric pyramid and the baseline ladder)*: "Metrics stack into a pyramid: the loss function at the bottom, the offline metric above it, the online metric above that, and money at the top. They are genuinely different things — the loss can be asymmetric if under-ordering costs more than over-ordering. Then the ladder of baselines: a constant, a rule, a simple model, the target system. Each rung has to beat the one below it visibly, or it doesn't belong."
- **Rule:** "And a way to check your validation is honest: train a classifier to tell the training set apart from recent data. If it can, your validation is lying — the distributions have drifted apart."
- **Call:** "Learning curves and error analysis — link in the description."

**Description:**
```
Loss, offline metric, online metric and money are four different things. Stacking them into a pyramid, building the baseline ladder, using adversarial validation as an honesty check on your split, and error analysis instead of blind tuning.

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlengineer #dataanalysis
```

---

## 23 · Module m23 — `ab-testing-ml-systems-and-ownership`

**Title:** Who fixes the model at 3am | Owning an ML system

- **Hook:** "The model beat every baseline. The easy part is over. Now: who fixes it at three in the morning?"
- **Stake:** "Demand forecasting for a retail chain. This isn't an experiment any more — purchasing depends on it."
- **Explanation** *(cutaway: three types of drift and the response to each)*: "Three things that aren't in the textbooks. One: the randomisation unit in the A/B test is the store, not the shopper, or the effect leaks between groups. Two: the ageing test. Deliberately delay retraining by one, two, four and eight weeks and watch quality degrade — that's how retraining frequency gets decided. Three: a fallback hierarchy. Model, previous version, seasonal naive, manual order."
- **Rule:** "And the metric people forget: how often buyers override the system by hand. Rising overrides mean the business has stopped trusting it."
- **Call:** "Four levels of monitoring and bus factor — link in the description."

**Description:**
```
What turns a model into a system: training and inference pipelines, an A/B design randomised by store, an ageing test to choose retraining frequency, drift types and a fallback hierarchy. Plus an honest look at accountability and bus factor.

Full walkthrough → <link>

#shorts #machinelearning #datascience #mlops #mlengineer
```

---

## Shooting order

Filming in module order is not the best use of the first weeks. The
counter-intuitive hooks carry furthest, so shoot those first and learn what
holds attention before committing to all twenty-three:

1. **№ 6** — 99% accurate and zero fraudsters caught
2. **№ 9** — 0.97 on the test set, 0.61 in production
3. **№ 11** — 93% of alerts are false and that's correct
4. **№ 21** — the best project is the one you didn't build
5. **№ 3** — the discount lifted conversion and lost money

## Before you publish

- The domain is live and `PUBLIC_URL` points at it. A link inside a published
  video cannot be edited afterwards.
- The video id is written into `seo.short` for that module in
  `content/en/modules.json`, or views and signups will never join up.
- `utm_campaign=ml_en`, so the English funnel stays separate from the Russian
  one in the stats.
- The link has been opened and lands on the right lesson.
