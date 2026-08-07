const socket = io();

let username = "";

let isAdmin = false;


// ========================================
// ELEMENTS
// ========================================

const authScreen =
    document.getElementById("authScreen");

const chatApp =
    document.getElementById("chatApp");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const loginUsername =
    document.getElementById("loginUsername");

const loginPassword =
    document.getElementById("loginPassword");

const registerUsername =
    document.getElementById("registerUsername");

const registerPassword =
    document.getElementById("registerPassword");

const registerCode =
    document.getElementById("registerCode");

const loginButton =
    document.getElementById("loginButton");

const registerButton =
    document.getElementById("registerButton");

const showRegister =
    document.getElementById("showRegister");

const showLogin =
    document.getElementById("showLogin");

const authMessage =
    document.getElementById("authMessage");

const input =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const messages =
    document.getElementById("messages");

const onlineUsers =
    document.getElementById("onlineUsers");

const adminButton =
    document.getElementById("adminButton");

const adminPanel =
    document.getElementById("adminPanel");

const closeAdmin =
    document.getElementById("closeAdmin");

const adminUsers =
    document.getElementById("adminUsers");

const adminLogs =
    document.getElementById("adminLogs");

const statUsers =
    document.getElementById("statUsers");

const statOnline =
    document.getElementById("statOnline");

const statMessages =
    document.getElementById("statMessages");

const clearChatButton =
    document.getElementById("clearChatButton");


// ========================================
// LOGIN / REGISTER SWITCH
// ========================================

showRegister.addEventListener(
    "click",
    () => {

        loginForm.classList.add(
            "hidden"
        );

        registerForm.classList.remove(
            "hidden"
        );

        authMessage.textContent = "";

    }
);


showLogin.addEventListener(
    "click",
    () => {

        registerForm.classList.add(
            "hidden"
        );

        loginForm.classList.remove(
            "hidden"
        );

        authMessage.textContent = "";

    }
);


// ========================================
// REGISTER
// ========================================

registerButton.addEventListener(
    "click",
    register
);


async function register() {

    const newUsername =
        registerUsername.value.trim();

    const password =
        registerPassword.value;

    const code =
        registerCode.value.trim();


    if (
        !newUsername ||
        !password ||
        !code
    ) {

        showAuthMessage(
            "Fill in all fields."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/register",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            newUsername,

                        password:
                            password,

                        code:
                            code

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            showAuthMessage(
                result.message
            );

            return;

        }


        showAuthMessage(
            "Account created! Login now."
        );


        registerForm.classList.add(
            "hidden"
        );

        loginForm.classList.remove(
            "hidden"
        );


        loginUsername.value =
            newUsername;

        loginPassword.focus();

    }

    catch (error) {

        console.error(error);

        showAuthMessage(
            "Server connection failed."
        );

    }

}


// ========================================
// LOGIN
// ========================================

loginButton.addEventListener(
    "click",
    login
);


async function login() {

    const loginName =
        loginUsername.value.trim();

    const password =
        loginPassword.value;


    if (
        !loginName ||
        !password
    ) {

        showAuthMessage(
            "Enter username and password."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/login",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            loginName,

                        password:
                            password

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            showAuthMessage(
                result.message
            );

            return;

        }


        enterChat(
            result.username,
            result.role
        );

    }

    catch (error) {

        console.error(error);

        showAuthMessage(
            "Server connection failed."
        );

    }

}


// ========================================
// ENTER CHAT
// ========================================

function enterChat(
    name,
    role
) {

    username = name;

    isAdmin =
        role === "admin";


    authScreen.classList.add(
        "hidden"
    );

    chatApp.classList.remove(
        "hidden"
    );


    if (isAdmin) {

        adminButton.classList.remove(
            "hidden"
        );

    }


    socket.emit(
        "join",
        username
    );


    input.focus();

}


// ========================================
// AUTH MESSAGE
// ========================================

function showAuthMessage(message) {

    authMessage.textContent =
        message;

}


