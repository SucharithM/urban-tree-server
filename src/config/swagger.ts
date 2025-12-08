import swaggerJSDoc from "swagger-jsdoc";

export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Urban Tree API",
    version: "1.0.0",
    description: "REST API for tree sensor data",
  },
  servers: [
    { url: "http://localhost:3000/api", description: "Development server" },
    // TODO Update url before deployment to prod. Use ENV
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerConfigs = swaggerJSDoc(options);
