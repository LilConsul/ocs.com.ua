---
title: "Understanding Scale Division (d) and Accuracy in Plain Words"
description: "A plain-language guide to industrial weighing terminology: what scale division (d) means, how it differs from error and verification interval (e), and how to select the right resolution."
order: 1
related:
  - "choosing-a-dynamic-checkweigher"
  - "checkweigher-calibration"
---

When selecting industrial scales or an automated dynamic checkweigher, one of the primary technical parameters in datasheets is **scale division** or resolution (denoted by the letter **d**).

## What is Scale Division (d) in Plain Terms?

**Scale division (d)** is the smallest step or increment by which the weight value changes on the display.

Think of an ordinary mechanical ruler:

* If a ruler only has marks every centimetre, you can measure with a 1 cm step.
* If it has millimeter lines, your resolution is 1 mm.

Industrial weighing scales work the exact same way:

* If a scale has **d = 1 g**, the display increments as: `100 g` → `101 g` → `102 g`. It cannot display `100.5 g`.
* If a scale has **d = 0.1 g**, the display increments as: `100.0 g` → `100.1 g` → `100.2 g`.

## Scale Division (d) vs Accuracy: What is the Difference?

A common misconception is assuming that scale division equals scale accuracy. They are fundamentally different:

1. **Scale Division (d)** — The display resolution (the smallest measurable increment).
2. **Measurement Error (Accuracy)** — The actual deviation between the true certified test mass and the reading provided by the scale.

> **Example:** If a scale displays `150.2 g` with `d = 0.1 g`, this only indicates display granularity. The true mass might be `150.4 g` if the system error tolerance is ±0.3 g.

## What is Verification Scale Interval (e)?

In metrological certifications and data sheets, you will frequently see both **d** and **e**:

* **d (actual scale interval)** — The actual display resolution.
* **e (verification scale interval)** — The verified metrological division used by calibration authorities to determine accuracy classes (OIML Class II, III, etc.) and maximum permissible errors.

In most industrial weighing systems, `e = d` or `e = 10 · d`.

## Practical Recommendations by Industry

| Industry / Application | Typical Package Weight | Recommended Scale Division (d) |
| :--- | :--- | :--- |
| **Pharmaceuticals (blisters, vials)** | up to 100 g | `0.01 g – 0.05 g` |
| **Confectionery, coffee, dry goods** | 100 g – 1 kg | `0.1 g – 0.2 g` |
| **Food packaging, fresh meat trays** | 1 kg – 5 kg | `0.5 g – 1 g` |
| **Logistics cartons, bulk bags** | 10 kg – 60 kg | `5 g – 10 g` |

## Why Not Choose the Smallest Possible 'd'?

While choosing ultra-high resolution might sound ideal, setting resolution unnecessarily high on a dynamic production line introduces drawbacks:

* **Sensitivity to environmental vibration:** High-resolution load cells register ambient conveyor vibration, motor hum, and air drafts.
* **Stabilization time:** Processing ultra-fine signals takes more filter settling time, reducing maximum throughput (packs per minute).

**Rule of Thumb:** Your scale division (d) should typically be 3 to 5 times smaller than your permitted product packaging tolerance.
