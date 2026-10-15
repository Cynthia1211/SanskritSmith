window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.fallbackLevels = {
    levels: [{
        id: "level_1",
        toolsOptions: ["axe", "scissors", "Gem"],
        wordPools: [{
            id: 1,
            word: "स्त",
            meaning: "XXX",
            letters: ["स", "त"],
            initial: ["_", "त"],
            targetSlots: [
                {step: 0, processingPosition: "1", tool: "axe", targetPositions: ["1", "2"], targetConjunct: "स्त"},
                {step: 1, processingPosition: "", tool: "", targetPositions: ["1", "2"], targetConjunct: "स्त"}
            ]
        }]
    }]
};

SanskritSmith.fallbackTools = [
    {toolName: "axe", toolEffect: "Split the letter"},
    {toolName: "scissors", toolEffect: "Trim the letter"},
    {toolName: "gem", toolEffect: "Add halant"}
];

SanskritSmith.fallbackCharacters = {
    "स": [{
        audio: "",
        tool: "axe",
        toolAnimation: "axeSplit",
        toolParams: {hiddenRightRatio: 0.45}
    }]
};
