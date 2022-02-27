let api = "https://backend.calcourse.jackli.org/api/v1/";
let cookiesLoaded = false;
let helpLoaded = false;
let cardAnimationLock = null;
let cardAnimationTimeout = null;

$(() => {
    $("#login-wrapper").removeClass("hidden");

    $("#email-code-button").on("click", sendEmailCode);

    $("#email-login-button").on("click", onEmailSignIn);

    if (/micromessenger/.test(navigator.userAgent.toLowerCase())) {
        document.getElementById("google-login-label").onclick = toggleGoogleAuthDisabled;
    }

    $("#search-input").on("input", () => {
        filter();
    });
    
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

    $.urlParam = (name) => {
        let results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results && results.length >= 2) {
            return results[1] || 0;
        }
    };

    if ($.urlParam("timeout")) {
        errorAlert("登录过期，请重新登陆");
    }

    let token = readToken();
    if (token) {
        loadCourses(token);
    }
});

let ids = [];

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

let COUNTDOWN_INI = 60;
let COUNTDOWN_CUR = 60;
let USER_EMAIL = "";
let USER_CODE = "";

function handleClientLoad() {
    gapi.load('auth2', () => {
        auth2 = gapi.auth2.init({
            client_id: '707915550129-7l94p2dpplaoub3d6clhrjpivki6dqpe.apps.googleusercontent.com',
            cookiepolicy: 'single_host_origin'
        });
        auth2.attachClickHandler($("#google-login-button")[0], {}, onGoogleSignIn, (error) => {
            if (error.error.indexOf("closed by user") == -1) {
                errorAlert("验证失败，请重试");
                console.log(error.error);
            }
        });
    });
}

function errorAlert(msg) {
    let login_description = $("#login-description");
    login_description.text('\u26A0' + '\n' + msg);
    login_description.css('color', '#FBEC5D');
    login_description.addClass("shake").on("animationend", function(e) {
        $(this).removeClass('shake').off("animationend");
    });
}

function errorRestore(msg) {
    let login_description = $("#login-description");
    login_description.text(msg);
    login_description.css('color', '#FFFFFF');
}

function toggleEmailColor(e_button, g_button) {
    e_button.css("background-color","#DA8388");
    e_button.css("color","#FFFFFF");
    g_button.css("background-color","#333");
    g_button.css("color","#DA8388");
}

function toggleGoogleColor(e_button, g_button) {
    g_button.css("background-color","#DA8388");
    g_button.css("color","#FFFFFF");
    e_button.css("background-color","#333");
    e_button.css("color","#DA8388");
}

function toggleEmailAuth() {
    if($("#google-login-radio").is(':checked')) {
        $("#google-auth-wrapper").slideUp(200, function () {
            $("#email-auth-wrapper").slideDown(300);
        });
        errorRestore("我们需要验证你的学生身份");
    } else {
        $("#email-auth-wrapper").slideDown(300);
    }
    let g_button = $(".auth-option-wrapper > .auth-option[for=\"google-login-radio\"]");
    let e_button = $(".auth-option-wrapper > .auth-option[for=\"email-login-radio\"]");
    e_button.hover(function () {
        toggleEmailColor(e_button, g_button);
        }, function () {
        toggleEmailColor(e_button, g_button);
    });
    g_button.hover(function() {
        toggleGoogleColor(e_button, g_button)
    }, function () {
        toggleEmailColor(e_button, g_button)
    });
}

function toggleGoogleAuth() {
    if($("#email-login-radio").is(':checked')) {
        $("#email-auth-wrapper").slideUp(200, function () {
            $("#google-auth-wrapper").slideDown(300);
        });
        errorRestore("我们需要验证你的学生身份");
    } else {
        $("#google-auth-wrapper").slideDown(300);
    }
    let g_button = $(".auth-option-wrapper > .auth-option[for=\"google-login-radio\"]");
    let e_button = $(".auth-option-wrapper > .auth-option[for=\"email-login-radio\"]");
    e_button.hover(function () {
        toggleEmailColor(e_button, g_button);
        }, function () {
        toggleGoogleColor(e_button, g_button);
    });
    g_button.hover(function() {
        toggleGoogleColor(e_button, g_button);
    }, function () {
        toggleGoogleColor(e_button, g_button);
    });
}

function toggleGoogleAuthDisabled() {
    errorAlert("当前浏览器不支持Google登录");
}

function sendEmailCode() {
    let emailInput = $("#email-input").val().toLowerCase();
    let emailReg = new RegExp("^[A-Za-z0-9._-]+$");
    if (!emailInput) {
        errorAlert("请填写Berkeley邮箱地址");
    } else if (!emailReg.test(emailInput)) {
        errorAlert("邮箱格式不正确");
    } else {
        $("#email-code-button").hide();
        $("#email-code-ani").show();
        USER_EMAIL = emailInput + "@berkeley.edu";
        let form = new FormData();
        form.append("email", USER_EMAIL);
        $.ajax({url: api + "auth/code/",
            type: "POST",
            data: form,
            processData: false,
            contentType: false,
            success: (response) => {
                $("#email-code-ani").hide();
                $("#email-code-button").show();
                sendEmailCodeCountDown();
                $('#login-description').text("请查收并填写邮箱验证码");
            }, error: (response) => {
                console.log(response);
                $("#email-code-ani").hide();
                $("#email-code-button").show();
                errorAlert("无法发送验证码到该邮箱，请重试");
            }});
    }
}

