import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    try {
        const connectionINT = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
        })
        console.log(`Connected to database ${connectionINT.connection.host}`);
    } catch (error) {
        console.log("Error in connecting to the database", error);
        process.exit(1)
    }
}

export default connectDB