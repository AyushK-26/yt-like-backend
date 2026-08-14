import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    // console.log("file is uploaded on cloudinary", response.url);
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    // remove the locally saved temporary file as the upload operation failed
    // console.error("Cloudinary error:", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const removeFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return response;
  } catch (error) {
    // console.log("Cloudinary error: ", error);
    return null;
  }
};

export { uploadOnCloudinary, removeFromCloudinary };
