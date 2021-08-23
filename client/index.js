import qs from "query-string";

window.onload = function () {
    askForConsent();
    handleCode();
    protectedRequest();
};

function askForConsent() {
    const oAuthQueryParams = {
        response_type: "code",
        scope: "user public_repo",
        redirect_uri: process.env.REDIRECT_URL,
        client_id: process.env.CLIENT_ID,
        state: "blah",
    };

    const query = qs.stringify(oAuthQueryParams);
    const authorizationUrl = `${process.env.AUTHORIZATION_ENDPOINT}?${query}`;
    const loginLinkEl = document.querySelector("a");
    loginLinkEl.setAttribute("href", authorizationUrl);
}

function handleCode() {
    const parsedQuery = qs.parseUrl(window.location.href);

    if (parsedQuery.query.code) {
        sendCodeToServer(parsedQuery);
    }
}

async function sendCodeToServer(parsedQuery) {
    const server = "http://localhost:1235/code";
    try {
        const res = await fetch(server, {
            method: "POST",
            body: JSON.stringify({
                code: parsedQuery.query.code,
                state: parsedQuery.query.state,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();

        localStorage.setItem("jwt", data.jwt);
        window.location.href = process.env.REDIRECT_URL;
    } catch (error) {}
}

function protectedRequest() {
    const requestButton = document.querySelector("button");
    requestButton.style.display = "none";

    if (localStorage.getItem("jwt")) {
        requestButton.style.display = "block";
        requestButton.addEventListener("click", function () {
            fetchRepos();
        });
    }
}

async function fetchRepos() {
    const server = "http://localhost:1235/repos";
    try {
        const res = await fetch(server, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("jwt")}`,
            },
        });
        const data = await res.json();

        const repoList = new DocumentFragment();

        for (const item of data) {
            const article = document.createElement("article");
            repoList.appendChild(article);

            const h2 = document.createElement("h2");
            h2.textContent = item.full_name;
            article.appendChild(h2);

            if (item.description) {
                const p = document.createElement("p");
                p.textContent = item.description;
                article.appendChild(p);
            }

            const code = document.createElement("code");
            const cloneCmd = `git clone ${item.git_url}`;
            code.innerText = cloneCmd;
            article.appendChild(code);
            code.addEventListener("click", async function onCodeClick() {
                await navigator.clipboard.writeText(cloneCmd);
                const note = document.createElement("div");
                note.classList.add("note");
                note.textContent = "Command was copied to clipboard.";
                article.appendChild(note);
                setTimeout(() => {
                    note.classList.add("fade-out");
                    note.addEventListener("transitionend", () => {
                        note.remove();
                    });
                }, 3000);
            });
            document.body.appendChild(article);
        }
    } catch (error) {
        console.log(error);
    }
}
