window.SanskritSmith = window.SanskritSmith || {};

SanskritSmith.loadJson = (url, fallback) =>
    fetch(url).then(response => response.json()).catch(() => fallback);

SanskritSmith.addOutlinedText = (stage, text, font, x, y) => {
    const textOutline = new createjs.Text(text, font, "#000000");
    textOutline.textAlign = "center";
    textOutline.textBaseline = "middle";
    textOutline.outline = 3;
    textOutline.x = x;
    textOutline.y = y;
    stage.addChild(textOutline);

    const textFill = new createjs.Text(text, font, "#FFF2A8");
    textFill.textAlign = "center";
    textFill.textBaseline = "middle";
    textFill.x = x;
    textFill.y = y;
    stage.addChild(textFill);
    return {textOutline, textFill, setText(value) {
        textOutline.text = value;
        textFill.text = value;
    }};
};
