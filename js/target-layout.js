window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.isCompleteTargetStep = step => Boolean(step)
    && (step.processingPosition === "" || step.processingPosition == null)
    && (step.tool === "" || step.tool == null);

SanskritSmith.getTargetPositions = (step, boxCount) => [...new Set((step?.targetPositions || [])
    .map(Number)
    .filter(position => Number.isInteger(position) && position > 0 && position <= boxCount))]
    .sort((a, b) => a - b);

SanskritSmith.getTargetSlotCenterX = (position, startX, width, gap) =>
    startX + (position - 1) * (width + gap) + width / 2;
