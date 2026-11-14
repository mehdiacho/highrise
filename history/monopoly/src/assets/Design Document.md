
---

# 🎲 Monopoly Web Game Design Document

## Overview

A web-based Monopoly game with **2D and 3D modes**, flexible rules, and negotiation systems.

* **2D Mode**: Simple top-down view, board and pieces represented by images.
* **3D Mode**: Full 3D model with rotatable camera (top-down, inclined 45°, and side views).
* **Rules Engine**: Default Monopoly rules with options to toggle, alter, or extend.
* **Custom Boards**: JSON imports/exports define board structure and properties.

---

## Game Views

### 2D Mode

* **Top-down view.**
* Pieces represented by PNGs or SVG icons.
* Dice as animated image(s).
* Movement: pieces move along board edges, centered in slots.

### 3D Mode

* **Top-down (3D projection).**
* **Inclined (≈45° camera angle).**
* **Side view** (flat perspective).
* 3D models for board, pieces, and dice.
* Supports smooth **transition from 2D → 3D**:

  1. Overlay 3D board on 2D.
  2. Fade/swap board representation.
  3. Pivot camera after transition.
* **Per-user view setting**: players can independently choose 2D or 3D.

---

## Core Systems

### Dice

* Digital dice roller (button click → animated roll).
* Returns number 2–12 (2 dice).
* Rule-modifiable (e.g., special effects on doubles).

### Movement

* Piece carries a **position index** (0–39 on classic board).
* Dice result → advance index.
* Movement animation:

  * Straight across slot centers.
  * At corners: diagonal movement into correct lane.
* **Multiple players on same slot**:

  * 2 players: slot split into halves.
  * 3 players: slot split into thirds.
  * 4+ players: shrink piece icons or switch to "player markers" above the property.

### Property Interaction

* **Unowned Property**: option to buy or auction.
* **Owned Property**:

  * System calculates rent (ownership set, houses, hotels).
  * Pop-up: pay money, pay with property, or negotiate.
* **Flexible rules** allow selling directly to players, banks, or custom auctions.

### Negotiation

* **Default**: pay with money or property (at value).
* **Flexible**:

  * Negotiate directly with property owner.
  * Agree on over/under-market deals.
  * Swap services (e.g., “3 free passes on my properties”).
* **LAN/Hotseat**: manual resolution button.
* **Online**: private chatbox for negotiations.

### Chance & Community Chest

* Pop-up card display.
* **Default**: card is public.
* **Optional rule**: allow private cards (e.g., hidden payments to bank).

### Taxes

* **Income Tax** and **Luxury Tax** trigger automatic deductions.
* Always mandatory (unless custom rules say otherwise).

### Jail System

* Player sent to Jail slot.
* Default: pay fine, use card, or roll doubles.
* **Custom rule options**:

  * Modify "3 doubles in a row → jail" (toggle or set 2, 3, 4 rolls).
  * Replace jail condition with alternate penalty (e.g., "move back 5 spaces").

---

## Rule Engine

### Levels of Rule Customization

1. **Toggle**: enable/disable default rules.

   * Example: Disable "3 doubles → jail."
2. **Alter**: set custom thresholds.

   * Example: "2 doubles → jail" or "4 doubles → jail."
3. **Extend**: define new actions using available **functions**.

   * Example: "If player rolls three 6s in a row → move back 5 spaces."

### Rule Functions (examples)

* `move_piece(x)` → moves piece forward `x` slots.
* `move_back(x)` → moves piece back `x` slots.
* `send_to_jail()` → sends piece to Jail slot.
* `pay(amount, to)` → handles transactions.
* `draw_card(type)` → draws Chance or Community Chest.

Rules are stored in JSON, referencing these functions and parameters.

---

## Transactions

### Money

* Default unit: Monopoly cash.
* Player balances tracked in system.

### Property

* Can be **mortgaged**, **sold to bank**, or **transferred to players**.
* **Flexible trade values** allowed under negotiation.

### Mixed Payments

* System allows combining cash + property.
* If insufficient funds, force negotiation or bankruptcy.

---

## Animations

### Movement

* Pieces slide along board path.
* Diagonal animation for entering corners.

### Dice

* Animated roll with 2D dice images (2D mode) or 3D dice (3D mode).

### Card Draw

* Chance/Community Chest flips up.
* Optionally animate discard pile.

### Jail

* Animated move to Jail slot.

---

## Multiplayer

### Hotseat

* Players share a device, click buttons in turns.
* Negotiations resolved with a confirmation button.

### LAN / Online

* Real-time moves synced across devices.
* Negotiations done via private chatbox.
* Support for both **public info** (e.g., rent owed) and **private deals**.

---

## Customization

### Board Layout

