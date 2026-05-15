// // Backend/test.cloudinary.js
// // Run with: node test.cloudinary.js
// import "dotenv/config";
// import { v2 as cloudinary } from "cloudinary";
// import { readFileSync } from "fs";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// console.log("🔑 Config check:");
// console.log("   cloud_name:", process.env.CLOUDINARY_CLOUD_NAME || "❌ MISSING");
// console.log("   api_key:", process.env.CLOUDINARY_API_KEY ? "✅ set" : "❌ MISSING");
// console.log("   api_secret:", process.env.CLOUDINARY_API_SECRET ? "✅ set" : "❌ MISSING");

// // Ping test — just check your account is reachable
// try {
//   const result = await cloudinary.api.ping();
//   console.log("\n✅ Ping success:", result.status);
// } catch (e) {
//   console.error("\n❌ Ping failed:", e.message);
//   process.exit(1);
// }

// // Upload test — use a tiny 1x1 pixel PNG encoded as base64
// try {
//   const result = await cloudinary.uploader.upload(
//     "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
//     { 
//       resource_type: "image", 
//       folder: "chat_app/avatars",
//       transformation: [
//         { width: 400, height: 400, crop: "fill", gravity: "face" },
//         { quality: "auto", fetch_format: "auto" },
//       ]
//     }
//   );
//   console.log("✅ Upload success:", result.secure_url);

//   // Clean up the test image
//   await cloudinary.uploader.destroy("chat-app/Backend/test/connection_test");
//   console.log("✅ Cleanup done — your Cloudinary integration is fully working");
// } catch (e) {file
//   console.error("❌ Upload failed!");
//   console.error(e);
// }