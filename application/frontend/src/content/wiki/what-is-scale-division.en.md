---
file_name: what-is-scale-division
title: "Scale Resolution (d): What It Is, in Simple Words"
description: "What the number 'd' in a scale's specs means, why it is not the same as accuracy, and how to pick the right one for your product."
order: 1
related:
  - "weighing-accuracy"
  - "load-cell"
---

In every scale's specification you will find a small letter **d**. It is usually called **resolution** or **scale division**. It sounds technical, but the idea is very simple.

## The short version

**d is the smallest step the display can show.**

That's it. It is how finely the scale "rounds" the number on the screen.

## Think of a ruler

Imagine two rulers:

* Ruler A has marks only every **1 cm**. You can only say "12 cm" or "13 cm". Anything in between, you have to guess.
* Ruler B has marks every **1 mm**. Now you can say "12.3 cm".

Scales work the same way:

| Scale | What the display can show |
| :--- | :--- |
| **d = 1 g** | 100 g → 101 g → 102 g (never 100.5 g) |
| **d = 0.1 g** | 100.0 g → 100.1 g → 100.2 g |
| **d = 0.01 g** | 100.00 g → 100.01 g → 100.02 g |

A smaller d means the scale shows finer detail.

## Important: d is NOT accuracy

This is the most common mistake. A scale can show many digits and still be wrong.

> **Example:** A clock that shows seconds is not necessarily more *correct* than a clock that shows only minutes. It just shows more detail. If it is set 5 minutes wrong, the seconds don't help.

The same with scales:

* **d** tells you how finely the number is **displayed**.
* **Accuracy** tells you how close that number is to the **real weight**.

A scale with d = 0.1 g may show `150.2 g` while the product really weighs `150.4 g`. The display is detailed, but not exact. You can read more about this in the article about [weighing accuracy](/en/wiki/weighing-accuracy).

## You may also see "e"

On certified scales you will often see two letters, **d** and **e**:

* **d** is the step of the display.
* **e** is the step used by the inspectors when they officially check the scale and decide how much error is allowed.

Usually **e = d**, or sometimes **e = 10 × d**. If you are not doing official trade weighing, you can mostly just look at d.

## Which d do I need?

A simple rule: **d should be about 3 to 5 times smaller than the weight tolerance you allow for your product.**

Example: your bag should weigh 500 g, and you accept ±5 g. Then d of **1 g** is a good choice (5 times smaller than the tolerance). A d of 0.01 g would be pointless.

Typical values:

| What you weigh | Typical weight | Good d |
| :--- | :--- | :--- |
| Pills, vials | up to 100 g | 0.01 – 0.05 g |
| Coffee, sweets, dry goods | 100 g – 1 kg | 0.1 – 0.2 g |
| Meat trays, food packs | 1 – 5 kg | 0.5 – 1 g |
| Boxes, big bags | 10 – 60 kg | 5 – 10 g |

## Why not just take the smallest d possible?

It sounds like "smaller is always better", but on a moving production line it is not:

* **Too sensitive.** The scale starts to react to belt vibration, motors and even drafts. The numbers jump around.
* **Slower.** To get a very fine number, the scale needs more time to "calm down", so fewer products per minute can pass.

Pick a d that is fine enough for your tolerance, and no finer.
