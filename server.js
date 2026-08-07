const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://codenikul.github.io",
        methods: ["GET", "POST"]
    }
});


app.use(express.json());

app.use(express.static("public"));


// ========================================
// SETTINGS
// ========================================

const PORT = 3000;

const ADMIN_USERNAME = "ADMIN";


// ========================================
// DATA FILES
// ========================================

const DATA_FOLDER =
    path.join(__dirname, "data");

const USERS_FILE =
    path.join(DATA_FOLDER, "users.json");

const MESSAGES_FILE =
    path.join(DATA_FOLDER, "messages.json");

const ADMIN_LOG_FILE =
    path.join(DATA_FOLDER, "admin-log.json");


if (!fs.existsSync(DATA_FOLDER)) {

    fs.mkdirSync(DATA_FOLDER);

}


function createFileIfNeeded(file) {

    if (!fs.existsSync(file)) {

        fs.writeFileSync(file, "[]");

    }

}


createFileIfNeeded(USERS_FILE);

createFileIfNeeded(MESSAGES_FILE);

createFileIfNeeded(ADMIN_LOG_FILE);


// ========================================
// JSON HELPERS
// ========================================

function readJSON(file) {

    try {

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );

    } catch {

        return [];

    }

}


function writeJSON(file, data) {

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2)
    );

}


// ========================================
// PASSWORD HASHING
// ========================================

function hashPassword(password) {

    const salt =
        crypto.randomBytes(16).toString("hex");

    const hash =
        crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

    return `${salt}:${hash}`;

}


function verifyPassword(
    password,
    storedPassword
) {

    try {

        const parts =
            storedPassword.split(":");

        const salt = parts[0];

        const storedHash = parts[1];

        const hash =
            crypto
                .scryptSync(password, salt, 64)
                .toString("hex");


        return crypto.timingSafeEqual(

            Buffer.from(hash, "hex"),

            Buffer.from(storedHash, "hex")

        );

    } catch {

        return false;

    }

}


// ========================================
// ADMIN LOG
// ========================================

function adminLog(action) {

    const logs =
        readJSON(ADMIN_LOG_FILE);


    logs.push({

        action: action,

        time: new Date().toISOString()

    });


    if (logs.length > 500) {

        logs.splice(
            0,
            logs.length - 500
        );

    }


    writeJSON(
        ADMIN_LOG_FILE,
        logs
    );

}


// ========================================
// FIND USER
// ========================================

function findUser(username) {

    const users =
        readJSON(USERS_FILE);


    return users.find(
        user =>
            user.username.toLowerCase() ===
            username.toLowerCase()
    );

}


// ========================================
// CHECK BAN
// ========================================

function isUserBanned(user) {

    if (!user) {
        return false;
    }


    if (user.bannedUntil === "lifetime") {

        return true;

    }


    if (
        user.bannedUntil &&
        Date.now() < user.bannedUntil
    ) {

        return true;

    }


    return false;

}


// ========================================
// REGISTER
// ========================================

app.post(
    "/api/register",
    (req, res) => {

        const username =
            String(
                req.body.username || ""
            ).trim();

        const password =
            String(
                req.body.password || ""
            );

        const code =
            String(
                req.body.code || ""
            ).trim();


        if (username.length < 3) {

            return res.json({

                success: false,

                message:
                    "Username must be at least 3 characters."

            });

        }


        if (username.length > 20) {

            return res.json({

                success: false,

                message:
                    "Username must be 20 characters or less."

            });

        }


        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {

            return res.json({

                success: false,

                message:
                    "Use only letters, numbers, _ or -."

            });

        }


        if (
            username.toLowerCase() ===
            ADMIN_USERNAME.toLowerCase()
        ) {

            return res.json({

                success: false,

                message:
                    "That username is reserved."

            });

        }


        if (password.length < 6) {

            return res.json({

                success: false,

                message:
                    "Password must be at least 6 characters."

            });

        }


        if (code !== "NOVA-2026") {

            return res.json({

                success: false,

                message:
                    "Invalid Nova Code."

            });

        }


        const users =
            readJSON(USERS_FILE);


        const exists =
            users.some(
                user =>
                    user.username.toLowerCase() ===
                    username.toLowerCase()
            );


        if (exists) {

            return res.json({

                success: false,

                message:
                    "That username is already taken."

            });

        }


        users.push({

            username: username,

            originalUsername: username,

            password:
                hashPassword(password),

            role: "user",

            bannedUntil: null,

            createdAt:
                new Date().toISOString()

        });


        writeJSON(
            USERS_FILE,
            users
        );


        res.json({

            success: true,

            message:
                "Account created."

        });

    }
);


// ========================================
// LOGIN
// ========================================