* Default 40-lot Monopoly board.
* Expandable system allows 30, 50, 60+ lot boards.
* JSON import/export defines:

  * Property groups
  * Utilities
  * Transport
  * Chance/Community Chest
  * Taxes
  * Corners

### Rules

* Default set + toggle/alter options.
* JSON rulesets for custom games.

---

## Technical Notes

* **2D Board**: grid-based with image assets.
* **3D Board**: Three.js or Babylon.js for rendering.
* **Networking**: WebSockets for multiplayer sync.
* **State Management**: central game state → synced across clients.
* **Extensibility**: JSON-driven rules & board layouts.

---

## Next Steps

1. Prototype **2D version** (board, dice, movement, property interaction).
2. Build **rules engine** (toggle + alter level).
3. Implement **basic negotiation system** (money/property).
4. Extend to **flexible negotiations** (private deals).
5. Add **3D rendering** & 2D↔3D transitions.
6. Add **multiplayer networking**.

---
## Raw Idea
### Part 1
i want to make a web game of monopoly.  a board usually has 40 lots. starting from Go and moving clockwise, list all the lot names, you can go with the south africa version

### Part 2
ok, lets take any version of which you are 100% sure of the lots, list them in order, makes sure it's one with utilities and airports . write it out in json format, so in the first list just list them out by number with GO being number 0 moving clockwise. in the second list group them by type then sub type eg properties, utilities, transport, {you can group community chest, chance, and tax fields t0gether}, or however best you see fit. then under properties youd have coulours and in orange for example, you list them by number according to their appearance going clockwise starting from go. both lists should be json format and will form the basis of importing and exporting to allow for the creation of custom boards
eg

{
    1 : "Go",
    2 : "Mediterranean Avenue",
    3 : "Community Chest",
    ....
}

and 

{
    "properties": {
      "brown": {
       1 : "Mediterranean Avenue",
       2 : "Baltic Avenue"
       }
      "light_blue": {...}
      "green": {...},
      },
    "utilities": {
     1 : "Electricty",
     2 : "Water"
     },
    "transport": {
     1 : "Airport A",
     2 : "..."
     },
    "chance_community_tax": {
      1 : "Chance",
      2 : "chance",
      3 : "community Chest",
      4 : "..."{since each normal board has 3 chance and 3 community chest that interchange starting with community chest, this section will just list them as such, so the idea is the game already knows where to lot for this category and will do so in order listed such that a custom board can have all chances appear first for example}
      "taxes": {
        1 : "income_tax",
        2 : "luxury_tax"
      }
    },
    "corners": {
      1 : "go",
      2 : "jail",
      3 : "free_parking",
      4 : "go_to_jail"
    }
  }


The idea here is, instead of the JSON showing the lot name and then its position, the game system is already going to be able to understand that a board has these types of different lots and categories and so forth. And so when you import a JSON file, it knows, okay, if I'm reading properties, inside properties I expect to find colors. And so when I get to brown, for example, I know that the first brown slot is on position one of the board, with position zero being where go usually is. And the second brown slot is beyond position three of the slot of the board, or array number three, if you will, fourth position, third array position. And so when you say one, maybe you make one Kimberley and maybe you make two Table Mountain, for example, the board understands that you're saying the first brown slot should be Kimberley, but it also knows the first brown slot is in the second position of the board or the first array position. Likewise, it knows that you're saying the second brown position should be Table Mountain, but it also knows that it's the second brown position, but that's the fourth board position or the third array position for the board. So the JSON doesn't need to specify the position on the board of the lot. It just needs to say in what order these lots need to appear per category. When you move on to blue, it knows where the blue are and their positions, and it just needs to know, okay, moving clockwise from golf, what should be the first blue that appears? What should be the second? What should be the third? Same for pink, et cetera, et cetera. It also knows all the positions where, for example, the transport stuff up here. It knows all the positions where the utilities should appear. It knows the community chest and the chance, and then it has corners as well. So if you want to have a custom game whereby maybe you have Go To Jail and In Jail being in the same line instead of Jail being in the same line with Free Parking and Free Parking being in the same other line with Go To Jail, you can do so by adjusting the order in which the corners appear. Or maybe you want to start the game off at the corner which is followed by the first pink slot. You can put your Go in the second corner slot instead of in the first where it usually is. Additionally, now...
At a later point in time, I also intend to make the board number expandable, i.e. instead of having 40 lots like you usually do, maybe someone wants to make a smaller board whereby you have maybe 30 lots. Or alternatively, maybe someone wants to make a larger board in which you have 50 or 60 lots. In that case, it would still follow essentially a similar principle whereby when one wants to edit that in the game, the game will be able to know, okay, this is where the position of so-and-so-and-so is and I just need to apply them accordingly. Now, we can have a third list. We can have a third list whereby we add the positions just for the sake of, let's say, the sake of covering all our bases, although I don't intend to use that system. We can have a third list which includes the generally expected positions of these different things. So, as such, in the example below,
    "corners": {
      "go": [0],
      "jail": [10],
      "free_parking": [20],
      "go_to_jail": [30]
    }

