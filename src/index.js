function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safeParseTags(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

    tags: safeParseTags(row.tags_json),
    notes: row.notes,

    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function optionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function optionalInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function booleanInteger(value) {
  return value === true || value === 1 || value === "true" ? 1 : 0;
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
    SELECT *
    FROM vehicles
    ${whereClause}
    ORDER BY model_name COLLATE NOCASE ASC
    LIMIT ?
    OFFSET ?
  `);

  const boundCountStatement = bindings.length
    ? countStatement.bind(...bindings)
    : countStatement;

  const boundListStatement = listStatement.bind(
    ...bindings,
    limit,
    offset
  );

  const [countResult, listResult] = await Promise.all([
    boundCountStatement.first(),
    boundListStatement.all()
  ]);

  return jsonResponse({
    ok: true,
    total: Number(countResult?.count ?? 0),
    limit,
    offset,
    vehicles: listResult.results.map(normalizeVehicle)
  });
}

async function handleVehicleImport(request, env) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return jsonResponse(
      {
        ok: false,
        error: "Content-Type must be application/json"
      },
      415
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "The request body is not valid JSON"
      },
      400
    );
  }

  const modelName = optionalText(body.modelName);

  if (!modelName) {
    return jsonResponse(
      {
        ok: false,
        error: "modelName is required"
      },
      400
    );
  }

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)) {
    return jsonResponse(
      {
        ok: false,
        error:
          "modelName may contain only letters, numbers, underscores, and dashes"
      },
      400
    );
  }

  const id = crypto.randomUUID();

  const tags = Array.isArray(body.tags)
    ? JSON.stringify(
        body.tags
          .filter(tag => typeof tag === "string")
          .map(tag => tag.trim())
          .filter(Boolean)
      )
    : "[]";

  const rawRecord = JSON.stringify(body);

  const statement = env.DB.prepare(`
    INSERT INTO vehicles (
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
      raw_record_json,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(model_name) DO UPDATE SET
      game_name = excluded.game_name,
      display_name = excluded.display_name,
      make_name = excluded.make_name,
      vehicle_class = excluded.vehicle_class,
      vehicle_type = excluded.vehicle_type,
      handling_id = excluded.handling_id,
      audio_name = excluded.audio_name,
      layout_name = excluded.layout_name,
      frequency = excluded.frequency,
      max_num = excluded.max_num,
      max_num_of_same_color = excluded.max_num_of_same_color,
      identical_model_spawn_distance =
        excluded.identical_model_spawn_distance,
      swankness = excluded.swankness,
      installed = excluded.installed,
      favorite = excluded.favorite,
      installation_type = excluded.installation_type,
      replacement_slot = excluded.replacement_slot,
      game_version = excluded.game_version,
      installed_dlc_folder = excluded.installed_dlc_folder,
      install_date = excluded.install_date,
      rockstar_dlc = excluded.rockstar_dlc,
      source_pack = excluded.source_pack,
      download_url = excluded.download_url,
      yft_path = excluded.yft_path,
      hi_yft_path = excluded.hi_yft_path,
      ytd_path = excluded.ytd_path,
      vehicles_meta_path = excluded.vehicles_meta_path,
      handling_meta_path = excluded.handling_meta_path,
      tags_json = excluded.tags_json,
      notes = excluded.notes,
      raw_record_json = excluded.raw_record_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id,
    modelName,
    optionalText(body.gameName),
    optionalText(body.displayName),
    optionalText(body.makeName),
    optionalText(body.vehicleClass),
    optionalText(body.vehicleType),
    optionalText(body.handlingId),
    optionalText(body.audioName),
    optionalText(body.layoutName),
    optionalInteger(body.frequency),
    optionalInteger(body.maxNum),
    optionalInteger(body.maxNumOfSameColor),
    optionalInteger(body.identicalModelSpawnDistance),
    optionalText(body.swankness),
    booleanInteger(body.installed),
    booleanInteger(body.favorite),
    optionalText(body.installationType),
    optionalText(body.replacementSlot),
    optionalText(body.gameVersion),
    optionalText(body.installedDlcFolder),
    optionalText(body.installDate),
    optionalText(body.rockstarDlc),
    optionalText(body.sourcePack),
    optionalText(body.downloadUrl),
    optionalText(body.yftPath),
    optionalText(body.hiYftPath),
    optionalText(body.ytdPath),
    optionalText(body.vehiclesMetaPath),
    optionalText(body.handlingMetaPath),
    tags,
    optionalText(body.notes),
    rawRecord
  );

  await statement.run();

  const savedVehicle = await env.DB
    .prepare(`
      SELECT *
      FROM vehicles
      WHERE model_name = ? COLLATE NOCASE
      LIMIT 1
    `)
    .bind(modelName)
    .first();

  return jsonResponse(
    {
      ok: true,
      message: "Vehicle saved",
      vehicle: normalizeVehicle(savedVehicle)
    },
    201
  );
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

      if (
        request.method === "POST" &&
        url.pathname === "/api/vehicles/import"
      ) {
        return await handleVehicleImport(request, env);
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