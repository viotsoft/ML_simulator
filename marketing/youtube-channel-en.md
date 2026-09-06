# The English YouTube channel: setup and trailer script

A **separate channel** from the Russian one. Content is the 23 scripts in
[shorts-ml-track-en.md](shorts-ml-track-en.md) plus long-form walkthroughs.

---

## Why a second channel and not a second language on the first

This is the decision people get wrong, and it is expensive to undo.

YouTube builds recommendations from who watches to the end. A channel that
publishes in two languages hands the algorithm an audience that contradicts
itself: half the viewers drop the moment a video opens in a language they do not
speak, and the system reads that as "this channel's videos are not worth
showing". Both languages then lose.

One channel, one language. The two channels can cross-link in their
descriptions, and that is the correct amount of connection between them.

**Handles.** `@mlsimulator` is free and belongs on the Russian channel, since
that is where the first videos go. For the English one `@mlcareersim` and
`@mlsimulatoren` are both free — I would take `@mlcareersim`: it reads as a
name rather than as a language suffix bolted onto a brand.

Both should be claimed today, before either channel is built. Handles are
cheap to hold and impossible to recover once taken.

---

## The strategic difference from the Russian channel

The Russian channel builds audience. **The English channel is where the product
is priced.** The subscription is twenty dollars a month, and that price sits
naturally against English-speaking salaries in a way it does not everywhere
else — this is set out in [growth-plan.md](growth-plan.md).

Practically that changes two things:

- **The call to action can be more direct.** On the English channel it is
  reasonable to say "the first two modules are free, and the rest is twenty
  dollars a month" out loud. It converts, and it filters.
- **Long-form matters more than shorts.** Buying decisions are made on trust,
  and trust is built in ten minutes, not in fifty seconds. Shorts bring reach;
  the long walkthroughs bring subscriptions and payments.

---

## Channel setup

**Name:** ML Career Simulator. Identical to the Russian channel and to the
domain — the brand should not fork by language.

**Description** (the first 150 characters are what search shows):

> Real problems from an ML engineer's job, walked through end to end: metrics
> and the cost of an error, data leakage, class imbalance, demand forecasting,
> shipping models to production and interview preparation.
>
> Every walkthrough is a piece of a career simulator: you are "hired" as a
> junior engineer at a company called Datacore, a team lead hands you the
> problems, and you defend your final project in front of the CTO. Three tracks:
> classic ML, agentic systems, and preparation for an architect certification.
>
> First modules free → mlsimulator.com/en.html

**Banner:** one line, readable on a phone — "Real ML problems, walked through".

**Links:** one, tagged so registrations attribute correctly:

```
https://mlsimulator.com/en.html?utm_source=youtube&utm_medium=channel&utm_campaign=ml_en
```

**Sections, top to bottom:** trailer, Shorts, then playlists by problem rather
than by module number — "Metrics and the cost of error", "Data, leakage and
validation", "Production: MLOps and monitoring", "Interviews and career".

---

## Publishing

| | What | How often |
| --- | --- | --- |
| Mon, Wed, Fri | short | 3 a week |
| Thu | long walkthrough | 1 a week |

Twenty-three shorts is eight weeks of publishing. Shoot them in batches of five
or six — the lighting, the audio and your own momentum are already set up, and
restarting costs more than the filming itself.

**Link placement.** Descriptions on shorts are rarely read. Put the link in a
**pinned comment** as well:

```
https://mlsimulator.com/en/lesson/<slug>?utm_source=youtube&utm_medium=shorts&utm_campaign=ml_en&utm_content=<video id>
```

And write that same video id into `seo.short` for the module in
`content/en/modules.json` — otherwise views and signups never join up in the
admin panel.

---

## Trailer script

The trailer plays for **non-subscribers** on the channel homepage. Its job is
not to sell the product but to explain, in a minute, what is here and why it is
worth staying.

Roughly 75 seconds. You on camera plus screen cutaways.

### Beat 1 · Hook — 0:00–0:06

**You, close:**

> "A model with ninety-nine per cent accuracy that caught zero fraudsters. If
> you can't explain how that happens, an interviewer will find out in the first
> minute."

### Beat 2 · Who is talking — 0:06–0:18

**You, on camera.**

> ⚠️ **You write this block.** Two or three sentences: your role, how long
> you've worked in ML, what you have actually built and shipped. I am
> deliberately not inventing it — a fabricated track record in a channel
> trailer is the worst possible way to start, and the comments will find it.

For length, aim at: "I'm [name]. I've spent [N] years building ML systems in
[domain] — [concrete: fraud detection, recommendations, demand forecasting]."

### Beat 3 · What the channel gives — 0:18–0:42

**You on camera, cutaways from the walkthroughs:**

> "This channel is not going to teach you what gradient descent is. It takes
> problems in the shape they actually arrive in.
>
> Revenue is growing and profit isn't — why.
>
> A model scored zero point nine seven offline and zero point six one in
> production — what happened.
>
> Ninety-three per cent of an anti-fraud system's alerts are false — and why
> that system is correctly configured.
>
> Every walkthrough ends with a decision you could defend to your manager, not
> with a definition."

### Beat 4 · Where the material comes from — 0:42–1:00

**Cutaway: the simulator — the module list, then a task card from the team lead.**

> "The walkthroughs come out of a simulator I built. It hires you as a junior ML
> engineer at a company called Datacore: a team lead gives you the problems, the
> data arrives broken, and at the end you defend a project in front of the CTO.
> Twenty-three modules of classic ML, then agentic systems, then the architect
> level."

### Beat 5 · Call — 1:00–1:15

**You, on camera.**

> "If you already write code and you're thinking about moving into ML —
> subscribe. Walkthroughs go out three times a week, and the next one is exactly
> why ninety-nine per cent accuracy means nothing.
>
> If you'd rather try it yourself, the first two modules are free. Link in the
> description."

### Notes

- **Ask for the subscription once, at the end.** Asking in the first five
  seconds, before you have given anything, lowers conversion.
- **Be specific instead of promising.** "The next one is why 99% accuracy means
  nothing" beats "lots of useful content coming".
- **Three examples in beat 3 is the ceiling.** A fourth stops registering.
- Re-record the trailer quarterly; it drifts away from what the channel has
  actually become faster than you expect.

---

## First 30 days

| Week | What you do |
| --- | --- |
| 0 | Claim the handles, set up the channel, film and upload the trailer |
| 1 | Batch-film 6 shorts (№ 6, 9, 11, 21, 3, 16 — the strongest hooks), publish 3 |
| 2 | Publish the other 3, film the first long walkthrough on module 6 |
| 3 | Long walkthrough + 3 shorts; pin the comments with links |
| 4 | Batch two; review the first numbers — what gets watched, where signups come from |

After a month there is enough data to tell which delivery holds attention, and
the remaining seventeen get filmed against a proven template rather than blind.
