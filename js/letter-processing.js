window.SanskritSmith = window.SanskritSmith || {};

// Read the source character for a processing step from its target-bar position.
SanskritSmith.getProcessingLetterText = (word, step) => {
    if (!word || !step || step.processingPosition === "" || step.processingPosition == null) return "";
    const position = Number(step.processingPosition);
    if (!Number.isInteger(position) || position < 1) return "";
    return word.letters[position - 1] || "";
};

// Check whether a step points to an existing character in the word.
SanskritSmith.hasProcessingPosition = (step, word) => {
    if (!word || !step || step.processingPosition === "" || step.processingPosition == null) return false;
    const position = Number(step.processingPosition);
    return Number.isInteger(position) && position >= 1 && position <= (word.letters?.length || 0);
};

// Synchronize the processing text object and its rendered letter parts.
SanskritSmith.updateProcessingLetter = (letterParts, processingLetter, word, step, onUpdate) => {
    const text = SanskritSmith.getProcessingLetterText(word, step);
    processingLetter.text = text;
    letterParts.setText(text);
    if (onUpdate) onUpdate();
};

/** Creates and resets the display objects used for processing a letter. */
SanskritSmith.createProcessingLetterParts = ({stage, createjs, baseLetter, box, size}) => {
    // Create a square mask aligned with the processing-letter box.
    const makeMask = () => {
        const mask = new createjs.Shape();
        mask.graphics.beginFill("#000000").drawRect(0, 0, size, size);
        mask.x = box.x;
        mask.y = box.y;
        return mask;
    };
    // Clone the base text and align it to the center of the processing box.
    const makeLetter = mask => {
        const letter = baseLetter.clone();
        letter.textAlign = "center";
        letter.textBaseline = "middle";
        letter.x = box.x + size / 2;
        letter.y = box.y + size / 2;
        letter.mask = mask;
        return letter;
    };
    const firstMask = makeMask();
    const secondMask = makeMask();
    const firstLetter = makeLetter(firstMask);
    const secondLetter = makeLetter(secondMask);
    const singleLetter = makeLetter(null);
    secondLetter.visible = false;
    singleLetter.visible = false;
    stage.addChild(firstLetter, secondLetter, singleLetter);

    const axeVisual = {letters: [firstLetter, secondLetter], masks: [firstMask, secondMask]};
    const singleVisual = {letters: [singleLetter], masks: []};
    const trimVisual = {letters: [singleLetter], masks: [secondMask]};
    let visual = axeVisual;

    return {
        secondLetter,
        firstMask,
        secondMask,
        singleLetter,
        get visual() { return visual; },
        // Switch between split-letter, trimmed-letter, and whole-letter visuals.
        setMode(mode) {
            visual = mode === "axe" ? axeVisual : mode === "trim" ? trimVisual : singleVisual;
            if (mode === "axe") {
                [firstMask, secondMask].forEach(mask => {
                    mask.graphics.clear().beginFill("#000000").drawRect(0, 0, size, size);
                });
            }
            firstLetter.visible = mode === "axe";
            secondLetter.visible = false;
            singleLetter.visible = mode !== "axe";
            singleLetter.mask = mode === "trim" ? secondMask : null;
            [firstMask, secondMask].forEach(mask => {
                mask.visible = visual.masks.includes(mask);
            });
        },
        // Apply the same text to each backing text object.
        setText(text) {
            firstLetter.text = text;
            secondLetter.text = text;
            singleLetter.text = text;
        },
        // Hide every processing-letter piece and its masks.
        hide() {
            firstLetter.visible = false;
            secondLetter.visible = false;
            singleLetter.visible = false;
            firstMask.visible = false;
            secondMask.visible = false;
        },
        // Restore positions, scales, masks, visibility, and text for a new step.
        reset(text, showFirst = true, mode = "axe") {
            [firstLetter, secondLetter, singleLetter, firstMask, secondMask].forEach(part => {
                createjs.Tween.removeTweens(part);
                part.alpha = 1;
                part.scaleX = 1;
                part.scaleY = 1;
            });
            firstLetter.regX = firstLetter.regY = 0;
            secondLetter.regX = secondLetter.regY = 0;
            firstMask.regX = firstMask.regY = 0;
            secondMask.regX = secondMask.regY = 0;
            firstLetter.x = secondLetter.x = box.x + size / 2;
            firstLetter.y = secondLetter.y = box.y + size / 2;
            firstMask.x = secondMask.x = box.x;
            firstMask.y = secondMask.y = box.y;
            firstMask.scaleX = secondMask.scaleX = 1;
            firstMask.scaleY = secondMask.scaleY = 1;
            [firstMask, secondMask].forEach(mask => {
                mask.graphics.clear().beginFill("#000000").drawRect(0, 0, size, size);
            });
            singleLetter.x = box.x + size / 2;
            singleLetter.y = box.y + size / 2;
            this.setMode(mode);
            if (!showFirst) {
                firstLetter.visible = firstMask.visible = false;
                singleLetter.visible = false;
            }
            this.setText(text);
        }
    };
};

