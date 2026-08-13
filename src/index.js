import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;

    app.on("error", (error) => {
      console.log("App error: ", error);
    });

    const server = app.listen(PORT, () => {
      console.log(`Server is running at PORT: ${PORT}`);
    });

    server.on("error", (error) => {
      console.log("Server error: ", error);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed! ", error);
  });
