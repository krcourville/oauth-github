import fs from "fs";
import util from "util";

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);

const USER_DB_FILEPATH = "users.json";

export class UserRepository {
    async add(user) {
        const users = await this.getUsers();
        const data = [...users, user];
        await writeFile(USER_DB_FILEPATH, JSON.stringify(data, null, 2));
    }

    async getUsers() {
        const dbExists = await exists(USER_DB_FILEPATH);
        if (dbExists) {
            const content = await readFile(USER_DB_FILEPATH, "utf-8");
            return JSON.parse(content);
        }
        return [];
    }

    async getByJwt(jwt) {
        const users = await this.getUsers();
        return users.find((user) => user.jwt === jwt);
    }
}