/** Animates selected target-bar letters into a conjunct and handles completion. */
SanskritSmith.createConjunctAnimator = ({stage, createjs, targetArea, targetBarX, targetBarWidth, addOutlinedText}) => {
    let isAnimating = false;
    // Collapse the selected target slots and show their conjunct replacement.
    const animateConjunctPositions = (step, onComplete, completeMode = false) => {
        console.log("[targetConjunct] animation started", {
            targetPositions: step && step.targetPositions,
            targetConjunct: step && step.targetConjunct
        });
        if (isAnimating) return;
        isAnimating = true;
        createjs.Tween.removeTweens(targetArea.processingPositionGlow);
        targetArea.processingPositionGlow.visible = false;

        const processingPositionIsEmpty = step.processingPosition === ""
            || step.processingPosition == null;
        const toolIsEmpty = step.tool === "" || step.tool == null;
        const isFinalStep = completeMode || (processingPositionIsEmpty && toolIsEmpty);

        const positions = SanskritSmith.getTargetPositions(step, targetArea.targetBoxRefs.length);
        if (!positions.length) {
            isAnimating = false;
            if (onComplete) onComplete();
            return;
        }

        const firstPosition = positions[0];
        const firstSlotCenterX = SanskritSmith.getTargetSlotCenterX(
            firstPosition,
            targetArea.letterStartX,
            targetArea.letterWidth,
            targetArea.letterGap
        );
        const centerY = targetArea.letterY + targetArea.letterHeight / 2;
        const collapseTargets = [];

        positions.forEach(position => {
            const slotX = targetArea.letterStartX + (position - 1) * (targetArea.letterWidth + targetArea.letterGap);
            const textRef = targetArea.targetTextRefs[position - 1];
            const box = targetArea.targetBoxRefs[position - 1];
            if (textRef) {
                [textRef.textOutline, textRef.textFill].forEach(text => {
                    createjs.Tween.removeTweens(text);
                    text.x = slotX + targetArea.letterWidth / 2;
                    text.y = centerY;
                    text.scaleX = 1;
                    text.scaleY = 1;
                    text.alpha = 1;
                    text.visible = true;
                    collapseTargets.push(text);
                });
            }
            if (box) {
                createjs.Tween.removeTweens(box);
                box.alpha = 1;
                box.visible = false;
            }
        });

        let remaining = collapseTargets.length;
        let finished = false;
        // Remove collapsed text and create the merged replacement.
        const finishCollapse = () => {
            if (finished) return;
            finished = true;
            console.log("[targetConjunct] all collapse tweens finished", {
                targetConjunct: step.targetConjunct,
                replacementPosition: firstPosition
            });
            collapseTargets.forEach(target => {
                createjs.Tween.removeTweens(target);
                target.visible = false;
                stage.removeChild(target);
            });
            // Clear every collapsed slot's text ref so a later step cannot
            // make stale letters visible again when it resets tween state.
            positions.forEach(position => {
                targetArea.targetTextRefs[position - 1] = null;
            });

            const replacementX = isFinalStep
                ? targetBarX + targetBarWidth / 2
                : SanskritSmith.getTargetSlotCenterX(firstPosition, targetArea.letterStartX, targetArea.letterWidth, targetArea.letterGap);
            const replacementFontSize = targetArea.letterWidth * (isFinalStep ? 60 : 50) / 85;
            const replacementText = addOutlinedText(
                step.targetConjunct || "",
                `bold ${replacementFontSize}px Arial`,
                replacementX,
                centerY
            );
            targetArea.targetTextRefs[firstPosition - 1] = replacementText;
            const replacementParts = [replacementText.textOutline, replacementText.textFill];
            replacementParts.forEach(text => { text.alpha = 0; });
            stage.update();
            const replacementFade = createjs.Tween.get(replacementParts[0])
                .to({alpha: 1}, 800);
            replacementFade.on("change", () => stage.update());
            const replacementFillFade = createjs.Tween.get(replacementParts[1])
                .to({alpha: 1}, 800);
            replacementFillFade.on("change", () => stage.update());
            if (isFinalStep) {
                let displayFinished = false;
                // Release the animator after the final result has been shown.
                const finishDisplay = () => {
                    if (displayFinished) return;
                    displayFinished = true;
                    window.setTimeout(() => {
                        isAnimating = false;
                        stage.update();
                        if (onComplete) onComplete();
                    }, 1000);
                };
                replacementFade.call(finishDisplay);
                window.setTimeout(finishDisplay, 850);
                return;
            }
            console.log("[targetConjunct] replacement created", {
                text: replacementText.textFill.text,
                x: replacementText.textFill.x,
                y: replacementText.textFill.y,
                visible: replacementText.textFill.visible,
                stageChildCount: stage.numChildren
            });
            let replacementFinished = false;
            // Release the animator after the intermediate result has appeared.
            const finishReplacement = () => {
                if (replacementFinished) return;
                replacementFinished = true;
                isAnimating = false;
                if (onComplete) onComplete();
            };
            replacementFade.call(finishReplacement);
            window.setTimeout(finishReplacement, 850);
        };

        if (!remaining) {
            finishCollapse();
            return;
        }

        collapseTargets.forEach(target => {
            createjs.Tween.get(target)
                .to({x: firstSlotCenterX, y: centerY}, 400)
                .to({alpha: 0}, 300)
                .on("change", () => stage.update())
                .call(() => {
                    remaining -= 1;
                    console.log("[targetConjunct] collapse tween completed", {
                        remaining,
                        total: collapseTargets.length
                    });
                    if (remaining === 0) finishCollapse();
                });
        });

        // Keep the replacement from depending exclusively on CreateJS
        // completion callbacks: the collapse visuals can finish even when a
        // callback is missed (for example, after another tween was removed).
        window.setTimeout(() => {
            if (!finished) {
                console.warn("[targetConjunct] using timed completion fallback", {
                    remaining,
                    targetConjunct: step.targetConjunct
                });
                finishCollapse();
            }
        }, 800);
    }

    return {
        // Merge a regular processing step's target positions.
        animateTargetPositionsToConjunct(step, onComplete) {
            animateConjunctPositions(step, onComplete, false);
        },
        // Play the final target-bar merge before completing the word.
        animateCompleteConjunct(step, onComplete) {
            window.setTimeout(() => {
                animateConjunctPositions(step, onComplete, true);
            }, 500);
        },
        // Allow a new target-bar animation after a level or word reset.
        reset() {
            isAnimating = false;
        }
    };
};

