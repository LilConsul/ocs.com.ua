---
title: "The Load Cell (Weight Sensor) in Simple Words"
description: "What a load cell is, how it turns weight into a number, which types exist, and how to look after it."
order: 3
related:
  - "what-is-scale-division"
  - "weighing-accuracy"
---

Inside every electronic scale there is a small metal part that actually "feels" the weight. It is called a **load cell**, or simply a **weight sensor**. Without it, a scale is just a plate with a screen.

## The short version

**A load cell turns pressure from weight into a tiny electrical signal.** The scale's electronics then turn that signal into the number you see on the display.

## How does it work?

Think of a metal ruler that you press on the edge of a table. The harder you press, the more it bends. It bends only a tiny bit, but it does bend.

A load cell works in a similar way:

1. You put a product on the scale. The weight pushes on the load cell.
2. The metal body of the cell bends **a tiny, invisible amount**.
3. Small sensors glued to the metal (called **strain gauges**) stretch or squeeze with it.
4. When they stretch or squeeze, their electrical resistance changes slightly.
5. The electronics measure this change, calculate the weight, and show it on the screen.

Heavier product means more bending, a bigger signal, and a bigger number.

## The main types

| Type | How to picture it | Where it is used |
| :--- | :--- | :--- |
| **Strain gauge** | A metal block with tiny sensors glued on. The most common type. | Almost everywhere: floor scales, platform scales, conveyors, checkweighers |
| **Electromagnetic force restoration (EMFR)** | A coil and magnet hold the weighing pan in place. The more current needed to hold it, the heavier the product. | Very fine and fast weighing, e.g. small packs on high-speed lines |

For most factories, a strain gauge load cell is the standard choice.

## What the numbers on a load cell mean

When you read the specs, you will mostly meet these:

* **Capacity.** The maximum weight it is designed to measure. Pick a load cell so your normal load is well below this value.
* **Overload limit.** How much beyond capacity it survives without damage. Going past it can bend the metal permanently.
* **Accuracy class.** How exact the cell is. Better class means smaller error.
* **Protection rating (IP).** How well it resists dust and water. Washdown areas need a high rating, such as IP67 or IP69K.

## What can damage a load cell?

Load cells are tough, but not unbreakable:

* **Overloading or shock.** Dropping a heavy box onto the scale is the number one killer.
* **Water and moisture** getting into a cell that is not sealed well.
* **Extreme heat or cold**, and sudden temperature changes.
* **Electrical problems.** Lightning, welding currents or wrong wiring.
* **Side forces.** Pushing or pulling sideways when the cell is made only for pushing down.

## Simple care tips

1. Never exceed the maximum load, and avoid dropping things on the scale.
2. Keep the area around the weighing platform clean, so nothing jams against it.
3. Use the correct cleaning method for your protection rating. Do not blast water at a cell that is not made for it.
4. If readings start to drift, jump or never return to zero, have the load cell and its cable checked.
5. Check the scale with a known test weight regularly. See [weighing accuracy](/en/wiki/weighing-accuracy) for more.

## How does this connect to d?

The load cell and the electronics together decide how finely and how exactly the scale can weigh. A good load cell allows a smaller, useful [resolution (d)](/en/wiki/what-is-scale-division). A poor one will give noisy numbers, no matter how many digits the display has.
