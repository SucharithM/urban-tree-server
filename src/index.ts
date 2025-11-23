import { app } from "./app.js";
require("dotenv").config();

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`urban-tree-server listening on port ${port}`);
});