/** Builds the shared movement logic and individual tool animations. */
SanskritSmith.createLetterProcessor = ({
    stage,
    createjs,
    letterParts,
    scissorsCutLines,
    processingLetterBox,
    processingLetterSize,
    letterWidth,
    letterHeight,
    getCurrentStep,
    getTargetBox,
    getTargetLetter,
    removeTargetText,
    animateTargetPositionsToConjunct,
    advanceToNextStep,
    defaultHiddenRightRatio
}) => {
    const {secondLetter, firstMask: firstLetterMask, secondMask: secondLetterMask} = letterParts;
    // Guarantee that an animation advances once, even if its tween callback is missed.
    const continueOnce = (tween, fallbackDelay, callback, stageName) => {
        let continued = false;
        const continueAnimation = () => {
            if (continued) return;
            continued = true;
            callback();
        };
        tween.call(continueAnimation);
        window.setTimeout(() => {
            if (!continued) {
                console.warn(`[letterProcessing] ${stageName} callback fallback`);
                continueAnimation();
            }
        }, fallbackDelay);
    };
    // Convert the scissors parameter to a clamped vertical or horizontal cut line.
    const getRightCutPositionRatio = hiddenRightRatio =>
        Math.max(0, Math.min(1, 0.5 + hiddenRightRatio));
    // Convert the scissors parameter to a clamped horizontal cut line.
    const getBottomCutPositionRatio = hiddenBottomRatio =>
        Math.max(0, Math.min(1, 0.5 + hiddenBottomRatio));

    // Provide a brief fallback animation for tools without a dedicated handler.
    const genericToolAnimation = () => {
        const animation = createjs.Tween.get(letterParts.singleLetter)
            .to({alpha: 0, scaleX: 1.15, scaleY: 1.15}, 180)
            .to({alpha: 1, scaleX: 1, scaleY: 1}, 180);
        continueOnce(animation, 420, () => {
            stage.update();
            animateProcessedLetterToTarget(0, 0);
        }, "toolAnimation");
        return animation;
    };

    // Lift, resize, and move a processed letter into its target slot.
    const animateProcessedLetterToTarget = (
        hiddenRightRatio = 0,
        hiddenBottomRatio = 0,
        visual = letterParts.visual
    ) => {
        const verticalDistance = processingLetterSize * 0.25;
        const auxiliaryLines = scissorsCutLines?.visible
            ? [scissorsCutLines]
            : [];
        const movingParts = [...visual.letters, ...visual.masks, ...auxiliaryLines];
        // Move all visual parts to the target slot, then start the merge.
        const moveAndFadeToProcessingPosition = () => {
            const step = getCurrentStep();
            const targetBox = step?.processingPosition
                ? getTargetBox(Number(step.processingPosition))
                : null;
            if (!targetBox) return;

            const targetCenterX = targetBox.x + letterWidth / 2;
            const targetCenterY = targetBox.y + letterHeight / 2;
            const anchorLetter = visual.letters[0];
            const currentVisualCenterX = anchorLetter.x - anchorLetter.regX * anchorLetter.scaleX;
            const currentVisualCenterY = anchorLetter.y - anchorLetter.regY * anchorLetter.scaleY;
            const moveX = targetCenterX - currentVisualCenterX;
            const moveY = targetCenterY - currentVisualCenterY;
            let flightFinished = false;
            // Hide the temporary processing visual and continue the step.
            const finishFlight = () => {
                if (flightFinished) return;
                flightFinished = true;
                letterParts.hide();
                if (auxiliaryLines.length) auxiliaryLines.forEach(line => { line.visible = false; });
                stage.update();
                console.log("[processedLetter] flight finished; checking target conjunct", {
                    targetPositions: step.targetPositions,
                    targetConjunct: step.targetConjunct
                });
                const isEmptyTargetValue = value => value == null
                    || value === ""
                    || (Array.isArray(value) && value.length === 0);
                if (isEmptyTargetValue(step.targetPositions) && isEmptyTargetValue(step.targetConjunct)) {
                    advanceToNextStep();
                    return;
                }
                animateTargetPositionsToConjunct(step, advanceToNextStep);
            };

            visual.masks.forEach(mask => {
                createjs.Tween.get(mask)
                    .to({x: mask.x + moveX, y: mask.y + moveY}, 500)
                    .on("change", () => stage.update());
            });
            const flights = visual.letters.map(letter => createjs.Tween.get(letter)
                .to({x: letter.x + moveX, y: letter.y + moveY, alpha: 0}, 500)
                .on("change", () => stage.update()));
            auxiliaryLines.forEach(line => {
                createjs.Tween.get(line)
                    .to({x: line.x + moveX, y: line.y + moveY, alpha: 0}, 500)
                    .on("change", () => stage.update());
            });
            const firstFlight = flights[0];
            continueOnce(firstFlight, 550, finishFlight, "flight");
        };

        // Scale the letter, masks, and guides around the shared cut-line intersection.
        const shrinkToTargetSize = () => {
            const targetScaleX = letterWidth / processingLetterSize;
            const targetScaleY = letterHeight / processingLetterSize;
            const pivotOriginX = processingLetterBox.x;
            const pivotOriginY = processingLetterBox.y - verticalDistance;
            const crossX = pivotOriginX + processingLetterSize * getRightCutPositionRatio(hiddenRightRatio);
            const crossY = pivotOriginY + processingLetterSize * getBottomCutPositionRatio(hiddenBottomRatio);
            const scaleTargets = [...visual.letters, ...visual.masks, ...auxiliaryLines];
            scaleTargets.forEach(part => {
                const partScaleX = part.scaleX * targetScaleX;
                const partScaleY = part.scaleY * targetScaleY;
                // Convert the shared stage-space pivot to this object's local coordinates.
                // Masks can already have a partial scale after axe splitting.
                if (part.scaleX) part.regX += (crossX - part.x) / part.scaleX;
                if (part.scaleY) part.regY += (crossY - part.y) / part.scaleY;
                part.x = crossX;
                part.y = crossY;
                createjs.Tween.get(part, {override: true})
                    .to({scaleX: partScaleX, scaleY: partScaleY}, 400)
                    .on("change", () => stage.update());
            });
            const finishShrink = createjs.Tween.get(visual.letters[0]).wait(400);
            continueOnce(finishShrink, 450, moveAndFadeToProcessingPosition, "shrink");
        };

        movingParts.forEach(part => {
            createjs.Tween.get(part)
                .to({y: part.y - verticalDistance}, 400)
                .on("change", () => stage.update());
        });
        const finishLift = createjs.Tween.get(visual.letters[0]).wait(400);
        continueOnce(finishLift, 450, shrinkToTargetSize, "lift");
    };

    // Split the processing letter and move the right portion out of view.
    const axeSplit = hiddenRightRatio => {
        const visibleLeftRatio = getRightCutPositionRatio(hiddenRightRatio);
        const hiddenRightWidthRatio = 1 - visibleLeftRatio;
        createjs.Tween.removeTweens(firstLetterMask);
        createjs.Tween.removeTweens(secondLetterMask);
        createjs.Tween.removeTweens(secondLetter);

        firstLetterMask.x = processingLetterBox.x;
        firstLetterMask.scaleX = 1;
        secondLetterMask.x = processingLetterBox.x;
        secondLetterMask.scaleX = 1;
        secondLetter.x = processingLetterBox.x + processingLetterSize / 2;
        secondLetter.alpha = 1;
        secondLetter.visible = true;

        firstLetterMask.scaleX = visibleLeftRatio;
        secondLetterMask.x = processingLetterBox.x + processingLetterSize * visibleLeftRatio;
        secondLetterMask.scaleX = hiddenRightWidthRatio;
        stage.update();

        const slideDistance = processingLetterSize * 0.35;
        createjs.Tween.get(secondLetterMask)
            .to({x: secondLetterMask.x + slideDistance}, 500)
            .on("change", () => stage.update());
        const splitTween = createjs.Tween.get(secondLetter)
            .to({x: secondLetter.x + slideDistance, alpha: 0}, 500)
            .on("change", () => stage.update());
        continueOnce(splitTween, 550, () => {
            stage.update();
            animateProcessedLetterToTarget(hiddenRightRatio, -0.5);
        }, "axeSplit");
        return splitTween;
    };

    // Mask the selected right and bottom regions before moving the trimmed letter.
    const scissorsTrim = (hiddenRightRatio, hiddenBottomRatio) => {
        const trimMask = letterParts.secondMask;
        createjs.Tween.removeTweens(trimMask);
        trimMask.x = processingLetterBox.x;
        trimMask.y = processingLetterBox.y;
        trimMask.scaleX = trimMask.scaleY = 1;
        trimMask.regX = trimMask.regY = 0;
        trimMask.alpha = 1;
        trimMask.visible = true;
        const cutX = processingLetterSize * getRightCutPositionRatio(hiddenRightRatio);
        const cutY = processingLetterSize * getBottomCutPositionRatio(hiddenBottomRatio);
        // Keep the left and top regions, leaving the lower-right intersection outside the mask.
        trimMask.graphics.clear().beginFill("#000000")
            .moveTo(0, 0)
            .lineTo(processingLetterSize, 0)
            .lineTo(processingLetterSize, cutY)
            .lineTo(cutX, cutY)
            .lineTo(cutX, processingLetterSize)
            .lineTo(0, processingLetterSize)
            .closePath();
        const letter = letterParts.singleLetter;
        letter.mask = trimMask;
        letter.visible = true;
        letter.regX = letter.regY = 0;
        letter.x = processingLetterBox.x + processingLetterSize / 2;
        letter.y = processingLetterBox.y + processingLetterSize / 2;
        letter.alpha = 1;
        letter.scaleX = letter.scaleY = 1;
        stage.update();
        animateProcessedLetterToTarget(hiddenRightRatio, hiddenBottomRatio);
    };

    // Pull the following target-bar letter into the processing letter.
    const hookJoin = () => {
        const step = getCurrentStep();
        const position = Number(step?.processingPosition);
        const followingPosition = position + 1;
        const followingBox = getTargetBox(followingPosition);
        const followingText = getTargetLetter(followingPosition);
        if (!Number.isInteger(position) || !followingBox || !followingText) {
            return genericToolAnimation();
        }

        removeTargetText(followingPosition);

        const letter = letterParts.singleLetter;
        const incomingLetter = new createjs.Text(followingText, letter.font, letter.color);
        incomingLetter.textAlign = "center";
        incomingLetter.textBaseline = "middle";
        incomingLetter.x = followingBox.x + letterWidth / 2;
        incomingLetter.y = followingBox.y + letterHeight / 2;
        incomingLetter.scaleX = letterWidth / processingLetterSize;
        incomingLetter.scaleY = letterHeight / processingLetterSize;
        stage.addChild(incomingLetter);

        const animation = createjs.Tween.get(incomingLetter)
            .to({
                x: letter.x,
                y: letter.y,
                scaleX: 1,
                scaleY: 1,
                alpha: 0
            }, 500)
            .on("change", () => stage.update());
        continueOnce(animation, 550, () => {
            stage.removeChild(incomingLetter);
            letterParts.setText(step.targetConjunct || letter.text);
            letter.alpha = 1;
            stage.update();
            animateProcessedLetterToTarget(0, 0);
        }, "hookJoin");
        return animation;
    };

    // Pull the following target-bar letter into the processing letter for repha.
    const hookRepha = () => {
        const step = getCurrentStep();
        const position = Number(step?.processingPosition);
        const followingPosition = position + 1;
        const followingBox = getTargetBox(followingPosition);
        const followingText = getTargetLetter(followingPosition);
        if (!Number.isInteger(position) || !followingBox || !followingText) {
            return genericToolAnimation();
        }

        removeTargetText(followingPosition);

        const letter = letterParts.singleLetter;
        const originalLetterY = letter.y;
        const originalScaleX = letter.scaleX;
        const originalScaleY = letter.scaleY;
        const incomingLetter = new createjs.Text(followingText, letter.font, letter.color);
        incomingLetter.textAlign = "center";
        incomingLetter.textBaseline = "middle";
        incomingLetter.x = followingBox.x + letterWidth / 2;
        incomingLetter.y = followingBox.y + letterHeight / 2;
        incomingLetter.scaleX = letterWidth / processingLetterSize;
        incomingLetter.scaleY = letterHeight / processingLetterSize;
        stage.addChild(incomingLetter);

        createjs.Tween.get(letter)
            .to({
                y: originalLetterY - processingLetterSize * 0.25,
                scaleX: originalScaleX * letterWidth / processingLetterSize,
                scaleY: originalScaleY * letterHeight / processingLetterSize,
                alpha: 0
            }, 500)
            .on("change", () => stage.update());
        const animation = createjs.Tween.get(incomingLetter)
            .to({
                x: letter.x,
                y: letter.y,
                scaleX: 1,
                scaleY: 1,
                alpha: 0
            }, 500)
            .on("change", () => stage.update());
        continueOnce(animation, 550, () => {
            stage.removeChild(incomingLetter);
            letterParts.setText(step.targetConjunct || letter.text);
            letter.y = originalLetterY;
            letter.scaleX = originalScaleX;
            letter.scaleY = originalScaleY;
            letter.alpha = 1;
            stage.update();
            createjs.Tween.get(letter)
                .wait(500)
                .call(() => animateProcessedLetterToTarget(0, 0));
        }, "hookRepha");
        return animation;
    };

    // Pull the following target-bar letter into the processing letter for rakaar.
    const hookRakaar = () => {
        const step = getCurrentStep();
        const position = Number(step?.processingPosition);
        const followingPosition = position + 1;
        const followingBox = getTargetBox(followingPosition);
        const followingText = getTargetLetter(followingPosition);
        if (!Number.isInteger(position) || !followingBox || !followingText) {
            return genericToolAnimation();
        }

        removeTargetText(followingPosition);

        const letter = letterParts.singleLetter;
        const originalLetterY = letter.y;
        const originalScaleX = letter.scaleX;
        const originalScaleY = letter.scaleY;
        const incomingLetter = new createjs.Text(followingText, letter.font, letter.color);
        incomingLetter.textAlign = "center";
        incomingLetter.textBaseline = "middle";
        incomingLetter.x = followingBox.x + letterWidth / 2;
        incomingLetter.y = followingBox.y + letterHeight / 2;
        incomingLetter.scaleX = letterWidth / processingLetterSize;
        incomingLetter.scaleY = letterHeight / processingLetterSize;
        stage.addChild(incomingLetter);

        createjs.Tween.get(letter)
            .to({
                y: originalLetterY + processingLetterSize * 0.05,
                scaleX: originalScaleX * letterWidth / processingLetterSize,
                scaleY: originalScaleY * letterHeight / processingLetterSize,
                alpha: 0
            }, 500)
            .on("change", () => stage.update());
        const animation = createjs.Tween.get(incomingLetter)
            .to({
                x: letter.x,
                y: letter.y,
                scaleX: 1,
                scaleY: 1,
                alpha: 0
            }, 500)
            .on("change", () => stage.update());
        continueOnce(animation, 550, () => {
            stage.removeChild(incomingLetter);
            letterParts.setText(step.targetConjunct || letter.text);
            letter.y = originalLetterY;
            letter.scaleX = originalScaleX;
            letter.scaleY = originalScaleY;
            letter.alpha = 1;
            stage.update();
            createjs.Tween.get(letter)
                .wait(500)
                .call(() => animateProcessedLetterToTarget(0, 0));
        }, "hookRakaar");
        return animation;
    };

    // Shrink and overlap two letters, shatter them, then reveal their conjunct.
    const hammerReforge = () => {
        const step = getCurrentStep();
        const position = Number(step?.processingPosition);
        const followingPosition = position + 1;
        const followingBox = getTargetBox(followingPosition);
        if (!Number.isInteger(position) || !followingBox) {
            return genericToolAnimation();
        }

        const letter = letterParts.singleLetter;
        const sourceText = letter.text;
        letterParts.setMode("single");
        letter.visible = true;
        letter.alpha = 1;
        const targetScaleX = letterWidth / processingLetterSize;
        const targetScaleY = letterHeight / processingLetterSize;
        const letterX = processingLetterBox.x + processingLetterSize / 2;
        const letterY = processingLetterBox.y + processingLetterSize / 2;
        letter.x = letterX;
        letter.y = letterY;
        letter.regX = letter.regY = 0;

        // Fetch the following character and move it over the processing letter.
        const startIncomingLetter = () => {
            const followingText = getTargetLetter(followingPosition);
            if (!followingText) {
                letter.scaleX = letter.scaleY = 1;
                stage.update();
                return;
            }
            removeTargetText(followingPosition);
            followingBox.visible = false;

            const incomingLetter = new createjs.Text(followingText, letter.font, letter.color);
            incomingLetter.textAlign = "center";
            incomingLetter.textBaseline = "middle";
            incomingLetter.x = followingBox.x + letterWidth / 2;
            incomingLetter.y = followingBox.y + letterHeight / 2;
            incomingLetter.scaleX = targetScaleX;
            incomingLetter.scaleY = targetScaleY;
            stage.addChild(incomingLetter);
            stage.update();

            // Replace both letters with shards, then reveal the re-forged conjunct.
            const startSmash = () => {
                const shardCount = 15 + Math.floor(Math.random() * 6);
                const shards = [];
                const shardStageIndex = Math.max(0, stage.getChildIndex(letter));
                let firstShardTween = null;
                letter.visible = false;
                incomingLetter.visible = false;

                for (let index = 0; index < shardCount; index += 1) {
                    const width = letterWidth * (4 + Math.random() * 7) / 85;
                    const height = letterHeight * (4 + Math.random() * 7) / 85;
                    const shard = new createjs.Shape();
                    shard.graphics.beginFill("#FFFFFF")
                        .moveTo(0, -height / 2)
                        .lineTo(width / 2, -height / 4)
                        .lineTo(width / 3, height / 2)
                        .lineTo(-width / 2, height / 4)
                        .closePath();
                    shard.x = letterX + (Math.random() - 0.5) * letterWidth;
                    shard.y = letterY + (Math.random() - 0.5) * letterHeight;
                    stage.addChildAt(shard, Math.min(shardStageIndex, stage.numChildren));
                    shards.push(shard);

                    const angle = Math.random() * Math.PI * 2;
                    const distance = letterWidth * (12 + Math.random() * 38) / 85;
                    const shardTween = createjs.Tween.get(shard)
                        .to({
                            x: shard.x + Math.cos(angle) * distance,
                            y: shard.y + Math.sin(angle) * distance
                                + letterHeight * (5 + Math.random() * 14) / 85,
                            rotation: (Math.random() - 0.5) * 360
                        }, 350)
                        .wait(500)
                        .to({
                            x: letterX,
                            y: letterY,
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0
                        }, 300);
                    shardTween.on("change", () => stage.update());
                    if (index === 0) firstShardTween = shardTween;
                }
                stage.removeChild(incomingLetter);
                stage.update();

                // Show the new conjunct once the shard animation has completed.
                const finishShards = () => {
                    shards.forEach(shard => stage.removeChild(shard));
                    letterParts.setText(step.targetConjunct || sourceText);
                    letter.scaleX = letter.scaleY = 0;
                    letter.x = letterX;
                    letter.y = letterY;
                    letter.alpha = 0;
                    letter.visible = true;
                    stage.update();

                    const targetFade = createjs.Tween.get(letter)
                        .to({alpha: 1, scaleX: 1, scaleY: 1}, 500, createjs.Ease.backOut);
                    targetFade.on("change", () => stage.update());
                    continueOnce(targetFade, 550, () => {
                        animateProcessedLetterToTarget(0, 0);
                    }, "hammerReforgeTargetFade");
                };
                continueOnce(firstShardTween, 1200, finishShards, "hammerReforgeShatter");
            };

            const joinAnimation = createjs.Tween.get(incomingLetter)
                .to({x: letterX, y: letterY}, 500)
                .wait(100);
            joinAnimation.on("change", () => stage.update());
            continueOnce(joinAnimation, 650, startSmash, "hammerReforgeJoin");
        };

        const shrinkAnimation = createjs.Tween.get(letter)
            .to({scaleX: targetScaleX, scaleY: targetScaleY}, 350);
        shrinkAnimation.on("change", () => stage.update());
        continueOnce(shrinkAnimation, 400, startIncomingLetter, "hammerReforgeShrink");
        stage.update();
        return shrinkAnimation;
    };

    // Dispatch the processed letter to its target without applying a cut offset.
    const gloveDispatch = () => animateProcessedLetterToTarget(0, 0);

    // Map animation names to the corresponding tool-specific implementation.
    const handlers = {
        axeSplit: params => {
            const value = Number(params.hiddenRightRatio);
            const ratio = Number.isFinite(value) && value > 0 && value < 1
                ? value
                : defaultHiddenRightRatio;
            return axeSplit(ratio);
        },
        scissorsTrim: params => {
            // Keep signed offsets; the cut-position helpers clamp the resulting lines.
            const readRatio = (value, fallback) => {
                const ratio = Number(value);
                return Number.isFinite(ratio) ? ratio : fallback;
            };
            return scissorsTrim(
                readRatio(params.hiddenRightRatio, 0.45),
                readRatio(params.hiddenBottomRatio, 0.45)
            );
        },
        hookJoin,
        hookRepha,
        hookRakaar,
        hammerReforge,
        gloveDispatch
    };

    return {
        // Set the required visual mode and run the selected animation.
        run(animationName, params = {}) {
            letterParts.setMode(animationName === "axeSplit" ? "axe" : animationName === "scissorsTrim" ? "trim" : "single");
            return (handlers[animationName] || genericToolAnimation)(params);
        }
    };
};
