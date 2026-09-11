# LinkedIn posts: three ML modules (English)

Three posts, one per module, each linking to that module's public lesson page.
Every figure comes from the English module itself — the English modules price
things in dollars and with different values from the Russian ones, so never
reuse a number from the Russian scripts.

**Where the link goes.** LinkedIn tends to show posts with an outside link in
the body to fewer people. If reach matters more than a clickable body, move the
link to the first comment and end the post with "Link in the first comment".
Either way the link unfurls into a card with the lesson's own image and title.

**Tags.** `utm_content` is set per post (`li_m06`, `li_m09`, `li_m21`), so page
views and signups from each post show up separately in the admin panel's
statistics tab.

---

## Post 1 · Module 6 — metrics and the cost of an error

```
An intern announced an anti-fraud model with 99.2% accuracy.

It had not caught a single fraudster.

Fraud was 0.8% of the transactions. The model answered "not fraud" every time — and was right 99.2% of the time. Accuracy was measuring how rare fraud is, not how good the model was.

Accuracy treats every error as equal. The business never does. A missed fraudster is money gone. A blocked honest customer is a support call and an angry user.

So you look at two numbers instead: recall — how much of the fraud you caught — and precision — how much of what you flagged was real.

Then comes the part most teams skip: the threshold. 0.5 is a default, not a decision.

In the same lesson a churn model at 0.5 looked tidy and missed 60% of the customers who were about to leave. At 0.31, precision drops to 0.55 and recall climbs to 0.79. With 5,000 retention calls at $2 each, that is $10K spent to keep roughly $124K of customers.

Worse on the metric. Better on the money.

The first question worth asking about any "99% accurate" model: what does it cost when it is wrong?

The full walkthrough, with the threshold maths:
https://mlsimulator.com/en/lesson/precision-recall-roc-auc-explained?utm_source=linkedin&utm_medium=social&utm_campaign=ml_en&utm_content=li_m06

#MachineLearning #DataScience #MLEngineering
```

---

## Post 2 · Module 9 — data leakage

```
ROC-AUC 0.97 on the test set.
0.61 in production — worse than the hand-written rules it replaced.

This is the post-mortem of a credit scoring model, and all three causes turn up in real projects constantly.

1. A random split on time-ordered data. Two years of applications, shuffled together: the model trained on December and was tested on January of the same year. It had seen the future.

2. The scaler was fitted on all the data before the split, so statistics from the test set leaked into training.

3. The real culprit: a feature called account_status_at_export. For everyone who defaulted it read "blocked" — because the status was set after the default. The model was not predicting risk. It was reading the answer.

Drop that feature, validate honestly, and the true quality is 0.74. Still useful. Just not magic.

One number gave it away early: a single feature carried 0.61 of the total importance. The team now has a rule — if one feature explains more than 40%, stop and check for leakage before anyone celebrates.

A metric that looks too good is a warning, not a result.

And the line from the review worth keeping: "We punish no one — we fix the process."

The investigation, step by step:
https://mlsimulator.com/en/lesson/data-leakage-and-overfitting?utm_source=linkedin&utm_medium=social&utm_campaign=ml_en&utm_content=li_m09

#MachineLearning #DataScience #MLOps
```

---

## Post 3 · Module 21 — the design doc

```
The cheapest ML project is the one you decide not to build.
The design doc is where you find out.

A retail chain with 2,000 stores and 47 distribution centres wants demand forecasting. By their own estimate they lose around $800M a year on the gap between what gets stocked and what sells.

The instinct is to open a notebook. The rule on the team: no code for a month. The design doc comes first.

What goes into it before any model:

- Where it hurts and what that costs — in both directions. Overstock is easy to count. A lost sale is nearly invisible, because it never shows up in the data.
- Anti-goals. For v1: no forecasts for brand-new items, no logistics routing, no pricing, and no chasing accuracy on SKUs that sell less than one unit a week. These are what protect the team when someone asks for "just a little pricing on top".
- A success criterion: 15% fewer perishable write-offs in 50 pilot stores over a quarter, with the service level held at 95% on the top 1,000 SKUs.
- A kill criterion: if a moving average with seasonality lands within 3% of the ML model on WAPE, the project stops.

That last line is the one people resist, and the most valuable one. "Don't build it" is a legitimate outcome of a design doc — and by far the cheapest.

Juniors start with the model. Mid-level engineers start by asking whether the problem exists and whether it is worth solving.

The lesson follows the approach in "Machine Learning System Design" (Manning). The full design doc structure:
https://mlsimulator.com/en/lesson/ml-design-doc-problem-space?utm_source=linkedin&utm_medium=social&utm_campaign=ml_en&utm_content=li_m21

#MachineLearning #MLSystemDesign #ProductManagement
```
