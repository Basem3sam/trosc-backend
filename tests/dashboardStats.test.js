const request = require("supertest");
const app = require("../src/app");
const DashboardStats = require("../src/models/dashboardstats.model");
const dashboardStatsService = require("../src/services/dashboardStats.service");
const { createTestUser } = require("./helpers/testUser");

describe("Dashboard Stats endpoints", () => {
  // ===================================================================
  // Auth guards — the entire module is admin-only, no self-service route.
  // ===================================================================
  describe("auth guards", () => {
    const endpoints = () => [
      { method: "get", url: "/v1/dashboard-stats" },
      { method: "get", url: "/v1/dashboard-stats/live" },
      { method: "get", url: "/v1/dashboard-stats/latest?period=daily" },
      { method: "get", url: "/v1/dashboard-stats/trends?period=daily" },
      { method: "get", url: "/v1/dashboard-stats/507f1f77bcf86cd799439099" },
    ];

    it("rejects an unauthenticated request to every route", async () => {
      await Promise.all(
        endpoints().map(async ({ method, url }) => {
          const res = await request(app)[method](url);
          expect(res.status).toBe(401);
        }),
      );
    });

    it("rejects a non-admin from every route", async () => {
      const { token } = await createTestUser({ role: "student" });
      await Promise.all(
        endpoints().map(async ({ method, url }) => {
          const res = await request(app)
            [method](url)
            .set("Authorization", `Bearer ${token}`);
          expect(res.status).toBe(403);
        }),
      );
    });

    it("rejects an instructor too (admin-only, not just non-student)", async () => {
      const { token } = await createTestUser({ role: "instructor" });
      const res = await request(app)
        .get("/v1/dashboard-stats/live")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  // ===================================================================
  // GET /dashboard-stats/live
  // ===================================================================
  describe("GET /v1/dashboard-stats/live", () => {
    it("returns computed stats without persisting anything", async () => {
      const { token } = await createTestUser({ role: "admin" });

      const res = await request(app)
        .get("/v1/dashboard-stats/live")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("totalUsers");
      expect(res.body.data).toHaveProperty("computedAt");
      expect(await DashboardStats.countDocuments()).toBe(0);
    });
  });

  // ===================================================================
  // POST /dashboard-stats/snapshot
  // ===================================================================
  describe("POST /v1/dashboard-stats/snapshot", () => {
    it("generates and persists a snapshot", async () => {
      const { token } = await createTestUser({ role: "admin" });

      const res = await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });

      expect(res.status).toBe(200);
      expect(res.body.data.dashboardStat.period).toBe("daily");
      expect(await DashboardStats.countDocuments()).toBe(1);
    });

    it("rejects a missing period", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("rejects an invalid period", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "yearly" });
      expect(res.status).toBe(400);
    });

    it("upserts on repeated calls for the same period/date", async () => {
      const { token } = await createTestUser({ role: "admin" });
      await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });
      await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });

      expect(await DashboardStats.countDocuments()).toBe(1);
    });
  });

  // ===================================================================
  // GET /dashboard-stats/latest
  // ===================================================================
  describe("GET /v1/dashboard-stats/latest", () => {
    it("returns 404 when no snapshot has been generated yet", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats/latest?period=weekly")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("returns the latest snapshot once one exists", async () => {
      const { token } = await createTestUser({ role: "admin" });
      await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });

      const res = await request(app)
        .get("/v1/dashboard-stats/latest?period=daily")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.dashboardStat.period).toBe("daily");
    });

    it("rejects a missing period", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats/latest")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // GET /dashboard-stats/trends
  // ===================================================================
  describe("GET /v1/dashboard-stats/trends", () => {
    it("returns an ordered trend array", async () => {
      const { token } = await createTestUser({ role: "admin" });
      await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });

      const res = await request(app)
        .get("/v1/dashboard-stats/trends?period=daily&limit=5")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.period).toBe("daily");
      expect(Array.isArray(res.body.data.trends)).toBe(true);
      expect(res.body.data.trends).toHaveLength(1);
    });

    it("rejects a limit above the max", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats/trends?period=daily&limit=9999")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // GET /dashboard-stats (list)
  // ===================================================================
  describe("GET /v1/dashboard-stats", () => {
    it("lists all stored snapshots and supports ?period= filtering", async () => {
      const { token } = await createTestUser({ role: "admin" });
      await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });
      await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "weekly" });

      const all = await request(app)
        .get("/v1/dashboard-stats")
        .set("Authorization", `Bearer ${token}`);
      expect(all.body.results).toBe(2);

      const filtered = await request(app)
        .get("/v1/dashboard-stats?period=weekly")
        .set("Authorization", `Bearer ${token}`);
      expect(filtered.body.results).toBe(1);
      expect(filtered.body.data.dashboardStats[0].period).toBe("weekly");
    });

    it("supports the documented date[gte]/date[lte] range filter", async () => {
      const { token } = await createTestUser({ role: "admin" });
      await dashboardStatsService.generateSnapshot(
        "daily",
        new Date("2025-01-10"),
      );
      await dashboardStatsService.generateSnapshot(
        "daily",
        new Date("2025-06-10"),
      );

      const res = await request(app)
        .get("/v1/dashboard-stats?date[gte]=2025-03-01&date[lte]=2025-12-31")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
    });

    it("rejects an invalid period value instead of silently returning nothing", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats?period=yearly")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it("rejects an unrecognized query param instead of silently no-op filtering", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats?perido=daily") // typo, on purpose
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // GET /dashboard-stats/:id and DELETE /dashboard-stats/:id
  // ===================================================================
  describe("GET & DELETE /v1/dashboard-stats/:id", () => {
    it("fetches and then deletes a single snapshot", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const createRes = await request(app)
        .post("/v1/dashboard-stats/snapshot")
        .set("Authorization", `Bearer ${token}`)
        .send({ period: "daily" });
      const id = createRes.body.data.dashboardStat._id;

      const getRes = await request(app)
        .get(`/v1/dashboard-stats/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.dashboardStat._id).toBe(id);

      const deleteRes = await request(app)
        .delete(`/v1/dashboard-stats/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(deleteRes.status).toBe(204);
      expect(await DashboardStats.findById(id)).toBeNull();
    });

    it("returns 404 for a non-existent ID", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats/507f1f77bcf86cd799439099")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("rejects a malformed ID", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .get("/v1/dashboard-stats/not-an-id")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // DELETE /dashboard-stats (prune)
  // ===================================================================
  describe("DELETE /v1/dashboard-stats (prune)", () => {
    it("deletes snapshots older than the cutoff", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const old = await DashboardStats.create({
        period: "daily",
        date: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      });
      const recent = await DashboardStats.create({
        period: "daily",
        date: new Date(),
      });

      const res = await request(app)
        .delete("/v1/dashboard-stats?olderThanDays=365")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deletedCount).toBe(1);
      expect(await DashboardStats.findById(old._id)).toBeNull();
      expect(await DashboardStats.findById(recent._id)).not.toBeNull();
    });

    it("requires olderThanDays", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .delete("/v1/dashboard-stats")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it("rejects an olderThanDays below the safety floor", async () => {
      const { token } = await createTestUser({ role: "admin" });
      const res = await request(app)
        .delete("/v1/dashboard-stats?olderThanDays=5")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });
});
