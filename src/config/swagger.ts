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
    { url: "http://localhost:3000", description: "Node process root (health checks)" },
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
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      AuthUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "VIEWER"] },
        },
        required: ["id", "email", "role"],
      },
      AuthLoginRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
        required: ["email", "password"],
      },
      AuthLoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/AuthUser" },
        },
      },
      LogoutResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
        },
      },
      LatestReadingSummary: {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
          temperature: { type: "number", nullable: true },
          humidity: { type: "number", nullable: true },
          dendrometer: { type: "number", nullable: true },
          sapflow1: { type: "number", nullable: true },
          dataSource: { type: "string", nullable: true },
        },
        required: ["timestamp"],
      },
      TreeSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          nodeId: { type: "string" },
          name: { type: "string", nullable: true },
          location: { type: "string", nullable: true },
          lat: { type: "number", nullable: true },
          lon: { type: "number", nullable: true },
          species: { type: "string", nullable: true },
          dbh: { type: "number", nullable: true },
          active: { type: "boolean" },
          latestReading: {
            $ref: "#/components/schemas/LatestReadingSummary",
          },
        },
        required: ["id", "nodeId", "active"],
      },
      TreeListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/TreeSummary" },
          },
          total: { type: "integer" },
        },
      },
      TreeDetail: {
        allOf: [
          { $ref: "#/components/schemas/TreeSummary" },
          {
            type: "object",
            properties: {
              boardId: { type: "string", nullable: true },
              sensorDepths: { type: "string", nullable: true },
              sitePi: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      ReadingPoint: {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
          temperature: { type: "number", nullable: true },
          pressure: { type: "number", nullable: true },
          humidity: { type: "number", nullable: true },
          dendrometer: { type: "number", nullable: true },
          sapflow1: { type: "number", nullable: true },
          sapflow2: { type: "number", nullable: true },
          sapflow3: { type: "number", nullable: true },
          sapflow4: { type: "number", nullable: true },
          battery: { type: "number", nullable: true },
          lipoCharge: { type: "number", nullable: true },
          dataSource: { type: "string", nullable: true },
        },
        required: ["timestamp"],
      },
      TreeReadingsResponse: {
        type: "object",
        properties: {
          treeId: { type: "string" },
          count: { type: "integer" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ReadingPoint" },
          },
        },
      },
      ProcessedReadingPoint: {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
          temperature: { type: "number", nullable: true },
          pressure: { type: "number", nullable: true },
          humidity: { type: "number", nullable: true },
          dendroRaw: { type: "number", nullable: true },
          sapflowCmPerHr: { type: "number", nullable: true },
          sfMaxD: { type: "number", nullable: true },
          sfSignal: { type: "number", nullable: true },
          sfNoise: { type: "number", nullable: true },
          dendroMm: { type: "number", nullable: true },
        },
        required: ["timestamp"],
      },
      TreeProcessedReadingsResponse: {
        type: "object",
        properties: {
          treeId: { type: "string" },
          nodeId: { type: "string" },
          name: { type: "string", nullable: true },
          source: { type: "string", enum: ["computed", "raw-fallback"] },
          readings: {
            type: "array",
            items: { $ref: "#/components/schemas/ProcessedReadingPoint" },
          },
          total: { type: "integer" },
        },
        required: ["treeId", "nodeId", "source", "readings", "total"],
      },
      TreeReadingSummaryBucket: {
        type: "object",
        properties: {
          bucketStart: { type: "string", format: "date-time" },
          bucketEnd: { type: "string", format: "date-time" },
          bucketSize: { type: "string", enum: ["all", "day", "hour"] },
          count: { type: "integer" },
          avgTemperature: { type: "number", nullable: true },
          minTemperature: { type: "number", nullable: true },
          maxTemperature: { type: "number", nullable: true },
          avgPressure: { type: "number", nullable: true },
          minPressure: { type: "number", nullable: true },
          maxPressure: { type: "number", nullable: true },
          avgHumidity: { type: "number", nullable: true },
          minHumidity: { type: "number", nullable: true },
          maxHumidity: { type: "number", nullable: true },
          avgDendroRaw: { type: "number", nullable: true },
          minDendroRaw: { type: "number", nullable: true },
          maxDendroRaw: { type: "number", nullable: true },
          avgDendroMm: { type: "number", nullable: true },
          minDendroMm: { type: "number", nullable: true },
          maxDendroMm: { type: "number", nullable: true },
          avgSapflowCmPerHr: { type: "number", nullable: true },
          minSapflowCmPerHr: { type: "number", nullable: true },
          maxSapflowCmPerHr: { type: "number", nullable: true },
        },
      },
      TreeReadingSummaryResponse: {
        type: "object",
        properties: {
          treeId: { type: "string" },
          nodeId: { type: "string" },
          name: { type: "string", nullable: true },
          bucketSize: { type: "string", enum: ["all", "day", "hour"] },
          buckets: {
            type: "array",
            items: { $ref: "#/components/schemas/TreeReadingSummaryBucket" },
          },
        },
      },
      ImportJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          fileName: { type: "string" },
          fileSize: { type: "integer" },
          sheetsProcessed: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          status: {
            type: "string",
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
          },
          recordsImported: { type: "integer" },
          recordsSkipped: { type: "integer" },
          recordsFailed: { type: "integer" },
          warnings: { type: "array", items: { type: "object" }, nullable: true },
          errors: { type: "array", items: { type: "object" }, nullable: true },
          startedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ImportJobListResponse: {
        type: "array",
        items: { $ref: "#/components/schemas/ImportJob" },
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string" },
          service: { type: "string" },
        },
      },
      DbCheckResponse: {
        type: "object",
        properties: {
          status: { type: "string" },
          db: { type: "string" },
          service: { type: "string" },
        },
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
  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts", "./src/app.ts"],
};

export const swaggerConfigs = swaggerJSDoc(options);
