import "dotenv/config"; // This MUST be the first import to load .env variables before other imports!
import connectDB from "./config/db.js";
import "./app.js"; // This MUST be imported so the routes attach to the app instance!
import { server } from "./socket/socket.js";

const listen = async (params) => {
    try {
        await connectDB()

        const port = process.env.PORT || 5001;
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        })
    } catch (error) {
        console.log("Error in connecting to the database", error);
    }
}

listen()
