function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function normalizeVehicle(row) {
  return {
    id: row.id,
    modelName: row.model_name,
    gameName: row.game_name,
    displayName: row.display_name,
    makeName: row.make_name,
    vehicleClass: row.vehicle_class,
    vehicleType: row.vehicle_type,

    handlingId: row.handling_id,
    audioName: row.audio_name,
    layoutName: row.layout_name,

    frequency: row.frequency,
    maxNum: row.max_num,
    maxNumOfSameColor: row.max_num_of_same_color,
    identicalModelSpawnDistance: row.identical_model_spawn_distance,
    swankness: row.swankness,

    installed: row.installed === 1,
    favorite: row.favorite === 1,

    installationType: row.installation_type,
    replacementSlot: row.replacement_slot,
    gameVersion: row.game_version,
    installedDlcFolder: row.installed_dlc_folder,
    installDate: row.install_date,

    rockstarDlc: row.rockstar_dlc,
    sourcePack: row.source_pack,
    downloadUrl: row.download_url,

    yftPath: row.yft_path,
    hiYftPath: row.hi_yft_path,
    ytdPath: row.ytd_path,
    vehiclesMetaPath: row.vehicles_meta_path,
    handlingMetaPath: row.handling_meta_path,

    tags: row.tags_json ? JSON.parse(row.tags_json) : [],
    notes: row.notes,

    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function handleHealthCheck(env) {
  const vehicleCount = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM vehicles")
    .first();

  return jsonResponse({
    ok: true,
    database: "connected",
    vehicleCount: Number(vehicleCount?.count ?? 0),
    imageBucket: "bound"
  });
}

async function handleVehicleList(request, env) {
  const url = new URL(request.url);

  const search = (url.searchParams.get("search") || "").trim();
  const installed = url.searchParams.get("installed");
  const favorite = url.searchParams.get("favorite");

  const requestedLimit = Number.parseInt(
    url.searchParams.get("limit") || "100",
    10
  );

  const requestedOffset = Number.parseInt(
    url.searchParams.get("offset") || "0",
    10
  );

  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 500)
    : 100;

  const offset = Number.isFinite(requestedOffset)
    ? Math.max(requestedOffset, 0)
    : 0;

  const conditions = [];
  const bindings = [];

  if (search) {
    conditions.push(`
      (
        model_name LIKE ?
        OR display_name LIKE ?
        OR game_name LIKE ?
        OR make_name LIKE ?
        OR handling_id LIKE ?
        OR source_pack LIKE ?
      )
    `);

    const searchValue = `%${search}%`;

    bindings.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  if (installed === "true" || installed === "false") {
    conditions.push("installed = ?");
    bindings.push(installed === "true" ? 1 : 0);
  }

  if (favorite === "true" || favorite === "false") {
    conditions.push("favorite = ?");
    bindings.push(favorite === "true" ? 1 : 0);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countStatement = env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM vehicles
    ${whereClause}
  `);

  const listStatement = env.DB.prepare(`
    SELECT
      id,
      model_name,
      game_name,
      display_name,
      make_name,
      vehicle_class,
      vehicle_type,
      handling_id,
      audio_name,
      layout_name,
      frequency,
      max_num,
      max_num_of_same_color,
      identical_model_spawn_distance,
      swankness,
      installed,
      favorite,
      installation_type,
      replacement_slot,
      game_version,
      installed_dlc_folder,
      install_date,
      rockstar_dlc,
      source_pack,
      download_url,
      yft_path,
      hi_yft_path,
      ytd_path,
      vehicles_meta_path,
      handling_meta_path,
      tags_json,
      notes,
      created_at,
      updated_at
    FROM vehicles
    ${whereClause}
    ORDER BY model_name COLLATE NOCASE ASC
    LIMIT ?
    OFFSET ?
  `);

  const boundCountStatement = bindings.length
    ? countStatement.bind(...bindings)
    : countStatement;

  const listBindings = [...bindings, limit, offset];
  const boundListStatement = listStatement.bind(...listBindings);

  const [countResult, listResult] = await Promise.all([
    boundCountStatement.first(),
    boundListStatement.all()
  ]);

  const vehicles = listResult.results.map(normalizeVehicle);

  return jsonResponse({
    ok: true,
    total: Number(countResult?.count ?? 0),
    limit,
    offset,
    vehicles
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (
        request.method === "GET" &&
        url.pathname === "/api/health"
      ) {
        return await handleHealthCheck(env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/vehicles"
      ) {
        return await handleVehicleList(request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return jsonResponse(
          {
            ok: false,
            error: "API route not found"
          },
          404
        );
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Worker request failed:", error);

      return jsonResponse(
        {
          ok: false,
          error: "Internal server error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown error"
        },
        500
      );
    }
  }
};