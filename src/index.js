export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      try {
        const vehicleCount = await env.DB
          .prepare("SELECT COUNT(*) AS count FROM vehicles")
          .first();

        return Response.json({
          ok: true,
          database: "connected",
          vehicleCount: Number(vehicleCount?.count ?? 0),
          imageBucket: "bound"
        });
      } catch (error) {
        console.error("D1 health check failed:", error);

        return Response.json(
          {
            ok: false,
            database: "error",
            message: error instanceof Error
              ? error.message
              : "Unknown database error"
          },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};