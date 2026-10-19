window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.SCORE_SETTINGS = Object.freeze({
    wordScore: 10,
    levelScore: 50,
    hintDeductScore: 2,
    AttemptsDeductScore: 2
});

// Toggle processing-letter guide lines without changing the renderer.
SanskritSmith.SHOW_SCISSORS_CUT_LINES = true;

SanskritSmith.howToPlay = [
    "Drag the correct tool onto the letter being processed.",
    "Complete each step to combine the letters into the word.",
    "You can use up to 2 hints in each level.",
    "Each level gives you 3 attempts. Incorrect tools use an attempt.",
    "Earn money by completing words; hints and incorrect attempts reduce your reward.",
    "Finish the last word in a level to earn a $50 level bonus.",
];
