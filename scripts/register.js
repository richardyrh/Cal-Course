let api = "https://backend.calcourse.jackli.org/api/v1/";
let cookiesLoaded = false;
let helpLoaded = false;
let term = undefined;
let course_entries = []

$(() => {
    token = readToken();
    if (!token) {
        window.location.href = 'index.html?redirect=register';
    }

    $(".about-toggle").on("click", () => {
        $("#about-container").toggleClass("hidden");
    });

    $(".cookies-toggle").on("click", () => {
        if (!cookiesLoaded) {
            $("#cookies-page-container").load("policy.html");
            cookiesLoaded = true;
        }
        $("#cookies-container").toggleClass("hidden");
    });
    
    $(".help-toggle").on("click", () => {
        if (!helpLoaded) {
            $("#help-page-container").load("help.html");
            cookiesLoaded = true;
        }
        $("#help-container").toggleClass("hidden");
    });
});

let entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

function logSubmission(term) {
    if(!navigator.cookieEnabled) {
        createCookie(term, 'true', 1440);
    }
    else {
        createSession(term, 'true');
        console.log(readSession(term));
    }
}

function readLog(term) {
    if (readCookie(term) || readSession(term)) {
        return true;
    } else {
        return null;
    }
}

function readToken() {
    if(navigator.cookieEnabled) {
        return readCookie("token");
    }
    else {
        return readSession("token");
    }
}

function createSession(name, value) {
    sessionStorage.setItem(encodeURIComponent(name), encodeURIComponent(value));
}

function readSession(name) {
    name = encodeURIComponent(name);
    if (sessionStorage.hasOwnProperty(name)) {
        return sessionStorage.getItem(name);
    } else {
        return null;
    }
}

function createCookie(name, value, minutes) {
    let date = new Date();
    date.setTime(date.getTime() + minutes * 60 * 1000);
    let expires = "; expires=" + date.toUTCString();
    document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
}

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

function errorAlert(msg) {
    let register_description = $("#register-description");
    register_description.text('\u26A0 ' + msg);
    register_description.css('color', '#FBEC5D');
    register_description.addClass("shake").on("animationend", function(e) {
        $(this).removeClass('shake').off("animationend");
    });
    $("#submit-button").removeClass('submit-button-default').addClass('submit-button-error');
}

function errorRestore() {
    let register_description = $("#register-description");
    register_description.text("申请官方建群");
    register_description.css('color', '#FFFFFF');
    $("#submit-button").removeClass('submit-button-error').addClass('submit-button-default');
}

function confirmAlert() {
    $("#register-description").text("\u26A0 请确认输入的课程信息是否正确");
}

function submitSuccessAlert() {
    $("#submit-ani").slideUp(500, function () {
        $(this).remove();
        let register_description = $("#register-description");
        register_description.text("\u2713 提交成功！");
        register_description.css('color', '#77DD77');
    });
}

function termErrorAlert() {
    errorAlert("请选择学期");
    $("#term-container").removeClass("term-default").addClass("term-error");
}

function termErrorRestore() {
    $("#term-container").removeClass("term-error").addClass("term-default");
    errorRestore();
}

function inputErrorAlert(input_id) {
    $(input_id).removeClass('course-input-default').addClass('course-input-error');
}

function inputErrorRestore(input_id) {
    $(input_id).removeClass('course-input-error').addClass('course-input-default');
}

function toggleTerm() {
    if ($("#register-description").text() === "\u26A0 已达到该学期一天内最大提交次数") {
        errorRestore();
    }
}

function isEmpty(value) {
    if (!value) {
        return true;
    } else return value.replace(/(^s*)|(s*$)/g, "").length === 0;
}

function isIllegal(FLAG, value) {
    switch (FLAG) {
        case "DEP_CODE":
            let depCodeReg = /^[a-zA-Z]+$/
            return !(depCodeReg.test(value) && value.length < 11);
        case "NUM_CODE":
            let numCodeReg = /^[a-zA-Z]?[0-9]+[a-zA-Z]*$/
            return !(numCodeReg.test(value) && value.length < 11);
        case "LEC_CODE":
            let lecCodeReg = /^[0-9]{1,3}$/
            return !(lecCodeReg.test(value));
    }
}

function checkNonemptyAndLegal(FLAG, value) {
    if (isEmpty(value)) {
        return false;
    } else return !isIllegal(FLAG, value);
}

