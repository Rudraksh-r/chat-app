import "dotenv/config"; // This MUST be the first import to load .env variables before other imports!
import connectDB from "./config/db.js";
import "./app.js"; // This MUST be imported so the routes attach to the app instance!
import { server } from "./socket/socket.js";
import logger from "./utils/logger.js";

const listen = async (params) => {
    try {
        await connectDB()

        const port = process.env.PORT || 5001;
        server.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        })
    } catch (error) {
        logger.error("Error in connecting to the database: %s", error.stack || error.message || error);
    }
}

listen()