// ========================================
// SEND MESSAGE
// ========================================

sendButton.addEventListener(
    "click",
    sendMessage
);


input.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            sendMessage();

        }

    }
);


function sendMessage() {

    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    socket.emit(
        "chat message",
        text
    );


    input.value = "";

    input.focus();

}


// ========================================
// RECEIVE MESSAGE
// ========================================

socket.on(
    "chat message",
    data => {

        displayMessage(data);

    }
);


// ========================================
// HISTORY
// ========================================

socket.on(
    "message history",
    history => {

        messages.innerHTML = "";


        history.forEach(
            data => {

                displayMessage(
                    data
                );

            }
        );

    }
);


// ========================================
// DISPLAY MESSAGE
// ========================================

function displayMessage(data) {

    const message =
        document.createElement(
            "div"
        );


    message.className =
        "chat-message";


    message.dataset.id =
        data.id;


    const name =
        document.createElement(
            "strong"
        );

    name.textContent =
        data.username;


    const time =
        document.createElement(
            "span"
        );

    time.className =
        "message-time";

    time.textContent =
        data.time || "";


    const text =
        document.createElement(
            "p"
        );

    text.textContent =
        data.message;


    message.appendChild(name);

    message.appendChild(time);

    message.appendChild(text);


    if (
        isAdmin &&
        data.id
    ) {

        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.textContent =
            "Delete";


        deleteButton.className =
            "delete-message";


        deleteButton.onclick =
            () => {

                socket.emit(
                    "admin delete message",
                    data.id
                );

            };


        message.appendChild(
            deleteButton
        );

    }


    messages.appendChild(
        message
    );


    messages.scrollTop =
        messages.scrollHeight;

}


// ========================================
// ONLINE USERS
// ========================================

socket.on(
    "users update",
    users => {

        updateOnlineUsers(
            users
        );

    }
);


function updateOnlineUsers(users) {

    onlineUsers.innerHTML = "";


    users.forEach(
        user => {

            const person =
                document.createElement(
                    "div"
                );


            person.className =
                "online-user";


            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "user-avatar";


            avatar.textContent =
                user.username
                    .charAt(0)
                    .toUpperCase();


            const details =
                document.createElement(
                    "div"
                );


            details.className =
                "user-details";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                user.username;


            const status =
                document.createElement(
                    "span"
                );


            status.textContent =
                "Online";


            details.appendChild(name);

            details.appendChild(status);


            person.appendChild(
                avatar
            );

            person.appendChild(
                details
            );


            onlineUsers.appendChild(
                person
            );

        }
    );

}


// ========================================
// ADMIN PANEL OPEN
// ========================================

adminButton.addEventListener(
    "click",
    () => {

        if (!isAdmin) {
            return;
        }


        adminPanel.classList.remove(
            "hidden"
        );


        socket.emit(
            "admin request"
        );

    }
);


// ========================================
// ADMIN PANEL CLOSE
// ========================================

closeAdmin.addEventListener(
    "click",
    () => {

        adminPanel.classList.add(
            "hidden"
        );

    }
);


// ========================================
// ADMIN DATA
// ========================================

socket.on(
    "admin data",
    data => {

        renderAdminData(
            data
        );

    }
);


function renderAdminData(data) {

    statUsers.textContent =
        data.users.length;

    statOnline.textContent =
        data.online.length;

    statMessages.textContent =
        data.messages;


    renderAdminUsers(
        data.users,
        data.online
    );


    renderAdminLogs(
        data.logs
    );

}


// ========================================
// ADMIN USERS
// ========================================

