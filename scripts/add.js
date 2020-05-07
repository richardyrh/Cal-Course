let token = "";
let courseURL = "";

$(() => {
    token = readCookie("token");
    if (!token) {
        window.location.href = 'index.html?redirect=add';
    }
});

function readCookie(name) {
    name = encodeURIComponent(name) + "=";
    for (c of document.cookie.split(';')) {
        c = c.trim();
        if (c.indexOf(name) === 0) {
            return decodeURIComponent(c.substring(name.length, c.length));
        }
    }
    return null;
}

function processSubmit() {
    if (isLegalCourse()) {
        let term = $("input[name='term']:checked").val();
        let depCode = $("#dep-code").val().toUpperCase();
        let courseCode = $("#course-code").val().toUpperCase();
        findDuplicate(term, depCode, courseCode, courseURL);
    } else {
        $("#submit-text").text("课程信息不正确");
    }
}

function submitInfo(name, code, term) {
    $.ajax({
        type: 'POST',
        url: 'http://118.25.79.158:3000/api/v1/courses/',
        // FIXME： change to actual token
        headers: {
            "Authorization": 'Bearer ' + token,
            "Content-Type": 'application/json',
        },
        dataType: 'json',
        data: JSON.stringify({
            "name": name,
            "code": code,
            "term": term,
            "qr_code": courseURL,
        }),
        success: (response) => {
            console.log(response);
            $("#submit-text").text("添加成功！");
        },
        error: (response) => {
            console.log(response);
        },
    });
}

function loadPreview() {
    updateQrCss("qr-container");
    let imgContainer = $(
        `<div id="img-container">
            <canvas id="canv" width=0 height=0></canvas>
            <div id="upload-text"></div>
        </div>`);
    $("#img-wrapper").html("").append(imgContainer);
    let qrCodeFile = $("#qr")[0].files[0];
    if (!qrCodeFile) {
        $("#upload-text").text("emm.. 还在盼着二维码");
        return;
    }
    let previewer = new FileReader();
    previewer.onload = (e) => {
        let qrCodeImg = new Image();
        qrCodeImg.src = e.target.result;
        qrCodeImg.onload = () => {
            let canv = $("#canv")[0];
            let context = canv.getContext("2d");
            fitImageOntoCanvasAndDisplay(context, qrCodeImg, 150, 200);
            try {
                let img_data = new ImageData(
                    context.getImageData(
                        0, 0, canv.width, canv.height).data,
                    canv.width,
                    canv.height);
                updatePageURLWithImageUploaded(img_data);
            } catch (err) {
                $("#upload-text").text("唔，出错了，请重试");
            }
        }
    };
    previewer.readAsDataURL(qrCodeFile);
}


function fitImageOntoCanvasAndDisplay(ctx, image, width, height) {
    let scale = Math.min((width / image.width), (height / image.height), 1);
    canv.width = image.width * scale;
    canv.height = image.height * scale;
    ctx.drawImage(image, 0, 0, canv.width, canv.height);
}

function updatePageURLWithImageUploaded(image_data){
    let url = getURL(image_data);
    $("#upload-text").text("");
    switch (url){
    case 2:
        $("#upload-text").text("哎？好像不是二维码");
        break;
    case 1:
        $("#upload-text").text("确定这是微信二维码？？？");
        break;
    default:
        updateQrCss("qr-container-contained");
        courseURL = url;
        break;
    }
}

function updateQrCss(cssClass) {
    let qrContainer = $("#qr-upload");
    qrContainer.removeClass("qr-container", "qr-container-contained");
    qrContainer.addClass(cssClass)
}

function isLegalURL(url) {
    let regex = new RegExp("^https://weixin.qq.com/g/([a-zA-Z0-9-_]{16})$");
    if (regex.test(url)) {
        return true;
    }
    return false;
}

// image_data is ImageData or Uint8ClampedArray, give it undecoded stuff shit will happen
function getURL(image_data) {
    let qrCodeRead = jsQR(image_data.data, image_data.width, image_data.height);
    if (qrCodeRead) {
        url = qrCodeRead.data;
        if (isLegalURL(url)){
            return url;
        }
        return 1;
    }
    else {
        return 2;
    }
}


function getCode() {
    return $("#dep-code").val().toUpperCase() + " " + $("#course-code").val().toUpperCase();
}

function findDuplicate(term, depCode, couCode, url) {
    $.ajax({
        url: 'http://118.25.79.158:3000/api/v1/courses/',
        headers: {
            "Authorization": "Bearer " + token,
        },
        success: (response) => {
            let found = findInResponse(response, term, depCode, couCode, url);
            if (found) {
                $("#submit-text").text("已经有了哦");
            } else {
                submitInfo($("#course-name").val(), getCode(), term);
            }
        },
        error: (response) => {
            $("#submit-text").text("糟糕，服务器走丢了！");
        }
    });
}

function findInResponse(response, term, depCode, couCode, url) {
    let found = false;
    for (let course of response) {
        if (course.term === term) {
            let courseCodeSplit = course.code.split(" ");
            if (courseCodeSplit[0] === depCode && courseCodeSplit[1] === couCode) {
                found = true;
                break;
            }
        }
        if (course.qr_code === url) {
            found = true;
            break;
        }
    }
    return found;
}

function isNotEmpty(value) {
    if (!value) {
        console.log("No input");
        return false;
    } else if (value.replace(/(^s*)|(s*$)/g, "").length === 0) {
        console.log("Empty input");
        return false;
    }
    return true;
}

function isLegalCode(code) {
    let regex = new RegExp("^([a-zA-Z]+ [a-zA-Z]?[0-9]+[a-zA-Z]*-[0-9]{3})$");
    if (regex.test(code)) {
        return true;
    } else {
        console.log("Wrong course code.");
        return false;
    }
}

function isLegalCourse() {
    let depCodeInputField = $("#dep-code");
    let depCodeInput = depCodeInputField.val();
    let couCodeInputField = $("#course-code");
    let couCodeInput = couCodeInputField.val();
    let nameInputField = $("#course-name");
    let nameInput = nameInputField.val();
    if (!$("input[name='term']:checked").val()) {
        return false;
    }
    if (isNotEmpty(depCodeInput) && isNotEmpty(couCodeInput) && isNotEmpty(nameInput)) {
        if (depCodeInput === "CS") {
            depCodeInput = "COMPSCI";
        }
        depCodeInput = depCodeInput.toUpperCase();
        couCodeInput = couCodeInput.toUpperCase();
        let code = depCodeInput + " " + couCodeInput;
        if (isLegalCode(code)) {
            if (isLegalURL(courseURL)) {
                return true;
            }
            console.log("no image");
        }
    }
    return false;
}