app.post(
    "/api/login",
    (req, res) => {

        const username =
            String(
                req.body.username || ""
            ).trim();

        const password =
            String(
                req.body.password || ""
            );


        const user =
            findUser(username);


        if (!user) {

            return res.json({

                success: false,

                message:
                    "Incorrect username or password."

            });

        }


        if (
            isUserBanned(user)
        ) {

            let message =
                "This account is banned.";

            if (
                user.bannedUntil !==
                "lifetime"
            ) {

                const remaining =
                    Math.ceil(
                        (
                            user.bannedUntil -
                            Date.now()
                        ) / 60000
                    );

                message +=
                    ` Ban remaining: ${remaining} minute(s).`;

            }


            return res.json({

                success: false,

                message: message

            });

        }


        if (
            !verifyPassword(
                password,
                user.password
            )
        ) {

            return res.json({

                success: false,

                message:
                    "Incorrect username or password."

            });

        }


        res.json({

            success: true,

            username: user.username,

            role: user.role

        });

    }
);


// ========================================
// ONLINE USERS
// ========================================

const onlineUsers = new Map();


// ========================================
// SOCKET CONNECTION
// ========================================

io.on(
    "connection",
    socket => {


        // ================================
        // JOIN
        // ================================

        socket.on(
            "join",
            username => {

                const user =
                    findUser(username);


                if (!user) {

                    socket.emit(
                        "force logout"
                    );

                    return;

                }


                if (
                    isUserBanned(user)
                ) {

                    socket.emit(
                        "banned",
                        {
                            message:
                                "You are banned."
                        }
                    );

                    socket.disconnect();

                    return;

                }


                onlineUsers.set(
                    socket.id,
                    {
                        username:
                            user.username,

                        role:
                            user.role
                    }
                );


                socket.emit(
                    "message history",
                    readJSON(MESSAGES_FILE)
                );


                io.emit(
                    "users update",
                    Array.from(
                        onlineUsers.values()
                    )
                );

            }
        );


        // ================================
        // MESSAGE
        // ================================

        socket.on(
            "chat message",
            text => {

                const current =
                    onlineUsers.get(
                        socket.id
                    );


                if (!current) {
                    return;
                }


                const user =
                    findUser(
                        current.username
                    );


                if (
                    !user ||
                    isUserBanned(user)
                ) {

                    return;

                }


                text =
                    String(
                        text || ""
                    ).trim();


                if (!text) {
                    return;
                }


                const message = {

                    id:
                        crypto
                            .randomUUID(),

                    username:
                        user.username,

                    message:
                        text,

                    time:
                        new Date().toLocaleTimeString(
                            [],
                            {
                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit"
                            }
                        ),

                    timestamp:
                        new Date().toISOString()

                };


                const messages =
                    readJSON(
                        MESSAGES_FILE
                    );


                messages.push(message);


                if (
                    messages.length >
                    1000
                ) {

                    messages.splice(
                        0,
                        messages.length - 1000
                    );

                }


                writeJSON(
                    MESSAGES_FILE,
                    messages
                );


                io.emit(
                    "chat message",
                    message
                );

            }
        );


        // ================================
        // ADMIN AUTHORITY
        // ================================

        socket.on(
            "admin request",
            () => {

                const current =
                    onlineUsers.get(
                        socket.id
                    );


                if (
                    !current ||
                    current.role !== "admin"
                ) {

                    socket.emit(
                        "admin denied"
                    );

                    return;

                }


                socket.emit(
                    "admin data",
                    getAdminData()
                );

            }
        );


        // ================================
        // ADMIN KICK
        // ================================

        socket.on(
            "admin kick",
            targetUsername => {

                if (
                    !isAdmin(socket)
                ) {
                    return;
                }


                const target =
                    findOnlineSocket(
                        targetUsername
                    );


                if (!target) {
                    return;
                }


                target.socket.emit(
                    "kicked"
                );


                target.socket.disconnect();


                adminLog(
                    `ADMIN kicked ${targetUsername}`
                );

            }
        );


        // ================================
        // ADMIN BAN
        // ================================

        socket.on(
            "admin ban",
            data => {

                if (
                    !isAdmin(socket)
                ) {
                    return;
                }


                const targetUsername =
                    String(
                        data.username || ""
                    ).trim();

                const duration =
                    data.duration;


                if (
                    targetUsername.toLowerCase() ===
                    "admin"
                ) {

                    return;

                }


                const users =
                    readJSON(
                        USERS_FILE
                    );


                const target =
                    users.find(
                        user =>
                            user.username.toLowerCase() ===
                            targetUsername.toLowerCase()
                    );


                if (!target) {
                    return;
                }


                if (
                    duration ===
                    "lifetime"
                ) {

                    target.bannedUntil =
                        "lifetime";

                } else {

                    const minutes =
                        Number(duration);


                    if (
                        !Number.isFinite(
                            minutes
                        )
                    ) {
                        return;
                    }


                    target.bannedUntil =
                        Date.now() +
                        minutes * 60 * 1000;

                }


                writeJSON(
                    USERS_FILE,
                    users
                );


                const online =
                    findOnlineSocket(
                        target.username
                    );


                if (online) {

                    online.socket.emit(
                        "banned",
                        {
                            message:
                                "You have been banned."
                        }
                    );


                    online.socket.disconnect();

                }


                adminLog(
                    `ADMIN banned ${target.username}`
                );


                io.emit(
                    "users update",
                    Array.from(
                        onlineUsers.values()
                    )
                );

            }
        );


        // ================================
        // ADMIN UNBAN
        // ================================

        socket.on(
            "admin unban",
            username => {

                if (
                    !isAdmin(socket)
                ) {
                    return;
                }


                const users =
                    readJSON(
                        USERS_FILE
                    );


                const target =
                    users.find(
                        user =>
                            user.username.toLowerCase() ===
                            String(
                                username
                            ).toLowerCase()
                    );


                if (!target) {
                    return;
                }


                target.bannedUntil =
                    null;


                writeJSON(
                    USERS_FILE,
                    users
                );


                adminLog(
                    `ADMIN unbanned ${target.username}`
                );

            }
        );


        // ================================
        // ADMIN RENAME
        // ================================

        socket.on(
            "admin rename",
            data => {

                if (
                    !isAdmin(socket)
                ) {
                    return;
                }


                const oldUsername =
                    String(
                        data.username || ""
                    ).trim();

                const newUsername =
                    String(
                        data.newUsername || ""
                    ).trim();


                if (
                    oldUsername.toLowerCase() ===
                    "admin"
                ) {

                    return;

                }


                if (
                    !/^[a-zA-Z0-9_-]+$/.test(
                        newUsername
                    )
                ) {

                    return;

                }


                if (
                    newUsername.length < 3 ||
                    newUsername.length > 20
                ) {

                    return;

                }


                if (
                    newUsername.toLowerCase() ===
                    "admin"
                ) {

                    return;

                }


                const users =
                    readJSON(
                        USERS_FILE
                    );


                const target =
                    users.find(
                        user =>
                            user.username.toLowerCase() ===
                            oldUsername.toLowerCase()
                    );


                if (!target) {
                    return;
                }


                const alreadyUsed =
                    users.some(
                        user =>
                            user.username.toLowerCase() ===
                            newUsername.toLowerCase()
                    );


                if (alreadyUsed) {

                    return;

                }


                target.username =
                    newUsername;


                writeJSON(
                    USERS_FILE,
                    users
                );


                for (
                    const [
                        id,
                        user
                    ] of onlineUsers
                ) {

                    if (
                        user.username.toLowerCase() ===
                        oldUsername.toLowerCase()
                    ) {

                        user.username =
                            newUsername;

                    }

                }


                adminLog(
                    `ADMIN renamed ${oldUsername} to ${newUsername}`
                );


                io.emit(
                    "users update",
                    Array.from(
                        onlineUsers.values()
                    )
                );

            }
        );


        // ================================
        // ADMIN DELETE MESSAGE
        // ================================

        socket.on(
            "admin delete message",
            messageId => {

                if (
                    !isAdmin(socket)
                ) {
                    return;
                }


                let messages =
                    readJSON(
                        MESSAGES_FILE
                    );


                messages =
                    messages.filter(
                        message =>
                            message.id !==
                            messageId
                    );


                writeJSON(
                    MESSAGES_FILE,
                    messages
                );


                io.emit(
                    "message deleted",
                    messageId
                );


                adminLog(
                    `ADMIN deleted message ${messageId}`
                );

            }
        );


        // ================================
        // ADMIN CLEAR CHAT
        // ================================

        socket.on(
            "admin clear chat",
            () => {

                if (
                    !isAdmin(socket)
                ) {
                    return;
                }


                writeJSON(
                    MESSAGES_FILE,
                    []
                );


                io.emit(
                    "chat cleared"
                );


                adminLog(
                    "ADMIN cleared chat history"
                );

            }
        );


        // ================================
        // DISCONNECT
        // ================================

        socket.on(
            "disconnect",
            () => {

                onlineUsers.delete(
                    socket.id
                );


                io.emit(
                    "users update",
                    Array.from(
                        onlineUsers.values()
                    )
                );

            }
        );

    }
);


