require("dotenv").config();
import { app } from "./app.js";

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`urban-tree-server listening on port ${port}`);
});
