window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.createProcessingLetterParts = ({stage, createjs, baseLetter, box, size}) => {
    const makeMask = () => {
        const mask = new createjs.Shape();
        mask.graphics.beginFill("#000000").drawRect(0, 0, size, size);
        mask.x = box.x;
        mask.y = box.y;
        return mask;
    };
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

    const axeVisual = {letters: [firstLetter, secondLetter], masks: [firstMask, secondMask], shrinkMode: "cut"};
    const singleVisual = {letters: [singleLetter], masks: [], shrinkMode: "center"};
    const trimVisual = {letters: [singleLetter], masks: [secondMask], shrinkMode: "trim"};
    let visual = axeVisual;

    return {
        firstLetter,
        secondLetter,
        firstMask,
        secondMask,
        singleLetter,
        get visual() { return visual; },
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
        setText(text) {
            firstLetter.text = text;
            secondLetter.text = text;
            singleLetter.text = text;
        },
        hide() {
            firstLetter.visible = false;
            secondLetter.visible = false;
            singleLetter.visible = false;
            firstMask.visible = false;
            secondMask.visible = false;
        },
        reset(text, showFirst = true, mode = "axe") {
            [firstLetter, secondLetter, singleLetter, firstMask, secondMask].forEach(part => {
                createjs.Tween.removeTweens(part);
                part.alpha = 1;
                part.scaleX = 1;
                part.scaleY = 1;
            });
            firstLetter.regX = firstLetter.regY = 0;
            secondLetter.regX = secondLetter.regY = 0;
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

SanskritSmith.createConjunctAnimator = ({stage, createjs, targetArea, targetBarX, targetBarWidth, addOutlinedText}) => {
    let isAnimating = false;
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
    const lastPosition = positions[positions.length - 1];
    const left = targetArea.letterStartX + (firstPosition - 1) * (targetArea.letterWidth + targetArea.letterGap);
    const right = targetArea.letterStartX + (lastPosition - 1) * (targetArea.letterWidth + targetArea.letterGap) + targetArea.letterWidth;
    const processingPosition = Number(step.processingPosition);
    const hasProcessingPosition = Number.isInteger(processingPosition)
        && processingPosition > 0
        && processingPosition <= targetArea.targetBoxRefs.length;
    const centerX = completeMode
        ? targetBarX + targetBarWidth / 2
        : isFinalStep
            ? SanskritSmith.getTargetSlotCenterX(firstPosition, targetArea.letterStartX, targetArea.letterWidth, targetArea.letterGap)
        : hasProcessingPosition
            ? SanskritSmith.getTargetSlotCenterX(processingPosition, targetArea.letterStartX, targetArea.letterWidth, targetArea.letterGap)
            : (left + right) / 2;
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
            box.regX = targetArea.letterWidth / 2;
            box.regY = targetArea.letterHeight / 2;
            box.x = slotX + targetArea.letterWidth / 2;
            box.y = centerY;
            box.scaleX = 1;
            box.scaleY = 1;
            box.visible = true;
            collapseTargets.push(box);
        }
    });

    let remaining = collapseTargets.length;
    let finished = false;
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
        const replacementFontSize = isFinalStep ? 60 : 50;
        const replacementText = addOutlinedText(
            step.targetConjunct || "",
            `bold ${replacementFontSize}px Arial`,
            replacementX,
            centerY
        );
        targetArea.targetTextRefs[firstPosition - 1] = replacementText;
        if (isFinalStep) {
            let displayFinished = false;
            const finishDisplay = () => {
                if (displayFinished) return;
                displayFinished = true;
                window.setTimeout(() => {
                    isAnimating = false;
                    stage.update();
                    if (onComplete) onComplete();
                }, 1000);
            };
            [replacementText.textOutline, replacementText.textFill].forEach(text => {
                text.alpha = 0;
                text.scaleX = 0.75;
                text.scaleY = 0.75;
                createjs.Tween.get(text)
                    .to({alpha: 1, scaleX: 1.3, scaleY: 1.3}, 525)
                    .on("change", () => stage.update());
            });
            window.setTimeout(finishDisplay, 575);
            stage.update();
            return;
        }
        console.log("[targetConjunct] replacement created", {
            text: replacementText.textFill.text,
            x: replacementText.textFill.x,
            y: replacementText.textFill.y,
            visible: replacementText.textFill.visible,
            stageChildCount: stage.numChildren
        });
        stage.update();
        isAnimating = false;
        if (onComplete) onComplete();
    };

    if (!remaining) {
        finishCollapse();
        return;
    }

    collapseTargets.forEach(target => {
        createjs.Tween.get(target)
            .to({x: centerX, y: centerY, scaleX: 0, scaleY: 0, alpha: 0}, 400)
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
    }, 450);
}

    return {
        animateTargetPositionsToConjunct(step, onComplete) {
            animateConjunctPositions(step, onComplete, false);
        },
        animateCompleteConjunct(step, onComplete) {
            window.setTimeout(() => {
                animateConjunctPositions(step, onComplete, true);
            }, 500);
        },
        reset() {
            isAnimating = false;
        }
    };
};

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
    const {firstLetter, secondLetter, firstMask: firstLetterMask, secondMask: secondLetterMask} = letterParts;
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
    const getRightCutPositionRatio = hiddenRightRatio =>
        Math.max(0, Math.min(1, 0.5 + hiddenRightRatio));
    const getBottomCutPositionRatio = hiddenBottomRatio =>
        Math.max(0, Math.min(1, 0.5 + hiddenBottomRatio));

    const animateProcessedLetterToTarget = (
        hiddenRightRatio = 0,
        hiddenBottomRatio = 0,
        visual = letterParts.visual
    ) => {
        const verticalDistance = processingLetterSize * 0.25;
        const auxiliaryLines = visual.shrinkMode === "trim" && scissorsCutLines?.visible
            ? [scissorsCutLines]
            : [];
        const movingParts = [...visual.letters, ...visual.masks, ...auxiliaryLines];
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

        const shrinkToTargetSize = () => {
            const targetScaleX = letterWidth / processingLetterSize;
            const targetScaleY = letterHeight / processingLetterSize;
            const scaleLetter = letter => createjs.Tween.get(letter, {override: true})
                .to({scaleX: targetScaleX, scaleY: targetScaleY}, 400)
                .on("change", () => stage.update());

            if (visual.shrinkMode === "cut") {
                const shrinkAtBoundary = (letter, boundaryX) => {
                    letter.regX = boundaryX - letter.x;
                    letter.x = boundaryX;
                    return scaleLetter(letter);
                };
                shrinkAtBoundary(secondLetter, secondLetterMask.x);
                shrinkAtBoundary(firstLetter, firstLetterMask.x + processingLetterSize * firstLetterMask.scaleX);
            } else if (visual.shrinkMode === "trim") {
                const trimMask = letterParts.secondMask;
                const crossX = trimMask.x + processingLetterSize * getRightCutPositionRatio(hiddenRightRatio);
                const crossY = trimMask.y + processingLetterSize * getBottomCutPositionRatio(hiddenBottomRatio);
                const letter = visual.letters[0];
                letter.regX = crossX - letter.x;
                letter.regY = crossY - letter.y;
                letter.x = crossX;
                letter.y = crossY;
                trimMask.regX = crossX - trimMask.x;
                trimMask.regY = crossY - trimMask.y;
                trimMask.x = crossX;
                trimMask.y = crossY;
                auxiliaryLines.forEach(line => {
                    line.regX = crossX - line.x;
                    line.regY = crossY - line.y;
                    line.x = crossX;
                    line.y = crossY;
                });
                scaleLetter(letter);
                scaleLetter(trimMask);
                auxiliaryLines.forEach(scaleLetter);
            } else {
                const letter = visual.letters[0];
                letter.regX = letter.regY = 0;
                scaleLetter(letter);
            }
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
            animateProcessedLetterToTarget(hiddenRightRatio, 0);
        }, "axeSplit");
        return splitTween;
    };

    const scissorsTrim = (hiddenRightRatio, hiddenBottomRatio) => {
        const trimMask = letterParts.secondMask;
        createjs.Tween.removeTweens(trimMask);
        trimMask.x = processingLetterBox.x;
        trimMask.y = processingLetterBox.y;
        trimMask.scaleX = trimMask.scaleY = 1;
        trimMask.regX = trimMask.regY = 0;
        trimMask.graphics.clear().beginFill("#000000")
            .drawRect(0, 0, processingLetterSize * getRightCutPositionRatio(hiddenRightRatio), processingLetterSize)
            .drawRect(0, 0, processingLetterSize, processingLetterSize * getBottomCutPositionRatio(hiddenBottomRatio));
        const letter = letterParts.singleLetter;
        letter.regX = letter.regY = 0;
        letter.x = processingLetterBox.x + processingLetterSize / 2;
        letter.y = processingLetterBox.y + processingLetterSize / 2;
        letter.alpha = 1;
        letter.scaleX = letter.scaleY = 1;
        stage.update();
        const animation = createjs.Tween.get(letter)
            .to({alpha: 0.75}, 180)
            .to({alpha: 1}, 180);
        continueOnce(animation, 420, () => {
            stage.update();
            animateProcessedLetterToTarget(hiddenRightRatio, hiddenBottomRatio);
        }, "scissorsTrim");
        return animation;
    };

    const genericToolAnimation = () => {
        const animation = createjs.Tween.get(letterParts.singleLetter)
            .to({alpha: 0, scaleX: 1.15, scaleY: 1.15}, 180)
            .to({alpha: 1, scaleX: 1, scaleY: 1}, 180);
        continueOnce(animation, 420, () => {
            stage.update();
            animateProcessedLetterToTarget();
        }, "toolAnimation");
        return animation;
    };

    const gemHalant = params => {
        const withHalant = typeof params.withHalant === "string" ? params.withHalant : "";
        if (!withHalant) return genericToolAnimation();

        const letter = letterParts.singleLetter;
        const originalLetter = letterParts.firstLetter;
        originalLetter.text = letter.text;
        originalLetter.x = letter.x;
        originalLetter.y = letter.y;
        originalLetter.scaleX = letter.scaleX;
        originalLetter.scaleY = letter.scaleY;
        originalLetter.regX = letter.regX;
        originalLetter.regY = letter.regY;
        originalLetter.mask = null;
        originalLetter.alpha = 1;
        originalLetter.visible = true;
        letter.text = withHalant;
        letter.alpha = 0;
        letter.visible = true;
        stage.update();
        const animation = createjs.Tween.get(letter)
            .to({alpha: 1}, 200)
            .on("change", () => stage.update());
        continueOnce(animation, 450, () => {
            originalLetter.visible = false;
            stage.update();
            advanceToNextStep();
        }, "gemHalant");
        return animation;
    };

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
            animateProcessedLetterToTarget(0.5, 0.5);
        }, "hookJoin");
        return animation;
    };

    const handlers = {
        axeSplit: params => {
            const value = Number(params.hiddenRightRatio);
            const ratio = Number.isFinite(value) && value > 0 && value < 1
                ? value
                : defaultHiddenRightRatio;
            return axeSplit(ratio);
        },
        scissorsTrim: params => {
            const validRatio = (value, fallback) => {
                const ratio = Number(value);
                return Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : fallback;
            };
            return scissorsTrim(
                validRatio(params.hiddenRightRatio, 0.45),
                validRatio(params.hiddenBottomRatio, 0.45)
            );
        },
        gemHalant,
        hookJoin
    };

    return {
        run(animationName, params = {}) {
            letterParts.setMode(animationName === "axeSplit" ? "axe" : animationName === "scissorsTrim" ? "trim" : "single");
            return (handlers[animationName] || genericToolAnimation)(params);
        }
    };
};
