# Sanskrit Smith

## Letter Transformation Configuration

Letter transformations are configured in three parts: regular rules, intermediate processing states, and special transformations that do not have a regular letter rule.

### Regular Transformation Rules: `charactersRules.json`

Configure the available tools, animations, and animation parameters for each letter. The game looks up a rule using the current processing letter and the `tool` set in the step.

```json
"स": {
  "audio": "",
  "tools": [ { "tool": "scissors", "toolAnimation": "scissorsTrim",
      "toolParams": { "hiddenRightRatio": 0.1, "hiddenBottomRatio": 0.05 } } ]
}
```

### Intermediate Processing States: steps in `levels.json`

Each word defines its processing steps in `targetSlots`. `processingPosition` identifies the source letter position and determines which character appears in the processing area. `base` specifies the character form used for the operation; when it differs from the displayed character, the game changes the processing character to `base` before running the tool. Set `toolAnimation` to choose an animation for the step. If it is empty, the game uses the animation matching `base` and `tool` in `charactersRules.json`.

For example, a step can read the character from position 1, change it to its base form, and use a hook animation:

```json
{ "step": 0, "processingPosition": "1", "base": "ट्", "tool": "hook",
  "toolAnimation": "hookJoin", "targetPositions": ["1", "2"], "targetConjunct": "ट्ठ" }
```

### Special transformations without a regular rule

Some transformations do not have a regular letter rule in `charactersRules.json`. Configure these directly in a `levels.json` step by setting `tool` to `"hammer"`. The game recognizes this as a step-level special transformation, so no matching character rule is required. Provide `targetPositions` and `targetConjunct` for the result.

```json
{ "step": 0, "processingPosition": "1", "base": "क्ष", "tool": "hammer",
  "toolAnimation": "", "targetPositions": ["1", "2"], "targetConjunct": "क्ष" }
```

Set `toolAnimation` and `toolParams` in a step to override the animation and parameters from the regular letter rule. If both `targetPositions` and `targetConjunct` are empty, the game advances to the next step when the processing animation finishes without animating a merge into the target letter.
