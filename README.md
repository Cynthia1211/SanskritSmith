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

Each word defines its processing steps in `targetSlots`. `processingPosition` identifies the source letter position, and `processingLetter` specifies the letter shown in the processing area for that step. When `processingLetter` is empty, the game reads the letter from the word's `letters` array using `processingPosition`; when set, the specified intermediate letter is used. Set `toolAnimation` to choose an animation for the step. If it is empty, the game uses the animation matching the letter and tool in `charactersRules.json`.

For example, after the gem transforms `ट` into `ट्`, the next step can set `processingLetter` to `ट्` and use `toolAnimation` to specify how it is processed next:

```json
{ "step": 1, "processingPosition": "1", "processingLetter": "ट्", "tool": "hook",
  "toolAnimation": "hookJoin", "targetPositions": ["1", "2"], "targetConjunct": "ट्ठ" }
```

### Special transformations without a regular rule

Some transformations do not have a regular letter rule in `charactersRules.json`. Configure these directly in a `levels.json` step by setting `tool` to `"hammer"`. The game recognizes this as a step-level special transformation, so no matching character rule is required. Provide `targetPositions` and `targetConjunct` for the result.

```json
{ "step": 0, "processingPosition": "1", "processingLetter": "", "tool": "hammer",
  "toolAnimation": "", "targetPositions": ["1", "2"], "targetConjunct": "क्ष" }
```

Set `toolAnimation` and `toolParams` in a step to override the animation and parameters from the regular letter rule. If both `targetPositions` and `targetConjunct` are empty, the game advances to the next step when the processing animation finishes without animating a merge into the target letter.
