window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.ASSET_PATHS = {
    background: "assets/game/background.jpeg",
    forgingStation: "assets/game/forgingStation.png",
    targetBackground: "assets/game/targetBackground.png",
    toolBackground: "assets/tools/toolBackground.png",
    assetRoot: "assets/"
};

SanskritSmith.calculateGameLayout = (frame, targetBarImage) => {
    const leftAreaWidth = frame.width * 2 / 3;
    const rightAreaX = leftAreaWidth;
    const rightAreaWidth = frame.width - leftAreaWidth;
    const targetBarImageWidth = targetBarImage.naturalWidth || targetBarImage.width;
    const targetBarImageHeight = targetBarImage.naturalHeight || targetBarImage.height;
    const targetBarTargetWidth = leftAreaWidth * 0.9;
    const targetBarY = 5;
    const targetBarScaleX = targetBarTargetWidth / targetBarImageWidth;
    const targetBarScaleY = 150 / targetBarImageHeight;
    const targetBarWidth = targetBarImageWidth * targetBarScaleX;
    const targetBarHeight = targetBarImageHeight * targetBarScaleY;
    const targetBarX = (leftAreaWidth - targetBarWidth) / 2;
    const toolsAreaWidth = leftAreaWidth * 0.98;
    const toolsAreaX = (leftAreaWidth - toolsAreaWidth) / 2;
    const toolsAreaHeight = 150;
    const toolsAreaY = frame.height - toolsAreaHeight;
    const infoAreaWidth = rightAreaWidth * 0.85;
    const infoAreaX = rightAreaX + (rightAreaWidth - infoAreaWidth) / 2;
    const infoAreaHeight = 620;
    const infoSectionWidth = infoAreaWidth * 0.9;
    const infoSectionX = infoAreaX + (infoAreaWidth - infoSectionWidth) / 2;

    return {
        leftAreaWidth,
        rightAreaX,
        rightAreaWidth,
        targetBarY,
        targetBarScaleX,
        targetBarScaleY,
        targetBarWidth,
        targetBarHeight,
        targetBarX,
        toolsAreaX,
        toolsAreaWidth,
        toolsAreaHeight,
        toolsAreaY,
        infoAreaWidth,
        infoAreaX,
        infoAreaHeight,
        infoSectionWidth,
        infoSectionX
    };
};

SanskritSmith.addRoundedPanel = (stage, createjs, {
    x, y, width, height,
    fill = "rgba(128, 128, 128, 0.6)",
    stroke = "#444444",
    strokeWidth = 2,
    radius = 12
}) => {
    const panel = new createjs.Shape();
    panel.graphics
        .beginFill(fill)
        .setStrokeStyle(strokeWidth)
        .beginStroke(stroke)
        .drawRoundRect(0, 0, width, height, radius);
    panel.x = x;
    panel.y = y;
    stage.addChild(panel);
    return panel;
};

SanskritSmith.isCompleteTargetStep = step => Boolean(step)
    && (step.processingPosition === "" || step.processingPosition == null)
    && (step.tool === "" || step.tool == null);

SanskritSmith.getTargetPositions = (step, boxCount) => [...new Set((step?.targetPositions || [])
    .map(Number)
    .filter(position => Number.isInteger(position) && position > 0 && position <= boxCount))]
    .sort((a, b) => a - b);

SanskritSmith.getTargetSlotCenterX = (position, startX, width, gap) =>
    startX + (position - 1) * (width + gap) + width / 2;

