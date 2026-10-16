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
