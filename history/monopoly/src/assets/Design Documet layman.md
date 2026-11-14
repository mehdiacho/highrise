# Monopoly Web Game Design Document

## Overview

This document outlines the design and functionality of a Monopoly-inspired web game. The game will support **2D and 3D modes**, customizable rules, digital dice, property management, and negotiation systems. This serves as a reference during development.

---

## Modes & Views

### 2D Mode

* **Top-down board view** displayed on the screen.
* Each player has a piece (token) that moves across the board.
* A dice button is used to roll and determine moves.

### 3D Mode

* Supports multiple perspectives:

  * **Top-down 3D view** (still overhead but rendered in 3D).
  * **Inclined view (\~45° angle)** allowing rotation.
  * **Side view** (flat from the side).
* Smooth **transition from 2D to 3D**:

  * Overlay or fade effect from 2D to 3D.
  * After transition, camera can pivot to other angles.
* **Independent per-user views** (one player can be in 2D, another in 3D).

---

## Rule System

The game will support three levels of rules:

### 1. **Default Rules**

* Based on standard Monopoly rules.
* Example: rolling three 6s in a row → go to jail.

### 2. **Toggleable Rules**

* Players can enable/disable certain rules.
* Example: toggle the “three 6s → jail” rule.

### 3. **Adjustable Rules**

* Modify values in existing rules.
* Example: change “3 sixes → jail” to “2 sixes” or “4 sixes.”

### 4. **Complex Rule Modifications**

* Rules can invoke **functions** (e.g., `movePiece(xSteps)`).
* Example: *If player rolls 3 sixes → move back 5 spaces.*
* Requires functions to:

  * Move pieces forward/backward.
  * Send player to jail.
  * Adjust player balance.

---

## Game Mechanics

### Dice System

* Digital dice with animation.
* Button press rolls dice and triggers movement.

### Piece Movement

* Tokens move along the **center of the board edges**.
* If multiple players land on the same lot:

  * The slot divides into equal parts.
  * Tokens shift slightly (left/right/center) to avoid overlap.
  * For larger groups, either **shrink token sizes** or display **icons above property**.
* Special animations:

  * Movement at corners involves diagonal transitions.
  * Jail sends token directly to jail slot.

### Property Ownership & Rent

* On landing:

  * If **unowned** → option to **buy** or **auction**.
  * If **owned** → system calculates **rent**:

    * Checks property set ownership.
    * Applies houses/hotels multipliers.
    * Displays amount owed.
* **Payment Options**:

  * Pay with **money**.
  * Pay with **property** (sell to bank or transfer directly).
  * **Negotiation** if enabled.

### Negotiation System

* **Local play (hot seat/LAN)**: button to mark custom deals.
* **Online play**:

  * Private chat box for negotiation.
  * Deals can include:

    * Property swaps.
    * Custom prices (above/below board value).
    * Free passes (e.g., “3 free passes on my properties”).
  * Agreement finalized with a confirmation button.

### Special Lots

* **Community Chest & Chance**:

  * Draw card pops up.
  * By default, cards are **public**.
  * Rule toggle: allow **hidden cards** for some.
  * Actions executed automatically (e.g., pay bank, move).
* **Taxes (e.g., Income Tax)**:

  * Auto-enforced.
* **Go to Jail**:

  * Piece is moved automatically.

---

## User Interface (UI)

* **Dice Button** → rolls dice.
* **Popup UI** when landing:

  * Rent owed → choose payment/negotiation.
  * Chance/Community Chest card displayed.
* **Property Management UI**:

  * Displays owned properties and values.
  * Options for selling, mortgaging, trading.
* **Negotiation Window**:

  * Private chat for trades.
  * Confirmation buttons.

---

## Animation & Transitions

* **Token movement**:

  * Moves square-by-square with smooth animation.
  * Diagonal animation when required (e.g., corners).
* **Dice roll**:

  * Animated roll before result.
* **Card draw**:

  * Slide-in animation for Chance/Community Chest.
* **Discard pile animation** for used cards.
* **2D → 3D transition**:

  * Fade/overlay effect.
  * Camera pivots after transition.

---

## Development Roadmap

1. **2D Implementation First**

   * Board + tokens.
   * Dice system.
   * Property ownership & payments.
   * Rule toggles.
2. **Add Negotiation System**

   * Local button system.
   * Online chat + confirmation system.
3. **Animations**

   * Token movement.
   * Dice + card animations.
4. **3D Implementation**

   * Board + tokens rendered in 3D.
   * Camera controls.
   * Smooth 2D → 3D transitions.

---

## Notes

* Rules should be modular, built around reusable **functions**.
* Players should be able to modify rules **without coding**.
* Flexible **property trading system** is key to replicating Monopoly’s “fast dealing” aspect.
* **Networking** should allow private deals between players.