### Part 3
Okay, now I'm looking at the board and I'm just thinking of how it's going to work. Ideally, it can have a 2D and a 3D mode where the 2D mode is pretty much a top-down view which is on your screen and then the 3D mode can still be top-down view and then it can be an inclined view so you're looking at from an angle whereby you can rotate looking from maybe about a 45 degree angle so and then you can also have a side view where you're pretty much looking at it flat from the side. The 2D, we'll start with the 2D version. Rather simple, you have pieces, each person has a piece and there'll be a dice. They roll, click a button to roll, your dice keeps going, you roll, you move however slots and you can interact, right? So, depending on the rules you set, which will be another thing, we'll need a system to define or alter rules. So, there's going to be a set of rules based off of the original rules and then maybe there'll be ability to turn off or turn on certain rules and then another ability to alter certain rules. So, for example, usually there's a rule whereby if you roll sixes three times in a row and you're out of jail, so you're not in jail, you roll three times in a row, you immediately go to jail. There'll be a button to turn on or off this rule. So, if the rule is off and someone rolls sixes three times in a row, nothing happens. Additionally, there should be an option to alter it. Altering, for example, could be instead you might set it to if someone rolls sixes two times in a row, they go straight to jail instead of three times. Or instead you may say if they roll sixes four times in a row, right, they go to jail. That's an easier way of modifying the game without making it too complex. A further but more complex way will be defining certain things like moving x steps, right. So, in a sense the rule system will work based off of available functions and data. So, in a more complex rule system there'll be a function that moves a piece x steps, right. And obviously it's going to move the piece, it's going to animate the piece moving. The piece will always carry its position on the board so that when the function tries to move the piece, it knows where the piece needs to end up. And so, in a rule and more complex rule modification, maybe you'll say if you roll sixes three times in a row, you move back five spaces, right. And so, that rule will have to know what it means to move back five spaces, i.e. it will have to understand. There'll have to be a function it can call to enforce that. And so, this is why I say it's a bit more complex because the more creative freedom you try to instill in the game, in how it's played, the more different structures and functions you have to create to allow the people to essentially add and modify these rules as they please without they themselves having to code them in.
That aside, there will obviously be, as I mentioned, a digital dice. You press a button, the dice rolls, you land on whatever lot. So if you land on a property, and this property is owned, it shows you the for example, the tax that you are required to pay. So, the rent you are required to pay usually depends on a combination of is the property, is the entire property set owned by one person? Is the property set, does the property set have houses on it? Does the property have hotels on it? So the system would be able to essentially do all this computation by itself without someone having to individually do it. And then it will just pop up and show you owe X much. Now, since Monopoly is a game of fast dealing property, as it says, usually when people play, you can pay with money or you can pay with property. Or, if you have more flexible rules, you can decide to instead negotiate with the property owner. So, assuming default rules, it will give you an option to pay with property or pay with money. Usually the property has a certain value, which means if you want to pay someone, you can. You have to sum up their property value and top up with money or vice versa. Right? And usually you only pay with property if you run out of money. And so that's how that would work. It will show you how much money you have and the value of your different properties. And you can select which ones you want to sell off, essentially. Now, if I'm not mistaken, in the original rules, you sell the property to the bank and you get the money and you pay. I may be mistaken. But it should be also possible to sell it to essentially not sell the property to the person you're owing rent money to, but essentially give it to them in place of that money. Now, with more flexible rules, you don't have to necessarily sell according to the property's value. Right? For example, if I hold one dark blue property and another person, person B, holds the other, dark blue is usually the most sought after property. And when you have this set, that's when you can really start to make money. And so, I should be able to sell my dark blue for more than the written price. In a situation where you have more flexible rules, this price, obviously, I will negotiate with the person who I need to owe to. This is person B. So this is assuming I land on person B's property.
In that case, I should be able to negotiate them and say, okay, I have one property, but you have the other. I know you want it, so normally it goes for 400. I'm willing to let it go for maybe, I say, 10,000, right? Because the alternative is, I could instead sell it to someone else who might also want to at least have one of them. And maybe that person is willing to offer me more, right? Or I could just auction it off altogether. Again, this is all assuming more flexible rules. Now, this is, again, as I mentioned with flexibility, there should also be an option where I negotiate with the owner of the property. And maybe he lets me escort free, and I say something along the lines of, okay, I'll give you three free passes on any of my properties you ever land on, regardless of whatever development has happened there. And maybe they say fair enough, and they let me go without having to pay. Now, if you're playing, um, if you're playing LAN, if you're playing a hot seat, rather, maybe it'll be some kind of, well, uh, button, which you just click to say, player X and player Y came to a resolution, and it was sorted. So this is in the situation where you don't just do the default pay. If you go to the negotiation route, if you're playing online, whether it's local or if it's just wide over the net, then there'll be a little chat box where you can negotiate with the player. The key benefit of this will be you can have a private negotiation, so no one really needs to know what kind of agreement you two have come up with, which makes the game more interesting. So that's another key thing to note. Now, moving back to the other systems. So, as I mentioned, you land on someone's property. It shows you an interface on OUX match. Do you want to pay? Do you want to negotiate? If you land on a community chest, it just pops, shows the community chest on the screen. Now, usually, community chests, if it's either community chests or it's chances or it's both, but usually they are, in a sense, open to the public, which means everyone should be able to see what you got. It's not, you aren't really allowed to hide it. Again, maybe there's a rule you can alter to say you can hide whatever you see, provided it's something which maybe you can keep, for example. If maybe it's something which says pay the bank X amount, you can pay the bank and then the card disappears, and maybe that whole transaction can be kept private, assuming you alter the rules. Otherwise, it's all public. Right, so maybe you land on a property and it's unowned. Now, usually, the standard rule said you either buy it or you auction it, right? And so when you're auctioning it, you're profiting essentially the difference, which means if the property cost 500 and the auction, the highest bidder is 850, 850, the 500 for the property's initial cost goes to the bank and then you pocket the 350. But from my experience, for example, when I'm playing with my own rules, I can, well, it's more or less the same thing, except I would initially buy it first. You get it? I would initially buy it and then I'll start doing other kinds of dealings with it. But that one is fairly simple. Ultimately, the bank has to get paid the property value, and then anything you do after that is up to you. Stuff like income tax, it pops up, you have to pay, you don't really have a choice. Transport, et cetera, et cetera. Chance. And so your pieces will be moving along as you roll. If you land or go to jail, for example, your piece gets sent back to jail. So the animations on how the pieces move should ideally be fairly simple with exceptions. So exceptions in this case are each piece should ideally move on the center of whatever line they're on, right? Whatever side of the board they're on, they should move straight in the center. Now if, let's say, one piece is on slot 10, or no, one piece is on slot 13 and another is on slot 15, and the player rolls a 2 or something, and they have to go to slot 15. Slot 15 is then going to be partitioned into two slots, into two parts. The piece that's already there is going to move to the center of one side, and the other one moves to the center of the other side. And so that's how you'd handle in that kind of situation, right? As for the animation, since the computer already knows the destination beforehand, when it reaches the slot before slot 15, which is slot 14, instead of moving straight in the direction of the travel, I guess, it's going to move diagonally at somewhat of an angle, maybe 45 degrees or so. And so this animation of moving at an angle will also be already coded, such that the computer knows when it gets to this position. Instead of continuing with the same animation of a straight line, it needs to move diagonal. Now, say there's two pieces, a third one, you can still split it up into three. But at some point, rather than continuously splitting, maybe the piece sizes will be shrunk. Or instead, the pieces won't be shown as pieces as they usually are, and there'll be just an icon for each player on that property, maybe at the top of the property, showing that this is where the player is positioned. So there. And then that aside, the only other animation, I think, is for rolling the dice and drawing a chance or a community chest. And then, I guess, putting the card in the discard pile. So those are all the things that need to be done.As for the 3D model, ideally the movements and everything should work the same. I think in a 2D version it's going to be much easier because, I mean, it's 2D. Ultimately you're just going to be moving an object that contains an image, right, a PNG or something. In the 3D version you're going to have an actual 3D object. I'm yet to figure out how I'm going to do that but for now we'll just deal only with the 2D. And then another thing I remembered also that needs to be done is the transition. So you want a smooth transition from 2D to 3D, which means ideally the 2D and 3D need to line up in such a way that the 3D can either be overlaid or maybe the 2D phases out into the 3D map. And then when that transition essentially from the 2D to 3D is complete, mind you maintaining still that same top-down view, then the camera angle can be pivoted. So first it's going to transition the board from a 2D to 3D one, which is going to include like the pieces and everything, right, and then it'll be shifted downwards to a 3D view. And obviously this needs to be a per-user thing, which means some users should be able to view in 3D while others are viewing in 2D. And it shouldn't, it shouldn't, the the two different views should be mutually exclusive, not mutually exclusive, they should be independent. So it shouldn't matter who's looking in what view to the other person.
