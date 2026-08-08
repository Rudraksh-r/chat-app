import { User } from "../models/user.model.js";
import logger from "./logger.js";

export const setupAIBot = async () => {
  try {
    const aiEmail = "ai@meta.bot";
    let aiUser = await User.findOne({ email: aiEmail });

    if (!aiUser) {
      logger.info("Creating Aura AI bot user...");
      aiUser = await User.create({
        fullName: "Aura",
        username: "aura_ai",
        email: aiEmail,
        password: "secure_random_password_that_wont_be_used",
        about: "I'm Aura, your intelligent and creative companion.",
        avatar: {
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png", // Or any AI icon
          public_id: "aura_ai_avatar"
        }
      });
      logger.info("Aura AI bot user created successfully.");
    } else {
      // Ensure it has the updated creative name
      aiUser.fullName = "Aura";
      aiUser.username = "aura_ai";
      aiUser.about = "I'm Aura, your intelligent and creative companion.";
      await aiUser.save();
    }
    
    // We can store the AI Bot's ID globally or just rely on querying it when needed
    global.AI_BOT_ID = aiUser._id.toString();
  } catch (error) {
    logger.error("Error setting up AI Bot user: ", error);
  }
};
