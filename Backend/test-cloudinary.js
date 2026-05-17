import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET?.substring(0, 5) + "..."
});

cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/a3/June_odd-eyed_cat.jpg", {
  folder: "test_folder"
}, (error, result) => {
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Result:", result.secure_url);
  }
  process.exit(0);
});