function renderAdminUsers(
    users,
    online
) {

    adminUsers.innerHTML = "";


    users.forEach(
        user => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "admin-user";


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "admin-user-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                user.username;


            const role =
                document.createElement(
                    "span"
                );


            role.textContent =
                user.role === "admin"
                    ? "ADMIN"
                    : "USER";


            info.appendChild(name);

            info.appendChild(role);


            const controls =
                document.createElement(
                    "div"
                );


            controls.className =
                "admin-controls";


            if (
                user.username.toLowerCase() !==
                "admin"
            ) {

                const kick =
                    document.createElement(
                        "button"
                    );


                kick.textContent =
                    "Kick";


                kick.onclick =
                    () => {

                        socket.emit(
                            "admin kick",
                            user.username
                        );

                    };


                const ban =
                    document.createElement(
                        "button"
                    );


                ban.textContent =
                    "Ban 1h";


                ban.onclick =
                    () => {

                        socket.emit(
                            "admin ban",
                            {
                                username:
                                    user.username,

                                duration:
                                    60
                            }
                        );

                        refreshAdmin();

                    };


                const lifetime =
                    document.createElement(
                        "button"
                    );


                lifetime.textContent =
                    "Lifetime";


                lifetime.onclick =
                    () => {

                        if (
                            confirm(
                                `Ban ${user.username} permanently?`
                            )
                        ) {

                            socket.emit(
                                "admin ban",
                                {
                                    username:
                                        user.username,

                                    duration:
                                        "lifetime"
                                }
                            );

                            refreshAdmin();

                        }

                    };


                const rename =
                    document.createElement(
                        "button"
                    );


                rename.textContent =
                    "Rename";


                rename.onclick =
                    () => {

                        const newName =
                            prompt(
                                `New username for ${user.username}:`
                            );


                        if (
                            newName &&
                            newName.trim()
                        ) {

                            socket.emit(
                                "admin rename",
                                {

                                    username:
                                        user.username,

                                    newUsername:
                                        newName.trim()

                                }
                            );


                            refreshAdmin();

                        }

                    };


                const unban =
                    document.createElement(
                        "button"
                    );


                unban.textContent =
                    "Unban";


                unban.onclick =
                    () => {

                        socket.emit(
                            "admin unban",
                            user.username
                        );


                        refreshAdmin();

                    };


                controls.appendChild(
                    kick
                );

                controls.appendChild(
                    ban
                );

                controls.appendChild(
                    lifetime
                );

                controls.appendChild(
                    rename
                );

                controls.appendChild(
                    unban
                );

            }


            row.appendChild(
                info
            );

            row.appendChild(
                controls
            );


            adminUsers.appendChild(
                row
            );

        }
    );

}


// ========================================
// ADMIN LOGS
// ========================================

function renderAdminLogs(logs) {

    adminLogs.innerHTML = "";


    logs.slice()
        .reverse()
        .forEach(
            log => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "admin-log";


                item.textContent =
                    `${new Date(log.time).toLocaleString()} — ${log.action}`;


                adminLogs.appendChild(
                    item
                );

            }
        );

}


// ========================================
// REFRESH ADMIN
// ========================================

function refreshAdmin() {

    setTimeout(
        () => {

            socket.emit(
                "admin request"
            );

        },
        300
    );

}


// ========================================
// DELETE MESSAGE
// ========================================

socket.on(
    "message deleted",
    messageId => {

        const message =
            document.querySelector(
                `[data-id="${messageId}"]`
            );


        if (message) {

            message.remove();

        }

    }
);


// ========================================
// CLEAR CHAT
// ========================================

clearChatButton.addEventListener(
    "click",
    () => {

        if (
            !confirm(
                "Delete ALL chat history?"
            )
        ) {

            return;

        }


        socket.emit(
            "admin clear chat"
        );

    }
);


socket.on(
    "chat cleared",
    () => {

        messages.innerHTML = "";

        refreshAdmin();

    }
);


// ========================================
// KICKED
// ========================================

socket.on(
    "kicked",
    () => {

        alert(
            "You have been kicked by an administrator."
        );

        location.reload();

    }
);


// ========================================
// BANNED
// ========================================

socket.on(
    "banned",
    data => {

        alert(
            data.message
        );

        location.reload();

    }
);


// ========================================
// ADMIN DENIED
// ========================================

socket.on(
    "admin denied",
    () => {

        alert(
            "Admin access denied."
        );

    }
);