function sendEmailCodeCountDown() {
    const sendEmailCodeButton = $("#email-code-button");
    if (COUNTDOWN_CUR === 0) {
        sendEmailCodeButton.css("cursor", "pointer");
        sendEmailCodeButton.css("color", "");
        sendEmailCodeButton.html("<span>获取</span>");
        $("#email-code-button").on("click", sendEmailCode);
        COUNTDOWN_CUR = COUNTDOWN_INI;
    } else {
        sendEmailCodeButton.css("cursor", "default");
        sendEmailCodeButton.css("color", "#707070");
        sendEmailCodeButton.html("<span>" + COUNTDOWN_CUR + "</span>");
        if (COUNTDOWN_CUR === COUNTDOWN_INI) {
            $("#email-code-button").off("click");
        }
        COUNTDOWN_CUR -= 1;
        setTimeout(function() { sendEmailCodeCountDown() },1000);
    }
}

function onEmailSignIn() {
    let codeInput = $("#email-code-input").val();
    let codeReg = new RegExp("^[0-9]{6}$");
    if (!USER_EMAIL) {
        errorAlert("请先获取验证码");
    } else if (!codeInput) {
        errorAlert("请填写验证码");
    } else if (!codeReg.test(codeInput)) {
        errorAlert("验证码格式不正确");
    } else {
        $("#email-login-button").hide();
        $("#email-login-ani").show();
        USER_CODE = codeInput;
        let form = new FormData();
        form.append("email", USER_EMAIL);
        form.append("code", USER_CODE);
        $.ajax({url: api + "auth/email/",
            type: "POST",
            data: form,
            processData: false,
            contentType: false,
            mimeType: "multipart/form-data",
            success: (response) => {
                let response_data = JSON.parse(response);
                let token = response_data["token"];
                $("#email-login-button").html("<span>登录</span>");
                $("#email-login-button").on("click", onEmailSignIn);
                createToken(token);
                if ($.urlParam("redirect") === "add") {
                    window.location.href = "add.html";
                } else if ($.urlParam("redirect") === "queue") {
                    window.location.href = "queue.html";
                } else if ($.urlParam("redirect") === "register") {
                    window.location.href = "register.html";
                } else {
                    loadCourses(token);
                }
            }, error: (response) => {
                console.log(response);
                $("#email-login-ani").hide();
                $("#email-login-button").show();
                errorAlert("验证失败，请重试");
            }});
    }
}
  
function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

function addCard(id, name, url, term) {
    ids.push(id);
    let lastSpace = name.lastIndexOf(" ");
    let codePart = escapeHtml(lastSpace == -1 ? "" : name.substring(0, lastSpace));
    let numPart = escapeHtml(name.substring(lastSpace + 1, name.length));
    let newCard = $(
        `<div class="card" data-id="${id}" data-name="${name}"
                           data-url="${url}" data-term="${term}">
            <div class="id-wrapper">
                <div class="id">
                    <span>
                        ${codePart} <span>${numPart}</span>
                    </span>
                </div>
            </div>
            <div class="qrcode"></div>
            <div class="desc">${escapeHtml(id)}</div>
        </div>`);
    $("#card-container").append(newCard);
    
    newCard.on("mouseenter", cardEnter);
    newCard.on("mouseleave", cardLeave);
    newCard.on("click", cardClick);
}

function cardEnter(e) {
    let x = $(e.currentTarget);
    if (x.data("timer")) {
        clearTimeout(x.data("timer"));
        x.data("timer", null);
    } else {
        new QRCode(x.find(".qrcode")[0], {
            text: x.data("url"),
            colorDark : "#333333",
            colorLight : "#da8388",
            correctLevel : QRCode.CorrectLevel.H
        });
    }
}

function cardLeave(e) {
    let x = $(e.currentTarget);
    x.data("timer", setTimeout(() => {
        x.find(".qrcode").html("");
        x.data("timer", null);
    }, 150));
}


function cardClick(e) {
let currentCardDesc = $(e.currentTarget).find(".id");
let originalContent = currentCardDesc.html();
currentCardDesc.fadeOut(300, function () {
 $(this).html("<span><span>右键或长按可保存二维码</span></span>");
 $(this).fadeIn(300, function () {
     $(this).fadeOut(2000, function () {
         $(this).removeClass('shake').off("animationend");
         $(this).html(originalContent);
         $(this).fadeIn(300);
     });
 });
});
}

function filter() {
substring = $("#search-input").val().toLowerCase();
let term = $("input[type='radio']:checked").data("term");
for (let id of ids) {
 let card = $(`.card[data-id="${id}"]`);
 if ((id.toLowerCase().indexOf(substring) == -1) &&
         ((card.data("name").toLowerCase().indexOf(substring)) == -1) ||
         (term !== card.data("term"))) {
     card.addClass("hidden");
 } else {
     card.removeClass("hidden");
 }
}
}

