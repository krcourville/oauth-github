import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import qs from "query-string";
import JSONWebToken from "jsonwebtoken";

import { UserRepository } from "./user-repository.js";

const users = new UserRepository();

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping", function (req, res) {
    res.send({
        now: new Date().toISOString(),
    });
});

app.post("/code", async function (req, res) {
    try {
        const token = await exchangeCodeForToken(req.body.code);
        const user = await fetchUser(token);
        const jwt = await encodeJWT(user, token);
        await users.add({ jwt, user, token });
        res.json({ jwt });
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get("/repos", async function (req, res) {
    try {
        const [_, jwt] = req.headers.authorization.split(" ");
        const user = await users.getByJwt(jwt);
        const token = user.token;

        await verifyJWT(jwt, token);

        const repos = await fetchRepos(token);
        res.json(repos);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.listen(1235, function () {
    console.log("Listening");
});

async function encodeJWT(user, token) {
    const jwtPayload = {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
    };
    return JSONWebToken.sign(jwtPayload, token, { expiresIn: "1h" });
}

async function verifyJWT(jwt, token) {
    return JSONWebToken.verify(jwt, token);
}

async function fetchRepos(token) {
    const url = `${process.env.RESOURCE_ENDPOINT}/user/repos?sort=created&direction=desc`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await res.json();
    return data;
}

async function exchangeCodeForToken(code) {
    const tokenUrl = process.env.TOKEN_ENDPOINT;
    const oAuthQueryParams = {
        grant_type: "authorization_code",
        redirect_uri: process.env.REDIRECT_URL,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
    };
    const res = await fetch(tokenUrl, {
        body: JSON.stringify(oAuthQueryParams),
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const data = await res.text();
    console.log({ data, tokenUrl });
    const parsedData = qs.parse(data);
    return parsedData.access_token;
}

async function fetchUser(token) {
    const url = `${process.env.RESOURCE_ENDPOINT}/user`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = res.json();
    return data;
}
