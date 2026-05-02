import "dotenv/config"; // This MUST be the first import to load .env variables before other imports!
import connectDB from "./config/db.js";
import "./app.js"; // This MUST be imported so the routes attach to the app instance!
import { server } from "./socket/socket.js";

const listen = async (params) => {
    try {
        await connectDB()

        server.listen(process.env.PORT || 6000, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error in connecting to the database", error);
    }
}

listen()