function onGoogleSignIn(googleUser) {
let profile = googleUser.getBasicProfile();
let email = profile.getEmail();
if (email.endsWith("berkeley.edu")) {
 $("#google-login-button").hide();
 $("#google-login-ani").show();
 $.ajax({url: api + "auth/", type: "POST",
     data: {email: email}, success: (response) => {
         $("#google-login-button").show();
         $("#google-login-ani").hide();
         createToken(response.token);
         if ($.urlParam("redirect") === "add") {
             window.location.href = "add.html";
         } else if ($.urlParam("redirect") === "queue") {
             window.location.href = "queue.html";
         } else if ($.urlParam("redirect") === "register") {
             window.location.href = "queue.html";
         } else {
             loadCourses(response.token);
         }
     }, error: (response) => {
         console.log(response);
         $("#google-login-button").show();
         $("#google-login-ani").hide();
         errorAlert("服务器错误，请稍后重试");
     }});
} else {
 errorAlert("请换用bConnected账号登录");
}
}

function parseTerm(x) {
if (/^(FA|SP|SU)(\d\d)$/gi.test(x)) {
 let season = {"FA": "Fall", "SP": "Spring", "SU": "Summer"};
 let year = (y) => {
     return String(2000 + parseInt(y));
 }
 return season[x.substring(0, 2)] + " " + year(x.substring(2));
} else {
 let cap = x.substring(0, 1).toUpperCase();
 return cap + x.substring(1).toLowerCase();
}
}

function loadCourses(token) {
$("#main-container").addClass("logged-in");
$("#card-container").html(
 `<div class="load-ani">
     <div></div><div></div><div></div><div></div>
 </div>`);
$.ajax({url: api + "courses/", headers: {
 "Authorization": `Bearer ${token}`
}, success: (response) => {
 $("#card-container").html("");
 $("#main-container").addClass("loaded");
 let allTerms = new Set();
 for (let course of response) {
     let term = parseTerm(course.term);
     addCard(course.code, course.name, course.qr_code, term);
     allTerms.add(term);
 }
 let registerButton = $(`
 <div id="register-button" class="card function-button">
     <div>
         <div>&#128195</div>
         <div>申请建群</div>
     </div>
 </div>`);
 $("#card-container").append(registerButton);
 registerButton.on("click", () => {
     if (readToken()) {
         window.location.href = "register.html";
     } else {
         window.location.replace("index.html?redirect=register&timeout=1");
     }
 });
 let addButton = $(`
     <div id="add-button" class="card function-button">
         <div>
             <div>&#11014</div>
             <div>上传临时二维码</div>
         </div>
     </div>`);
 $("#card-container").append(addButton);
 addButton.on("click", () => {
     if (readToken()) {
         window.location.href = "add.html";
     } else {
         window.location.replace("index.html?redirect=add&timeout=1");
     }
 });
 let logoutButton = $(`
 <div id="logout-button" class="card function-button">
     <div>
         <div>&#128274</div>
         <div>退出登录</div>
     </div>
 </div>`);
 $("#card-container").append(logoutButton);
 logoutButton.on("click", () => {
     deleteToken();
     location.reload();
 });
 let termsArray = [];
 for (let x of allTerms) {
     termsArray.push(x);
 }
 let termToInt = (x) => {
     let separator = x.indexOf(" ");
     if (separator == -1) {
         return -1;
     } else {
         let season = x.substring(0, separator);
         let year = x.substring(separator + 1, x.length);
         let seasonInt;
         switch (season.toLowerCase()) {
             case "spring":
                 seasonInt = 0;
                 break;
             case "summer":
                 seasonInt = 1;
                 break;
             case "fall":
                 seasonInt = 2;
                 break;
             default:
                 return -1;
         }
         return year * 3 + seasonInt;
     }
 };
 termsArray.sort((a, b) => {
     return termToInt(b) - termToInt(a);
 });
 for (let term of termsArray) {
     let termId = term.replace(/ /gi, "-");
     let radio = $(`
         <input type="radio" name="term" id="term-${termId}" data-term="${term}" />
         <label for="term-${termId}">${term}</label>
     `);
     $("#term-container").append(radio);
     $(radio[0]).on("change", (e) => {
         filter();
     });
 }
 if (termsArray[0]) {
     $(`#term-${termsArray[0].replace(/ /gi, "-")}`).attr("checked", "checked");
     filter();
 }
}, error: (response) => {
 console.log(response);
}});
}

function createToken(token) {
if(navigator.cookieEnabled) {
 createCookie("token", token, 1440);
}
else {
 createSession("token", token);
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

function deleteToken() {
deleteSession("token");
deleteCookie("token");
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

function deleteSession(name) {
name = encodeURIComponent(name);
if (sessionStorage.hasOwnProperty(name)) {
 return sessionStorage.removeItem(name);
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

function deleteCookie(name) {
let expires = "; expires = Thu, 01 Jan 1970 00:00:00 GMT";
document.cookie = encodeURIComponent(name) + "=/"  + expires + "; path=/";
}
