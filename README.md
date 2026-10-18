# Sanskrit Smith

Sanskrit Smith is a sanskrit charater transformation game. A level defines the available tools and each word's ordered transformation steps. Regular letter and tool combinations are configured in `charactersRules.json`; step-specific animations are configured in `levels.json`.

## Tools

The tool palette is defined in `tools.json`. Each entry provides the tool name, its short effect description, its image asset, and its label.

| Tool | Effect | Processing animation |
| --- | --- | --- |
| Axe | Splits a character using the configured cut ratio. | `axeSplit` |
| Scissors | Masks the lower-right intersection set by horizontal and vertical cut ratios. | `scissorsTrim` |
| Hook | Brings the following target-bar character to the processing character. | `hookJoin`, `hookRepha`, or `hookRakaar` |
| Hammer | Reforges the processing character together with the following target-bar character. | `hammerReforge` |
| Gloves | Dispatches the processing character to its target position. | `gloveDispatch` |

The tool palette for a level is selected by its `toolsOptions` array. Its values must match the `toolName` values in `tools.json` (for example, `"gloves"`).

## Regular transformations: `charactersRules.json`

Use `charactersRules.json` for reusable character-and-tool rules, currently axe and scissors transformations. The game looks up a rule with the step's `base` character and `tool`. A rule can provide the animation name and its parameters:

```json
"स": { "audio": "", "tools": [
    { "tool": "scissors", "toolAnimation": "scissorsTrim",
      "toolParams": { "hiddenRightRatio": 0.1, "hiddenBottomRatio": 0.05 }
    } ] }
```

`hiddenRightRatio` positions the vertical cut relative to the character center, measured as a fraction of its width. `hiddenBottomRatio` positions the horizontal cut relative to the center, measured as a fraction of its height. `scissorsTrim` masks the area to the right of the vertical line and below the horizontal line. Axe rules use `hiddenRightRatio` for the cut position.

## Word steps: `levels.json`

Each word has a `targetSlots` array. The game processes these entries in `step` order. A processing step uses these fields:

| Field | Purpose |
| --- | --- |
| `step` | Order of this operation within the word. |
| `processingPosition` | One-based position in the word's `letters` array. This selects the character shown in the processing area. |
| `base` | Character form used for rule lookup and processing. If it differs from the displayed character, the processing character changes to this form before the tool runs. |
| `tool` | Tool required for the step. |
| `toolAnimation` | Optional explicit animation name. Leave empty to use the matching regular rule where applicable. |
| `toolParams` | Optional step-level parameters that override the rule parameters. |
| `targetPositions` | One-based target-bar positions that participate in the resulting merge. |
| `targetConjunct` | Resulting character or conjunct for this operation. |

`processingLetter` is not used; the processing character comes from `processingPosition` and `letters`, then is changed to `base` when needed.

For a regular axe or scissors step, leave `toolAnimation` empty to resolve the animation from `charactersRules.json`. Set `toolAnimation` on the step when the operation uses a step-specific animation, such as a hook, hammer, or gloves operation. A step-level `toolParams` object overrides the matching rule's parameters.

## Hook transformations

Hook operations have three dedicated animations. Set `tool` to `"hook"` and set `toolAnimation` explicitly in the step; these animations are selected by the step rather than by a `charactersRules.json` rule.

| Animation | Behavior |
| --- | --- |
| `hookJoin` | Moves the following target-bar character onto the processing character, then displays `targetConjunct`. |
| `hookRepha` | Moves the following character into place while moving the processing character upward and fading it. The result is displayed briefly before dispatch. |
| `hookRakaar` | Moves the following character into place while moving the processing character downward and fading it. The result is displayed briefly before dispatch. |

All hook variants use the character immediately after `processingPosition` as the incoming character. Include both characters in `targetPositions` and set `targetConjunct` to the combined result. For example:

```json
{ "step": 0, "processingPosition": "2", "base": "क",
  "tool": "hook", "toolAnimation": "hookRakaar", 
  "targetPositions": ["2", "3"], "targetConjunct": "क्र"
}
```

Use `hookRepha` or `hookJoin` in `toolAnimation` for those corresponding hook behaviors; the rest of the step structure is the same.

## Step-specific transformations

Some transformations are implemented directly as processing animations and do not need a reusable character rule. Configure the tool and animation on the step, along with its source, base form, and result. For example, a hammer reforge step uses `tool: "hammer"` and `toolAnimation: "hammerReforge"`:

```json
{ "step": 0, "processingPosition": "1", "base": "फ",
  "tool": "hammer", "toolAnimation": "hammerReforge",
  "targetPositions": ["1", "2"], "targetConjunct": "फ्त"
}
```

The hammer animation shrinks the processing character to target-bar size, brings in the following target-bar character, shatters the overlapping characters, and reveals `targetConjunct`. Gloves use `tool: "gloves"` with `toolAnimation: "gloveDispatch"`; this animation dispatches the processing character without applying a cut.

## Final word merge

After the word's processing steps, add a final `targetSlots` entry with empty `processingPosition` and `tool`. Set `targetPositions` to all positions in the completed word and `targetConjunct` to the full word. The game uses this entry to animate the final merge and complete the word.

```json
{ "step": 1, "processingPosition": "", "base": "",
  "tool": "", "toolAnimation": "",
  "targetPositions": ["1", "2", "3"], "targetConjunct": "..."
}
```