SanskritSmith.createTargetArea = ({stage, createjs, layout, addOutlinedText}) => {
    const {
        targetBarX,
        targetBarY,
        targetBarWidth,
        targetBarHeight,
        targetBarScaleX,
        targetBarScaleY
    } = layout;
    const targetBar = new createjs.Bitmap(SanskritSmith.ASSET_PATHS.targetBackground);
    targetBar.x = targetBarX;
    targetBar.y = targetBarY;
    targetBar.scaleX = targetBarScaleX;
    targetBar.scaleY = targetBarScaleY;
    targetBar.image.onload = () => stage.update();
    stage.addChild(targetBar);

    const letterWidth = 85;
    const letterHeight = 85;
    const letterGap = 30;
    const letterBoxes = [];
    const textRefs = [];
    let letterStartX = targetBarX;
    const letterY = targetBarY + targetBarHeight / 2 - letterHeight / 2;
    const processingPositionGlow = new createjs.Shape();
    processingPositionGlow.graphics
        .setStrokeStyle(5)
        .beginStroke("#FFD700")
        .drawRoundRect(-4, -4, letterWidth + 8, letterHeight + 8, 15);
    processingPositionGlow.visible = false;
    processingPositionGlow.mouseEnabled = false;
    stage.addChild(processingPositionGlow);

    const render = currentWord => {
        textRefs.forEach(textRef => {
            if (!textRef) return;
            [textRef.textOutline, textRef.textFill].forEach(text => {
                createjs.Tween.removeTweens(text);
                stage.removeChild(text);
            });
        });
        letterBoxes.forEach(box => {
            createjs.Tween.removeTweens(box);
            stage.removeChild(box);
        });
        textRefs.length = 0;
        letterBoxes.length = 0;

        const letterData = currentWord.initial.map(value => value === "_" ? "?" : value);
        const groupWidth = letterWidth * letterData.length + letterGap * (letterData.length - 1);
        letterStartX = targetBarX + (targetBarWidth - groupWidth) / 2;
        letterData.forEach((text, index) => {
            const box = new createjs.Shape();
            if (currentWord.initial[index] === "_") {
                box.graphics
                    .setStrokeStyle(4)
                    .setStrokeDash([6, 4])
                    .beginStroke("#FFFFFF")
                    .beginFill("rgba(245, 232, 200, 0.2)")
                    .drawRoundRect(0, 0, letterWidth, letterHeight, 12);
            }
            box.x = letterStartX + index * (letterWidth + letterGap);
            box.y = letterY;
            stage.addChild(box);
            letterBoxes.push(box);
            textRefs.push(addOutlinedText(
                text,
                "bold 50px Arial",
                box.x + letterWidth / 2,
                box.y + letterHeight / 2
            ));
        });
    };

    const updateProcessingPositionGlow = (currentWord, stepIndex) => {
        createjs.Tween.removeTweens(processingPositionGlow);
        processingPositionGlow.visible = false;
        const step = currentWord && currentWord.targetSlots[stepIndex];
        const position = Number(step && step.processingPosition);
        if (!Number.isInteger(position) || position < 1 || position > letterBoxes.length) return;
        if (currentWord.initial[position - 1] !== "_") return;
        const box = letterBoxes[position - 1];
        processingPositionGlow.x = box.x;
        processingPositionGlow.y = box.y;
        processingPositionGlow.alpha = 0.25;
        processingPositionGlow.visible = true;
        createjs.Tween.get(processingPositionGlow, {loop: true})
            .to({alpha: 1}, 500)
            .to({alpha: 0.25}, 500)
            .on("change", () => stage.update());
    };

    return {
        targetTextRefs: textRefs,
        targetBoxRefs: letterBoxes,
        processingPositionGlow,
        letterWidth,
        letterHeight,
        letterGap,
        letterY,
        get letterStartX() { return letterStartX; },
        render,
        updateProcessingPositionGlow
    };
};

