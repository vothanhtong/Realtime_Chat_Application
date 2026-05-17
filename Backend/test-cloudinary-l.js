import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'diicopfxy',
  api_key: '598424741221785',
  api_secret: 'l297A_RBIq8Q-AP-UAozkTy3MCo', // Testing with 'l' instead of 'I'
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
