window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.loadJson = async url => {
    let response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(`Could not load ${url}: ${error.message}`);
    }
    if (!response.ok) {
        throw new Error(`Could not load ${url}: HTTP ${response.status}`);
    }
    try {
        return await response.json();
    } catch (error) {
        throw new Error(`Invalid JSON in ${url}: ${error.message}`);
    }
};

SanskritSmith.addOutlinedText = (stage, text, font, x, y, lineWidth, outlineWidth = 3) => {
    const textOutline = new createjs.Text(text, font, "#000000");
    textOutline.textAlign = "center";
    textOutline.textBaseline = "middle";
    textOutline.outline = outlineWidth;
    if (lineWidth) textOutline.lineWidth = lineWidth;
    textOutline.x = x;
    textOutline.y = y;
    stage.addChild(textOutline);

    const textFill = new createjs.Text(text, font, "#FFF2A8");
    textFill.textAlign = "center";
    textFill.textBaseline = "middle";
    if (lineWidth) textFill.lineWidth = lineWidth;
    textFill.x = x;
    textFill.y = y;
    stage.addChild(textFill);
    return {textOutline, textFill, setText(value) {
        textOutline.text = value;
        textFill.text = value;
    }};
};

SanskritSmith.createCutLinesHelper = ({
    stage,
    cutLines,
    getWord,
    getStep,
    getProcessingCharacter,
    getShowCutLines,
    characterRules,
    processingLetterBox,
    processingLetterSize,
    uiScale,
    defaultHiddenRightRatio
}) => () => {
    const word = getWord();
    const step = getStep();
    const processingCharacter = getProcessingCharacter(word, step);
    if (!step?.base || step.base !== processingCharacter) {
        cutLines.alpha = 1;
        cutLines.visible = false;
        stage.update();
        return;
    }

    const toolName = step.tool?.toLowerCase();
    const isAxe = toolName === "axe";
    const isScissors = toolName === "scissors";
    const rule = isAxe || isScissors
        ? (characterRules[step.base]?.tools || []).find(candidate =>
            candidate.tool?.toLowerCase() === toolName
        )
        : null;
    if (!rule) {
        cutLines.alpha = 1;
        cutLines.visible = false;
        stage.update();
        return;
    }

    const params = rule.toolParams || {};
    const rightRatio = Number(params.hiddenRightRatio);
    const bottomRatio = Number(params.hiddenBottomRatio);
    const rightCutRatio = Math.max(0, Math.min(1,
        0.5 + (Number.isFinite(rightRatio) ? rightRatio : defaultHiddenRightRatio)));
    const effectiveBottomRatio = isAxe ? -0.5 : Number.isFinite(bottomRatio) ? bottomRatio : 0.45;
    const bottomCutRatio = Math.max(0, Math.min(1, 0.5 + effectiveBottomRatio));
    const cutX = processingLetterBox.x + processingLetterSize * rightCutRatio;
    const cutY = processingLetterBox.y + processingLetterSize * bottomCutRatio;

    cutLines.x = cutLines.y = 0;
    cutLines.regX = cutLines.regY = 0;
    cutLines.scaleX = cutLines.scaleY = 1;
    cutLines.alpha = 1;
    cutLines.graphics.clear()
        .setStrokeStyle(2 * uiScale)
        .setStrokeDash([6 * uiScale, 5 * uiScale], 0)
        .beginStroke("#ff0000")
        .moveTo(cutX, processingLetterBox.y)
        .lineTo(cutX, processingLetterBox.y + processingLetterSize);
    if (isAxe || isScissors) {
        cutLines.graphics
            .moveTo(processingLetterBox.x, cutY)
            .lineTo(processingLetterBox.x + processingLetterSize, cutY);
    }
    cutLines.visible = getShowCutLines();
    stage.update();
};