window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.attachToolInteraction = ({
    tool,
    stage,
    createjs,
    originalX,
    originalY,
    getCurrentStep,
    processingLetterBox,
    processingLetterSize,
    isCorrectTool,
    onCorrectDrop,
    onIncorrectDrop
}) => {
    let offsetX = 0;
    let offsetY = 0;
    let homeX = originalX;
    let homeY = originalY;
    let hovered = false;
    let dragging = false;
    const scaleX = tool.scaleX;
    const scaleY = tool.scaleY;
    const updateScale = () => {
        const factor = hovered || dragging ? 1.15 : 1;
        tool.scaleX = scaleX * factor;
        tool.scaleY = scaleY * factor;
    };

    tool.cursor = "pointer";
    tool.on("mouseover", () => {
        hovered = true;
        updateScale();
        if (typeof tool.glow === "function") tool.glow("#FFD700", 50);
        else tool.shadow = new createjs.Shadow("#FFD700", 0, 0, 20);
        stage.update();
    });
    tool.on("mouseout", () => {
        hovered = false;
        updateScale();
        if (typeof tool.noGlow === "function") tool.noGlow();
        else tool.shadow = null;
        stage.update();
    });
    tool.on("mousedown", event => {
        dragging = true;
        updateScale();
        stage.addChild(tool);
        offsetX = tool.x - event.stageX;
        offsetY = tool.y - event.stageY;
        stage.update();
    });
    tool.on("pressmove", event => {
        tool.x = event.stageX + offsetX;
        tool.y = event.stageY + offsetY;
        stage.update();
    });
    tool.on("pressup", event => {
        const step = getCurrentStep();
        const box = processingLetterBox();
        const size = processingLetterSize();
        const droppedOnLetter = box
            && event.stageX >= box.x && event.stageX <= box.x + size
            && event.stageY >= box.y && event.stageY <= box.y + size;
        if (droppedOnLetter && step) {
            if (isCorrectTool(step)) onCorrectDrop(step);
            else if (onIncorrectDrop) onIncorrectDrop(step);
        }

        dragging = false;
        updateScale();
        createjs.Tween.get(tool)
            .to({x: homeX, y: homeY, scaleX: tool.scaleX, scaleY: tool.scaleY}, 200)
            .call(() => stage.update());
    });

    return {
        setHomePosition(x, y) {
            homeX = x;
            homeY = y;
        }
    };
};

SanskritSmith.createToolArea = ({
    stage,
    createjs,
    layout,
    toolFrameImage,
    toolData,
    levels,
    getLevel,
    getCurrentWord,
    getCurrentStep,
    getProcessingLetterBox,
    getProcessingLetterSize,
    addOutlinedText,
    onCorrectTool,
    onIncorrectTool
}) => {
    const {toolsAreaX, toolsAreaWidth, toolsAreaHeight, toolsAreaY} = layout;
    const toolNames = [...new Set(levels.flatMap(level => level.toolsOptions || []))];
    const availableTools = toolNames
        .map(name => toolData.find(item => item.toolName.toLowerCase() === name.toLowerCase()))
        .filter(Boolean);
    const displayRefs = [];
    const groups = [];
    const toolGap = 0;

    const updateForLevel = () => {
        const level = getLevel();
        const word = getCurrentWord();
        const allowedNames = level.toolsOptions || word.toolsOptions || [];
        const allowed = new Set(allowedNames.map(name => name.toLowerCase()));
        const visibleGroups = groups.filter(group => allowed.has(group.toolName.toLowerCase()));
        const visibleWidth = visibleGroups.reduce((total, group) => total + group.width, 0)
            + toolGap * Math.max(0, visibleGroups.length - 1);
        let nextX = toolsAreaX + (toolsAreaWidth - visibleWidth) / 2;

        groups.forEach(group => {
            const visible = allowed.has(group.toolName.toLowerCase());
            group.displays.forEach(display => { display.visible = visible; });
            if (!visible) return;
            group.moveTo(nextX);
            nextX += group.width + toolGap;
        });
    };

    const toolCount = availableTools.length;
    const toolTop = toolsAreaY + toolsAreaHeight * 0.25;
    const toolTargetHeight = toolsAreaHeight * 0.7;
    const frameWidth = toolFrameImage.naturalWidth || toolFrameImage.width;
    const frameHeight = toolFrameImage.naturalHeight || toolFrameImage.height;
    const baseScale = Math.min(
        toolTargetHeight / frameHeight,
        toolsAreaWidth / (toolCount * frameWidth + toolGap * (toolCount - 1))
    );
    const toolScale = baseScale * 1.2;
    const toolWidth = frameWidth * toolScale;
    const actualToolHeight = frameHeight * toolScale;
    const groupWidth = toolWidth * toolCount + toolGap * (toolCount - 1);
    const startX = toolsAreaX + (toolsAreaWidth - groupWidth) / 2;

    availableTools.forEach((toolInfo, index) => {
        const toolX = startX + index * (toolWidth + toolGap);
        const toolBox = new createjs.Bitmap(SanskritSmith.ASSET_PATHS.toolBackground);
        toolBox.scaleX = toolWidth / frameWidth;
        toolBox.scaleY = actualToolHeight / frameHeight;
        toolBox.x = toolX;
        toolBox.y = toolTop;
        toolBox.image.onload = () => stage.update();
        stage.addChild(toolBox);
        const displays = [toolBox];

        const tool = new createjs.Bitmap(`${SanskritSmith.ASSET_PATHS.assetRoot}${toolInfo.asset}`);
        const homeX = toolX + toolWidth / 2;
        const homeY = toolTop * 1.01;
        let interactionAttached = false;
        let setHomePosition = null;
        let displayGroup = null;

        const setupTool = () => {
            const maxWidth = toolWidth * 0.8;
            const maxHeight = actualToolHeight * 0.8;
            const imageScale = Math.min(maxWidth / tool.image.width, maxHeight / tool.image.height);
            tool.scaleX = imageScale * 0.95;
            tool.scaleY = imageScale * 0.95;
            tool.regX = tool.image.width / 2;
            tool.regY = tool.image.height / 2;
            tool.x = (displayGroup ? displayGroup.x : toolX) + toolWidth / 2;
            tool.y = homeY;
            if (!interactionAttached) {
                interactionAttached = true;
                const interaction = SanskritSmith.attachToolInteraction({
                    tool,
                    stage,
                    createjs,
                    originalX: homeX,
                    originalY: homeY,
                    getCurrentStep,
                    processingLetterBox: getProcessingLetterBox,
                    processingLetterSize: getProcessingLetterSize,
                    isCorrectTool: step => step.tool
                        && toolInfo.toolName.toLowerCase() === step.tool.toLowerCase(),
                    onCorrectDrop: () => onCorrectTool(toolInfo.toolName),
                    onIncorrectDrop: () => onIncorrectTool(toolInfo.toolName)
                });
                setHomePosition = interaction.setHomePosition;
            }
            if (setHomePosition) setHomePosition(tool.x, tool.y);
            stage.update();
        };
        tool.image.onload = setupTool;
        if (tool.image.complete) setupTool();
        stage.addChild(tool);
        displays.push(tool);
        displayRefs.push(tool);

        const textCenterX = toolX + toolWidth / 2;
        const textTop = toolTop + actualToolHeight * 0.55;
        const textBottom = toolTop + actualToolHeight - 8;
        const textCenterY = (textTop + textBottom) / 2;
        const name = addOutlinedText(toolInfo.label || toolInfo.toolName, "bold 21px Arial", textCenterX, textCenterY - 20);
        const effect = addOutlinedText(toolInfo.toolEffect || "tool effect", "16px Arial", textCenterX, textCenterY + 5);
        displays.push(name.textOutline, name.textFill, effect.textOutline, effect.textFill);

        displayGroup = {
            toolName: toolInfo.toolName,
            displays,
            width: toolWidth,
            x: toolX,
            moveTo(nextX) {
                const offsetX = nextX - this.x;
                this.displays.forEach(display => { display.x += offsetX; });
                this.x = nextX;
                if (setHomePosition) setHomePosition(tool.x, tool.y);
            }
        };
        groups.push(displayGroup);
    });

    return {displayRefs, updateForLevel};
};

