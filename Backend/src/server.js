import dotenv from "dotenv";
import connectDB from "./config/db.js";
// import app from "./app.js"
import { server } from "./socket/socket.js";

dotenv.config({
    path: "./.env"
})

const listen = async (params) => {
    try {
        await connectDB()

        server.listen(process.env.PORT || 5000, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error in connecting to the database", error);
    }
}

listen()