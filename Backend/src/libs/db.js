import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGODB_CONNECTIONSTRING;

  if (!uri) {
    console.error("MONGODB_CONNECTIONSTRING chưa được cấu hình");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // Recommended settings for production stability
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Kết nối CSDL thành công!");
  } catch (error) {
    console.error("Lỗi khi kết nối CSDL:", error.message);
    process.exit(1);
  }
};