// ========================================
// ADMIN HELPERS
// ========================================

function isAdmin(socket) {

    const user =
        onlineUsers.get(
            socket.id
        );


    return (
        user &&
        user.role === "admin"
    );

}


function findOnlineSocket(username) {

    for (
        const [
            id,
            user
        ] of onlineUsers
    ) {

        if (
            user.username.toLowerCase() ===
            String(
                username
            ).toLowerCase()
        ) {

            return {
                id,
                socket:
                    io.sockets.sockets.get(id)
            };

        }

    }


    return null;

}


function getAdminData() {

    const users =
        readJSON(USERS_FILE);


    return {

        users:
            users.map(
                user => ({

                    username:
                        user.username,

                    role:
                        user.role,

                    bannedUntil:
                        user.bannedUntil,

                    createdAt:
                        user.createdAt

                })
            ),

        online:
            Array.from(
                onlineUsers.values()
            ),

        messages:
            readJSON(
                MESSAGES_FILE
            ).length,

        logs:
            readJSON(
                ADMIN_LOG_FILE
            ).slice(-50)

    };

}


// ========================================
// START
// ========================================

server.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "=============================="
        );
        console.log(
            "       NOVA CHAT ONLINE"
        );
        console.log(
            "=============================="
        );
        console.log("");
        console.log(
            `http://localhost:${PORT}`
        );
        console.log("");

    }
);
