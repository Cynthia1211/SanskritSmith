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
    onCorrectDrop
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
        if (droppedOnLetter && step && isCorrectTool(step)) onCorrectDrop(step);

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
