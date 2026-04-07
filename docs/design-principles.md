# Design Principles

This document records the reasoning behind major implementation choices. It exists so the project does not have to keep re-litigating the same architectural and design decisions from scratch.

## 1. Gameplay Should Reward Systems Thinking

The game is not trying to be a pure tactics skirmish where each unit is evaluated in isolation.

The intended strategic loop values:

- recon before commitment
- logistics before reach
- basing before sustained air power
- escorts before naval ambition
- engineers before terrain-heavy breakthroughs

That is why many units are intentionally incomplete on their own. The design should keep rewarding coordinated force structure.

## 2. Rules Need A Single Operational Home

Gameplay rules should resolve in the engine, not emerge from a loose collection of UI assumptions.

Why:

- duplicated legality logic drifts
- bug fixes become partial
- AI and player actions stop following the same rules
- documentation becomes impossible to trust

When behavior feels complicated, that is usually an argument for clearer engine helpers, not for pushing logic into panels or map tiles.

## 3. Information Is Part Of Balance

Fog of war, stealth, radar, escorts, and concealment are not add-ons. They are part of the balance model.

The game becomes flatter if:

- all threats are always visible
- recon is optional
- stealth has no dedicated counterplay
- radar and detection are treated as mere flavor

Changes that reduce informational asymmetry should be made carefully because they also reduce the value of planning.

## 4. Logistics Is Real Gameplay

The project treats supply-like concerns through basing, transport rules, escorts, improvements, and legal recovery spaces.

That choice exists because it produces better strategic texture:

- invasions require preparation
- air power requires infrastructure
- engineers matter beyond flavor
- terrain can create meaningful campaign problems

If a proposed change makes logistics irrelevant, it should be treated as a major design shift, not a small convenience tweak.

## 5. AI Should Be Understandable, Not Magical

The AI is intentionally split into layers so contributors can reason about failures.

The desired property is not "perfect play." The desired property is:

- predictable structure
- debuggable decisions
- room to improve one layer without rewriting everything

Opaque AI that occasionally produces strong moves but cannot be debugged is not a durable foundation.

## 6. Documentation Is Part Of The Product

Docs are not just onboarding material. In this repo they also serve as:

- memory for why rules were added
- guardrails against regressions in intent
- orientation for future contributors or agents
- a way to keep implementation, design, and explanation aligned

If the project keeps repeating the same explanation in code review or chat, that explanation should usually be promoted into markdown.

## 7. Player Clarity Beats Hidden Cleverness

Complex systems are acceptable. Confusing feedback is not.

Whenever possible:

- players should be able to infer why a move is illegal
- the cost of overextension should be understandable
- counters should be discoverable through rules, tooltips, or manuals
- "surprise" should come from enemy strategy, not from arbitrary system opacity

This principle matters for both UI and mechanics. A deep game still needs legible consequences.

## Maintenance Rule

When you add a major mechanic or architectural constraint, also add the sentence that explains why it should continue to exist. That is the part future contributors are least likely to recover from code alone.
