import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config();

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;

    app.on("error", (error) => {
      console.log("Error: ", error);
    });

    app.listen(PORT, () => {
      console.log(`Server is running at PORT: ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed! ", error);
  });