function inputClean(FLAG, input_id, entry) {
    entry = entry.toUpperCase();
    switch (FLAG) {
        case "DEP_CODE":
            switch (entry) {
                case "CS":
                    entry = "COMPSCI";
                    break;
                case "NST":
                    entry = "NUSCTX";
                    break;
                case "ENG":
                    entry = "ENGLISH";
                    break;
                default:
                    break;
            }
            break;
        case "NUM_CODE":
            break;
        case "LEC_CODE":
            entry = '0'.repeat(3 - entry.length) + entry
            break;
    }
    $(input_id).val(entry);
}

function submit() {
    let term_entry = $("input[name='term']:checked").data("term");
    if(!term_entry) {
        termErrorAlert();
        return undefined;
    }
    term = term_entry;
    termErrorRestore();
    if (readLog(term)) {
        errorAlert("已达到该学期一天内最大提交次数");
        return undefined;
    }
    let course_containers = [];
    for (let i = 1; i < 6; i++){
        course_containers.push(`#course${i}-container`);
    }
    course_entries = [];
    let READY_FLAG = true;
    for (let i = 0; i < 5; i++){
        let course_dep_input = course_containers[i] + " .course-dep-code";
        let course_code_input = course_containers[i] + " .course-num-code";
        let course_lec_input = course_containers[i] + " .course-lec-code";
        let dep_entry = $(course_dep_input).val();
        let code_entry = $(course_code_input).val();
        let lec_entry = $(course_lec_input).val();
        if (isEmpty(dep_entry) && isEmpty(code_entry) && isEmpty(lec_entry)) {
            continue;
        }
        if (!checkNonemptyAndLegal("DEP_CODE", dep_entry)) {
            inputErrorAlert(course_dep_input);
            READY_FLAG = false;
        } else {
            inputErrorRestore(course_dep_input);
            inputClean("DEP_CODE", course_dep_input, dep_entry);
        }
        if (!checkNonemptyAndLegal("NUM_CODE", code_entry)) {
            inputErrorAlert(course_code_input);
            READY_FLAG = false;
        } else {
            inputErrorRestore(course_code_input);
            inputClean("NUM_CODE", course_code_input, code_entry);
        }
        if (!checkNonemptyAndLegal("LEC_CODE", lec_entry)) {
            inputErrorAlert(course_lec_input);
            READY_FLAG = false;
        } else {
            inputErrorRestore(course_lec_input);
            inputClean("LEC_CODE", course_lec_input, lec_entry);
        }
        course_entries.push({dep: dep_entry, code: code_entry, lec: lec_entry});
    }
    if (!READY_FLAG) {
        errorAlert("请输入正确的课程信息");
        return undefined;
    } else {
        errorRestore();
    }
    if (course_entries.length === 0) {
        inputErrorAlert(course_containers[0] + " .course-dep-code");
        inputErrorAlert(course_containers[0] + " .course-num-code");
        inputErrorAlert(course_containers[0] + " .course-lec-code");
        errorAlert("请至少填写一个课程");
        return undefined;
    }
    displayConfirmSubmit();
}

function displayConfirmSubmit() {
    $("#register-wrapper input").prop("disabled", true);
    $("#term-container label").css("cursor", "default");
    confirmAlert();
    $("#submit-button").hide();
    $("#edit-button").show();
    $("#confirm-button").show();
}

function edit() {
    $("#register-wrapper input").prop("disabled", false);
    $("#term-container label").css("cursor", "pointer");
    errorRestore();
    $("#edit-button").hide();
    $("#confirm-button").hide();
    $("#submit-button").show();
}

function confirmSubmit() {
    console.log(JSON.stringify(course_entries));
    $("#edit-button").hide();
    $("#confirm-button").hide();
    $("#submit-botton-wrapper").append(
        `<div id="submit-ani" class="load-ani">
            <div></div><div></div><div></div><div></div>
        </div>`);
    $.ajax({
        type: 'POST',
        url: api + 'register/',
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": 'application/json',
        },
        dataType: 'json',
        data: JSON.stringify({
            "term": term,
            "courses": course_entries,
        }),
        success: (response) => {
            submitSuccessAlert();
            logSubmission(term);
        },
        error: (response) => {
            console.log(response);
            $("#submit-ani").remove();
            displayConfirmSubmit();
            errorAlert("上传失败, 请重试");
        }
    });
}