SanskritSmith.createGameUI = ({
    stage,
    frame,
    createjs,
    layout,
    levels,
    campaign,
    getCampaignState,
    getMaxUnlockedLevel,
    getHintCount,
    getAttemptsRemaining,
    onHint,
    onLevelSelect
}) => {
    const {
        rightAreaWidth,
        infoAreaWidth,
        infoAreaX,
        infoAreaHeight,
        infoSectionWidth,
        infoSectionX
    } = layout;
    const selectedWordLabels = [];

    const infoArea = new createjs.Shape();
    infoArea.graphics.beginFill("rgba(204, 204, 204, 0.3)")
        .drawRoundRect(0, 0, infoAreaWidth, infoAreaHeight, 16);
    infoArea.x = infoAreaX;
    infoArea.y = 40;
    stage.addChild(infoArea);

    const infoTitle = new createjs.Text("Sanskrit Smith", "bold 40px Arial", "#FFFFFF");
    infoTitle.textAlign = "left";
    infoTitle.textBaseline = "middle";
    infoTitle.x = 840;
    infoTitle.y = 68;
    stage.addChild(infoTitle);

    const controlButtonWidth = 90;
    const controlButtonHeight = 24;
    const controlButtonGap = 10;
    const controlButtonRowWidth = controlButtonWidth * 3 + controlButtonGap * 2;
    ["How to Play", "Music", "SFX"].forEach((label, index) => {
        const button = new createjs.Shape();
        button.graphics.beginFill("#FFF2A8").setStrokeStyle(2).beginStroke("#000000")
            .drawRoundRect(0, 0, controlButtonWidth, controlButtonHeight, 6);
        button.x = infoAreaX + (infoAreaWidth - controlButtonRowWidth) / 2
            + index * (controlButtonWidth + controlButtonGap);
        button.y = 150 - controlButtonHeight * 1.5;
        button.cursor = "pointer";
        stage.addChild(button);
        const buttonText = new createjs.Text(label, "bold 12px Arial", "#000000");
        buttonText.textAlign = "center";
        buttonText.textBaseline = "middle";
        buttonText.x = button.x + controlButtonWidth / 2;
        buttonText.y = button.y + controlButtonHeight / 2;
        stage.addChild(buttonText);
    });

    SanskritSmith.addRoundedPanel(stage, createjs, {
        x: infoSectionX, y: 150, width: infoSectionWidth, height: 130
    });
    SanskritSmith.addRoundedPanel(stage, createjs, {
        x: infoSectionX, y: 355, width: infoSectionWidth, height: 265
    });

    const addText = (text, font, x, y, align = "left") => {
        const label = new createjs.Text(text, font, "#FFFFFF");
        label.textAlign = align;
        label.textBaseline = "middle";
        label.x = x;
        label.y = y;
        stage.addChild(label);
        return label;
    };

    const statusLabelX = 1020;
    const statusValueX = 1130;
    addText("Today's Income", "bold 22px Arial", statusLabelX, 180, "right");
    addText("$0", "bold 22px Arial", statusValueX, 180, "right");
    addText("Today's Completed", "15px Arial", statusLabelX, 215, "right");
    addText("0", "bold 18px Arial", statusValueX, 215, "right");

    const hintButtonWidth = 76;
    const hintButtonHeight = 24;
    const hintButton = new createjs.Shape();
    hintButton.graphics.beginFill("#FFF2A8").setStrokeStyle(2).beginStroke("#000000")
        .drawRoundRect(0, 0, hintButtonWidth, hintButtonHeight, 8);
    hintButton.x = statusLabelX - hintButtonWidth - 12;
    hintButton.y = 241;
    hintButton.cursor = "pointer";
    stage.addChild(hintButton);
    const hintButtonLabel = addText("Hint 2/2", "bold 13px Arial",
        hintButton.x + hintButtonWidth / 2, hintButton.y + hintButtonHeight / 2, "center");
    hintButtonLabel.color = "#000000";
    hintButtonLabel.mouseEnabled = false;

    const attemptsLabel = addText("Attempts: 3/3", "bold 17px Arial", statusValueX, 253, "right");
    const levelTitle = addText("Level 1", "bold 26px Arial", 855, 380);
    const levelRequirement = addText("Need 5 pieces to complete the level", "12px Arial", 855, 599);
    const progressLabel = addText("Level Progress", "bold 13px Arial", 855, 408);

    const progressBarWidth = 260;
    const progressBar = new createjs.Shape();
    progressBar.graphics.beginFill("#174D17").drawRoundRect(0, 0, progressBarWidth, 16, 8);
    progressBar.x = 855;
    progressBar.y = 418;
    stage.addChild(progressBar);
    const progressFill = new createjs.Shape();
    progressFill.x = progressBar.x;
    progressFill.y = progressBar.y;
    stage.addChild(progressFill);

    const levelDropdown = document.createElement("select");
    levelDropdown.className = "level-selector";
    levelDropdown.setAttribute("aria-label", "Select level");
    levels.forEach((levelConfig, index) => {
        const option = document.createElement("option");
        const number = String(levelConfig.id || "").match(/\d+/)?.[0] || index + 1;
        option.value = String(index);
        option.textContent = levelConfig.name || `Level ${number}`;
        levelDropdown.appendChild(option);
    });
    document.body.appendChild(levelDropdown);

    const updateLevelDropdown = () => {
        [...levelDropdown.options].forEach((option, index) => {
            option.disabled = index > getMaxUnlockedLevel();
        });
        levelDropdown.value = String(campaign.levelIndex);
    };
    const positionLevelDropdown = () => {
        const canvas = stage.canvas;
        if (!canvas) return;
        const bounds = canvas.getBoundingClientRect();
        const scaleX = bounds.width / frame.width;
        const scaleY = bounds.height / frame.height;
        levelDropdown.style.borderWidth = `${2 * Math.min(scaleX, scaleY)}px`;
        levelDropdown.style.left = `${bounds.left + infoSectionX * scaleX}px`;
        levelDropdown.style.top = `${bounds.top + 295 * scaleY}px`;
        levelDropdown.style.width = `${infoSectionWidth * scaleX}px`;
        levelDropdown.style.height = `${45 * scaleY}px`;
    };

    const updateHintButton = () => {
        const remaining = 2 - getHintCount();
        hintButtonLabel.text = `Hint ${remaining}/2`;
        hintButton.alpha = remaining <= 0 ? 0.55 : 1;
        hintButtonLabel.alpha = hintButton.alpha;
        hintButton.cursor = remaining <= 0 ? "default" : "pointer";
    };
    const updateAttemptsLabel = () => {
        attemptsLabel.text = `Attempts: ${getAttemptsRemaining()}/3`;
        stage.update();
    };

    const updateCampaignStatus = (completedCount) => {
        const state = getCampaignState();
        if (!state.level) return;
        const completed = completedCount ?? state.wordIndex;
        levelTitle.text = `Level ${state.levelIndex + 1} / ${levels.length}`;
        levelRequirement.text = `Complete ${state.words.length} words to clear this level`;
        selectedWordLabels.forEach(label => stage.removeChild(label));
        selectedWordLabels.length = 0;
        state.words.forEach((word, index) => {
            const visibleWord = index < completed || state.hintedWordIndices.has(index)
                ? ` ${word.word}`
                : "";
            const label = addText(`${index + 1}.${visibleWord}`, "18px Arial", 855,
                455 + index * 28);
            selectedWordLabels.push(label);
        });
        const ratio = state.words.length
            ? Math.min(state.words.length, Math.max(0, Number(completed) || 0)) / state.words.length
            : 0;
        progressLabel.text = `Level Progress: ${Math.round(ratio * 100)}%`;
        progressFill.graphics.clear();
        if (ratio > 0) {
            const fillWidth = progressBarWidth * ratio;
            progressFill.graphics.beginFill("#FFF2A8")
                .drawRoundRect(0, 0, fillWidth, 16, Math.min(8, fillWidth / 2));
        }
        stage.update();
    };

    const flashWord = index => {
        const wordLabel = selectedWordLabels[index];
        if (!wordLabel) return;
        createjs.Tween.removeTweens(wordLabel);
        wordLabel.alpha = 1;
        const flash = createjs.Tween.get(wordLabel, {override: true});
        for (let pulse = 0; pulse < 4; pulse += 1) {
            flash.to({alpha: 0.2}, 125).to({alpha: 1}, 125);
        }
        flash.call(() => {
            wordLabel.alpha = 1;
            stage.update();
        }).on("change", () => stage.update());
    };

    hintButton.on("click", () => {
        const result = onHint();
        if (!result) return;
        if (result.newHint) {
            updateHintButton();
            updateCampaignStatus();
        }
        flashWord(result.wordIndex);
    });
    levelDropdown.addEventListener("change", () => {
        const index = Number(levelDropdown.value);
        if (index > getMaxUnlockedLevel() || !onLevelSelect(index)) {
            levelDropdown.value = String(campaign.levelIndex);
            return;
        }
        updateLevelDropdown();
        updateCampaignStatus();
    });
    window.addEventListener("resize", positionLevelDropdown);
    if (window.ResizeObserver && stage.canvas) new ResizeObserver(positionLevelDropdown).observe(stage.canvas);
    positionLevelDropdown();
    updateLevelDropdown();
    updateCampaignStatus();

    return {
        updateCampaignStatus,
        updateHintButton,
        updateAttemptsLabel,
        updateLevelDropdown,
        positionLevelDropdown,
        showCampaignComplete() {
            levelTitle.text = "All levels complete!";
            levelRequirement.text = "You completed every selected word.";
            stage.update();
        }
    };
};
