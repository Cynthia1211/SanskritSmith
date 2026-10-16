window.SanskritSmith = window.SanskritSmith || {};

// Keep level data access behind this function so the source can later switch
// from the local JSON file to Firebase without changing the game controller.
SanskritSmith.fetchLevels = async () => {
    const data = await SanskritSmith.loadJson("levels.json");
    if (!Array.isArray(data.levels)) {
        throw new Error("levels.json must contain a levels array.");
    }
    return data.levels;
};
