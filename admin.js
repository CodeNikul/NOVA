const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const DATA_FOLDER = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_FOLDER, "users.json");

const ADMIN_USERNAME = "ADMIN";

if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER);
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]");
}

const users = JSON.parse(
    fs.readFileSync(USERS_FILE, "utf8")
);

const existingAdmin = users.find(
    user => user.username.toLowerCase() === "admin"
);

if (existingAdmin) {
    console.log("");
    console.log("ADMIN account already exists.");
    console.log("");
    process.exit();
}


function hashPassword(password) {

    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


rl.question(
    "Create ADMIN password: ",
    password => {

        if (password.length < 6) {

            console.log(
                "Password must be at least 6 characters."
            );

            rl.close();

            return;
        }


        users.push({

            username: ADMIN_USERNAME,

            originalUsername: ADMIN_USERNAME,

            password: hashPassword(password),

            role: "admin",

            bannedUntil: null,

            createdAt: new Date().toISOString()

        });


        fs.writeFileSync(
            USERS_FILE,
            JSON.stringify(users, null, 2)
        );


        console.log("");
        console.log("ADMIN account created successfully.");
        console.log("Username: ADMIN");
        console.log("");
        console.log(
            "Keep the password private."
        );


        rl.close();

    }
);