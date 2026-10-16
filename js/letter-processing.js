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
    let visual = axeVisual;

    return {
        firstLetter,
        secondLetter,
        firstMask,
        secondMask,
        singleLetter,
        get visual() { return visual; },
        setMode(mode) {
            visual = mode === "axe" ? axeVisual : singleVisual;
            firstLetter.visible = mode === "axe";
            secondLetter.visible = false;
            singleLetter.visible = mode !== "axe";
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

SanskritSmith.createLetterProcessor = ({
    stage,
    createjs,
    letterParts,
    processingLetterBox,
    processingLetterSize,
    letterWidth,
    letterHeight,
    getCurrentStep,
    getTargetBox,
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

    const animateProcessedLetterToTarget = (visual = letterParts.visual) => {
        const verticalDistance = processingLetterSize * 0.25;
        const movingParts = [...visual.letters, ...visual.masks];
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
                stage.update();
                console.log("[processedLetter] flight finished; starting target conjunct", {
                    targetPositions: step.targetPositions,
                    targetConjunct: step.targetConjunct
                });
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
            const firstFlight = flights[0];
            continueOnce(firstFlight, 550, finishFlight, "flight");
        };

        const shrinkToTargetSize = () => {
            const targetScaleX = letterWidth / processingLetterSize;
            const targetScaleY = letterHeight / processingLetterSize;
            const shrinkLetter = (letter, boundaryX) => {
                letter.regX = boundaryX - letter.x;
                letter.x = boundaryX;
                createjs.Tween.get(letter)
                    .to({scaleX: targetScaleX, scaleY: targetScaleY}, 400)
                    .on("change", () => stage.update());
            };

            if (visual.shrinkMode === "cut") {
                shrinkLetter(secondLetter, secondLetterMask.x);
                shrinkLetter(firstLetter, firstLetterMask.x + processingLetterSize * firstLetterMask.scaleX);
            } else {
                const letter = visual.letters[0];
                letter.regX = 0;
                letter.regY = 0;
                createjs.Tween.get(letter)
                    .to({scaleX: targetScaleX, scaleY: targetScaleY}, 400)
                    .on("change", () => stage.update());
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
        const visibleLeftRatio = 1 - hiddenRightRatio;
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
        secondLetterMask.scaleX = hiddenRightRatio;
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
            animateProcessedLetterToTarget();
        }, "axeSplit");
        return splitTween;
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

    const handlers = {
        axeSplit: params => {
            const value = Number(params.hiddenRightRatio);
            const ratio = Number.isFinite(value) && value > 0 && value < 1
                ? value
                : defaultHiddenRightRatio;
            return axeSplit(ratio);
        }
    };

    return {
        run(animationName, params = {}) {
            letterParts.setMode(animationName === "axeSplit" ? "axe" : "single");
            return (handlers[animationName] || genericToolAnimation)(params);
        }
    };
};
