window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.createCampaign = (levels, random = Math.random) => {
    if (!Array.isArray(levels) || levels.length === 0) {
        throw new Error("The campaign needs at least one level.");
    }

    let levelIndex = 0;
    let wordIndex = 0;
    let stepIndex = 0;

    const pickWords = level => {
        const pool = Array.isArray(level.wordPools) ? [...level.wordPools] : [];
        for (let index = pool.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(random() * (index + 1));
            [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
        }
        return pool.slice(0, 5);
    };

    let words = pickWords(levels[levelIndex]);

    const skipEmptyLevels = () => {
        while (levelIndex < levels.length && words.length === 0) {
            levelIndex += 1;
            if (levelIndex < levels.length) words = pickWords(levels[levelIndex]);
        }
    };
    skipEmptyLevels();

    return {
        get levelIndex() { return levelIndex; },
        get level() { return levels[levelIndex] || null; },
        get words() { return words; },
        get wordIndex() { return wordIndex; },
        get word() { return words[wordIndex] || null; },
        get stepIndex() { return stepIndex; },
        get step() { return this.word?.targetSlots?.[stepIndex] || null; },
        startLevel(index) {
            if (!Number.isInteger(index) || index < 0 || index >= levels.length) return false;
            levelIndex = index;
            wordIndex = 0;
            stepIndex = 0;
            words = pickWords(levels[levelIndex]);
            skipEmptyLevels();
            return levelIndex < levels.length;
        },
        advanceStep() {
            stepIndex += 1;
            return this.step;
        },
        completeWord() {
            if (wordIndex + 1 < words.length) {
                wordIndex += 1;
                stepIndex = 0;
                return "word";
            }

            levelIndex += 1;
            wordIndex = 0;
            stepIndex = 0;
            if (levelIndex >= levels.length) {
                return "complete";
            }
            words = pickWords(levels[levelIndex]);
            skipEmptyLevels();
            if (levelIndex >= levels.length) return "complete";
            return "level";
        }
    };
};
