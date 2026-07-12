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
    vehicleYear: row.vehicle_year,

    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeSourceHistory(row) {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    sourceContainer: row.source_container,
    sourceDirectory: row.source_directory,
    sourcePath: row.source_path,
    originalFileName: row.original_file_name,
    recordCount: row.record_count,
    importMode: row.import_mode,
    importedAt: row.imported_at,
    status: row.status,
    notes: row.notes,
    rawImportJson: row.raw_import_json
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

function validateVehicleInput(body, index = null) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return index === null
      ? "Vehicle body must be a JSON object"
      : `Vehicle at index ${index} must be a JSON object`;
  }

  const modelName = optionalText(body.modelName);

  if (!modelName) {
    return index === null
      ? "modelName is required"
      : `Vehicle at index ${index} is missing modelName`;
  }

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)) {
    return index === null
      ? "modelName may contain only letters, numbers, underscores, and dashes"
      : `Vehicle at index ${index} has an invalid modelName`;
  }

  return null;
}

function buildVehicleUpsertStatement(body, env) {
  const modelName = optionalText(body.modelName);
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

  return env.DB.prepare(`
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
      vehicle_year,
      raw_record_json,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
      vehicle_year = excluded.vehicle_year,
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
    optionalText(body.vehicleYear),
    rawRecord
  );
}
function buildVehicleMetaUpsertStatement(body, env) {
  const modelName =
    optionalText(body.modelName);

  const id = crypto.randomUUID();

  const rawRecord =
    JSON.stringify(body);

  return env.DB.prepare(`
    INSERT INTO vehicles (
      id,
      model_name,
      game_name,
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
      rockstar_dlc,
      source_pack,
      vehicles_meta_path,
      raw_record_json,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(model_name) DO UPDATE SET
      game_name =
        excluded.game_name,

      make_name =
        excluded.make_name,

      vehicle_class =
        excluded.vehicle_class,

      vehicle_type =
        excluded.vehicle_type,

      handling_id =
        excluded.handling_id,

      audio_name =
        excluded.audio_name,

      layout_name =
        excluded.layout_name,

      frequency =
        excluded.frequency,

      max_num =
        excluded.max_num,

      max_num_of_same_color =
        excluded.max_num_of_same_color,

      identical_model_spawn_distance =
        excluded.identical_model_spawn_distance,

      swankness =
        excluded.swankness,

     rockstar_dlc =
  COALESCE(
    excluded.rockstar_dlc,
    rockstar_dlc
  ),

source_pack =
  COALESCE(
    excluded.source_pack,
    source_pack
  ),

vehicles_meta_path =
  COALESCE(
    excluded.vehicles_meta_path,
    vehicles_meta_path
  ),

      raw_record_json =
        excluded.raw_record_json,

      updated_at =
        CURRENT_TIMESTAMP
  `).bind(
    id,
    modelName,
    optionalText(body.gameName),
    optionalText(body.makeName),
    optionalText(body.vehicleClass),
    optionalText(body.vehicleType),
    optionalText(body.handlingId),
    optionalText(body.audioName),
    optionalText(body.layoutName),
    optionalInteger(body.frequency),
    optionalInteger(body.maxNum),
    optionalInteger(
      body.maxNumOfSameColor
    ),
    optionalInteger(
      body.identicalModelSpawnDistance
    ),
    optionalText(body.swankness),
    optionalText(body.rockstarDlc),
    optionalText(body.sourcePack),
    optionalText(body.vehiclesMetaPath),
    rawRecord
  );
}
async function readJsonRequest(request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return {
      error: jsonResponse(
        {
          ok: false,
          error: "Content-Type must be application/json"
        },
        415
      )
    };
  }

  try {
    return {
      body: await request.json()
    };
  } catch {
    return {
      error: jsonResponse(
        {
          ok: false,
          error: "The request body is not valid JSON"
        },
        400
      )
    };
  }
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

async function handleVanillaVehicleList(request, env) {
  const result = await env.DB.prepare(
    `SELECT model_name, hash FROM vanilla_vehicles ORDER BY model_name COLLATE NOCASE`
  ).all();
  const vehicles = (result.results || []).map(row => ({
    modelName: row.model_name,
    hash: row.hash
  }));
  return jsonResponse({ ok: true, vehicles });
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
        OR vehicle_year LIKE ?
      )
    `);

    const searchValue = `%${search}%`;

    bindings.push(
      searchValue,
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

  // Tier gate: vanilla Rockstar vehicles are visible to everyone. Addon/mod
  // vehicles are only visible to the account that added them to their own
  // garage (see user_garage_vehicles, migration 020) -- FNL (no session)
  // sees vanilla only, free-logged-in sees vanilla + their own garage.
  // Admins/owners bypass this for full catalog visibility/moderation.
  const auth = await getCurrentAuthSession(request, env);
  const isAdmin = Boolean(auth && ["admin", "owner"].includes(auth.user.role));

  if (!isAdmin) {
    if (auth) {
      conditions.push(`
        (
          model_name IN (SELECT model_name FROM vanilla_vehicles)
          OR id IN (SELECT vehicle_id FROM user_garage_vehicles WHERE user_id = ?)
        )
      `);
      bindings.push(auth.user.id);
    } else {
      conditions.push("model_name IN (SELECT model_name FROM vanilla_vehicles)");
    }
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

// POST /api/garage/:modelName -- add an addon/mod vehicle to the current
// user's own garage (requires login). Vanilla vehicles don't need this --
// they're always visible to everyone regardless of garage membership.
async function handleGarageAdd(request, env, requestedModelName) {
  const auth = await getCurrentAuthSession(request, env);
  if (!auth) {
    return jsonResponse({ ok: false, error: "Authentication required" }, 401);
  }

  const modelName = optionalText(requestedModelName);
  if (!modelName) {
    return jsonResponse({ ok: false, error: "A vehicle model name is required" }, 400);
  }

  const vehicle = await env.DB.prepare(
    `SELECT id, model_name FROM vehicles WHERE model_name = ? COLLATE NOCASE LIMIT 1`
  ).bind(modelName).first();

  if (!vehicle) {
    return jsonResponse({ ok: false, error: "Vehicle not found" }, 404);
  }

  await env.DB.prepare(
    `INSERT OR IGNORE INTO user_garage_vehicles (id, user_id, vehicle_id) VALUES (?, ?, ?)`
  ).bind(crypto.randomUUID(), auth.user.id, vehicle.id).run();

  return jsonResponse({ ok: true, modelName: vehicle.model_name });
}

// DELETE /api/garage/:modelName -- remove a vehicle from the current
// user's own garage. Only removes the personal pointer -- never touches
// the shared vehicles catalog row itself.
async function handleGarageRemove(request, env, requestedModelName) {
  const auth = await getCurrentAuthSession(request, env);
  if (!auth) {
    return jsonResponse({ ok: false, error: "Authentication required" }, 401);
  }

  const modelName = optionalText(requestedModelName);
  if (!modelName) {
    return jsonResponse({ ok: false, error: "A vehicle model name is required" }, 400);
  }

  const vehicle = await env.DB.prepare(
    `SELECT id FROM vehicles WHERE model_name = ? COLLATE NOCASE LIMIT 1`
  ).bind(modelName).first();

  if (!vehicle) {
    return jsonResponse({ ok: false, error: "Vehicle not found" }, 404);
  }

  await env.DB.prepare(
    `DELETE FROM user_garage_vehicles WHERE user_id = ? AND vehicle_id = ?`
  ).bind(auth.user.id, vehicle.id).run();

  return jsonResponse({ ok: true });
}
function safeParseObject(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object"
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

async function handleHandlingProfileList(env) {
  const result = await env.DB
    .prepare(`
      SELECT
        id,
        handling_name,
        ai_handling,
        source_file,
        handling_data_json,
        created_at,
        updated_at
      FROM handling_profiles
      ORDER BY handling_name COLLATE NOCASE ASC
    `)
    .all();

  const handlingProfiles = result.results.map(row => {
    const storedProfile = safeParseObject(
      row.handling_data_json
    );

    return {
      ...storedProfile,
      id: row.id,
      handlingName: row.handling_name,
      AIHandling:
        row.ai_handling ??
        storedProfile.AIHandling ??
        "",
      sourceFile:
        row.source_file ??
        storedProfile.sourceFile ??
        "",
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });

  return jsonResponse({
    ok: true,
    total: handlingProfiles.length,
    handlingProfiles
  });
}

async function handleVehiclePopgroupList(env) {
  const result = await env.DB
    .prepare(`
      SELECT
        v.model_name,
        vp.popgroup_name,
        vp.source_file
      FROM vehicle_popgroups vp
      INNER JOIN vehicles v
        ON v.id = vp.vehicle_id
      ORDER BY
        v.model_name COLLATE NOCASE ASC,
        vp.popgroup_name COLLATE NOCASE ASC
    `)
    .all();

  const relationships = result.results.map(row => ({
    modelName: row.model_name,
    groupName: row.popgroup_name,
    sourceFile: row.source_file
  }));

  return jsonResponse({
    ok: true,
    total: relationships.length,
    relationships
  });
}
async function handleVehicleImport(request, env) {
  const parsed = await readJsonRequest(request);

  if (parsed.error) {
    return parsed.error;
  }

  const validationError = validateVehicleInput(parsed.body);

  if (validationError) {
    return jsonResponse(
      {
        ok: false,
        error: validationError
      },
      400
    );
  }

  await buildVehicleUpsertStatement(parsed.body, env).run();

  const savedVehicle = await env.DB
    .prepare(`
      SELECT *
      FROM vehicles
      WHERE model_name = ? COLLATE NOCASE
      LIMIT 1
    `)
    .bind(parsed.body.modelName)
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

async function handleVehicleBulkImport(request, env) {
  const parsed = await readJsonRequest(request);

  if (parsed.error) {
    return parsed.error;
  }

  const vehicles = Array.isArray(parsed.body)
    ? parsed.body
    : parsed.body?.vehicles;

  if (!Array.isArray(vehicles)) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Request body must be an array or an object with a vehicles array"
      },
      400
    );
  }

  if (vehicles.length === 0) {
    return jsonResponse(
      {
        ok: false,
        error: "At least one vehicle is required"
      },
      400
    );
  }

  if (vehicles.length > 100) {
    return jsonResponse(
      {
        ok: false,
        error: "A maximum of 100 vehicles may be imported per request"
      },
      400
    );
  }

  const validationErrors = vehicles
    .map((vehicle, index) =>
      validateVehicleInput(vehicle, index)
    )
    .filter(Boolean);

  if (validationErrors.length > 0) {
    return jsonResponse(
      {
        ok: false,
        error: "Bulk import validation failed",
        details: validationErrors
      },
      400
    );
  }

  const statements = vehicles.map(vehicle =>
    buildVehicleUpsertStatement(vehicle, env)
  );

  await env.DB.batch(statements);

  const modelNames = vehicles.map(vehicle => vehicle.modelName);

  return jsonResponse(
    {
      ok: true,
      message: "Bulk vehicle import completed",
      imported: vehicles.length,
      modelNames
    },
    201
  );
}
function splitTags(value) {
  if (Array.isArray(value)) {
    return value
      .filter(tag => typeof tag === "string")
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function flattenLibraryVehicle(record) {
const meta = record?.vehiclesMeta || {};
const custom = record?.custom || {};
const sources = record?.sources || {};
const importSource =
  record?.importSource || {};

  const vehicleMetaSources = Array.isArray(sources.vehiclesMeta)
    ? sources.vehiclesMeta
    : [];

  return {
    modelName:
      optionalText(record?.modelName) ||
      optionalText(meta.modelName),

    gameName: optionalText(meta.gameName),

   displayName: optionalText(custom.displayName),

    makeName: optionalText(meta.vehicleMakeName),

    vehicleClass: optionalText(meta.vehicleClass),
    vehicleType: optionalText(meta.vehicleType),

    handlingId: optionalText(meta.handlingId),
    audioName: optionalText(meta.audioNameHash),
    layoutName: optionalText(meta.layout),

    frequency: optionalInteger(meta.frequency),
    maxNum: optionalInteger(meta.maxNum),
    maxNumOfSameColor:
      optionalInteger(meta.maxNumOfSameColor),

    identicalModelSpawnDistance:
      optionalInteger(meta.identicalModelSpawnDistance),

    swankness: optionalText(meta.swankness),

    installed: Boolean(custom.installed),
    favorite: Boolean(custom.favorite),

    installationType: optionalText(custom.installType),
    replacementSlot: optionalText(custom.replacementFor),
    gameVersion: optionalText(custom.gameVersion),

    installedDlcFolder:
      optionalText(custom.dlcFolderPath),

    installDate: optionalText(custom.installDate),

	rockstarDlc:
	optionalText(importSource.dlcFolder) ||
	optionalText(custom.rockstarDlc),

	sourcePack:
	optionalText(importSource.sourceLabel) ||
	optionalText(custom.sourcePack) ||
	optionalText(vehicleMetaSources[0]),

    downloadUrl: optionalText(custom.downloadUrl),

    yftPath: optionalText(custom.yftPath),
    hiYftPath: optionalText(custom.yftHiPath),
    ytdPath: optionalText(custom.ytdPath),

    vehiclesMetaPath:
  optionalText(importSource.sourcePath) ||
  optionalText(custom.vehiclesMetaPath) ||
  optionalText(vehicleMetaSources[0]),

    handlingMetaPath:
      optionalText(custom.handlingMetaPath),

    tags: splitTags(custom.tags),
    notes: optionalText(custom.notes),
    vehicleYear: optionalText(custom.vehicleYear),

    originalLibraryRecord: record
  };
}

function buildHandlingUpsertStatement(profile, env) {
  const handlingName = optionalText(profile?.handlingName);

  if (!handlingName) {
    throw new Error("Handling profile is missing handlingName");
  }

  const id =
    optionalText(profile.id) ||
    handlingName.toLowerCase();

  return env.DB.prepare(`
    INSERT INTO handling_profiles (
      id,
      handling_name,
      ai_handling,
      source_file,
      handling_data_json,
      raw_xml,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(handling_name) DO UPDATE SET
      ai_handling = excluded.ai_handling,
      source_file = excluded.source_file,
      handling_data_json = excluded.handling_data_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id,
    handlingName,
    optionalText(profile.AIHandling),
    optionalText(profile.sourceFile),
    JSON.stringify(profile)
  );
}
function sourceHistoryTypeFromImport(
  importMode,
  body
) {
  if (importMode === "vehicles-meta") {
    return "vehicles.meta";
  }

  if (importMode === "popgroups") {
    return "Popgroups";
  }

  if (
    Array.isArray(body?.handlingProfiles) &&
    body.handlingProfiles.length > 0
  ) {
    return "handling.meta";
  }

  return "library";
}

function buildSourceHistoryStatement({
  body,
  env,
  importMode,
  recordCount
}) {
  const source =
    body?.importSource || {};

  const sourceType =
    sourceHistoryTypeFromImport(
      importMode,
      body
    );

  const sourcePath =
    optionalText(source.sourcePath) ||
    optionalText(body?.sourceFile);

  if (!sourcePath) {
    return null;
  }

  const id =
    optionalText(body?.importSessionId) ||
    [
      sourceType,
      sourcePath,
      crypto.randomUUID()
    ].join(":");

  const rawImportJson =
    JSON.stringify({
      importMode: importMode || "library",
      sourceFile:
        optionalText(body?.sourceFile),
      replaceSource:
        body?.replaceSource === true,
      recordCount
    });

  return env.DB.prepare(`
    INSERT INTO source_history (
      id,
      source_type,
      source_label,
      source_container,
      source_directory,
      source_path,
      original_file_name,
      record_count,
      import_mode,
      imported_at,
      status,
      raw_import_json
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?,
      ?,
      CURRENT_TIMESTAMP,
      'current',
      ?
    )
    ON CONFLICT(id) DO UPDATE SET
      record_count =
        COALESCE(source_history.record_count, 0) +
        COALESCE(excluded.record_count, 0),

      imported_at =
        CURRENT_TIMESTAMP,

      status =
        'current',

      raw_import_json =
        excluded.raw_import_json
  `).bind(
    id,
    sourceType,
    optionalText(source.sourceLabel),
    optionalText(source.dlcFolder),
    optionalText(source.sourceDirectory),
    sourcePath,
    optionalText(source.originalFileName),
    Number.isFinite(recordCount)
      ? recordCount
      : 0,
    importMode || "library",
    rawImportJson
  );
}
async function importVehiclePopgroups(
  records,
  env,
  sourceFileOverride = null
) {
  let imported = 0;

  for (const record of records) {
    const modelName =
      optionalText(record?.modelName) ||
      optionalText(record?.vehiclesMeta?.modelName);

    const popgroups = Array.isArray(record?.popgroups)
      ? record.popgroups
      : [];

    if (!modelName || popgroups.length === 0) {
      continue;
    }

    const vehicle = await env.DB
      .prepare(`
        SELECT id
        FROM vehicles
        WHERE model_name = ? COLLATE NOCASE
        LIMIT 1
      `)
      .bind(modelName)
      .first();

    if (!vehicle?.id) {
      continue;
    }

    const statements = popgroups
      .filter(group => optionalText(group?.groupName))
      .map(group =>
        env.DB.prepare(`
          INSERT INTO vehicle_popgroups (
            vehicle_id,
            popgroup_name,
            source_file
          )
          VALUES (?, ?, ?)
          ON CONFLICT(vehicle_id, popgroup_name)
          DO UPDATE SET
            source_file = excluded.source_file
        `).bind(
		vehicle.id,
		optionalText(group.groupName),
		optionalText(sourceFileOverride) ||
		optionalText(group.sourceFile)
)
      );

    if (statements.length > 0) {
      await env.DB.batch(statements);
      imported += statements.length;
    }
  }

  return imported;
}

async function ensurePopgroupVehicles(
  records,
  env
) {
  const statements = records
    .map(record =>
      optionalText(record?.modelName) ||
      optionalText(
        record?.vehiclesMeta?.modelName
      )
    )
    .filter(Boolean)
    .map(modelName =>
      env.DB.prepare(`
        INSERT INTO vehicles (
          id,
          model_name,
          created_at,
          updated_at
        )
        VALUES (
          ?,
          ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(model_name)
        DO NOTHING
      `).bind(
        crypto.randomUUID(),
        modelName
      )
    );

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}
async function handleSourceHistoryList(
  request,
  env
) {
  const url = new URL(request.url);

  const type =
    optionalText(url.searchParams.get("type"));

  const search =
    optionalText(url.searchParams.get("search"));

  const rawLimit =
    Number.parseInt(
      url.searchParams.get("limit") || "100",
      10
    );

  const rawOffset =
    Number.parseInt(
      url.searchParams.get("offset") || "0",
      10
    );

  const limit =
    Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 250)
      : 100;

  const offset =
    Number.isFinite(rawOffset)
      ? Math.max(rawOffset, 0)
      : 0;

  const whereClauses = [];
  const bindings = [];

  if (type) {
    whereClauses.push(
      "source_type = ?"
    );
    bindings.push(type);
  }

  if (search) {
    const pattern = `%${search}%`;

    whereClauses.push(`
      (
        source_label LIKE ?
        OR source_container LIKE ?
        OR source_directory LIKE ?
        OR source_path LIKE ?
        OR original_file_name LIKE ?
        OR import_mode LIKE ?
      )
    `);

    bindings.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern
    );
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const countRow = await env.DB
    .prepare(`
      SELECT COUNT(*) AS total
      FROM source_history
      ${whereSql}
    `)
    .bind(...bindings)
    .first();

  const result = await env.DB
    .prepare(`
      SELECT
        id,
        source_type,
        source_label,
        source_container,
        source_directory,
        source_path,
        original_file_name,
        record_count,
        import_mode,
        imported_at,
        status,
        notes,
        raw_import_json
      FROM source_history
      ${whereSql}
      ORDER BY imported_at DESC
      LIMIT ?
      OFFSET ?
    `)
    .bind(
      ...bindings,
      limit,
      offset
    )
    .all();

  const rows = Array.isArray(result.results)
    ? result.results
    : [];

  return jsonResponse({
    ok: true,
    total: Number(countRow?.total || 0),
    limit,
    offset,
    sourceHistory:
      rows.map(normalizeSourceHistory)
  });
}
// When a logged-in user imports addon/mod vehicles, link them into that
// user's own garage so they keep seeing "their" addons under the FLI tier
// gate in handleVehicleList (vanilla + own garage). Vanilla vehicles never
// need a garage entry -- they're already visible to everyone. Imports
// authorized only via LIBRARY_WRITE_TOKEN (no user session) skip this,
// since there's no account to attribute the entries to.
async function linkImportedVehiclesToGarage(flattenedVehicles, request, env) {
  const auth = await getCurrentAuthSession(request, env);
  if (!auth) return;

  const modelNames = [...new Set(
    flattenedVehicles
      .map(vehicle => optionalText(vehicle.modelName))
      .filter(Boolean)
  )];

  if (!modelNames.length) return;

  const placeholders = modelNames.map(() => "?").join(", ");

  const [vehicleRows, vanillaRows] = await Promise.all([
    env.DB.prepare(
      `SELECT id, model_name FROM vehicles WHERE model_name IN (${placeholders})`
    ).bind(...modelNames).all(),
    env.DB.prepare(
      `SELECT model_name FROM vanilla_vehicles WHERE model_name IN (${placeholders})`
    ).bind(...modelNames).all()
  ]);

  const vanillaSet = new Set(
    (vanillaRows.results || []).map(row => String(row.model_name).toLowerCase())
  );

  const addonVehicleIds = (vehicleRows.results || [])
    .filter(row => !vanillaSet.has(String(row.model_name).toLowerCase()))
    .map(row => row.id)
    .filter(Boolean);

  if (!addonVehicleIds.length) return;

  const statements = addonVehicleIds.map(vehicleId =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO user_garage_vehicles (id, user_id, vehicle_id) VALUES (?, ?, ?)`
    ).bind(crypto.randomUUID(), auth.user.id, vehicleId)
  );

  await env.DB.batch(statements);
}

async function handleLibraryV2Import(request, env) {
  const authorizationError =
    await checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const parsed = await readJsonRequest(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.body || {};

  const importMode =
  optionalText(body.importMode);
  const sourceFile =
  optionalText(body.sourceFile);

  const replaceSource =
  body.replaceSource === true;
  const vehicleRecords = Array.isArray(body.vehicles)
    ? body.vehicles
    : [];

  const handlingProfiles =
    Array.isArray(body.handlingProfiles)
      ? body.handlingProfiles
      : [];

  if (
    vehicleRecords.length === 0 &&
    handlingProfiles.length === 0
  ) {
    return jsonResponse(
      {
        ok: false,
        error:
          "The request must contain vehicles or handlingProfiles"
      },
      400
    );
  }

  if (vehicleRecords.length > 50) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A maximum of 50 library vehicles may be imported per request"
      },
      400
    );
  }

  if (handlingProfiles.length > 50) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A maximum of 50 handling profiles may be imported per request"
      },
      400
    );
  }

  const flattenedVehicles = vehicleRecords.map(
    flattenLibraryVehicle
  );

  const validationErrors = flattenedVehicles
    .map((vehicle, index) =>
      validateVehicleInput(vehicle, index)
    )
    .filter(Boolean);

  if (validationErrors.length > 0) {
    return jsonResponse(
      {
        ok: false,
        error: "Library import validation failed",
        details: validationErrors
      },
      400
    );
  }

if (importMode === "popgroups") {
  if (!sourceFile) {
    return jsonResponse(
      {
        ok: false,
        error:
          "sourceFile is required for a Popgroups import"
      },
      400
    );
  }

  /*
   * Only the first batch for a file requests replacement.
   * This removes relationships that belonged to the older
   * version of this exact source file.
   */
  if (replaceSource) {
    await env.DB
      .prepare(`
        DELETE FROM vehicle_popgroups
        WHERE source_file = ?
      `)
      .bind(sourceFile)
      .run();
  }

  await ensurePopgroupVehicles(
    vehicleRecords,
    env
  );
} else if (flattenedVehicles.length > 0) {
  const buildStatement =
    importMode === "vehicles-meta"
      ? buildVehicleMetaUpsertStatement
      : buildVehicleUpsertStatement;

  const vehicleStatements =
    flattenedVehicles.map(vehicle =>
      buildStatement(vehicle, env)
    );

  await env.DB.batch(
    vehicleStatements
  );

  await linkImportedVehiclesToGarage(
    flattenedVehicles,
    request,
    env
  );
}

  let popgroupsImported = 0;

  if (vehicleRecords.length > 0) {
    popgroupsImported =
  await importVehiclePopgroups(
    vehicleRecords,
    env,
    importMode === "popgroups"
      ? sourceFile
      : null
  );
  }

if (handlingProfiles.length > 0) {
  const handlingStatements =
    handlingProfiles.map(profile =>
      buildHandlingUpsertStatement(profile, env)
    );

  await env.DB.batch(handlingStatements);
}

const sourceHistoryRecordCount =
  importMode === "popgroups"
    ? popgroupsImported
    : handlingProfiles.length > 0
      ? handlingProfiles.length
      : flattenedVehicles.length;

const sourceHistoryStatement =
  buildSourceHistoryStatement({
    body,
    env,
    importMode,
    recordCount:
      sourceHistoryRecordCount
  });

let sourceHistoryLogged = false;
let sourceHistoryError = null;

if (sourceHistoryStatement) {
  try {
    await sourceHistoryStatement.run();
    sourceHistoryLogged = true;
  } catch (error) {
    console.error(
      "Source history logging failed",
      error
    );

    sourceHistoryError =
      error?.message ||
      "Source history logging failed";
  }
}

return jsonResponse(
    {
      ok: true,
      message: "Library V2 batch imported",
	  importMode: importMode || "library",
	  sourceFile,
	  replacedSource:
     importMode === "popgroups" &&
      replaceSource,
      vehiclesImported: flattenedVehicles.length,
      handlingProfilesImported:
        handlingProfiles.length,
      popgroupsImported,
     sourceFilesImported: 0,
     sourceHistoryLogged,
     sourceHistoryError
    },
    201
  );
}

const DEFAULT_WORKSPACE_ID = "default";

const AUTH_SESSION_COOKIE_NAME = "gta_traffic_session";
const AUTH_SESSION_DAYS = 14;
const PASSWORD_PBKDF2_ITERATIONS = 100000;

function normalizeWorkspaceId(value) {
  const workspaceId = optionalText(value) || DEFAULT_WORKSPACE_ID;

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(workspaceId)) {
    return DEFAULT_WORKSPACE_ID;
  }

  return workspaceId;
}

function sanitizePackKey(value) {
  const key = String(value || "pack")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return key || `pack_${crypto.randomUUID()}`;
}

function normalizeModelName(value) {
  const modelName = optionalText(value);

  if (!modelName) {
    return "";
  }

  return modelName.toLowerCase();
}

function normalizePackRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    packKey: row.pack_key,
    name: row.name,
    creator: row.creator,
    dlcFolder: row.dlc_folder,
    version: row.version,
    website: row.website,
    notes: row.notes,
    sourceFileId: row.source_file_id,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    vehicleCount: Number(row.vehicle_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeVehiclePackRow(row) {
  return {
    membershipId: row.membership_id,
    workspaceId: row.workspace_id,
    modelName: row.model_name,
    relationshipType: row.relationship_type,
    pack: {
      id: row.pack_id,
      packKey: row.pack_key,
      name: row.name,
      creator: row.creator,
      dlcFolder: row.dlc_folder,
      version: row.version,
      website: row.website,
      notes: row.notes,
      sourceType: row.source_type,
      sourceLabel: row.source_label,
      createdAt: row.pack_created_at,
      updatedAt: row.pack_updated_at
    }
  };
}

async function handlePackList(request, env) {
  const url = new URL(request.url);
  const workspaceId = normalizeWorkspaceId(
    url.searchParams.get("workspaceId")
  );

  const result = await env.DB
    .prepare(`
      SELECT
        p.id,
        p.workspace_id,
        p.pack_key,
        p.name,
        p.creator,
        p.dlc_folder,
        p.version,
        p.website,
        p.notes,
        p.source_file_id,
        p.source_type,
        p.source_label,
        p.created_at,
        p.updated_at,
        COUNT(vpm.id) AS vehicle_count
      FROM pack_records p
      LEFT JOIN vehicle_pack_memberships vpm
        ON vpm.pack_id = p.id
       AND vpm.workspace_id = p.workspace_id
      WHERE p.workspace_id = ?
      GROUP BY p.id
      ORDER BY p.name COLLATE NOCASE ASC
    `)
    .bind(workspaceId)
    .all();

  const packs = Array.isArray(result.results)
    ? result.results.map(normalizePackRow)
    : [];

  return jsonResponse({
    ok: true,
    workspaceId,
    total: packs.length,
    packs
  });
}

async function handleVehiclePackList(request, env) {
  const url = new URL(request.url);

  const workspaceId = normalizeWorkspaceId(
    url.searchParams.get("workspaceId")
  );

  const modelName = normalizeModelName(
    url.searchParams.get("modelName")
  );

  if (!modelName) {
    return jsonResponse(
      {
        ok: false,
        error: "modelName is required"
      },
      400
    );
  }

  const result = await env.DB
    .prepare(`
      SELECT
        vpm.id AS membership_id,
        vpm.workspace_id,
        vpm.model_name,
        vpm.relationship_type,
        p.id AS pack_id,
        p.pack_key,
        p.name,
        p.creator,
        p.dlc_folder,
        p.version,
        p.website,
        p.notes,
        p.source_type,
        p.source_label,
        p.created_at AS pack_created_at,
        p.updated_at AS pack_updated_at
      FROM vehicle_pack_memberships vpm
      INNER JOIN pack_records p
        ON p.id = vpm.pack_id
       AND p.workspace_id = vpm.workspace_id
      WHERE vpm.workspace_id = ?
        AND vpm.model_name = ? COLLATE NOCASE
      ORDER BY p.name COLLATE NOCASE ASC
    `)
    .bind(workspaceId, modelName)
    .all();

  const memberships = Array.isArray(result.results)
    ? result.results.map(normalizeVehiclePackRow)
    : [];

  return jsonResponse({
    ok: true,
    workspaceId,
    modelName,
    total: memberships.length,
    memberships
  });
}

function normalizePackImportBody(body) {
  const workspaceId = normalizeWorkspaceId(body?.workspaceId);

  const packsObject =
    body?.packs &&
    typeof body.packs === "object" &&
    !Array.isArray(body.packs)
      ? body.packs
      : {};

  const vehiclePackMap =
    body?.vehiclePackMap &&
    typeof body.vehiclePackMap === "object" &&
    !Array.isArray(body.vehiclePackMap)
      ? body.vehiclePackMap
      : {};

  const packs = Object.entries(packsObject)
    .map(([fallbackKey, pack]) => {
      if (!pack || typeof pack !== "object") {
        return null;
      }

      const packKey = sanitizePackKey(
        pack.id ||
        pack.packKey ||
        fallbackKey ||
        pack.name
      );

      const name =
        optionalText(pack.name) ||
        packKey.replace(/_/g, " ");

      return {
        id: `${workspaceId}:pack:${packKey}`,
        workspaceId,
        packKey,
        name,
        creator: optionalText(pack.creator),
        dlcFolder: optionalText(pack.dlcFolder),
        version: optionalText(pack.version),
        website: optionalText(pack.website),
        notes: optionalText(pack.notes),
        sourceType: optionalText(body?.sourceType) || "pack-database",
        sourceLabel:
          optionalText(body?.sourceLabel) ||
          optionalText(pack.name) ||
          name,
        rawPackJson: JSON.stringify(pack)
      };
    })
    .filter(Boolean);

  const packKeyByOriginalId = new Map();

  Object.entries(packsObject).forEach(([fallbackKey, pack]) => {
    if (!pack || typeof pack !== "object") {
      return;
    }

    const packKey = sanitizePackKey(
      pack.id ||
      pack.packKey ||
      fallbackKey ||
      pack.name
    );

    [
      fallbackKey,
      pack.id,
      pack.packKey,
      pack.name
    ].forEach(value => {
      const textValue = optionalText(value);

      if (textValue) {
        packKeyByOriginalId.set(textValue, packKey);
      }
    });
  });

  const memberships = Object.entries(vehiclePackMap)
    .map(([modelName, originalPackId]) => {
      const cleanModelName = normalizeModelName(modelName);
      const originalId = optionalText(originalPackId);

      if (!cleanModelName || !originalId) {
        return null;
      }

      const packKey =
        packKeyByOriginalId.get(originalId) ||
        sanitizePackKey(originalId);

      return {
        id:
          `${workspaceId}:membership:${packKey}:${cleanModelName}:included`,
        workspaceId,
        packId: `${workspaceId}:pack:${packKey}`,
        modelName: cleanModelName,
        relationshipType: "included",
        rawMembershipJson: JSON.stringify({
          modelName: cleanModelName,
          packId: originalId
        })
      };
    })
    .filter(Boolean);

  return {
    workspaceId,
    packs,
    memberships
  };
}

function normalizeAppearanceImportText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  return clean || null;
}

function normalizeAppearanceImportKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function appearanceImportId(workspaceId, type, key) {
  const cleanWorkspace =
    normalizeAppearanceImportKey(workspaceId) || "default";

  const cleanKey =
    normalizeAppearanceImportKey(key) ||
    Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);

  return cleanWorkspace + ":appearance:" + type + ":" + cleanKey;
}

function safeAppearanceJson(value) {
  return JSON.stringify(value ?? null);
}

function normalizeVehicleAppearanceImportBody(body = {}) {
  const workspaceId =
    normalizeAppearanceImportText(body.workspaceId) ||
    "default";

  const sourceLabel =
    normalizeAppearanceImportText(body.sourceLabel) ||
    "Appearance Metadata";

  const carvariations = body.carvariations || {};
  const carcols = body.carcols || {};

  const variationFileName =
    normalizeAppearanceImportText(carvariations.fileName) ||
    "carvariations.meta";

  const carcolsFileName =
    normalizeAppearanceImportText(carcols.fileName) ||
    "carcols.meta";

  const variations = Array.isArray(carvariations.vehicles)
    ? carvariations.vehicles
        .map(vehicle => {
          const modelName =
            normalizeAppearanceImportText(vehicle.modelName)?.toLowerCase();

          if (!modelName) {
            return null;
          }

          return {
            id: appearanceImportId(workspaceId, "variation", modelName),
            workspaceId,
            modelName,
            sourceFileName: variationFileName,
            sourceLabel,
            dlcFolder: normalizeAppearanceImportText(body.dlcFolder),
            colors: Array.isArray(vehicle.colors) ? vehicle.colors : [],
            kits: Array.isArray(vehicle.kits) ? vehicle.kits : [],
            liveryCount: Number(vehicle.liveryCount || 0),
            enabledLiveries: Array.isArray(vehicle.enabledLiveries)
              ? vehicle.enabledLiveries
              : [],
            plateProbabilities: Array.isArray(vehicle.plateProbabilities)
              ? vehicle.plateProbabilities
              : [],
            lightSettings: normalizeAppearanceImportText(vehicle.lightSettings),
            sirenSettings: normalizeAppearanceImportText(vehicle.sirenSettings),
            rawVariationJson: safeAppearanceJson(vehicle)
          };
        })
        .filter(Boolean)
    : [];

  const kits = Array.isArray(carcols.kits)
    ? carcols.kits
        .map(kit => {
          const kitName =
            normalizeAppearanceImportText(kit.kitName);

          if (!kitName) {
            return null;
          }

          return {
            id: appearanceImportId(workspaceId, "kit", kitName),
            workspaceId,
            kitName,
            kitId: normalizeAppearanceImportText(kit.id),
            kitType: normalizeAppearanceImportText(kit.kitType),
            sourceFileName: carcolsFileName,
            sourceLabel,
            statModCount: Number(kit.statModCount || 0),
            statModTypes: Array.isArray(kit.statModTypes)
              ? kit.statModTypes
              : [],
            visibleModCount: Number(kit.visibleModCount || 0),
            linkedModCount: Number(kit.linkedModCount || 0),
            rawKitJson: safeAppearanceJson(kit)
          };
        })
        .filter(Boolean)
    : [];

  const lights = Array.isArray(carcols.lights)
    ? carcols.lights
        .map(light => {
          const lightId =
            normalizeAppearanceImportText(light.id);

          if (!lightId) {
            return null;
          }

          return {
            id: appearanceImportId(workspaceId, "light", lightId),
            workspaceId,
            lightId,
            name: normalizeAppearanceImportText(light.name),
            sourceFileName: carcolsFileName,
            sourceLabel,
            headLightTexture:
              normalizeAppearanceImportText(light.headLightTexture),
            headLightColor:
              normalizeAppearanceImportText(light.headLightColor),
            tailLightColor:
              normalizeAppearanceImportText(light.tailLightColor),
            indicatorColor:
              normalizeAppearanceImportText(light.indicatorColor),
            rawLightJson: safeAppearanceJson(light)
          };
        })
        .filter(Boolean)
    : [];

  return {
    workspaceId,
    sourceLabel,
    variations,
    kits,
    lights
  };
}

function parseAppearanceJsonField(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function normalizeVehicleAppearanceVariationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    modelName: row.model_name,
    sourceFileName: row.source_file_name,
    sourceLabel: row.source_label,
    dlcFolder: row.dlc_folder,
    colors: parseAppearanceJsonField(row.colors_json, []),
    kits: parseAppearanceJsonField(row.kits_json, []),
    liveryCount: Number(row.livery_count || 0),
    enabledLiveries: parseAppearanceJsonField(row.enabled_liveries_json, []),
    plateProbabilities: parseAppearanceJsonField(row.plate_probabilities_json, []),
    lightSettings: row.light_settings,
    sirenSettings: row.siren_settings,
    rawVariation: parseAppearanceJsonField(row.raw_variation_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeVehicleAppearanceKitRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kitName: row.kit_name,
    kitId: row.kit_id,
    kitType: row.kit_type,
    sourceFileName: row.source_file_name,
    sourceLabel: row.source_label,
    statModCount: Number(row.stat_mod_count || 0),
    statModTypes: parseAppearanceJsonField(row.stat_mod_types_json, []),
    visibleModCount: Number(row.visible_mod_count || 0),
    linkedModCount: Number(row.linked_mod_count || 0),
    rawKit: parseAppearanceJsonField(row.raw_kit_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeVehicleAppearanceLightRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    lightId: row.light_id,
    name: row.name,
    sourceFileName: row.source_file_name,
    sourceLabel: row.source_label,
    headLightTexture: row.head_light_texture,
    headLightColor: row.head_light_color,
    tailLightColor: row.tail_light_color,
    indicatorColor: row.indicator_color,
    rawLight: parseAppearanceJsonField(row.raw_light_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function handleVehicleAppearanceGet(request, env) {
  const url = new URL(request.url);

  const modelName =
    String(url.searchParams.get("modelName") || "")
      .trim()
      .toLowerCase();

  const workspaceId =
    String(url.searchParams.get("workspaceId") || "default")
      .trim() ||
    "default";

  if (!modelName) {
    return jsonResponse(
      {
        ok: false,
        error: "modelName is required"
      },
      400
    );
  }

  const variationRow =
    await env.DB.prepare(`
      SELECT *
      FROM vehicle_appearance_variations
      WHERE workspace_id = ?
        AND model_name = ?
      LIMIT 1
    `).bind(
      workspaceId,
      modelName
    ).first();

  const variation =
    normalizeVehicleAppearanceVariationRow(variationRow);

  let kits = [];
  let lights = [];

  if (variation?.kits?.length) {
    const kitPlaceholders =
      variation.kits.map(() => "?").join(",");

    const kitResult =
      await env.DB.prepare(`
        SELECT *
        FROM vehicle_appearance_mod_kits
        WHERE workspace_id = ?
          AND kit_name IN (${kitPlaceholders})
        ORDER BY kit_name COLLATE NOCASE ASC
      `).bind(
        workspaceId,
        ...variation.kits
      ).all();

    kits =
      (kitResult.results || [])
        .map(normalizeVehicleAppearanceKitRow)
        .filter(Boolean);
  }

  if (variation?.lightSettings) {
    const lightRow =
      await env.DB.prepare(`
        SELECT *
        FROM vehicle_appearance_light_settings
        WHERE workspace_id = ?
          AND light_id = ?
        LIMIT 1
      `).bind(
        workspaceId,
        String(variation.lightSettings)
      ).first();

    const light =
      normalizeVehicleAppearanceLightRow(lightRow);

    if (light) {
      lights = [light];
    }
  }

  return jsonResponse({
    ok: true,
    workspaceId,
    modelName,
    appearance: {
      variation,
      kits,
      lights
    }
  });
}

async function handleVehicleAppearanceImport(request, env) {
  const authorizationError =
    await checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const parsed = await readJsonRequest(request);

  if (parsed.error) {
    return parsed.error;
  }

  const {
    workspaceId,
    variations,
    kits,
    lights
  } = normalizeVehicleAppearanceImportBody(parsed.body || {});

  if (
    variations.length === 0 &&
    kits.length === 0 &&
    lights.length === 0
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "No vehicle appearance metadata was found to import"
      },
      400
    );
  }

  if (variations.length > 5000) {
    return jsonResponse(
      {
        ok: false,
        error: "A maximum of 5000 vehicle appearance records may be imported per request"
      },
      400
    );
  }

  if (kits.length > 1000 || lights.length > 1000) {
    return jsonResponse(
      {
        ok: false,
        error: "A maximum of 1000 mod kits and 1000 light settings may be imported per request"
      },
      400
    );
  }

  const statements = [
    env.DB
      .prepare(`
        INSERT OR IGNORE INTO workspaces (
          id,
          owner_user_id,
          name,
          created_at,
          updated_at
        )
        VALUES (
          ?,
          NULL,
          'Default Workspace',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `)
      .bind(workspaceId)
  ];

  variations.forEach(variation => {
    statements.push(
      env.DB.prepare(`
        INSERT INTO vehicle_appearance_variations (
          id,
          workspace_id,
          model_name,
          source_file_name,
          source_label,
          dlc_folder,
          colors_json,
          kits_json,
          livery_count,
          enabled_liveries_json,
          plate_probabilities_json,
          light_settings,
          siren_settings,
          raw_variation_json,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(workspace_id, model_name)
        DO UPDATE SET
          source_file_name = excluded.source_file_name,
          source_label = excluded.source_label,
          dlc_folder = excluded.dlc_folder,
          colors_json = excluded.colors_json,
          kits_json = excluded.kits_json,
          livery_count = excluded.livery_count,
          enabled_liveries_json = excluded.enabled_liveries_json,
          plate_probabilities_json = excluded.plate_probabilities_json,
          light_settings = excluded.light_settings,
          siren_settings = excluded.siren_settings,
          raw_variation_json = excluded.raw_variation_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        variation.id,
        variation.workspaceId,
        variation.modelName,
        variation.sourceFileName,
        variation.sourceLabel,
        variation.dlcFolder,
        safeAppearanceJson(variation.colors),
        safeAppearanceJson(variation.kits),
        variation.liveryCount,
        safeAppearanceJson(variation.enabledLiveries),
        safeAppearanceJson(variation.plateProbabilities),
        variation.lightSettings,
        variation.sirenSettings,
        variation.rawVariationJson
      )
    );
  });

  kits.forEach(kit => {
    statements.push(
      env.DB.prepare(`
        INSERT INTO vehicle_appearance_mod_kits (
          id,
          workspace_id,
          kit_name,
          kit_id,
          kit_type,
          source_file_name,
          source_label,
          stat_mod_count,
          stat_mod_types_json,
          visible_mod_count,
          linked_mod_count,
          raw_kit_json,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(workspace_id, kit_name)
        DO UPDATE SET
          kit_id = excluded.kit_id,
          kit_type = excluded.kit_type,
          source_file_name = excluded.source_file_name,
          source_label = excluded.source_label,
          stat_mod_count = excluded.stat_mod_count,
          stat_mod_types_json = excluded.stat_mod_types_json,
          visible_mod_count = excluded.visible_mod_count,
          linked_mod_count = excluded.linked_mod_count,
          raw_kit_json = excluded.raw_kit_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        kit.id,
        kit.workspaceId,
        kit.kitName,
        kit.kitId,
        kit.kitType,
        kit.sourceFileName,
        kit.sourceLabel,
        kit.statModCount,
        safeAppearanceJson(kit.statModTypes),
        kit.visibleModCount,
        kit.linkedModCount,
        kit.rawKitJson
      )
    );
  });

  lights.forEach(light => {
    statements.push(
      env.DB.prepare(`
        INSERT INTO vehicle_appearance_light_settings (
          id,
          workspace_id,
          light_id,
          name,
          source_file_name,
          source_label,
          head_light_texture,
          head_light_color,
          tail_light_color,
          indicator_color,
          raw_light_json,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(workspace_id, light_id)
        DO UPDATE SET
          name = excluded.name,
          source_file_name = excluded.source_file_name,
          source_label = excluded.source_label,
          head_light_texture = excluded.head_light_texture,
          head_light_color = excluded.head_light_color,
          tail_light_color = excluded.tail_light_color,
          indicator_color = excluded.indicator_color,
          raw_light_json = excluded.raw_light_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        light.id,
        light.workspaceId,
        light.lightId,
        light.name,
        light.sourceFileName,
        light.sourceLabel,
        light.headLightTexture,
        light.headLightColor,
        light.tailLightColor,
        light.indicatorColor,
        light.rawLightJson
      )
    );
  });

  await env.DB.batch(statements);

  return jsonResponse({
    ok: true,
    workspaceId,
    variationsImported: variations.length,
    modKitsImported: kits.length,
    lightSettingsImported: lights.length
  });
}

async function handlePackImport(request, env) {
  const authorizationError =
    await checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const parsed = await readJsonRequest(request);

  if (parsed.error) {
    return parsed.error;
  }

  const {
    workspaceId,
    packs,
    memberships
  } = normalizePackImportBody(parsed.body || {});

  if (packs.length === 0) {
    return jsonResponse(
      {
        ok: false,
        error: "At least one pack is required"
      },
      400
    );
  }

  if (packs.length > 100) {
    return jsonResponse(
      {
        ok: false,
        error: "A maximum of 100 packs may be imported per request"
      },
      400
    );
  }

  if (memberships.length > 5000) {
    return jsonResponse(
      {
        ok: false,
        error:
          "A maximum of 5000 vehicle pack memberships may be imported per request"
      },
      400
    );
  }

  await env.DB
    .prepare(`
      INSERT OR IGNORE INTO workspaces (
        id,
        owner_user_id,
        name,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        NULL,
        'Default Workspace',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `)
    .bind(workspaceId)
    .run();

  const packStatements = packs.map(pack =>
    env.DB.prepare(`
      INSERT INTO pack_records (
        id,
        workspace_id,
        pack_key,
        name,
        creator,
        dlc_folder,
        version,
        website,
        notes,
        source_type,
        source_label,
        raw_pack_json,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(workspace_id, pack_key)
      DO UPDATE SET
        name = excluded.name,
        creator = excluded.creator,
        dlc_folder = excluded.dlc_folder,
        version = excluded.version,
        website = excluded.website,
        notes = excluded.notes,
        source_type = excluded.source_type,
        source_label = excluded.source_label,
        raw_pack_json = excluded.raw_pack_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      pack.id,
      pack.workspaceId,
      pack.packKey,
      pack.name,
      pack.creator,
      pack.dlcFolder,
      pack.version,
      pack.website,
      pack.notes,
      pack.sourceType,
      pack.sourceLabel,
      pack.rawPackJson
    )
  );

  if (packStatements.length > 0) {
    await env.DB.batch(packStatements);
  }

  const membershipStatements = memberships.map(membership =>
    env.DB.prepare(`
      INSERT INTO vehicle_pack_memberships (
        id,
        workspace_id,
        pack_id,
        model_name,
        relationship_type,
        raw_membership_json,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(workspace_id, pack_id, model_name, relationship_type)
      DO UPDATE SET
        raw_membership_json = excluded.raw_membership_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      membership.id,
      membership.workspaceId,
      membership.packId,
      membership.modelName,
      membership.relationshipType,
      membership.rawMembershipJson
    )
  );

  if (membershipStatements.length > 0) {
    await env.DB.batch(membershipStatements);
  }

  return jsonResponse(
    {
      ok: true,
      message: "Pack database imported",
      workspaceId,
      packsImported: packs.length,
      membershipsImported: memberships.length
    },
    201
  );
}

const VEHICLE_IMAGE_PREFIX = "vehicles/";
const MAX_VEHICLE_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_VEHICLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function normalizeVehicleImageModelName(value) {
  const modelName = String(value || "").trim();

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)) {
    return "";
  }

  return modelName.toLowerCase();
}

function vehicleImageKey(modelName) {
  return (
    `${VEHICLE_IMAGE_PREFIX}` +
    `${normalizeVehicleImageModelName(modelName)}` +
    `/primary`
  );
}

function modelNameFromVehicleImageKey(key) {
  const parts = String(key || "").split("/");

  if (
    parts.length < 3 ||
    parts[0] !== "vehicles" ||
    parts[2] !== "primary"
  ) {
    return "";
  }

  return parts[1];
}

function vehicleImageUrl(modelName, version = "") {
  const baseUrl =
    `/api/vehicle-images/` +
    encodeURIComponent(modelName);

  return version
    ? `${baseUrl}?v=${encodeURIComponent(version)}`
    : baseUrl;
}

function checkImageUploadAuthorization(request, env) {
  if (!env.IMAGE_UPLOAD_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error:
          "IMAGE_UPLOAD_TOKEN has not been configured for this Worker"
      },
      503
    );
  }

  const suppliedToken =
    request.headers.get("x-upload-token") || "";

  if (suppliedToken !== env.IMAGE_UPLOAD_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error: "Unauthorized image upload"
      },
      401
    );
  }

  return null;
}

async function handleVehicleImageUpload(
  request,
  env,
  requestedModelName
) {
  const authorizationError =
    checkImageUploadAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const normalizedModelName =
    normalizeVehicleImageModelName(
      requestedModelName
    );

  if (!normalizedModelName) {
    return jsonResponse(
      {
        ok: false,
        error: "The vehicle model name is invalid"
      },
      400
    );
  }

  const vehicle = await env.DB
    .prepare(`
      SELECT
        id,
        model_name
      FROM vehicles
      WHERE model_name = ? COLLATE NOCASE
      LIMIT 1
    `)
    .bind(normalizedModelName)
    .first();

  const imageOnlyUpload = !vehicle;

  const contentType = (
    request.headers.get("content-type") || ""
  )
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!ALLOWED_VEHICLE_IMAGE_TYPES.has(contentType)) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Only JPEG, PNG, and WebP images are supported"
      },
      415
    );
  }

  const imageBytes = await request.arrayBuffer();

  if (imageBytes.byteLength === 0) {
    return jsonResponse(
      {
        ok: false,
        error: "The uploaded image is empty"
      },
      400
    );
  }

  if (
    imageBytes.byteLength >
    MAX_VEHICLE_IMAGE_BYTES
  ) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Vehicle screenshots must be 10 MB or smaller"
      },
      413
    );
  }

  const canonicalModelName =
    vehicle?.model_name || normalizedModelName;

  const key = vehicleImageKey(
    canonicalModelName
  );

  const storedObject =
    await env.VEHICLE_IMAGES.put(
      key,
      imageBytes,
      {
        httpMetadata: {
          contentType,
          cacheControl:
            "public, max-age=31536000, immutable"
        },

        customMetadata: {
          modelName: canonicalModelName,
          imageType: "primary"
        }
      }
    );

  if (!storedObject) {
    return jsonResponse(
      {
        ok: false,
        error: "The image could not be stored"
      },
      500
    );
  }

  return jsonResponse(
    {
      ok: true,
      message: "Vehicle image uploaded",
      image: {
        modelName: canonicalModelName,
        key,
        contentType,
        size: imageBytes.byteLength,
        etag: storedObject.etag,
        imageUrl: vehicleImageUrl(
          canonicalModelName,
          storedObject.etag
        )
      }
    },
    201
  );
}

async function handleVehicleImageGet(
  env,
  requestedModelName
) {
  const normalizedModelName =
    normalizeVehicleImageModelName(
      requestedModelName
    );

  if (!normalizedModelName) {
    return jsonResponse(
      {
        ok: false,
        error: "The vehicle model name is invalid"
      },
      400
    );
  }

  const key = vehicleImageKey(
    normalizedModelName
  );

  const object =
    await env.VEHICLE_IMAGES.get(key);

  if (!object || !object.body) {
    return jsonResponse(
      {
        ok: false,
        error: "Vehicle image not found"
      },
      404
    );
  }

  const headers = new Headers();

  object.writeHttpMetadata(headers);

  headers.set("ETag", object.httpEtag);

  headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );

  headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );

  return new Response(object.body, {
    status: 200,
    headers
  });
}

async function handleVehicleImageList(env) {
  const images = [];
  let cursor;

  do {
    const result =
      await env.VEHICLE_IMAGES.list({
        prefix: VEHICLE_IMAGE_PREFIX,
        limit: 1000,
        cursor,
        include: [
          "httpMetadata",
          "customMetadata"
        ]
      });

    result.objects.forEach(object => {
      const modelName =
        object.customMetadata?.modelName ||
        modelNameFromVehicleImageKey(
          object.key
        );

      if (!modelName) {
        return;
      }

      images.push({
        modelName,
        key: object.key,
        size: object.size,
        etag: object.etag,
        contentType:
          object.httpMetadata?.contentType ||
          "application/octet-stream",
        uploadedAt:
          object.uploaded instanceof Date
            ? object.uploaded.toISOString()
            : object.uploaded,
        imageUrl: vehicleImageUrl(
          modelName,
          object.etag
        )
      });
    });

    cursor = result.truncated
      ? result.cursor
      : undefined;
  } while (cursor);

  images.sort((a, b) =>
    a.modelName.localeCompare(
      b.modelName,
      undefined,
      {
        sensitivity: "base"
      }
    )
  );

  return jsonResponse({
    ok: true,
    total: images.length,
    images
  });
}

// =====================================================
// BULK VEHICLE PHOTO IMPORT (.zip)
// Pure-JS zip reader — no npm dependency, matches this
// worker's zero-dependency build. Supports the two zip
// compression methods every normal zip tool uses:
// 0 = stored, 8 = deflate (via native DecompressionStream).
// =====================================================

const MAX_BULK_ZIP_BYTES = 90 * 1024 * 1024; // stays under Cloudflare's 100MB Free/Pro request body limit
const ZIP_CENTRAL_DIR_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;

function findZipEndOfCentralDirectory(bytes) {
  const maxCommentLength = 65535;
  const minOffset = Math.max(0, bytes.length - 22 - maxCommentLength);

  for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }

  return -1;
}

function parseZipEntries(bytes) {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );

  const eocdOffset = findZipEndOfCentralDirectory(bytes);

  if (eocdOffset < 0) {
    throw new Error(
      "This does not look like a valid .zip file."
    );
  }

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let centralDirOffset = view.getUint32(eocdOffset + 16, true);

  const entries = [];
  const textDecoder = new TextDecoder("utf-8");

  for (let i = 0; i < entryCount; i++) {
    if (
      centralDirOffset + 46 > bytes.length ||
      view.getUint32(centralDirOffset, true) !==
        ZIP_CENTRAL_DIR_SIGNATURE
    ) {
      break;
    }

    const compressionMethod = view.getUint16(
      centralDirOffset + 10,
      true
    );
    const compressedSize = view.getUint32(
      centralDirOffset + 20,
      true
    );
    const uncompressedSize = view.getUint32(
      centralDirOffset + 24,
      true
    );
    const fileNameLength = view.getUint16(
      centralDirOffset + 28,
      true
    );
    const extraLength = view.getUint16(
      centralDirOffset + 30,
      true
    );
    const commentLength = view.getUint16(
      centralDirOffset + 32,
      true
    );
    const localHeaderOffset = view.getUint32(
      centralDirOffset + 42,
      true
    );

    const nameStart = centralDirOffset + 46;
    const nameBytes = bytes.subarray(
      nameStart,
      nameStart + fileNameLength
    );
    const fileName = textDecoder.decode(nameBytes);

    entries.push({
      fileName,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });

    centralDirOffset =
      nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function extractZipEntryBytes(bytes, entry) {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );

  const offset = entry.localHeaderOffset;

  if (
    view.getUint32(offset, true) !== ZIP_LOCAL_FILE_SIGNATURE
  ) {
    throw new Error(
      "Local file header did not match — the zip may be corrupt."
    );
  }

  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + nameLength + extraLength;

  const compressedBytes = bytes.subarray(
    dataStart,
    dataStart + entry.compressedSize
  );

  if (entry.compressionMethod === 0) {
    return compressedBytes;
  }

  if (entry.compressionMethod === 8) {
    const stream = new Response(compressedBytes).body.pipeThrough(
      new DecompressionStream("deflate-raw")
    );

    const arrayBuffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  throw new Error(
    `Unsupported zip compression method (${entry.compressionMethod}). ` +
    `Re-save this file using "Store" or standard "Deflate" compression.`
  );
}

function isZipDirectoryOrJunkEntry(fileName) {
  if (!fileName || fileName.endsWith("/")) {
    return true;
  }

  if (fileName.startsWith("__MACOSX/")) {
    return true;
  }

  const baseName = fileName.split("/").pop() || "";

  if (baseName.startsWith("._")) {
    return true;
  }

  if (baseName.toLowerCase() === ".ds_store") {
    return true;
  }

  return false;
}

function vehicleImageTypeForFileName(fileName) {
  const lower = fileName.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");

  if (dotIndex < 0) {
    return null;
  }

  const extension = lower.slice(dotIndex);
  const contentType = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp"
  }[extension];

  return contentType ? { extension, contentType } : null;
}

function requestedModelNameFromFileName(fileName) {
  const baseName = fileName.split("/").pop() || "";
  const dotIndex = baseName.lastIndexOf(".");

  return (
    dotIndex > 0 ? baseName.slice(0, dotIndex) : baseName
  ).trim();
}

async function loadVehicleModelNameLookup(env) {
  const result = await env.DB.prepare(
    `SELECT model_name FROM vehicles`
  ).all();

  const lookup = new Map();

  (result.results || []).forEach(row => {
    const modelName = String(row.model_name || "").trim();

    if (modelName) {
      lookup.set(modelName.toLowerCase(), modelName);
    }
  });

  return lookup;
}

async function loadExistingVehicleImageModelNames(env) {
  const existing = new Set();
  let cursor;

  do {
    const result = await env.VEHICLE_IMAGES.list({
      prefix: VEHICLE_IMAGE_PREFIX,
      limit: 1000,
      cursor
    });

    result.objects.forEach(object => {
      const modelName = modelNameFromVehicleImageKey(object.key);

      if (modelName) {
        existing.add(modelName.toLowerCase());
      }
    });

    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return existing;
}

async function handleVehicleImageBulkImport(request, env) {
  const authorizationError =
    checkImageUploadAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const contentLength = Number(
    request.headers.get("content-length") || 0
  );

  if (contentLength > MAX_BULK_ZIP_BYTES) {
    return jsonResponse(
      {
        ok: false,
        error:
          `The zip file is too large. The limit is ` +
          `${Math.floor(MAX_BULK_ZIP_BYTES / (1024 * 1024))} MB per upload.`
      },
      413
    );
  }

  const url = new URL(request.url);
  const skipExisting =
    url.searchParams.get("skipExisting") === "true";

  const zipBuffer = await request.arrayBuffer();

  if (zipBuffer.byteLength === 0) {
    return jsonResponse(
      { ok: false, error: "The uploaded zip file is empty." },
      400
    );
  }

  if (zipBuffer.byteLength > MAX_BULK_ZIP_BYTES) {
    return jsonResponse(
      {
        ok: false,
        error:
          `The zip file is too large. The limit is ` +
          `${Math.floor(MAX_BULK_ZIP_BYTES / (1024 * 1024))} MB per upload.`
      },
      413
    );
  }

  const zipBytes = new Uint8Array(zipBuffer);
  let entries;

  try {
    entries = parseZipEntries(zipBytes);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message || "Could not read the zip file."
      },
      400
    );
  }

  const vehicleLookup = await loadVehicleModelNameLookup(env);

  const existingImages = skipExisting
    ? await loadExistingVehicleImageModelNames(env)
    : new Set();

  const results = [];

  for (const entry of entries) {
    if (isZipDirectoryOrJunkEntry(entry.fileName)) {
      continue;
    }

    const fileBaseName = entry.fileName.split("/").pop();
    const imageType = vehicleImageTypeForFileName(entry.fileName);

    if (!imageType) {
      results.push({
        status: "skipped",
        fileName: fileBaseName,
        modelName: "",
        message:
          "Not a supported image type (.jpg, .jpeg, .png, .webp)."
      });
      continue;
    }

    const requestedModelName =
      requestedModelNameFromFileName(entry.fileName);
    const lookupKey = requestedModelName.toLowerCase();

    if (!vehicleLookup.has(lookupKey)) {
      results.push({
        status: "unmatched",
        fileName: fileBaseName,
        modelName: requestedModelName,
        message: "No matching vehicle model in the database."
      });
      continue;
    }

    const canonicalModelName = vehicleLookup.get(lookupKey);

    if (
      skipExisting &&
      existingImages.has(canonicalModelName.toLowerCase())
    ) {
      results.push({
        status: "skippedExisting",
        fileName: fileBaseName,
        modelName: canonicalModelName,
        message: "An image already exists and skip-existing was on."
      });
      continue;
    }

    if (entry.uncompressedSize > MAX_VEHICLE_IMAGE_BYTES) {
      results.push({
        status: "tooLarge",
        fileName: fileBaseName,
        modelName: canonicalModelName,
        message: "Image is larger than 10 MB."
      });
      continue;
    }

    try {
      const imageBytes = await extractZipEntryBytes(zipBytes, entry);

      if (imageBytes.byteLength === 0) {
        results.push({
          status: "failed",
          fileName: fileBaseName,
          modelName: canonicalModelName,
          message: "Extracted file was empty."
        });
        continue;
      }

      const key = vehicleImageKey(canonicalModelName);

      const storedObject = await env.VEHICLE_IMAGES.put(
        key,
        imageBytes,
        {
          httpMetadata: {
            contentType: imageType.contentType,
            cacheControl:
              "public, max-age=31536000, immutable"
          },
          customMetadata: {
            modelName: canonicalModelName,
            imageType: "primary"
          }
        }
      );

      results.push({
        status: "uploaded",
        fileName: fileBaseName,
        modelName: canonicalModelName,
        size: imageBytes.byteLength,
        etag: storedObject?.etag || "",
        message: "Vehicle image uploaded."
      });
    } catch (error) {
      results.push({
        status: "failed",
        fileName: fileBaseName,
        modelName: canonicalModelName,
        message: error.message || "Upload failed."
      });
    }
  }

  const summary = results.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] || 0) + 1;
    return counts;
  }, {});

  const auth = await getCurrentAuthSession(request, env);

  await writeAdminAuditLog(env, {
    actorUserId: auth?.user?.id || null,
    actorLabel: auth?.user?.email || "admin-token",
    action: "admin.vehicle_images.bulk_import",
    entityType: "vehicle_image",
    details: {
      summary,
      totalZipEntries: entries.length,
      skipExisting
    }
  });

  return jsonResponse({
    ok: true,
    message: "Bulk photo import finished.",
    summary,
    results
  });
}

// Free-account level gate: any logged-in user (or a script holding
// LIBRARY_WRITE_TOKEN) may import/patch their own catalog data into the
// shared vehicles/handling tables. This is intentional — cataloging vehicles
// is the core free-tier feature. Actions that affect other users' accounts,
// the site itself, or permanently delete shared records use
// requireAdminSession() instead — see handleVehicleDelete and the
// handleAdmin* handlers.
async function checkLibraryWriteAuthorization(request, env) {
  // Accept explicit library write token (for scripts / admin tools)
  const suppliedToken = request.headers.get("x-library-token") || "";
  if (env.LIBRARY_WRITE_TOKEN && suppliedToken === env.LIBRARY_WRITE_TOKEN) {
    return null;
  }

  // Accept a valid login session as an alternative (no token required when logged in)
  const session = await getCurrentAuthSession(request, env);
  if (session) {
    return null;
  }

  if (!env.LIBRARY_WRITE_TOKEN) {
    return jsonResponse(
      { ok: false, error: "LIBRARY_WRITE_TOKEN has not been configured for this Worker" },
      503
    );
  }
  return jsonResponse(
    { ok: false, error: "Unauthorized library update" },
    401
  );
}

function tagsForDatabase(value) {
  let tags = [];

  if (Array.isArray(value)) {
    tags = value;
  } else if (typeof value === "string") {
    tags = value.split(",");
  }

  const cleanedTags = tags
    .filter(tag => typeof tag === "string")
    .map(tag => tag.trim())
    .filter(Boolean);

  return JSON.stringify([...new Set(cleanedTags)]);
}

async function handleVehiclePatch(
  request,
  env,
  requestedModelName
) {
  const authorizationError =
    await checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const modelName = String(
    requestedModelName || ""
  ).trim();

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)) {
    return jsonResponse(
      {
        ok: false,
        error: "The vehicle model name is invalid"
      },
      400
    );
  }

  const parsed = await readJsonRequest(request);

  if (parsed.error) {
    return parsed.error;
  }

  const changes = parsed.body;

  if (
    !changes ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "Update body must be a JSON object"
      },
      400
    );
  }

  const allowedFields = {
    displayName: {
      column: "display_name",
      convert: optionalText
    },

    rockstarDlc: {
      column: "rockstar_dlc",
      convert: optionalText
    },

    sourcePack: {
      column: "source_pack",
      convert: optionalText
    },

    gameVersion: {
      column: "game_version",
      convert: optionalText
    },

    installDate: {
      column: "install_date",
      convert: optionalText
    },

    installationType: {
      column: "installation_type",
      convert: optionalText
    },

    replacementSlot: {
      column: "replacement_slot",
      convert: optionalText
    },

    installedDlcFolder: {
      column: "installed_dlc_folder",
      convert: optionalText
    },

    yftPath: {
      column: "yft_path",
      convert: optionalText
    },

    hiYftPath: {
      column: "hi_yft_path",
      convert: optionalText
    },

    ytdPath: {
      column: "ytd_path",
      convert: optionalText
    },

    vehiclesMetaPath: {
      column: "vehicles_meta_path",
      convert: optionalText
    },

    handlingMetaPath: {
      column: "handling_meta_path",
      convert: optionalText
    },

    downloadUrl: {
      column: "download_url",
      convert: optionalText
    },

    vehicleYear: {
      column: "vehicle_year",
      convert: optionalText
    }

    // tags, notes, installed, and favorite were removed from this whitelist
    // (2026-07) because they were written to this single shared `vehicles`
    // row with no per-user scoping — any account editing a vehicle's tags,
    // notes, favorite status, or installed status was overwriting the same
    // values everyone else saw. Removed as a stopgap until a proper
    // per-user table (e.g. user_vehicle_data) exists to store these fields
    // scoped to each account.
  };

  const assignments = [];
  const bindings = [];

  for (const [requestField, definition] of Object.entries(
    allowedFields
  )) {
    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        requestField
      )
    ) {
      assignments.push(`${definition.column} = ?`);

      bindings.push(
        definition.convert(
          changes[requestField]
        )
      );
    }
  }

  if (assignments.length === 0) {
    return jsonResponse(
      {
        ok: false,
        error: "No supported update fields were supplied"
      },
      400
    );
  }

  assignments.push(
    "updated_at = CURRENT_TIMESTAMP"
  );

  const updateResult = await env.DB
    .prepare(`
      UPDATE vehicles
      SET ${assignments.join(", ")}
      WHERE model_name = ? COLLATE NOCASE
    `)
    .bind(...bindings, modelName)
    .run();

  if (!updateResult.success) {
    return jsonResponse(
      {
        ok: false,
        error: "The vehicle could not be updated"
      },
      500
    );
  }

  const savedVehicle = await env.DB
    .prepare(`
      SELECT *
      FROM vehicles
      WHERE model_name = ? COLLATE NOCASE
      LIMIT 1
    `)
    .bind(modelName)
    .first();

  if (!savedVehicle) {
    return jsonResponse(
      {
        ok: false,
        error: "Vehicle not found"
      },
      404
    );
  }

  return jsonResponse({
    ok: true,
    message: "Vehicle updated",
    vehicle: normalizeVehicle(savedVehicle)
  });
}
// ── Per-user vehicle field edits ──────────────────────────────────
// Lets a logged-in visitor customize individual vehicles.meta fields on a
// vehicle without touching the shared vanilla row in `vehicles`. Only
// fields that differ from vanilla get a row in vehicle_field_edits — this
// merges at read time and never overwrites the shared library data.

const EDITABLE_VEHICLE_FIELDS = {
  gameName: "game_name",
  vehicleMakeName: "make_name",
  vehicleClass: "vehicle_class",
  vehicleType: "vehicle_type",
  handlingId: "handling_id",
  audioNameHash: "audio_name",
  layout: "layout_name",
  frequency: "frequency",
  maxNum: "max_num",
  maxNumOfSameColor: "max_num_of_same_color",
  identicalModelSpawnDistance: "identical_model_spawn_distance",
  swankness: "swankness"
};

function normalizeEditValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Admin-only: this permanently deletes a vehicle from the single shared
// library table (there is no per-user ownership on `vehicles`, so any account
// that could reach this before could delete anyone's shared data). Importing/
// patching your own catalog data stays free-account level via
// checkLibraryWriteAuthorization below; only whole-record deletion is gated
// to admin/owner.
async function handleVehicleDelete(request, env, requestedModelName) {
  const { auth, gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const modelName = String(requestedModelName || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)) {
    return jsonResponse({ ok: false, error: "The vehicle model name is invalid" }, 400);
  }

  // Remove the vehicle and all related rows
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM vehicles WHERE model_name = ? COLLATE NOCASE`).bind(modelName),
    env.DB.prepare(`DELETE FROM vehicle_popgroups WHERE vehicle_id = ? COLLATE NOCASE`).bind(modelName),
    env.DB.prepare(`DELETE FROM vehicle_field_edits WHERE model_name = ? COLLATE NOCASE`).bind(modelName),
  ]);

  await writeAdminAuditLog(env, {
    actorUserId: auth.user.id,
    actorLabel: auth.user.email,
    action: "admin.vehicle.delete",
    entityType: "vehicle",
    entityId: modelName
  });

  return jsonResponse({ ok: true, deleted: modelName });
}

async function handleVehicleFieldEditsGet(request, env, modelName) {
  const auth = await getCurrentAuthSession(request, env);

  if (!auth) {
    return jsonResponse({
      ok: true,
      loggedIn: false,
      modelName,
      edits: {}
    });
  }

  const { results } = await env.DB.prepare(`
    SELECT field_name, vanilla_value, edited_value, updated_at
    FROM vehicle_field_edits
    WHERE user_id = ? AND model_name = ? COLLATE NOCASE
  `).bind(auth.user.id, modelName).all();

  const edits = {};
  for (const row of results || []) {
    edits[row.field_name] = {
      vanillaValue: row.vanilla_value,
      editedValue: row.edited_value,
      updatedAt: row.updated_at
    };
  }

  return jsonResponse({
    ok: true,
    loggedIn: true,
    modelName,
    edits
  });
}

async function handleVehicleFieldEditSave(request, env, modelName) {
  const auth = await getCurrentAuthSession(request, env);

  if (!auth) {
    return jsonResponse({ ok: false, error: "Log in to save personal edits" }, 401);
  }

  const parsed = await readJsonRequest(request);
  if (parsed.error) return parsed.error;

  const field = optionalText(parsed.body?.field);
  const rawValue = parsed.body?.value;

  if (!field || !EDITABLE_VEHICLE_FIELDS[field]) {
    return jsonResponse({ ok: false, error: "Unknown or unsupported field" }, 400);
  }

  const column = EDITABLE_VEHICLE_FIELDS[field];

  const vehicleRow = await env.DB.prepare(`
    SELECT ${column} AS vanilla_value
    FROM vehicles
    WHERE model_name = ? COLLATE NOCASE
    LIMIT 1
  `).bind(modelName).first();

  if (!vehicleRow) {
    return jsonResponse({ ok: false, error: "Vehicle not found" }, 404);
  }

  const vanillaValue = normalizeEditValue(vehicleRow.vanilla_value);
  const editedValue = normalizeEditValue(rawValue);

  // Setting it back to vanilla is the same as restoring — don't store a no-op edit.
  if (editedValue === vanillaValue) {
    await env.DB.prepare(`
      DELETE FROM vehicle_field_edits
      WHERE user_id = ? AND model_name = ? COLLATE NOCASE AND field_name = ?
    `).bind(auth.user.id, modelName, field).run();

    return jsonResponse({
      ok: true,
      restored: true,
      modelName,
      field,
      vanillaValue
    });
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO vehicle_field_edits (
      id, user_id, model_name, field_name, vanilla_value, edited_value, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, model_name, field_name) DO UPDATE SET
      vanilla_value = excluded.vanilla_value,
      edited_value = excluded.edited_value,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, auth.user.id, modelName, field, vanillaValue, editedValue).run();

  return jsonResponse({
    ok: true,
    restored: false,
    modelName,
    field,
    vanillaValue,
    editedValue
  });
}

async function handleVehicleFieldEditRestore(request, env, modelName, field) {
  const auth = await getCurrentAuthSession(request, env);

  if (!auth) {
    return jsonResponse({ ok: false, error: "Log in to manage personal edits" }, 401);
  }

  if (field) {
    await env.DB.prepare(`
      DELETE FROM vehicle_field_edits
      WHERE user_id = ? AND model_name = ? COLLATE NOCASE AND field_name = ?
    `).bind(auth.user.id, modelName, field).run();
  } else {
    await env.DB.prepare(`
      DELETE FROM vehicle_field_edits
      WHERE user_id = ? AND model_name = ? COLLATE NOCASE
    `).bind(auth.user.id, modelName).run();
  }

  return jsonResponse({ ok: true, modelName, field: field || null, restoredAll: !field });
}

// ── Per-user handling.meta field edits ────────────────────────────
// handling_profiles is keyed by handling_name and stores the full profile
// as a JSON blob (handling_data_json), not individual columns — many
// vehicles share the same handling_name, so a personal edit here is scoped
// to the handling profile itself and applies to every vehicle that
// references it, matching how handling.meta actually behaves in-game.
// Vanilla handling_profiles rows are never modified.

const EDITABLE_HANDLING_FIELDS = new Set([
  "AIHandling",
  "fDriveBiasFront",
  "nInitialDriveGears",
  "fMass",
  "fInitialDriveForce",
  "fDriveInertia",
  "fInitialDriveMaxFlatVel",
  "fInitialDragCoeff",
  "fBrakeForce",
  "fBrakeBiasFront",
  "fHandBrakeForce",
  "fSteeringLock",
  "fClutchChangeRateScaleUpShift",
  "fClutchChangeRateScaleDownShift",
  "fTractionCurveMax",
  "fTractionCurveMin",
  "fTractionCurveLateral",
  "fTractionBiasFront",
  "fLowSpeedTractionLossMult",
  "fTractionLossMult",
  "fSuspensionForce",
  "fSuspensionCompDamp",
  "fSuspensionReboundDamp",
  "fSuspensionRaise",
  "fAntiRollBarForce",
  "fRollCentreHeightFront",
  "fRollCentreHeightRear",
  "fCollisionDamageMult",
  "fWeaponDamageMult",
  "fDeformationDamageMult",
  "fEngineDamageMult"
]);

async function getHandlingVanillaValue(env, handlingName, field) {
  const row = await env.DB.prepare(`
    SELECT handling_data_json
    FROM handling_profiles
    WHERE handling_name = ? COLLATE NOCASE
    LIMIT 1
  `).bind(handlingName).first();

  if (!row) {
    return { found: false, value: null };
  }

  let parsed = {};
  try {
    parsed = JSON.parse(row.handling_data_json || "{}");
  } catch {
    parsed = {};
  }

  return { found: true, value: parsed[field] };
}

async function handleHandlingFieldEditsGet(request, env, handlingName) {
  const auth = await getCurrentAuthSession(request, env);

  if (!auth) {
    return jsonResponse({
      ok: true,
      loggedIn: false,
      handlingName,
      edits: {}
    });
  }

  const { results } = await env.DB.prepare(`
    SELECT field_name, vanilla_value, edited_value, updated_at
    FROM handling_field_edits
    WHERE user_id = ? AND handling_name = ? COLLATE NOCASE
  `).bind(auth.user.id, handlingName).all();

  const edits = {};
  for (const row of results || []) {
    edits[row.field_name] = {
      vanillaValue: row.vanilla_value,
      editedValue: row.edited_value,
      updatedAt: row.updated_at
    };
  }

  return jsonResponse({
    ok: true,
    loggedIn: true,
    handlingName,
    edits
  });
}

async function handleHandlingFieldEditSave(request, env, handlingName) {
  const auth = await getCurrentAuthSession(request, env);

  if (!auth) {
    return jsonResponse({ ok: false, error: "Log in to save personal edits" }, 401);
  }

  const parsed = await readJsonRequest(request);
  if (parsed.error) return parsed.error;

  const field = optionalText(parsed.body?.field);
  const rawValue = parsed.body?.value;

  if (!field || !EDITABLE_HANDLING_FIELDS.has(field)) {
    return jsonResponse({ ok: false, error: "Unknown or unsupported handling field" }, 400);
  }

  const vanilla = await getHandlingVanillaValue(env, handlingName, field);

  if (!vanilla.found) {
    return jsonResponse({ ok: false, error: "Handling profile not found" }, 404);
  }

  const vanillaValue = normalizeEditValue(vanilla.value);
  const editedValue = normalizeEditValue(rawValue);

  // Setting it back to vanilla is the same as restoring — don't store a no-op edit.
  if (editedValue === vanillaValue) {
    await env.DB.prepare(`
      DELETE FROM handling_field_edits
      WHERE user_id = ? AND handling_name = ? COLLATE NOCASE AND field_name = ?
    `).bind(auth.user.id, handlingName, field).run();

    return jsonResponse({
      ok: true,
      restored: true,
      handlingName,
      field,
      vanillaValue
    });
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO handling_field_edits (
      id, user_id, handling_name, field_name, vanilla_value, edited_value, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, handling_name, field_name) DO UPDATE SET
      vanilla_value = excluded.vanilla_value,
      edited_value = excluded.edited_value,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, auth.user.id, handlingName, field, vanillaValue, editedValue).run();

  return jsonResponse({
    ok: true,
    restored: false,
    handlingName,
    field,
    vanillaValue,
    editedValue
  });
}

async function handleHandlingFieldEditRestore(request, env, handlingName, field) {
  const auth = await getCurrentAuthSession(request, env);

  if (!auth) {
    return jsonResponse({ ok: false, error: "Log in to manage personal edits" }, 401);
  }

  if (field) {
    await env.DB.prepare(`
      DELETE FROM handling_field_edits
      WHERE user_id = ? AND handling_name = ? COLLATE NOCASE AND field_name = ?
    `).bind(auth.user.id, handlingName, field).run();
  } else {
    await env.DB.prepare(`
      DELETE FROM handling_field_edits
      WHERE user_id = ? AND handling_name = ? COLLATE NOCASE
    `).bind(auth.user.id, handlingName).run();
  }

  return jsonResponse({ ok: true, handlingName, field: field || null, restoredAll: !field });
}

async function countAdminTableRows(env, tableName) {
  try {
    const row =
      await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM ${tableName}`
      ).first();

    return Number(row?.count || 0);
  } catch (error) {
    console.warn(
      `Admin summary count skipped for ${tableName}:`,
      error?.message || error
    );

    return 0;
  }
}

async function handleAdminSummary(request, env) {
  const { gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const [
    users,
    workspaces,
    packs,
    vehicleAssignments
  ] = await Promise.all([
    countAdminTableRows(env, "users"),
    countAdminTableRows(env, "workspaces"),
    countAdminTableRows(env, "pack_records"),
    countAdminTableRows(env, "vehicle_pack_memberships")
  ]);

  return jsonResponse({
    ok: true,
    summary: {
      users,
      workspaces,
      packs,
      vehicleAssignments,
      generatedAt: new Date().toISOString()
    }
  });
}


function normalizeAdminUserEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeAdminUserText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeAdminUserEnum(value, allowedValues, fallback) {
  const text = String(value || "").trim().toLowerCase();

  if (allowedValues.includes(text)) {
    return text;
  }

  return fallback;
}

function createAdminUserId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "user:" + crypto.randomUUID();
  }

  return "user:" + Date.now() + ":" + Math.random().toString(36).slice(2);
}

function normalizeAdminUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || "",
    role: row.role || "free_user",
    plan: row.plan || "free",
    status: row.status || "active",
    notes: row.notes || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    lastLoginAt: row.last_login_at || null
  };
}


async function writeAdminAuditLog(env, entry = {}) {
  try {
    const id =
      "audit:" +
      new Date().toISOString() +
      ":" +
      Math.random().toString(36).slice(2);

    await env.DB.prepare(`
      INSERT INTO admin_audit_log (
        id,
        actor_user_id,
        actor_label,
        action,
        entity_type,
        entity_id,
        details_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.actorUserId || null,
      entry.actorLabel || "admin-token",
      entry.action || "unknown",
      entry.entityType || "unknown",
      entry.entityId || null,
      JSON.stringify(entry.details || {})
    ).run();
  } catch (error) {
    console.warn(
      "Admin audit log write skipped:",
      error?.message || error
    );
  }
}

async function handleAdminUserList(request, env) {
  const { gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const url = new URL(request.url);
  const query = String(url.searchParams.get("query") || "").trim();
  const status = String(url.searchParams.get("status") || "all").trim().toLowerCase();
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || 50), 1),
    200
  );

  const where = [];
  const bindings = [];

  if (query) {
    where.push("(email LIKE ? OR display_name LIKE ?)");
    bindings.push("%" + query + "%", "%" + query + "%");
  }

  if (status !== "all") {
    where.push("status = ?");
    bindings.push(status);
  }

  const sql =
    "SELECT id, email, display_name, role, plan, status, notes, created_at, updated_at, last_login_at " +
    "FROM users " +
    (where.length ? "WHERE " + where.join(" AND ") + " " : "") +
    "ORDER BY created_at DESC " +
    "LIMIT ?";

  bindings.push(limit);

  const result =
    await env.DB.prepare(sql)
      .bind(...bindings)
      .all();

  return jsonResponse({
    ok: true,
    users: (result.results || []).map(normalizeAdminUserRow)
  });
}

async function handleAdminUserCreate(request, env) {
  const { auth, gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid JSON body"
      },
      400
    );
  }

  const email = normalizeAdminUserEmail(body.email);

  if (!email || !email.includes("@")) {
    return jsonResponse(
      {
        ok: false,
        error: "Valid email is required"
      },
      400
    );
  }

  const id = createAdminUserId();

  const displayName = normalizeAdminUserText(body.displayName);
  const role = normalizeAdminUserEnum(
    body.role,
    ["free_user", "premium_user", "moderator", "admin", "owner"],
    "free_user"
  );
  const plan = normalizeAdminUserEnum(
    body.plan,
    ["free", "premium", "admin"],
    "free"
  );
  const status = normalizeAdminUserEnum(
    body.status,
    ["active", "disabled", "pending"],
    "active"
  );
  const notes = normalizeAdminUserText(body.notes);

  try {
    await env.DB.prepare(`
      INSERT INTO users (
        id,
        email,
        display_name,
        role,
        plan,
        status,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      email,
      displayName,
      role,
      plan,
      status,
      notes
    ).run();
  } catch (error) {
    const message = String(error?.message || error || "");

    if (message.toLowerCase().includes("unique")) {
      return jsonResponse(
        {
          ok: false,
          error: "A user with that email already exists"
        },
        409
      );
    }

    throw error;
  }

  const row =
    await env.DB.prepare(`
      SELECT
        id,
        email,
        display_name,
        role,
        plan,
        status,
        notes,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
    `).bind(id).first();

  await writeAdminAuditLog(env, {
    actorUserId: auth.user.id,
    actorLabel: auth.user.email,
    action: "admin.user.create",
    entityType: "user",
    entityId: id,
    details: { created: normalizeAdminUserRow(row) }
  });

  return jsonResponse(
    {
      ok: true,
      user: normalizeAdminUserRow(row)
    },
    201
  );
}


async function handleAdminUserUpdate(request, env, userId) {
  const { auth, gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const existing =
    await env.DB.prepare(`
      SELECT
        id,
        email,
        display_name,
        role,
        plan,
        status,
        notes,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

  if (!existing) {
    return jsonResponse(
      {
        ok: false,
        error: "User not found"
      },
      404
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid JSON body"
      },
      400
    );
  }

  const displayName =
    Object.prototype.hasOwnProperty.call(body, "displayName")
      ? normalizeAdminUserText(body.displayName)
      : existing.display_name;

  const role =
    Object.prototype.hasOwnProperty.call(body, "role")
      ? normalizeAdminUserEnum(
          body.role,
          ["free_user", "premium_user", "moderator", "admin", "owner"],
          existing.role || "free_user"
        )
      : existing.role;

  const plan =
    Object.prototype.hasOwnProperty.call(body, "plan")
      ? normalizeAdminUserEnum(
          body.plan,
          ["free", "premium", "admin"],
          existing.plan || "free"
        )
      : existing.plan;

  const status =
    Object.prototype.hasOwnProperty.call(body, "status")
      ? normalizeAdminUserEnum(
          body.status,
          ["active", "disabled", "pending"],
          existing.status || "active"
        )
      : existing.status;

  const notes =
    Object.prototype.hasOwnProperty.call(body, "notes")
      ? normalizeAdminUserText(body.notes)
      : existing.notes;

  await env.DB.prepare(`
    UPDATE users
    SET
      display_name = ?,
      role = ?,
      plan = ?,
      status = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    displayName,
    role,
    plan,
    status,
    notes,
    userId
  ).run();

  const updated =
    await env.DB.prepare(`
      SELECT
        id,
        email,
        display_name,
        role,
        plan,
        status,
        notes,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

  await writeAdminAuditLog(env, {
    actorUserId: auth.user.id,
    actorLabel: auth.user.email,
    action: "admin.user.update",
    entityType: "user",
    entityId: userId,
    details: {
      before: normalizeAdminUserRow(existing),
      after: normalizeAdminUserRow(updated)
    }
  });

  return jsonResponse({
    ok: true,
    user: normalizeAdminUserRow(updated)
  });
}


function normalizeAdminWorkspaceText(value) {
  return String(value ?? "").trim();
}

function normalizeAdminWorkspaceRow(row = {}) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id || row.ownerUserId || null,
    name: row.name || "Untitled Workspace",
    memberCount: Number(row.member_count || row.memberCount || 0),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null
  };
}

function normalizeAdminWorkspaceMemberRow(row = {}) {
  return {
    workspaceId: row.workspace_id || row.workspaceId || null,
    workspaceName: row.workspace_name || row.workspaceName || null,
    userId: row.user_id || row.userId || null,
    email: row.email || null,
    displayName: row.display_name || row.displayName || null,
    role: row.role || "viewer",
    status: row.status || "active",
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null
  };
}

function normalizeWorkspaceMemberRole(value) {
  const role = normalizeAdminWorkspaceText(value).toLowerCase();

  if (["owner", "editor", "viewer"].includes(role)) {
    return role;
  }

  return "viewer";
}

function normalizeWorkspaceMemberStatus(value) {
  const status = normalizeAdminWorkspaceText(value).toLowerCase();

  if (["active", "pending", "disabled"].includes(status)) {
    return status;
  }

  return "active";
}

async function runAdminSelectAll(env, sql, bindings = []) {
  const statement = env.DB.prepare(sql);
  const result = bindings.length
    ? await statement.bind(...bindings).all()
    : await statement.all();

  return result.results || [];
}

async function handleAdminWorkspaceList(request, env) {
  const { gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const rows = await runAdminSelectAll(env, `
    SELECT
      w.id,
      w.owner_user_id,
      w.name,
      w.created_at,
      w.updated_at,
      COUNT(wm.user_id) AS member_count
    FROM workspaces w
    LEFT JOIN workspace_members wm
      ON wm.workspace_id = w.id
    GROUP BY
      w.id,
      w.owner_user_id,
      w.name,
      w.created_at,
      w.updated_at
    ORDER BY w.created_at DESC, w.name ASC
    LIMIT 100
  `);

  return jsonResponse({
    ok: true,
    workspaces: rows.map(normalizeAdminWorkspaceRow)
  });
}

async function handleAdminWorkspaceMemberList(request, env) {
  const { gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const url = new URL(request.url);
  const workspaceId =
    normalizeAdminWorkspaceText(url.searchParams.get("workspaceId"));
  const userId =
    normalizeAdminWorkspaceText(url.searchParams.get("userId"));
  const query =
    normalizeAdminWorkspaceText(url.searchParams.get("query")).toLowerCase();

  const where = [];
  const bindings = [];

  if (workspaceId) {
    where.push("wm.workspace_id = ?");
    bindings.push(workspaceId);
  }

  if (userId) {
    where.push("wm.user_id = ?");
    bindings.push(userId);
  }

  if (query) {
    where.push(`(
      LOWER(COALESCE(u.email, '')) LIKE ?
      OR LOWER(COALESCE(u.display_name, '')) LIKE ?
      OR LOWER(COALESCE(w.name, '')) LIKE ?
      OR LOWER(COALESCE(wm.role, '')) LIKE ?
      OR LOWER(COALESCE(wm.status, '')) LIKE ?
    )`);

    const likeQuery = "%" + query + "%";
    bindings.push(
      likeQuery,
      likeQuery,
      likeQuery,
      likeQuery,
      likeQuery
    );
  }

  const rows = await runAdminSelectAll(
    env,
    `
      SELECT
        wm.workspace_id,
        w.name AS workspace_name,
        wm.user_id,
        u.email,
        u.display_name,
        wm.role,
        wm.status,
        wm.created_at,
        wm.updated_at
      FROM workspace_members wm
      LEFT JOIN users u
        ON u.id = wm.user_id
      LEFT JOIN workspaces w
        ON w.id = wm.workspace_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY wm.updated_at DESC, u.email ASC
      LIMIT 100
    `,
    bindings
  );

  return jsonResponse({
    ok: true,
    memberships: rows.map(normalizeAdminWorkspaceMemberRow)
  });
}

async function getAdminWorkspaceMember(env, workspaceId, userId) {
  const row = await env.DB.prepare(`
    SELECT
      wm.workspace_id,
      w.name AS workspace_name,
      wm.user_id,
      u.email,
      u.display_name,
      wm.role,
      wm.status,
      wm.created_at,
      wm.updated_at
    FROM workspace_members wm
    LEFT JOIN users u
      ON u.id = wm.user_id
    LEFT JOIN workspaces w
      ON w.id = wm.workspace_id
    WHERE wm.workspace_id = ?
      AND wm.user_id = ?
  `).bind(workspaceId, userId).first();

  return normalizeAdminWorkspaceMemberRow(row || {});
}

async function handleAdminWorkspaceMemberUpsert(request, env) {
  const { auth, gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid JSON body"
      },
      400
    );
  }

  const workspaceId =
    normalizeAdminWorkspaceText(body.workspaceId || body.workspace_id);
  const userId =
    normalizeAdminWorkspaceText(body.userId || body.user_id);
  const role =
    normalizeWorkspaceMemberRole(body.role);
  const status =
    normalizeWorkspaceMemberStatus(body.status);

  if (!workspaceId) {
    return jsonResponse(
      {
        ok: false,
        error: "workspaceId is required"
      },
      400
    );
  }

  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: "userId is required"
      },
      400
    );
  }

  const workspace = await env.DB.prepare(`
    SELECT id, name
    FROM workspaces
    WHERE id = ?
  `).bind(workspaceId).first();

  if (!workspace) {
    return jsonResponse(
      {
        ok: false,
        error: "Workspace not found"
      },
      404
    );
  }

  const user = await env.DB.prepare(`
    SELECT id, email
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  if (!user) {
    return jsonResponse(
      {
        ok: false,
        error: "User not found"
      },
      404
    );
  }

  const before = await getAdminWorkspaceMember(
    env,
    workspaceId,
    userId
  );

  await env.DB.prepare(`
    INSERT INTO workspace_members (
      workspace_id,
      user_id,
      role,
      status
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(workspace_id, user_id)
    DO UPDATE SET
      role = excluded.role,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    workspaceId,
    userId,
    role,
    status
  ).run();

  const membership = await getAdminWorkspaceMember(
    env,
    workspaceId,
    userId
  );

  await writeAdminAuditLog(env, {
    actorUserId: auth.user.id,
    actorLabel: auth.user.email,
    action: "admin.workspace_member.upsert",
    entityType: "workspace_member",
    entityId: workspaceId + ":" + userId,
    details: {
      before,
      after: membership
    }
  });

  return jsonResponse({
    ok: true,
    membership
  });
}


function authText(value) {
  return String(value ?? "").trim();
}

function normalizeAuthEmail(value) {
  return authText(value).toLowerCase();
}

function normalizeAuthDisplayName(value, fallbackEmail = "") {
  const displayName = authText(value);

  if (displayName) {
    return displayName.slice(0, 120);
  }

  const emailName = String(fallbackEmail || "").split("@")[0] || "User";
  return emailName.slice(0, 120);
}

function isValidAuthEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidAuthPassword(password) {
  return String(password || "").length >= 8;
}

function bytesToBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function sha256Hex(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomTokenBase64Url(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hashPasswordForAuth(password, saltBase64 = "") {
  const salt =
    saltBase64
      ? base64ToBytes(saltBase64)
      : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PASSWORD_PBKDF2_ITERATIONS
    },
    keyMaterial,
    256
  );

  return {
    hash: bytesToBase64(new Uint8Array(bits)),
    salt: bytesToBase64(salt)
  };
}

function safeEqualString(left, right) {
  const a = String(left || "");
  const b = String(right || "");

  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return diff === 0;
}

function normalizePublicUser(row = {}) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.displayName || "",
    role: row.role || "free_user",
    plan: row.plan || "free",
    status: row.status || "active",
    createdAt: row.created_at || row.createdAt || null
  };
}

function normalizePublicWorkspace(row = {}) {
  return {
    id: row.id,
    name: row.name || "Personal Workspace",
    role: row.member_role || row.role || "owner",
    status: row.member_status || row.status || "active"
  };
}

function buildSessionCookie(token, expiresAt) {
  return [
    AUTH_SESSION_COOKIE_NAME + "=" + token,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=" + expiresAt.toUTCString()
  ].join("; ");
}

function buildExpiredSessionCookie() {
  return [
    AUTH_SESSION_COOKIE_NAME + "=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ].join("; ");
}

const OAUTH_STATE_COOKIE_NAME = "gta_traffic_oauth_state";

function buildOauthStateCookie(state) {
  const expires = new Date(Date.now() + 5 * 60 * 1000);
  return [
    OAUTH_STATE_COOKIE_NAME + "=" + state,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=" + expires.toUTCString()
  ].join("; ");
}

function buildExpiredOauthStateCookie() {
  return [
    OAUTH_STATE_COOKIE_NAME + "=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ].join("; ");
}

function getCookieValue(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (rawName === name) {
      return rawValue.join("=");
    }
  }

  return "";
}

async function createAuthSession(env, userId, request) {
  const token = randomTokenBase64Url(32);
  const tokenHash = await sha256Hex(token);
  const sessionId = "session:" + crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000
  );

  await env.DB.prepare(`
    INSERT INTO user_sessions (
      id,
      user_id,
      session_token_hash,
      expires_at,
      user_agent,
      ip_hint
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    sessionId,
    userId,
    tokenHash,
    expiresAt.toISOString(),
    request.headers.get("User-Agent") || null,
    request.headers.get("CF-Connecting-IP") || null
  ).run();

  return {
    token,
    expiresAt
  };
}

function jsonAuthResponse(payload, init = {}) {
  const headers = new Headers();

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  const inputHeaders = init.headers || {};

  for (const [key, value] of Object.entries(inputHeaders)) {
    if (key.toLowerCase() === "set-cookie") {
      headers.append("Set-Cookie", value);
    } else {
      headers.set(key, value);
    }
  }

  return new Response(
    JSON.stringify(payload, null, 2),
    {
      status: init.status || 200,
      headers
    }
  );
}

async function getCurrentAuthSession(request, env) {
  const token = getCookieValue(request, AUTH_SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256Hex(token);

  const row = await env.DB.prepare(`
    SELECT
      s.id AS session_id,
      s.user_id,
      s.expires_at,
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.plan,
      u.status,
      u.created_at
    FROM user_sessions s
    JOIN users u
      ON u.id = s.user_id
    WHERE s.session_token_hash = ?
      AND s.expires_at > CURRENT_TIMESTAMP
      AND u.status = 'active'
  `).bind(tokenHash).first();

  if (!row) {
    return null;
  }

  await env.DB.prepare(`
    UPDATE user_sessions
    SET last_seen_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(row.session_id).run();

  return {
    sessionId: row.session_id,
    user: normalizePublicUser(row)
  };
}

async function getUserWorkspacesForAuth(env, userId) {
  const result = await env.DB.prepare(`
    SELECT
      w.id,
      w.name,
      wm.role AS member_role,
      wm.status AS member_status
    FROM workspace_members wm
    JOIN workspaces w
      ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
      AND wm.status = 'active'
    ORDER BY
      CASE wm.role
        WHEN 'owner' THEN 1
        WHEN 'editor' THEN 2
        ELSE 3
      END,
      w.created_at ASC
    LIMIT 20
  `).bind(userId).all();

  return (result.results || []).map(normalizePublicWorkspace);
}

async function handleAuthMe(request, env) {
  const session = await getCurrentAuthSession(request, env);

  if (!session) {
    return jsonAuthResponse(
      {
        ok: false,
        authenticated: false,
        error: "Not authenticated"
      },
      { status: 401 }
    );
  }

  const workspaces =
    await getUserWorkspacesForAuth(env, session.user.id);

  return jsonAuthResponse({
    ok: true,
    authenticated: true,
    user: session.user,
    workspaces
  });
}

// POST /api/premium-interest -- collects interest in the Pro tier from the
// pricing page form. There's no live checkout/subscription flow yet, so
// this just records the lead; a real subscription is still granted
// manually by an admin (see requireAdminSession / handleAdminUserUpdate).
async function handlePremiumInterest(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const email = normalizeAuthEmail(body.email);
  const note = optionalText(body.note);

  if (!isValidAuthEmail(email)) {
    return jsonResponse({ ok: false, error: "Valid email is required" }, 400);
  }

  const auth = await getCurrentAuthSession(request, env);

  await env.DB.prepare(`
    INSERT INTO premium_interest_signups (id, email, note, user_id)
    VALUES (?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    email,
    note || null,
    auth?.user?.id || null
  ).run();

  return jsonResponse({ ok: true });
}

async function handleAuthRegister(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Invalid JSON body"
      },
      { status: 400 }
    );
  }

  const email = normalizeAuthEmail(body.email);
  const password = String(body.password || "");
  const displayName = normalizeAuthDisplayName(body.displayName, email);

  if (!isValidAuthEmail(email)) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Valid email is required"
      },
      { status: 400 }
    );
  }

  if (!isValidAuthPassword(password)) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Password must be at least 8 characters"
      },
      { status: 400 }
    );
  }

  const existing = await env.DB.prepare(`
    SELECT id
    FROM users
    WHERE email = ?
  `).bind(email).first();

  if (existing) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "An account with this email already exists"
      },
      { status: 409 }
    );
  }

  const userId = "user:" + crypto.randomUUID();
  const workspaceId = "workspace:" + crypto.randomUUID();
  const workspaceName = displayName + "'s Workspace";
  const passwordResult = await hashPasswordForAuth(password);

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO users (
        id,
        email,
        display_name,
        role,
        plan,
        status,
        notes
      )
      VALUES (?, ?, ?, 'free_user', 'free', 'active', 'Self-registered free account.')
    `).bind(
      userId,
      email,
      displayName
    ),

    env.DB.prepare(`
      INSERT INTO user_auth_credentials (
        user_id,
        email,
        password_hash,
        password_salt,
        password_algorithm
      )
      VALUES (?, ?, ?, ?, 'PBKDF2-SHA256')
    `).bind(
      userId,
      email,
      passwordResult.hash,
      passwordResult.salt
    ),

    env.DB.prepare(`
      INSERT INTO workspaces (
        id,
        owner_user_id,
        name
      )
      VALUES (?, ?, ?)
    `).bind(
      workspaceId,
      userId,
      workspaceName
    ),

    env.DB.prepare(`
      INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role,
        status
      )
      VALUES (?, ?, 'owner', 'active')
    `).bind(
      workspaceId,
      userId
    )
  ]);

  const session = await createAuthSession(env, userId, request);

  const user = {
    id: userId,
    email,
    displayName,
    role: "free_user",
    plan: "free",
    status: "active"
  };

  const workspace = {
    id: workspaceId,
    name: workspaceName,
    role: "owner",
    status: "active"
  };

  return jsonAuthResponse(
    {
      ok: true,
      user,
      workspaces: [workspace]
    },
    {
      headers: {
        "Set-Cookie": buildSessionCookie(
          session.token,
          session.expiresAt
        )
      }
    }
  );
}

async function handleAuthLogin(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Invalid JSON body"
      },
      { status: 400 }
    );
  }

  const email = normalizeAuthEmail(body.email);
  const password = String(body.password || "");

  const credential = await env.DB.prepare(`
    SELECT
      c.user_id,
      c.password_hash,
      c.password_salt,
      u.status
    FROM user_auth_credentials c
    JOIN users u
      ON u.id = c.user_id
    WHERE c.email = ?
  `).bind(email).first();

  if (!credential || credential.status !== "active") {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Invalid email or password"
      },
      { status: 401 }
    );
  }

  const passwordResult =
    await hashPasswordForAuth(password, credential.password_salt);

  if (!safeEqualString(passwordResult.hash, credential.password_hash)) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Invalid email or password"
      },
      { status: 401 }
    );
  }

  const session =
    await createAuthSession(env, credential.user_id, request);

  return jsonAuthResponse(
    {
      ok: true
    },
    {
      headers: {
        "Set-Cookie": buildSessionCookie(
          session.token,
          session.expiresAt
        )
      }
    }
  );
}

async function handleAuthLogout(request, env) {
  const token = getCookieValue(request, AUTH_SESSION_COOKIE_NAME);

  if (token) {
    const tokenHash = await sha256Hex(token);

    await env.DB.prepare(`
      DELETE FROM user_sessions
      WHERE session_token_hash = ?
    `).bind(tokenHash).run();
  }

  return jsonAuthResponse(
    {
      ok: true
    },
    {
      headers: {
        "Set-Cookie": buildExpiredSessionCookie()
      }
    }
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Google sign-in
// Redirect-based OAuth 2.0 flow (no client library needed on Workers):
//  1. /api/auth/google/start builds the Google consent URL, stashes a random
//     state value in a short-lived cookie, and redirects the browser there.
//  2. Google redirects back to /api/auth/google/callback with a code + the
//     same state. We check the state against the cookie (CSRF protection),
//     trade the code for tokens server-to-server, and call Google's userinfo
//     endpoint with the access token to get a verified email + profile.
//  3. find-or-create a `users` row by verified email, link a
//     user_oauth_identities row, then reuse createAuthSession() exactly like
//     password login does — Google is just another way to end up with a
//     valid session cookie.
// ─────────────────────────────────────────────────────────────────────────────

function googleRedirectUri(url) {
  return url.origin + "/api/auth/google/callback";
}

async function handleGoogleAuthStart(request, env) {
  if (!env.GOOGLE_CLIENT_ID) {
    return jsonAuthResponse(
      { ok: false, error: "Google sign-in is not configured on this Worker." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const state = randomTokenBase64Url(24);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri(url));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const headers = new Headers();
  headers.set("Location", authUrl.toString());
  headers.append("Set-Cookie", buildOauthStateCookie(state));

  return new Response(null, { status: 302, headers });
}

async function findOrCreateUserForGoogle(env, { sub, email, displayName }) {
  const identity = await env.DB.prepare(`
    SELECT user_id FROM user_oauth_identities
    WHERE provider = 'google' AND provider_user_id = ?
  `).bind(sub).first();

  if (identity) {
    return identity.user_id;
  }

  const existingUser = await env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(email).first();

  if (existingUser) {
    await env.DB.prepare(`
      INSERT INTO user_oauth_identities (id, user_id, provider, provider_user_id, email)
      VALUES (?, ?, 'google', ?, ?)
    `).bind("oauth:" + crypto.randomUUID(), existingUser.id, sub, email).run();

    return existingUser.id;
  }

  const userId = "user:" + crypto.randomUUID();
  const workspaceId = "workspace:" + crypto.randomUUID();
  const workspaceName = displayName + "'s Workspace";

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO users (id, email, display_name, role, plan, status, notes)
      VALUES (?, ?, ?, 'free_user', 'free', 'active', 'Signed up with Google.')
    `).bind(userId, email, displayName),

    env.DB.prepare(`
      INSERT INTO user_oauth_identities (id, user_id, provider, provider_user_id, email)
      VALUES (?, ?, 'google', ?, ?)
    `).bind("oauth:" + crypto.randomUUID(), userId, sub, email),

    env.DB.prepare(`
      INSERT INTO workspaces (id, owner_user_id, name)
      VALUES (?, ?, ?)
    `).bind(workspaceId, userId, workspaceName),

    env.DB.prepare(`
      INSERT INTO workspace_members (workspace_id, user_id, role, status)
      VALUES (?, ?, 'owner', 'active')
    `).bind(workspaceId, userId)
  ]);

  return userId;
}

async function handleGoogleAuthCallback(request, env) {
  const url = new URL(request.url);
  const loginUrl = url.origin + "/login.html";

  if (url.searchParams.get("error")) {
    return Response.redirect(loginUrl + "?error=google_denied", 302);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookieValue(request, OAUTH_STATE_COOKIE_NAME);

  if (!code || !state || !cookieState || state !== cookieState) {
    return Response.redirect(loginUrl + "?error=google_state", 302);
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(loginUrl + "?error=google_not_configured", 302);
  }

  let tokenPayload;
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(url),
        grant_type: "authorization_code"
      })
    });

    tokenPayload = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(tokenPayload.error_description || tokenPayload.error || "Token exchange failed");
    }
  } catch (error) {
    console.error("Google token exchange failed:", error?.message || error);
    return Response.redirect(loginUrl + "?error=google_token", 302);
  }

  let profile;
  try {
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + tokenPayload.access_token }
    });

    profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.sub) {
      throw new Error("Could not load Google profile");
    }
  } catch (error) {
    console.error("Google profile lookup failed:", error?.message || error);
    return Response.redirect(loginUrl + "?error=google_profile", 302);
  }

  if (profile.email_verified === false) {
    return Response.redirect(loginUrl + "?error=google_unverified_email", 302);
  }

  const email = normalizeAuthEmail(profile.email);

  if (!isValidAuthEmail(email)) {
    return Response.redirect(loginUrl + "?error=google_email", 302);
  }

  const userId = await findOrCreateUserForGoogle(env, {
    sub: profile.sub,
    email,
    displayName: normalizeAuthDisplayName(profile.name, email)
  });

  const activeUser = await env.DB.prepare(`
    SELECT status FROM users WHERE id = ?
  `).bind(userId).first();

  if (!activeUser || activeUser.status !== "active") {
    return Response.redirect(loginUrl + "?error=account_disabled", 302);
  }

  const session = await createAuthSession(env, userId, request);

  const headers = new Headers();
  headers.set("Location", url.origin + "/dashboard.html");
  headers.append("Set-Cookie", buildSessionCookie(session.token, session.expiresAt));
  headers.append("Set-Cookie", buildExpiredOauthStateCookie());

  return new Response(null, { status: 302, headers });
}


// ─────────────────────────────────────────────────────────────────────────────
// Raw Meta File Cloud Storage  (vehicles.meta, handling.meta, etc. → R2)
// Tables: raw_meta_files, meta_file_model_refs
// R2 key pattern: meta-files/{fileType}/{packName}
// ─────────────────────────────────────────────────────────────────────────────

const VALID_META_FILE_TYPES = new Set([
  "vehicles-meta",
  "handling-meta",
  "carcols-meta",
  "carvariations-meta",
  "popgroups"
]);

function sanitizeMetaPackName(value) {
  return String(value || "")
    .replace(/\.(meta|xml|txt)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "unnamed";
}

async function handleMetaFilePut(request, env, fileType, rawPackName) {
  const authErr = await checkLibraryWriteAuthorization(request, env);
  if (authErr) return authErr;

  if (!VALID_META_FILE_TYPES.has(fileType)) {
    return jsonResponse({ ok: false, error: "Invalid file type" }, 400);
  }

  const packName = sanitizeMetaPackName(rawPackName);
  if (!packName || packName === "unnamed") {
    return jsonResponse({ ok: false, error: "Invalid pack name" }, 400);
  }

  const rawXml = await request.text();
  if (!rawXml || rawXml.length < 10) {
    return jsonResponse({ ok: false, error: "Empty or missing XML body" }, 400);
  }

  const originalFilename = (request.headers.get("x-original-filename") || "").slice(0, 128);
  let entryNames = [];
  try {
    const raw = request.headers.get("x-entry-names") || "[]";
    entryNames = JSON.parse(raw);
    if (!Array.isArray(entryNames)) entryNames = [];
  } catch (_) { entryNames = []; }

  const r2Key = `meta-files/${fileType}/${packName}`;
  await env.VEHICLE_IMAGES.put(r2Key, rawXml, {
    httpMetadata: { contentType: "application/xml; charset=utf-8" },
    customMetadata: {
      packName,
      fileType,
      originalFilename,
      entryCount: String(entryNames.length),
      updatedAt: new Date().toISOString()
    }
  });

  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO raw_meta_files (file_type, pack_name, r2_key, original_filename, entry_count, entry_names_json, uploaded_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_type, pack_name) DO UPDATE SET
      r2_key = excluded.r2_key,
      original_filename = excluded.original_filename,
      entry_count = excluded.entry_count,
      entry_names_json = excluded.entry_names_json,
      updated_at = excluded.updated_at
  `).bind(fileType, packName, r2Key, originalFilename, entryNames.length, JSON.stringify(entryNames), now, now).run();

  // Batch upsert model→pack refs (100 per batch)
  if (entryNames.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < entryNames.length; i += BATCH) {
      const chunk = entryNames.slice(i, i + BATCH);
      const stmts = chunk.map(name =>
        env.DB.prepare(`
          INSERT INTO meta_file_model_refs (model_name, file_type, pack_name)
          VALUES (?, ?, ?)
          ON CONFLICT(model_name, file_type) DO UPDATE SET pack_name = excluded.pack_name
        `).bind(String(name).toLowerCase(), fileType, packName)
      );
      await env.DB.batch(stmts);
    }
  }

  return jsonResponse({ ok: true, packName, fileType, entryCount: entryNames.length }, 201);
}

async function handleMetaFileGet(request, env, fileType, packOrModel) {
  if (!VALID_META_FILE_TYPES.has(fileType)) {
    return jsonResponse({ ok: false, error: "Invalid file type" }, 400);
  }

  const sanitized = sanitizeMetaPackName(packOrModel);

  // Try direct pack name lookup first
  let row = await env.DB.prepare(`
    SELECT * FROM raw_meta_files WHERE file_type = ? AND pack_name = ? LIMIT 1
  `).bind(fileType, sanitized).first();

  // Fall back to model→pack ref lookup
  if (!row) {
    const ref = await env.DB.prepare(`
      SELECT pack_name FROM meta_file_model_refs WHERE file_type = ? AND model_name = ? LIMIT 1
    `).bind(fileType, sanitized).first();
    if (ref) {
      row = await env.DB.prepare(`
        SELECT * FROM raw_meta_files WHERE file_type = ? AND pack_name = ? LIMIT 1
      `).bind(fileType, ref.pack_name).first();
    }
  }

  if (!row) {
    return jsonResponse({ ok: false, error: "Meta file not found" }, 404);
  }

  const obj = await env.VEHICLE_IMAGES.get(row.r2_key);
  if (!obj) {
    return jsonResponse({ ok: false, error: "R2 object missing" }, 404);
  }

  const xml = await obj.text();
  let entryNames = [];
  try { entryNames = JSON.parse(row.entry_names_json || "[]"); } catch (_) {}

  return jsonResponse({
    ok: true,
    file: {
      packName: row.pack_name,
      fileType: row.file_type,
      originalFilename: row.original_filename || "",
      entryCount: row.entry_count || 0,
      entryNames,
      updatedAt: row.updated_at,
      xml
    }
  });
}

async function handleMetaFileDelete(request, env, fileType, packName) {
  const authErr = await checkLibraryWriteAuthorization(request, env);
  if (authErr) return authErr;

  if (!VALID_META_FILE_TYPES.has(fileType)) {
    return jsonResponse({ ok: false, error: "Invalid file type" }, 400);
  }

  const sanitized = sanitizeMetaPackName(packName);
  const row = await env.DB.prepare(`
    SELECT r2_key FROM raw_meta_files WHERE file_type = ? AND pack_name = ? LIMIT 1
  `).bind(fileType, sanitized).first();

  if (!row) return jsonResponse({ ok: false, error: "Not found" }, 404);

  await env.VEHICLE_IMAGES.delete(row.r2_key);
  await env.DB.prepare(`DELETE FROM raw_meta_files WHERE file_type = ? AND pack_name = ?`).bind(fileType, sanitized).run();
  await env.DB.prepare(`DELETE FROM meta_file_model_refs WHERE file_type = ? AND pack_name = ?`).bind(fileType, sanitized).run();

  return jsonResponse({ ok: true });
}

async function handleMetaFileList(request, env) {
  const url = new URL(request.url);
  const fileType = url.searchParams.get("fileType") || null;

  let rows;
  if (fileType && VALID_META_FILE_TYPES.has(fileType)) {
    rows = await env.DB.prepare(`
      SELECT file_type, pack_name, entry_count, original_filename, updated_at
      FROM raw_meta_files WHERE file_type = ? ORDER BY updated_at DESC
    `).bind(fileType).all();
  } else {
    rows = await env.DB.prepare(`
      SELECT file_type, pack_name, entry_count, original_filename, updated_at
      FROM raw_meta_files ORDER BY updated_at DESC
    `).all();
  }

  return jsonResponse({ ok: true, files: rows.results || [] });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (
        request.method === "POST" &&
        url.pathname === "/api/auth/register"
      ) {
        return await handleAuthRegister(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/premium-interest"
      ) {
        return await handlePremiumInterest(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/auth/login"
      ) {
        return await handleAuthLogin(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/auth/logout"
      ) {
        return await handleAuthLogout(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/auth/me"
      ) {
        return await handleAuthMe(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/auth/google/start"
      ) {
        return await handleGoogleAuthStart(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/auth/google/callback"
      ) {
        return await handleGoogleAuthCallback(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/summary"
      ) {
        return await handleAdminSummary(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/users"
      ) {
        return await handleAdminUserList(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/admin/users"
      ) {
        return await handleAdminUserCreate(request, env);
      }

      const adminUserPatchRoute =
        url.pathname.match(
          /^\/api\/admin\/users\/([^/]{1,240})$/
        );

      if (
        adminUserPatchRoute &&
        request.method === "PATCH"
      ) {
        return await handleAdminUserUpdate(
          request,
          env,
          decodeURIComponent(adminUserPatchRoute[1])
        );
      }

      if (
        adminUserPatchRoute &&
        request.method === "DELETE"
      ) {
        return await handleAdminUserDelete(
          request,
          env,
          decodeURIComponent(adminUserPatchRoute[1])
        );
      }


      const adminUserSessionsRoute =
        url.pathname.match(/^\/api\/admin\/users\/([^/]{1,240})\/sessions$/);

      if (adminUserSessionsRoute && request.method === "GET") {
        return await handleAdminUserSessions(
          request,
          env,
          decodeURIComponent(adminUserSessionsRoute[1])
        );
      }

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
        request.method === "GET" &&
        url.pathname === "/api/vanilla-vehicles"
      ) {
        return await handleVanillaVehicleList(request, env);
      }

      const garageRoute =
        url.pathname.match(
          /^\/api\/garage\/([^/]{1,240})$/
        );

      if (garageRoute && request.method === "POST") {
        return await handleGarageAdd(
          request,
          env,
          decodeURIComponent(garageRoute[1])
        );
      }

      if (garageRoute && request.method === "DELETE") {
        return await handleGarageRemove(
          request,
          env,
          decodeURIComponent(garageRoute[1])
        );
      }

if (
  request.method === "GET" &&
  url.pathname === "/api/handling-profiles"
) {
  return await handleHandlingProfileList(env);
}

if (
  request.method === "GET" &&
  url.pathname === "/api/vehicle-popgroups"
) {
  return await handleVehiclePopgroupList(env);
}
if (
  request.method === "GET" &&
  url.pathname === "/api/source-history"
) {
  return await handleSourceHistoryList(
    request,
    env
  );
}
if (
  request.method === "GET" &&
  url.pathname === "/api/vehicle-images"
) {
  return await handleVehicleImageList(env);
}

const vehicleImageRoute =
  url.pathname.match(
    /^\/api\/vehicle-images\/([a-zA-Z0-9_-]{1,100})$/
  );

if (
  vehicleImageRoute &&
  request.method === "GET"
) {
  return await handleVehicleImageGet(
    env,
    vehicleImageRoute[1]
  );
}

if (
  vehicleImageRoute &&
  request.method === "PUT"
) {
  return await handleVehicleImageUpload(
    request,
    env,
    vehicleImageRoute[1]
  );
}
if (
  vehicleImageRoute &&
  request.method === "DELETE"
) {
  return await handleVehicleImageDelete(
    request,
    env,
    vehicleImageRoute[1]
  );
}

if (
  request.method === "POST" &&
  url.pathname === "/api/vehicle-images/import-bulk"
) {
  return await handleVehicleImageBulkImport(
    request,
    env
  );
}
      if (
        request.method === "POST" &&
        url.pathname === "/api/vehicles/import"
      ) {
        return await handleVehicleImport(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/vehicles/import-bulk"
      ) {
        return await handleVehicleBulkImport(request, env);
      }
if (
  request.method === "POST" &&
  url.pathname === "/api/library/import-v2"
) {
  return await handleLibraryV2Import(request, env);
}
if (
  request.method === "GET" &&
  url.pathname === "/api/packs"
) {
  return await handlePackList(request, env);
}

if (
  request.method === "GET" &&
  url.pathname === "/api/vehicle-packs"
) {
  return await handleVehiclePackList(request, env);
}

if (
  request.method === "GET" &&
  url.pathname === "/api/vehicle-appearance"
) {
  return await handleVehicleAppearanceGet(request, env);
}
if (
  request.method === "POST" &&
  url.pathname === "/api/vehicle-appearance/import"
) {
  return await handleVehicleAppearanceImport(request, env);
}
if (
  request.method === "POST" &&
  url.pathname === "/api/packs/import"
) {
  return await handlePackImport(request, env);
}

// ── Pack Builder (premium) ─────────────────────────────
if (request.method === "GET" && url.pathname === "/api/builder/packs") {
  return await handleBuilderPackList(request, env);
}
if (request.method === "POST" && url.pathname === "/api/builder/packs") {
  return await handleBuilderPackCreate(request, env);
}
const builderPackRoute = url.pathname.match(/^\/api\/builder\/packs\/([a-zA-Z0-9_:-]{1,120})$/);
if (builderPackRoute) {
  if (request.method === "GET")    return await handleBuilderPackGet(request, env, builderPackRoute[1]);
  if (request.method === "PUT")    return await handleBuilderPackUpdate(request, env, builderPackRoute[1]);
  if (request.method === "DELETE") return await handleBuilderPackDelete(request, env, builderPackRoute[1]);
}
const builderVehicleRoute = url.pathname.match(/^\/api\/builder\/packs\/([a-zA-Z0-9_:-]{1,120})\/vehicles$/);
if (builderVehicleRoute) {
  if (request.method === "GET")  return await handleBuilderPackVehicleList(request, env, builderVehicleRoute[1]);
  if (request.method === "POST") return await handleBuilderPackVehicleAdd(request, env, builderVehicleRoute[1]);
}
const builderVehicleItemRoute = url.pathname.match(
  /^\/api\/builder\/packs\/([a-zA-Z0-9_:-]{1,120})\/vehicles\/([a-zA-Z0-9_-]{1,100})$/
);
if (builderVehicleItemRoute) {
  if (request.method === "PATCH")  return await handleBuilderPackVehiclePatch(request, env, builderVehicleItemRoute[1], builderVehicleItemRoute[2]);
  if (request.method === "DELETE") return await handleBuilderPackVehicleRemove(request, env, builderVehicleItemRoute[1], builderVehicleItemRoute[2]);
}
if (request.method === "POST" && url.pathname === "/api/builder/vehicle-meta") {
  return await handleBuilderMetaUpload(request, env);
}
const builderVehicleMetaRoute = url.pathname.match(/^\/api\/builder\/vehicle-meta\/([a-zA-Z0-9_-]{1,100})$/);
if (builderVehicleMetaRoute && request.method === "GET") {
  return await handleBuilderMetaGet(request, env, builderVehicleMetaRoute[1]);
}
// ── End Pack Builder ───────────────────────────────────

const vehiclePatchRoute =
  url.pathname.match(
    /^\/api\/vehicles\/([a-zA-Z0-9_-]{1,100})$/
  );

if (
  vehiclePatchRoute &&
  request.method === "PATCH"
) {
  return await handleVehiclePatch(
    request,
    env,
    vehiclePatchRoute[1]
  );
}

if (
  vehiclePatchRoute &&
  request.method === "DELETE"
) {
  return await handleVehicleDelete(
    request,
    env,
    vehiclePatchRoute[1]
  );
}

const vehicleFieldEditRoute =
  url.pathname.match(
    /^\/api\/vehicle-edits\/([a-zA-Z0-9_-]{1,100})$/
  );

if (vehicleFieldEditRoute && request.method === "GET") {
  return await handleVehicleFieldEditsGet(
    request,
    env,
    vehicleFieldEditRoute[1]
  );
}

if (vehicleFieldEditRoute && request.method === "PUT") {
  return await handleVehicleFieldEditSave(
    request,
    env,
    vehicleFieldEditRoute[1]
  );
}

if (vehicleFieldEditRoute && request.method === "DELETE") {
  return await handleVehicleFieldEditRestore(
    request,
    env,
    vehicleFieldEditRoute[1],
    null
  );
}

const vehicleFieldEditSingleRoute =
  url.pathname.match(
    /^\/api\/vehicle-edits\/([a-zA-Z0-9_-]{1,100})\/([a-zA-Z0-9_]{1,60})$/
  );

if (vehicleFieldEditSingleRoute && request.method === "DELETE") {
  return await handleVehicleFieldEditRestore(
    request,
    env,
    vehicleFieldEditSingleRoute[1],
    vehicleFieldEditSingleRoute[2]
  );
}

const handlingFieldEditRoute =
  url.pathname.match(
    /^\/api\/handling-edits\/([a-zA-Z0-9_-]{1,100})$/
  );

if (handlingFieldEditRoute && request.method === "GET") {
  return await handleHandlingFieldEditsGet(
    request,
    env,
    handlingFieldEditRoute[1]
  );
}

if (handlingFieldEditRoute && request.method === "PUT") {
  return await handleHandlingFieldEditSave(
    request,
    env,
    handlingFieldEditRoute[1]
  );
}

if (handlingFieldEditRoute && request.method === "DELETE") {
  return await handleHandlingFieldEditRestore(
    request,
    env,
    handlingFieldEditRoute[1],
    null
  );
}

const handlingFieldEditSingleRoute =
  url.pathname.match(
    /^\/api\/handling-edits\/([a-zA-Z0-9_-]{1,100})\/([a-zA-Z0-9_]{1,60})$/
  );

if (handlingFieldEditSingleRoute && request.method === "DELETE") {
  return await handleHandlingFieldEditRestore(
    request,
    env,
    handlingFieldEditSingleRoute[1],
    handlingFieldEditSingleRoute[2]
  );
}

      if (url.pathname.startsWith("/api/")) {
      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/workspaces"
      ) {
        return await handleAdminWorkspaceList(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/api/admin/workspace-members"
      ) {
        return await handleAdminWorkspaceMemberList(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/admin/workspace-members"
      ) {
        return await handleAdminWorkspaceMemberUpsert(request, env);
      }
        

function savedProjectText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function savedProjectJsonParse(value, fallback = null) {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const SAVED_PROJECT_TYPES = new Set([
  "popgroups",
  "popcycle",
  "vehicle-meta",
  "handling-meta",
  "pack-database",
  "vehicle-library",
  "dispatch",
  "relationships",
  "trains",
  "events",
  "combat",
  "combattasks",
  "general"
]);

function normalizeSavedProjectType(value) {
  const type = savedProjectText(value) || "general";
  return SAVED_PROJECT_TYPES.has(type) ? type : "general";
}

function normalizeSavedProjectRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerUserId: row.owner_user_id,
    projectType: row.project_type,
    name: row.name,
    description: row.description,
    status: row.status,
    pinned: Boolean(row.pinned),
    sourceFileId: row.source_file_id,
    currentVersionId: row.current_version_id,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function normalizeSavedProjectVersionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    createdByUserId: row.created_by_user_id,
    versionNumber: Number(row.version_number || 0),
    label: row.label,
    payload: savedProjectJsonParse(row.payload_json, {}),
    summary: savedProjectJsonParse(row.summary_json, null),
    fileCount: Number(row.file_count || 0),
    createdAt: row.created_at
  };
}

function getSavedProjectSessionUserId(session) {
  return (
    session?.user?.id ||
    session?.userId ||
    session?.id ||
    null
  );
}

async function requireSavedProjectSession(request, env) {
  const session = await getCurrentAuthSession(request, env);

  if (!session) {
    return {
      error: jsonAuthResponse(
        {
          ok: false,
          error: "Authentication required"
        },
        {
          status: 401
        }
      )
    };
  }

  const userId = getSavedProjectSessionUserId(session);

  if (!userId) {
    return {
      error: jsonAuthResponse(
        {
          ok: false,
          error: "Authenticated user could not be resolved"
        },
        {
          status: 401
        }
      )
    };
  }

  let workspaceId =
    session?.workspace?.id ||
    session?.workspaceId ||
    null;

  let workspaceRole =
    session?.workspace?.role ||
    session?.workspaceRole ||
    null;

  if (!workspaceId) {
    const membership = await env.DB.prepare(`
      SELECT
        workspace_id,
        role,
        status
      FROM workspace_members
      WHERE user_id = ?
        AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
    `).bind(userId).first();

    if (!membership) {
      return {
        error: jsonAuthResponse(
          {
            ok: false,
            error: "No active workspace membership found"
          },
          {
            status: 403
          }
        )
      };
    }

    workspaceId = membership.workspace_id;
    workspaceRole = membership.role || "viewer";
  }

  return {
    session,
    userId,
    workspaceId,
    workspaceRole: workspaceRole || "viewer"
  };
}

async function getSavedProjectForWorkspace(env, projectId, workspaceId) {
  return await env.DB.prepare(`
    SELECT *
    FROM saved_projects
    WHERE id = ?
      AND workspace_id = ?
      AND deleted_at IS NULL
    LIMIT 1
  `).bind(projectId, workspaceId).first();
}

async function getNextSavedProjectVersionNumber(env, projectId) {
  const row = await env.DB.prepare(`
    SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version_number
    FROM saved_project_versions
    WHERE project_id = ?
  `).bind(projectId).first();

  return Number(row?.next_version_number || 1);
}

async function handleProjectList(request, env) {
  const auth = await requireSavedProjectSession(request, env);

  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const projectType = savedProjectText(url.searchParams.get("type"));
  const search = savedProjectText(url.searchParams.get("search"));
  const status = savedProjectText(url.searchParams.get("status")) || "active";

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || 50), 1),
    100
  );

  const offset = Math.max(
    Number(url.searchParams.get("offset") || 0),
    0
  );

  const conditions = [
    "workspace_id = ?",
    "deleted_at IS NULL"
  ];

  const bindings = [auth.workspaceId];

  if (status !== "all") {
    conditions.push("status = ?");
    bindings.push(status);
  }

  if (projectType) {
    conditions.push("project_type = ?");
    bindings.push(projectType);
  }

  if (search) {
    conditions.push("(name LIKE ? OR description LIKE ?)");
    bindings.push("%" + search + "%", "%" + search + "%");
  }

  const whereClause = conditions.join(" AND ");

  const countRow = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM saved_projects WHERE " + whereClause
  ).bind(...bindings).first();

  const result = await env.DB.prepare(
    "SELECT * FROM saved_projects WHERE " +
      whereClause +
      " ORDER BY pinned DESC, updated_at DESC LIMIT ? OFFSET ?"
  ).bind(...bindings, limit, offset).all();

  return jsonAuthResponse({
    ok: true,
    total: Number(countRow?.count || 0),
    limit,
    offset,
    projects: (result.results || []).map(normalizeSavedProjectRow)
  });
}

async function handleProjectCreate(request, env) {
  const auth = await requireSavedProjectSession(request, env);

  if (auth.error) {
    return auth.error;
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonAuthResponse(
      {
        ok: false,
        error: "The request body is not valid JSON"
      },
      {
        status: 400
      }
    );
  }

  const name = savedProjectText(body.name);

  if (!name) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Project name is required"
      },
      {
        status: 400
      }
    );
  }

  const projectId = "project:" + crypto.randomUUID();
  const versionId = "project-version:" + crypto.randomUUID();
  const projectType = normalizeSavedProjectType(body.projectType);
  const description = savedProjectText(body.description);
  let summaryJson;
  let payloadJson;
  let payloadKB;

  try {
    summaryJson = body.summary ? JSON.stringify(body.summary) : null;

    // Strip heavy fields that bloat the payload beyond D1's 1 MB per-cell limit.
    const slimPayload = Object.assign({}, body.payload || {});
    delete slimPayload.vehicleMetaCache;
    delete slimPayload.uiState;
    payloadJson = JSON.stringify(slimPayload);
    payloadKB = Math.round(payloadJson.length / 1024);

    if (payloadKB > 900) {
      return jsonAuthResponse(
        { ok: false, error: `Payload too large (${payloadKB} KB). Reduce project size before saving.` },
        { status: 413 }
      );
    }
  } catch (serializeError) {
    return jsonAuthResponse(
      { ok: false, error: "Could not serialize project payload: " + (serializeError?.message || String(serializeError)) },
      { status: 400 }
    );
  }

  try {
    await env.DB.prepare(`
      INSERT INTO saved_projects (
        id,
        workspace_id,
        owner_user_id,
        project_type,
        name,
        description,
        status,
        pinned,
        current_version_id,
        created_at,
        updated_at,
        last_opened_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      projectId,
      auth.workspaceId,
      auth.userId,
      projectType,
      name,
      description,
      body.pinned === true ? 1 : 0,
      versionId
    ).run();

    await env.DB.prepare(`
      INSERT INTO saved_project_versions (
        id,
        project_id,
        workspace_id,
        created_by_user_id,
        version_number,
        label,
        payload_json,
        summary_json,
        file_count,
        created_at
      )
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      versionId,
      projectId,
      auth.workspaceId,
      auth.userId,
      savedProjectText(body.versionLabel) || "Initial save",
      payloadJson,
      summaryJson,
      Array.isArray(body.files) ? body.files.length : 0
    ).run();
  } catch (dbError) {
    const detail = dbError instanceof Error ? dbError.message : String(dbError);
    return jsonAuthResponse(
      {
        ok: false,
        error: `DB error (payload ${payloadKB}KB): ${detail}`
      },
      { status: 500 }
    );
  }

  let project = null;
  try {
    project = await getSavedProjectForWorkspace(env, projectId, auth.workspaceId);
  } catch {
    // Non-fatal: the insert succeeded; return success without the full row.
  }

  return jsonAuthResponse(
    {
      ok: true,
      message: "Project saved",
      project: normalizeSavedProjectRow(project),
      versionId
    },
    {
      status: 201
    }
  );
}

async function handleProjectDetail(request, env, projectId) {
  const auth = await requireSavedProjectSession(request, env);

  if (auth.error) {
    return auth.error;
  }

  const project = await getSavedProjectForWorkspace(
    env,
    projectId,
    auth.workspaceId
  );

  if (!project) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Project not found"
      },
      {
        status: 404
      }
    );
  }

  await env.DB.prepare(`
    UPDATE saved_projects
    SET last_opened_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
  `).bind(projectId, auth.workspaceId).run();

  const versions = await env.DB.prepare(`
    SELECT *
    FROM saved_project_versions
    WHERE project_id = ?
      AND workspace_id = ?
    ORDER BY version_number DESC
    LIMIT 25
  `).bind(projectId, auth.workspaceId).all();

  return jsonAuthResponse({
    ok: true,
    project: normalizeSavedProjectRow(project),
    versions: (versions.results || []).map(normalizeSavedProjectVersionRow)
  });
}

async function handleProjectUpdate(request, env, projectId) {
  const auth = await requireSavedProjectSession(request, env);

  if (auth.error) {
    return auth.error;
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonAuthResponse(
      {
        ok: false,
        error: "The request body is not valid JSON"
      },
      {
        status: 400
      }
    );
  }

  const existing = await getSavedProjectForWorkspace(
    env,
    projectId,
    auth.workspaceId
  );

  if (!existing) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Project not found"
      },
      {
        status: 404
      }
    );
  }

  const updates = [];
  const bindings = [];

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = savedProjectText(body.name);

    if (!name) {
      return jsonAuthResponse(
        {
          ok: false,
          error: "Project name cannot be blank"
        },
        {
          status: 400
        }
      );
    }

    updates.push("name = ?");
    bindings.push(name);
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    updates.push("description = ?");
    bindings.push(savedProjectText(body.description));
  }

  if (Object.prototype.hasOwnProperty.call(body, "projectType")) {
    updates.push("project_type = ?");
    bindings.push(normalizeSavedProjectType(body.projectType));
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const nextStatus = savedProjectText(body.status) || "active";

    if (!["active", "archived", "disabled"].includes(nextStatus)) {
      return jsonAuthResponse(
        {
          ok: false,
          error: "Invalid project status"
        },
        {
          status: 400
        }
      );
    }

    updates.push("status = ?");
    bindings.push(nextStatus);
  }

  if (Object.prototype.hasOwnProperty.call(body, "pinned")) {
    updates.push("pinned = ?");
    bindings.push(body.pinned === true ? 1 : 0);
  }

  if (!updates.length) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "No project fields were provided"
      },
      {
        status: 400
      }
    );
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  await env.DB.prepare(
    "UPDATE saved_projects SET " +
      updates.join(", ") +
      " WHERE id = ? AND workspace_id = ?"
  ).bind(...bindings, projectId, auth.workspaceId).run();

  const project = await getSavedProjectForWorkspace(
    env,
    projectId,
    auth.workspaceId
  );

  return jsonAuthResponse({
    ok: true,
    message: "Project updated",
    project: normalizeSavedProjectRow(project)
  });
}

async function handleProjectVersionCreate(request, env, projectId) {
  const auth = await requireSavedProjectSession(request, env);

  if (auth.error) {
    return auth.error;
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonAuthResponse(
      {
        ok: false,
        error: "The request body is not valid JSON"
      },
      {
        status: 400
      }
    );
  }

  const project = await getSavedProjectForWorkspace(
    env,
    projectId,
    auth.workspaceId
  );

  if (!project) {
    return jsonAuthResponse(
      {
        ok: false,
        error: "Project not found"
      },
      {
        status: 404
      }
    );
  }

  const versionId = "project-version:" + crypto.randomUUID();
  const versionNumber = await getNextSavedProjectVersionNumber(env, projectId);
  const payloadJson = JSON.stringify(body.payload || {});
  const summaryJson = body.summary ? JSON.stringify(body.summary) : null;

  await env.DB.prepare(`
    INSERT INTO saved_project_versions (
      id,
      project_id,
      workspace_id,
      created_by_user_id,
      version_number,
      label,
      payload_json,
      summary_json,
      file_count,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    versionId,
    projectId,
    auth.workspaceId,
    auth.userId,
    versionNumber,
    savedProjectText(body.label) || "Version " + versionNumber,
    payloadJson,
    summaryJson,
    Array.isArray(body.files) ? body.files.length : 0
  ).run();

  await env.DB.prepare(`
    UPDATE saved_projects
    SET current_version_id = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND workspace_id = ?
  `).bind(versionId, projectId, auth.workspaceId).run();

  const version = await env.DB.prepare(`
    SELECT *
    FROM saved_project_versions
    WHERE id = ?
      AND workspace_id = ?
    LIMIT 1
  `).bind(versionId, auth.workspaceId).first();

  return jsonAuthResponse(
    {
      ok: true,
      message: "Project version saved",
      version: normalizeSavedProjectVersionRow(version)
    },
    {
      status: 201
    }
  );
}

      if (
        request.method === "GET" &&
        url.pathname === "/api/projects"
      ) {
        return await handleProjectList(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/projects"
      ) {
        return await handleProjectCreate(request, env);
      }

      const projectVersionCreateRoute = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/versions$/
      );

      if (
        projectVersionCreateRoute &&
        request.method === "POST"
      ) {
        return await handleProjectVersionCreate(
          request,
          env,
          decodeURIComponent(projectVersionCreateRoute[1])
        );
      }

      const projectDetailRoute = url.pathname.match(
        /^\/api\/projects\/([^/]+)$/
      );

      if (
        projectDetailRoute &&
        request.method === "GET"
      ) {
        return await handleProjectDetail(
          request,
          env,
          decodeURIComponent(projectDetailRoute[1])
        );
      }

      if (
        projectDetailRoute &&
        request.method === "PATCH"
      ) {
        return await handleProjectUpdate(
          request,
          env,
          decodeURIComponent(projectDetailRoute[1])
        );
      }

// ── Meta file routes ──────────────────────────────────────────────────────
      // GET /api/meta-files  (list all)
      if (request.method === "GET" && url.pathname === "/api/meta-files") {
        return await handleMetaFileList(request, env);
      }

      // Match /api/meta-files/{fileType}/{packOrModel}
      const metaFileRoute = url.pathname.match(
        /^\/api\/meta-files\/([^\/]+)\/([^\/]+)$/
      );
      if (metaFileRoute) {
        const fileType = decodeURIComponent(metaFileRoute[1]);
        const packOrModel = decodeURIComponent(metaFileRoute[2]);
        if (request.method === "GET") {
          return await handleMetaFileGet(request, env, fileType, packOrModel);
        }
        if (request.method === "PUT") {
          return await handleMetaFilePut(request, env, fileType, packOrModel);
        }
        if (request.method === "DELETE") {
          return await handleMetaFileDelete(request, env, fileType, packOrModel);
        }
      }


      // ── Import routes ──────────────────────────────────────────────
      if (request.method === "POST" && url.pathname === "/api/import/vehicles-meta") {
        return await handleImportVehiclesMeta(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/import/handling-meta") {
        return await handleImportHandlingMeta(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/import/popgroups") {
        return await handleImportPopgroups(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/import/popcycle") {
        return await handleImportPopcycle(request, env);
      }

      // ── ModDB query routes — /api/moddb/* ─────────────────────────
      if (request.method === "GET" && url.pathname === "/api/moddb/vehicles") {
        return await handleModDbVehicleList(request, env);
      }
      const moddbVehicleRoute = url.pathname.match(/^\/api\/moddb\/vehicles\/([^/]+)$/);
      if (moddbVehicleRoute && request.method === "GET") {
        return await handleModDbVehicle(request, env, decodeURIComponent(moddbVehicleRoute[1]));
      }
      const moddbHandlingRoute = url.pathname.match(/^\/api\/moddb\/handling\/([^/]+)$/);
      if (moddbHandlingRoute && request.method === "GET") {
        return await handleModDbHandling(request, env, decodeURIComponent(moddbHandlingRoute[1]));
      }
      if (request.method === "GET" && url.pathname === "/api/moddb/popgroups") {
        return await handleModDbPopgroupList(request, env);
      }
      if (request.method === "GET" && url.pathname === "/api/moddb/popgroups/zones") {
        return await handleModDbPopcycleZones(request, env);
      }
      const moddbPopgroupByModel = url.pathname.match(/^\/api\/moddb\/popgroups\/by-model\/([^/]+)$/);
      if (moddbPopgroupByModel && request.method === "GET") {
        return await handleModDbPopgroupByModel(request, env, decodeURIComponent(moddbPopgroupByModel[1]));
      }
      const moddbPopgroupRoute = url.pathname.match(/^\/api\/moddb\/popgroups\/([^/]+)$/);
      if (moddbPopgroupRoute && request.method === "GET") {
        return await handleModDbPopgroup(request, env, decodeURIComponent(moddbPopgroupRoute[1]));
      }
      if (request.method === "GET" && url.pathname === "/api/moddb/popcycle/zones") {
        return await handleModDbPopcycleZones(request, env);
      }
      if (request.method === "GET" && url.pathname === "/api/moddb/popcycle/resolve") {
        return await handleModDbPopcycleResolve(request, env);
      }
      if (request.method === "GET" && url.pathname === "/api/moddb/popcycle") {
        return await handleModDbPopcycle(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/link-preview") {
        return await handleLinkPreview(request, env);
      }

      if (url.pathname === "/api/catalog-tags") {
        return await handleCatalogTags(request, env);
      }

      // ── Community Forum ──────────────────────────────────────────
      if (url.pathname === "/api/community/threads" && request.method === "GET") {
        return await handleCommunityListThreads(request, env, url);
      }
      if (url.pathname === "/api/community/threads" && request.method === "POST") {
        return await handleCommunityCreateThread(request, env);
      }
      if (/^\/api\/community\/threads\/\d+$/.test(url.pathname) && request.method === "GET") {
        return await handleCommunityGetThread(request, env, url);
      }
      if (/^\/api\/community\/threads\/\d+\/view$/.test(url.pathname) && request.method === "POST") {
        return await handleCommunityIncrementView(request, env, url);
      }
      if (/^\/api\/community\/threads\/\d+\/posts$/.test(url.pathname) && request.method === "POST") {
        return await handleCommunityCreatePost(request, env, url);
      }
      if (url.pathname === "/api/community/upload" && request.method === "POST") {
        return await handleCommunityUpload(request, env);
      }

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




// ================================================================
//  MOD FILE DATABASE — parsers, importers, and query handlers
//  Migration: 010_mod_file_tables.sql
// ================================================================

// ── Tiny XML helpers (no DOM required in Workers) ──────────────────

/** Extract first text value between <tag>…</tag> */
function xmlText(block, tag) {
  const m = block.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
  return m ? m[1].trim() : null;
}

/** Extract first value="…" attribute from <tag value="…"/> or <tag value="…"> */
function xmlAttr(block, tag, attr = 'value') {
  const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 's'));
  return m ? m[1].trim() : null;
}

/** Split outer XML into all top-level <tag>…</tag> blocks, depth-aware so a
 *  block containing nested tags of the SAME name (e.g. a Popgroups <Item> that
 *  itself contains <models><Item>...</Item></models>) is matched to its real
 *  closing tag instead of the first nested closing tag found. */
function xmlBlocks(xml, tag) {
  const results = [];
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let pos = 0;
  while (pos < xml.length) {
    const start = xml.indexOf(open, pos);
    if (start === -1) break;
    let depth = 1;
    let cursor = start + open.length;
    while (depth > 0) {
      const nextOpen = xml.indexOf(open, cursor);
      const nextClose = xml.indexOf(close, cursor);
      if (nextClose === -1) { depth = -1; break; } // unmatched, bail out
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        cursor = nextOpen + open.length;
      } else {
        depth--;
        cursor = nextClose + close.length;
      }
    }
    if (depth === -1) break;
    results.push(xml.slice(start, cursor));
    pos = cursor;
  }
  return results;
}

/** Extract text from the section between <outerTag>…</outerTag> */
function xmlSection(xml, outerTag) {
  const open = `<${outerTag}>`;
  const close = `</${outerTag}>`;
  const s = xml.indexOf(open);
  const e = xml.indexOf(close);
  if (s === -1 || e === -1) return '';
  return xml.slice(s + open.length, e);
}

// ── vehicles.meta parser ──────────────────────────────────────────

function parseVehiclesMeta(xmlText) {
  // Get <InitDatas> section first
  const initSection = xmlSection(xmlText, 'InitDatas') || xmlText;
  const itemBlocks = xmlBlocks(initSection, 'Item');
  const results = [];

  for (const block of itemBlocks) {
    const modelName = xmlText_(block, 'modelName');
    if (!modelName) continue;
    results.push({
      model_name:                  modelName,
      handling_id:                 xmlText_(block, 'handlingId'),
      game_name:                   xmlText_(block, 'gameName'),
      make_name:                   xmlText_(block, 'vehicleMakeName'),
      audio_name_hash:             xmlText_(block, 'audioNameHash'),
      layout:                      xmlText_(block, 'layout'),
      vehicle_type:                xmlText_(block, 'type'),
      vehicle_class:               xmlText_(block, 'vehicleClass'),
      wheel_type:                  xmlText_(block, 'wheelType'),
      frequency:                   toInt(xmlAttr(block, 'frequency')),
      max_num:                     toInt(xmlAttr(block, 'maxNum')),
      flags:                       xmlText_(block, 'flags'),
      swankness:                   xmlText_(block, 'swankness'),
      max_num_same_color:          toInt(xmlAttr(block, 'maxNumOfSameColor')),
      identical_model_spawn_dist:  toFloat(xmlAttr(block, 'identicalModelSpawnDistance')),
      default_body_health:         toFloat(xmlAttr(block, 'defaultBodyHealth')),
      raw_xml:                     block,
    });
  }
  return results;
}

// shadow helper — xmlText is already taken as a param name in this scope, alias:
function xmlText_(block, tag) { return xmlText(block, tag); }
function toInt(v) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }

// ── handling.meta parser ──────────────────────────────────────────

function parseHandlingMeta(xmlText) {
  const handlingSection = xmlSection(xmlText, 'HandlingData') || xmlText;
  // Items have type attribute: <Item type="CHandlingData">
  const results = [];
  const itemRe = /<Item\s+type="CHandlingData">([\s\S]*?)<\/Item>/g;
  let m;
  while ((m = itemRe.exec(handlingSection)) !== null) {
    const block = m[1];
    const handlingName = xmlText_(block, 'handlingName');
    if (!handlingName) continue;
    results.push({
      handling_name:               handlingName,
      mass:                        toFloat(xmlAttr(block, 'fMass')),
      initial_drag_coeff:          toFloat(xmlAttr(block, 'fInitialDragCoeff')),
      percent_submerged:           toFloat(xmlAttr(block, 'fPercentSubmerged')),
      drive_bias_front:            toFloat(xmlAttr(block, 'fDriveBiasFront')),
      initial_drive_gears:         toInt(xmlAttr(block, 'nInitialDriveGears')),
      initial_drive_force:         toFloat(xmlAttr(block, 'fInitialDriveForce')),
      drive_inertia:               toFloat(xmlAttr(block, 'fDriveInertia')),
      initial_drive_max_flat_vel:  toFloat(xmlAttr(block, 'fInitialDriveMaxFlatVel')),
      brake_force:                 toFloat(xmlAttr(block, 'fBrakeForce')),
      brake_bias_front:            toFloat(xmlAttr(block, 'fBrakeBiasFront')),
      hand_brake_force:            toFloat(xmlAttr(block, 'fHandBrakeForce')),
      steering_lock:               toFloat(xmlAttr(block, 'fSteeringLock')),
      traction_curve_max:          toFloat(xmlAttr(block, 'fTractionCurveMax')),
      traction_curve_min:          toFloat(xmlAttr(block, 'fTractionCurveMin')),
      traction_curve_lateral:      toFloat(xmlAttr(block, 'fTractionCurveLateral')),
      traction_bias_front:         toFloat(xmlAttr(block, 'fTractionBiasFront')),
      traction_loss_mult:          toFloat(xmlAttr(block, 'fTractionLossMult')),
      suspension_force:            toFloat(xmlAttr(block, 'fSuspensionForce')),
      suspension_comp_damp:        toFloat(xmlAttr(block, 'fSuspensionCompDamp')),
      suspension_rebound_damp:     toFloat(xmlAttr(block, 'fSuspensionReboundDamp')),
      suspension_upper_limit:      toFloat(xmlAttr(block, 'fSuspensionUpperLimit')),
      suspension_lower_limit:      toFloat(xmlAttr(block, 'fSuspensionLowerLimit')),
      suspension_raise:            toFloat(xmlAttr(block, 'fSuspensionRaise')),
      suspension_bias_front:       toFloat(xmlAttr(block, 'fSuspensionBiasFront')),
      anti_roll_bar_force:         toFloat(xmlAttr(block, 'fAntiRollBarForce')),
      collision_damage_mult:       toFloat(xmlAttr(block, 'fCollisionDamageMult')),
      weapon_damage_mult:          toFloat(xmlAttr(block, 'fWeaponDamageMult')),
      deformation_damage_mult:     toFloat(xmlAttr(block, 'fDeformationDamageMult')),
      engine_damage_mult:          toFloat(xmlAttr(block, 'fEngineDamageMult')),
      petrol_tank_volume:          toFloat(xmlAttr(block, 'fPetrolTankVolume')),
      monetary_value:              toInt(xmlAttr(block, 'nMonetaryValue')),
      model_flags:                 xmlText_(block, 'strModelFlags'),
      handling_flags:              xmlText_(block, 'strHandlingFlags'),
      damage_flags:                xmlText_(block, 'strDamageFlags'),
      ai_handling:                 xmlText_(block, 'AIHandling'),
      raw_xml:                     m[0],
    });
  }
  return results;
}

// ── popgroups.ymt.xml parser ──────────────────────────────────────

function parsePopgroups(xmlText) {
  const pedSection = xmlSection(xmlText, 'pedGroups');
  const vehSection = xmlSection(xmlText, 'vehGroups');

  function parseSection(section, groupType) {
    const rows = [];
    const groupBlocks = xmlBlocks(section, 'Item');
    for (const groupBlock of groupBlocks) {
      const groupName = xmlText_(groupBlock, 'Name');
      if (!groupName) continue;
      const flags = xmlText_(groupBlock, 'flags') || '';
      const modelsSection = xmlSection(groupBlock, 'models');
      // Within models, each <Item> has a <Name>
      const modelBlocks = xmlBlocks(modelsSection, 'Item');
      modelBlocks.forEach((mb, idx) => {
        const modelName = xmlText_(mb, 'Name');
        if (modelName) {
          rows.push({ group_type: groupType, group_name: groupName, model_name: modelName, sort_order: idx, flags });
        }
      });
    }
    return rows;
  }

  return [
    ...parseSection(pedSection, 'ped'),
    ...parseSection(vehSection, 'veh'),
  ];
}

// ── popcycle.dat parser ───────────────────────────────────────────

function parsePopcycle(text) {
  const rows = [];
  // Split into POP_SCHEDULE blocks
  const blocks = text.split(/POP_SCHEDULE:\s*/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    // First non-blank line is the zone name
    const lines = block.split(/\r?\n/).filter(l => !l.match(/^\s*(\/\/|$)/));
    if (lines.length < 1) continue;
    const zone = lines[0].trim();
    if (!zone) continue;
    // Collect data lines (non-comment, non-empty, before END_POP_SCHEDULE)
    const dataLines = [];
    let ended = false;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].match(/END_POP_SCHEDULE/)) { ended = true; break; }
      if (lines[i].trim()) dataLines.push(lines[i]);
    }
    // First 12 = weekday, next 12 = weekend
    for (let pass = 0; pass < 2; pass++) {
      const dayType = pass === 0 ? 'weekday' : 'weekend';
      for (let slot = 0; slot < 12; slot++) {
        const line = dataLines[pass * 12 + slot];
        if (!line) continue;
        const row = parsePopcycleLine(zone, dayType, slot, line);
        if (row) rows.push(row);
      }
    }
  }
  return rows;
}

function parsePopcycleLine(zone, dayType, hourSlot, line) {
  // The line has 10 leading numbers then "peds ... cars ..."
  const tokens = line.trim().split(/\s+/);
  let idx = 0;
  const nums = [];
  // Consume numeric tokens until we hit 'peds' or 'cars'
  while (idx < tokens.length && !isNaN(Number(tokens[idx]))) {
    nums.push(Number(tokens[idx++]));
  }
  if (nums.length < 3) return null; // Not a valid data line
  const pedGroups = [];
  const vehGroups = [];
  let mode = null;
  while (idx < tokens.length) {
    const t = tokens[idx++];
    if (t === 'peds') { mode = 'peds'; continue; }
    if (t === 'cars') { mode = 'veh'; continue; }
    // t is group name, next token is weight
    if (mode && idx < tokens.length && !isNaN(Number(tokens[idx]))) {
      const weight = Number(tokens[idx++]);
      if (mode === 'peds') pedGroups.push({ group: t, weight });
      else                 vehGroups.push({ group: t, weight });
    }
  }
  return {
    zone,
    day_type:                  dayType,
    hour_slot:                 hourSlot,
    max_peds:                  nums[0]  ?? null,
    max_scenario_peds:         nums[1]  ?? null,
    max_cars:                  nums[2]  ?? null,
    max_parked_cars:           nums[3]  ?? null,
    max_low_parked_cars:       nums[4]  ?? null,
    pct_cop_cars:              nums[5]  ?? null,
    pct_cop_peds:              nums[6]  ?? null,
    max_scen_ped_models:       nums[7]  ?? null,
    max_scen_veh_models:       nums[8]  ?? null,
    max_pre_assigned_parked:   nums[9]  ?? null,
    ped_groups:                JSON.stringify(pedGroups),
    veh_groups:                JSON.stringify(vehGroups),
  };
}

// ── D1 batch insert helper ────────────────────────────────────────

async function batchInsert(db, table, rows, conflictCols = []) {
  if (!rows.length) return { inserted: 0, updated: 0 };
  const cols = Object.keys(rows[0]);
  const CHUNK = 50; // D1 batch limit per statement is generous but keep chunks manageable
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const stmts = chunk.map(row => {
      const values = cols.map(c => row[c] ?? null);
      const placeholders = cols.map(() => '?').join(', ');
      const setCols = cols.filter(c => !conflictCols.includes(c));
      const setClause = setCols.map(c => `${c} = excluded.${c}`).join(', ');
      const sql = conflictCols.length
        ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
           ON CONFLICT(${conflictCols.join(', ')}) DO UPDATE SET ${setClause}`
        : `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
      return db.prepare(sql).bind(...values);
    });
    const results = await db.batch(stmts);
    inserted += results.reduce((s, r) => s + (r.meta?.changes ?? 0), 0);
  }
  return { inserted };
}

// ── Import handlers ───────────────────────────────────────────────

async function handleImportVehiclesMeta(request, env) {
  const { xml, packId = 'default', sourceFile = '' } = await request.json();
  if (!xml) return jsonResponse({ ok: false, error: 'Missing xml field' }, 400);
  const parsed = parseVehiclesMeta(xml);
  if (!parsed.length) return jsonResponse({ ok: false, error: 'No <Item> entries found in XML' }, 400);
  const rows = parsed.map(r => ({ pack_id: packId, source_file: sourceFile, ...r }));
  const { inserted } = await batchInsert(
    env.DB, 'vehicle_meta_entries', rows,
    ['pack_id', 'model_name']
  );
  return jsonResponse({ ok: true, parsed: parsed.length, inserted });
}

async function handleImportHandlingMeta(request, env) {
  const { xml, packId = 'default', sourceFile = '' } = await request.json();
  if (!xml) return jsonResponse({ ok: false, error: 'Missing xml field' }, 400);
  const parsed = parseHandlingMeta(xml);
  if (!parsed.length) return jsonResponse({ ok: false, error: 'No handling entries found in XML' }, 400);
  const rows = parsed.map(r => ({ pack_id: packId, source_file: sourceFile, ...r }));
  const { inserted } = await batchInsert(
    env.DB, 'handling_meta_entries', rows,
    ['pack_id', 'handling_name']
  );
  return jsonResponse({ ok: true, parsed: parsed.length, inserted });
}

async function handleImportPopgroups(request, env) {
  const { xml, packId = 'default', sourceFile = '' } = await request.json();
  if (!xml) return jsonResponse({ ok: false, error: 'Missing xml field' }, 400);
  // Delete existing for this pack, then re-insert (replace-all semantics)
  await env.DB.prepare('DELETE FROM popgroup_members WHERE pack_id = ?').bind(packId).run();
  const parsed = parsePopgroups(xml);
  if (!parsed.length) return jsonResponse({ ok: false, error: 'No popgroup members found in XML' }, 400);
  const rows = parsed.map(r => ({ pack_id: packId, source_file: sourceFile, ...r }));
  const { inserted } = await batchInsert(env.DB, 'popgroup_members', rows);
  return jsonResponse({ ok: true, parsed: parsed.length, inserted });
}

async function handleImportPopcycle(request, env) {
  const { text, packId = 'default', sourceFile = '' } = await request.json();
  if (!text) return jsonResponse({ ok: false, error: 'Missing text field' }, 400);
  const parsed = parsePopcycle(text);
  if (!parsed.length) return jsonResponse({ ok: false, error: 'No popcycle entries parsed' }, 400);
  const rows = parsed.map(r => ({ pack_id: packId, source_file: sourceFile, ...r }));
  const { inserted } = await batchInsert(
    env.DB, 'popcycle_slots', rows,
    ['pack_id', 'zone', 'day_type', 'hour_slot']
  );
  return jsonResponse({ ok: true, parsed: parsed.length, inserted });
}

// ── Query handlers — /api/moddb/* ────────────────────────────────

async function handleModDbVehicleList(request, env) {
  const url = new URL(request.url);
  const packId = url.searchParams.get('pack') || 'default';
  const cls    = url.searchParams.get('class');
  const q      = url.searchParams.get('q');
  const limit  = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  let sql = 'SELECT * FROM vehicle_meta_entries WHERE pack_id = ?';
  const params = [packId];
  if (cls) { sql += ' AND vehicle_class = ?'; params.push(cls); }
  if (q)   { sql += ' AND (model_name LIKE ? OR make_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY model_name LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return jsonResponse({ ok: true, vehicles: results, count: results.length });
}

async function handleModDbVehicle(request, env, modelName) {
  const url = new URL(request.url);
  const packId = url.searchParams.get('pack') || 'default';
  const row = await env.DB.prepare(
    'SELECT * FROM vehicle_meta_entries WHERE pack_id = ? AND model_name = ?'
  ).bind(packId, modelName).first();
  if (!row) return jsonResponse({ ok: false, error: 'Vehicle not found' }, 404);
  return jsonResponse({ ok: true, vehicle: row });
}

async function handleModDbHandling(request, env, handlingName) {
  const url = new URL(request.url);
  const packId = url.searchParams.get('pack') || 'default';
  const row = await env.DB.prepare(
    'SELECT * FROM handling_meta_entries WHERE pack_id = ? AND handling_name = ?'
  ).bind(packId, handlingName).first();
  if (!row) return jsonResponse({ ok: false, error: 'Handling entry not found' }, 404);
  return jsonResponse({ ok: true, handling: row });
}

async function handleModDbPopgroupList(request, env) {
  const url = new URL(request.url);
  const packId    = url.searchParams.get('pack') || 'default';
  const groupType = url.searchParams.get('type') || 'veh';
  const { results } = await env.DB.prepare(
    'SELECT DISTINCT group_name, flags FROM popgroup_members WHERE pack_id = ? AND group_type = ? ORDER BY group_name'
  ).bind(packId, groupType).all();
  return jsonResponse({ ok: true, groups: results });
}

// =====================================================
// PACK BUILDER HANDLERS (premium)
// /api/builder/packs  — pack projects
// /api/builder/vehicle-meta — per-vehicle meta files
// =====================================================

function requirePremium(auth) {
  if (!auth) return jsonResponse({ ok: false, error: "Authentication required" }, 401);
  const ok = ["premium", "admin"].includes(auth.user.plan) ||
             ["admin", "owner", "moderator"].includes(auth.user.role);
  if (!ok) return jsonResponse({ ok: false, error: "Premium subscription required" }, 403);
  return null;
}

// Admin/owner-only gate. Distinct from checkLibraryWriteAuthorization, which
// only checks "is anyone logged in" and is intentionally used for free-account
// level library contributions (importing/patching a vehicle record). This gate
// is for actions that affect other users' accounts or the whole site: user
// management, workspace administration, admin summaries, and deleting shared
// library records outright.
async function handleAdminUserDelete(request, env, userId) {
  const { auth, gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const existing = await env.DB.prepare(
    "SELECT id, email, role FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!existing) {
    return jsonResponse({ ok: false, error: "User not found" }, 404);
  }

  // Prevent deleting the last owner/admin to avoid lockout
  if (["admin", "owner"].includes(existing.role)) {
    const adminCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE role IN ('admin','owner') AND status = 'active'"
    ).first();
    if ((adminCount?.count ?? 0) <= 1) {
      return jsonResponse(
        { ok: false, error: "Cannot delete the last admin/owner account" },
        400
      );
    }
  }

  // Delete associated sessions first (FK safety)
  await env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(userId).run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

  await writeAdminAuditLog(env, {
    action: "admin.user.delete",
    actorId: auth?.user?.id || null,
    actorLabel: auth?.user?.email || "admin-token",
    targetType: "user",
    targetId: userId,
    details: { deletedEmail: existing.email, deletedRole: existing.role }
  });

  return jsonResponse({ ok: true, deletedId: userId, email: existing.email });
}

async function handleAdminUserSessions(request, env, userId) {
  const { gate } = await requireAdminSession(request, env);
  if (gate) return gate;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 25), 100);

  const [sessionsResult, projectsResult] = await Promise.all([
    env.DB.prepare(
      "SELECT id, created_at, last_seen_at, expires_at " +
      "FROM user_sessions WHERE user_id = ? " +
      "ORDER BY created_at DESC LIMIT ?"
    ).bind(userId, limit).all(),
    env.DB.prepare(
      "SELECT COUNT(*) AS count FROM saved_projects WHERE owner_user_id = ? AND status != 'deleted'"
    ).bind(userId).first().catch(() => null)
  ]);

  return jsonResponse({
    ok: true,
    sessions: (sessionsResult.results || []).map(s => ({
      id: s.id,
      createdAt: s.created_at,
      lastSeenAt: s.last_seen_at,
      expiresAt: s.expires_at
    })),
    savedProjects: projectsResult?.count ?? null
  });
}

async function requireAdminSession(request, env) {
  // Accept the library write token as a temporary admin bypass so the admin
  // panel keeps working while the site transitions to OAuth role-based access.
  const suppliedToken = request.headers.get("x-library-token") || "";
  if (env.LIBRARY_WRITE_TOKEN && suppliedToken === env.LIBRARY_WRITE_TOKEN) {
    return { auth: { user: { role: "admin", email: "admin-token" } }, gate: null };
  }

  const auth = await getCurrentAuthSession(request, env);
  if (!auth) return { auth: null, gate: jsonResponse({ ok: false, error: "Authentication required" }, 401) };
  const ok = ["admin", "owner"].includes(auth.user.role);
  if (!ok) return { auth, gate: jsonResponse({ ok: false, error: "Admin access required" }, 403) };
  return { auth, gate: null };
}

function createPackId() {
  return "pack:" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + ":" + Math.random().toString(36).slice(2));
}

function slugifyDlcName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
}

function validateDlcName(dlcName) {
  return /^[a-z0-9_]{1,40}$/.test(dlcName);
}

// GET /api/builder/packs
async function handleBuilderPackList(request, env) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const { results } = await env.DB.prepare(`
    SELECT p.id, p.name, p.dlc_name, p.description, p.version, p.author_name,
           p.status, p.created_at, p.updated_at,
           COUNT(pv.id) AS vehicle_count
    FROM packs p
    LEFT JOIN pack_vehicles pv ON pv.pack_id = p.id
    WHERE p.owner_user_id = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).bind(auth.user.id).all();

  return jsonResponse({ ok: true, packs: results });
}

// POST /api/builder/packs
async function handleBuilderPackCreate(request, env) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, 400); }

  const name = String(body.name || "").trim();
  if (!name) return jsonResponse({ ok: false, error: "Pack name is required" }, 400);

  const dlcName = body.dlc_name ? String(body.dlc_name).trim() : slugifyDlcName(name);
  if (!validateDlcName(dlcName)) {
    return jsonResponse({ ok: false, error: "DLC name must be lowercase letters, numbers, and underscores only (max 40 chars)" }, 400);
  }

  // Check uniqueness for this user
  const existing = await env.DB.prepare(
    "SELECT id FROM packs WHERE owner_user_id = ? AND dlc_name = ?"
  ).bind(auth.user.id, dlcName).first();
  if (existing) return jsonResponse({ ok: false, error: `You already have a pack with DLC name "${dlcName}"` }, 409);

  const id = createPackId();
  await env.DB.prepare(`
    INSERT INTO packs (id, owner_user_id, name, dlc_name, description, version, author_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, auth.user.id, name, dlcName,
    String(body.description || "").trim() || null,
    String(body.version || "1.0").trim(),
    String(body.author_name || "").trim() || null
  ).run();

  const pack = await env.DB.prepare("SELECT * FROM packs WHERE id = ?").bind(id).first();
  return jsonResponse({ ok: true, pack }, 201);
}

// GET /api/builder/packs/:id
async function handleBuilderPackGet(request, env, packId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT * FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  // Vehicles with meta status summary
  const { results: vehicles } = await env.DB.prepare(`
    SELECT
      pv.id, pv.vehicle_id, pv.sort_order,
      pv.has_yft, pv.has_yft_hi, pv.has_ytd, pv.added_at,
      v.make_name, v.display_name, v.vehicle_class AS category,
      (SELECT COUNT(*) FROM vehicle_meta_files vmf
       WHERE vmf.vehicle_id = pv.vehicle_id AND vmf.owner_user_id = ? AND vmf.status != 'error') AS meta_count,
      (SELECT GROUP_CONCAT(vmf2.meta_type)
       FROM vehicle_meta_files vmf2
       WHERE vmf2.vehicle_id = pv.vehicle_id AND vmf2.owner_user_id = ? AND vmf2.status != 'error') AS meta_types
    FROM pack_vehicles pv
    LEFT JOIN vehicles v ON v.model_name = pv.vehicle_id COLLATE NOCASE
    WHERE pv.pack_id = ?
    ORDER BY pv.sort_order, pv.added_at
  `).bind(auth.user.id, auth.user.id, packId).all();

  return jsonResponse({ ok: true, pack, vehicles });
}

// PUT /api/builder/packs/:id
async function handleBuilderPackUpdate(request, env, packId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT * FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, 400); }

  const name        = body.name        !== undefined ? String(body.name).trim()        : pack.name;
  const description = body.description !== undefined ? String(body.description).trim() || null : pack.description;
  const version     = body.version     !== undefined ? String(body.version).trim()     : pack.version;
  const author_name = body.author_name !== undefined ? String(body.author_name).trim() || null : pack.author_name;
  const status      = body.status      !== undefined ? String(body.status).trim()      : pack.status;

  if (!name) return jsonResponse({ ok: false, error: "Pack name cannot be empty" }, 400);
  if (!["draft", "ready", "exported"].includes(status)) {
    return jsonResponse({ ok: false, error: "Invalid status" }, 400);
  }

  // dlc_name is immutable after creation to avoid breaking installed packs
  await env.DB.prepare(`
    UPDATE packs SET name=?, description=?, version=?, author_name=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(name, description, version, author_name, status, packId).run();

  const updated = await env.DB.prepare("SELECT * FROM packs WHERE id = ?").bind(packId).first();
  return jsonResponse({ ok: true, pack: updated });
}

// DELETE /api/builder/packs/:id
async function handleBuilderPackDelete(request, env, packId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT id FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  // Cascade deletes pack_vehicles via FK
  await env.DB.prepare("DELETE FROM packs WHERE id = ?").bind(packId).run();
  return jsonResponse({ ok: true });
}

// GET /api/builder/packs/:id/vehicles
async function handleBuilderPackVehicleList(request, env, packId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT id FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  const { results } = await env.DB.prepare(`
    SELECT pv.*, v.make_name, v.display_name, v.category
    FROM pack_vehicles pv
    LEFT JOIN vehicles v ON v.model_name = pv.vehicle_id COLLATE NOCASE
    WHERE pv.pack_id = ?
    ORDER BY pv.sort_order, pv.added_at
  `).bind(packId).all();

  return jsonResponse({ ok: true, vehicles: results });
}

// POST /api/builder/packs/:id/vehicles
async function handleBuilderPackVehicleAdd(request, env, packId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT id FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, 400); }

  const vehicleId = String(body.vehicle_id || "").toLowerCase().trim();
  if (!vehicleId) return jsonResponse({ ok: false, error: "vehicle_id is required" }, 400);

  // Get current max sort_order
  const maxRow = await env.DB.prepare(
    "SELECT MAX(sort_order) AS max_order FROM pack_vehicles WHERE pack_id = ?"
  ).bind(packId).first();
  const sortOrder = (maxRow?.max_order ?? -1) + 1;

  try {
    await env.DB.prepare(
      "INSERT INTO pack_vehicles (pack_id, vehicle_id, sort_order) VALUES (?, ?, ?)"
    ).bind(packId, vehicleId, sortOrder).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) {
      return jsonResponse({ ok: false, error: `${vehicleId} is already in this pack` }, 409);
    }
    throw e;
  }

  // Bump pack updated_at
  await env.DB.prepare("UPDATE packs SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(packId).run();

  return jsonResponse({ ok: true, vehicle_id: vehicleId, sort_order: sortOrder }, 201);
}

// PATCH /api/builder/packs/:id/vehicles/:vehicleId
async function handleBuilderPackVehiclePatch(request, env, packId, vehicleId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT id FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, 400); }

  const fields = [];
  const vals   = [];

  if (body.has_yft    !== undefined) { fields.push("has_yft = ?");    vals.push(body.has_yft    ? 1 : 0); }
  if (body.has_yft_hi !== undefined) { fields.push("has_yft_hi = ?"); vals.push(body.has_yft_hi ? 1 : 0); }
  if (body.has_ytd    !== undefined) { fields.push("has_ytd = ?");    vals.push(body.has_ytd    ? 1 : 0); }
  if (body.sort_order !== undefined) { fields.push("sort_order = ?"); vals.push(Number(body.sort_order)); }

  if (!fields.length) return jsonResponse({ ok: false, error: "No fields to update" }, 400);

  vals.push(packId, vehicleId.toLowerCase());
  await env.DB.prepare(
    `UPDATE pack_vehicles SET ${fields.join(", ")} WHERE pack_id = ? AND vehicle_id = ? COLLATE NOCASE`
  ).bind(...vals).run();

  return jsonResponse({ ok: true });
}

// DELETE /api/builder/packs/:id/vehicles/:vehicleId
async function handleBuilderPackVehicleRemove(request, env, packId, vehicleId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const pack = await env.DB.prepare(
    "SELECT id FROM packs WHERE id = ? AND owner_user_id = ?"
  ).bind(packId, auth.user.id).first();
  if (!pack) return jsonResponse({ ok: false, error: "Pack not found" }, 404);

  await env.DB.prepare(
    "DELETE FROM pack_vehicles WHERE pack_id = ? AND vehicle_id = ? COLLATE NOCASE"
  ).bind(packId, vehicleId).run();
  await env.DB.prepare("UPDATE packs SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(packId).run();

  return jsonResponse({ ok: true });
}

// POST /api/builder/vehicle-meta
// Body: { vehicle_id, meta_type, raw_xml }
async function handleBuilderMetaUpload(request, env) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, 400); }

  const vehicleId = String(body.vehicle_id || "").toLowerCase().trim();
  const metaType  = String(body.meta_type  || "").toLowerCase().trim();
  const rawXml    = String(body.raw_xml    || "").trim();

  if (!vehicleId) return jsonResponse({ ok: false, error: "vehicle_id required" }, 400);
  if (!["vehicles", "handling", "carcols", "carvariations"].includes(metaType)) {
    return jsonResponse({ ok: false, error: "meta_type must be vehicles, handling, carcols, or carvariations" }, 400);
  }
  if (!rawXml) return jsonResponse({ ok: false, error: "raw_xml required" }, 400);

  const { parsed, kitName, warnings, status } = parseAndValidateMetaXml(rawXml, metaType, vehicleId);

  await env.DB.prepare(`
    INSERT INTO vehicle_meta_files (vehicle_id, owner_user_id, meta_type, raw_xml, parsed_json, kit_name, status, warnings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vehicle_id, owner_user_id, meta_type)
    DO UPDATE SET raw_xml=excluded.raw_xml, parsed_json=excluded.parsed_json,
                  kit_name=excluded.kit_name, status=excluded.status, warnings=excluded.warnings,
                  updated_at=CURRENT_TIMESTAMP
  `).bind(
    vehicleId, auth.user.id, metaType, rawXml,
    JSON.stringify(parsed),
    kitName || null,
    status,
    warnings.length ? JSON.stringify(warnings) : null
  ).run();

  return jsonResponse({ ok: true, vehicle_id: vehicleId, meta_type: metaType, status, warnings, parsed });
}

// GET /api/builder/vehicle-meta/:vehicleId
async function handleBuilderMetaGet(request, env, vehicleId) {
  const auth = await getCurrentAuthSession(request, env);
  const gate = requirePremium(auth);
  if (gate) return gate;

  const { results } = await env.DB.prepare(`
    SELECT meta_type, raw_xml, parsed_json, kit_name, status, warnings, uploaded_at, updated_at
    FROM vehicle_meta_files
    WHERE vehicle_id = ? COLLATE NOCASE AND owner_user_id = ?
    ORDER BY meta_type
  `).bind(vehicleId, auth.user.id).all();

  const byType = {};
  for (const row of results) {
    byType[row.meta_type] = {
      ...row,
      parsed: row.parsed_json ? JSON.parse(row.parsed_json) : null,
      warnings: row.warnings ? JSON.parse(row.warnings) : []
    };
  }

  return jsonResponse({
    ok: true,
    vehicle_id: vehicleId,
    meta: byType,
    complete: ["vehicles", "handling", "carcols", "carvariations"].every(t => byType[t] && byType[t].status !== "error")
  });
}

// ── /api/catalog-tags ─────────────────────────────────────────────────────────
async function handleCatalogTags(request, env) {
  const auth = await getCurrentAuthSession(request, env);
  if (!auth) {
    return jsonResponse({ ok: false, error: "Login required" }, 401);
  }
  const userId = auth.user.id;

  if (request.method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT vehicle_key, tag FROM catalog_custom_tags
      WHERE user_id = ?
      ORDER BY created_at ASC
    `).bind(userId).all();

    const tags = {};
    for (const row of rows.results) {
      if (!tags[row.vehicle_key]) tags[row.vehicle_key] = [];
      tags[row.vehicle_key].push(row.tag);
    }
    return jsonResponse({ ok: true, tags });
  }

  if (request.method === "POST" || request.method === "DELETE") {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
    }

    const vehicleKey = (body.vehicleKey || "").trim().slice(0, 500);
    const tag        = (body.tag        || "").trim().slice(0, 64);

    if (!vehicleKey || !tag) {
      return jsonResponse({ ok: false, error: "vehicleKey and tag are required" }, 400);
    }

    if (request.method === "DELETE") {
      await env.DB.prepare(`
        DELETE FROM catalog_custom_tags
        WHERE user_id = ? AND vehicle_key = ? AND tag = ?
      `).bind(userId, vehicleKey, tag).run();
      return jsonResponse({ ok: true });
    }

    await env.DB.prepare(`
      INSERT OR IGNORE INTO catalog_custom_tags (user_id, vehicle_key, tag)
      VALUES (?, ?, ?)
    `).bind(userId, vehicleKey, tag).run();
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

// GET /api/link-preview?url=ENCODED_URL
async function handleLinkPreview(request, env) {
  const reqUrl    = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get("url");

  if (!targetUrl) return jsonResponse({ ok: false, error: "url param required" }, 400);

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid URL" }, 400);
  }

  if (!parsed.hostname.endsWith("gta5-mods.com")) {
    return jsonResponse({ ok: false, error: "Only gta5-mods.com URLs are supported" }, 400);
  }

  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  try {
    const cached = await env.DB.prepare(
      "SELECT og_title, og_image, og_description FROM link_preview_cache WHERE url = ? AND cached_at > ?"
    ).bind(targetUrl, sevenDaysAgo).first();

    if (cached) {
      return jsonResponse({ ok: true, title: cached.og_title, image: cached.og_image, description: cached.og_description, cached: true });
    }
  } catch { /* D1 miss is non-fatal */ }

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const html = await resp.text();

    const getMeta = (attr, val) => {
      const re1 = new RegExp(`<meta[^>]+${attr}=["']${val}["'][^>]+content=["']([^"']{1,500})["']`, "i");
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+${attr}=["']${val}["']`, "i");
      const m = html.match(re1) || html.match(re2);
      return m ? m[1].replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c)).trim() : null;
    };

    const title       = getMeta("property", "og:title")       || getMeta("name", "twitter:title")       || null;
    const image       = getMeta("property", "og:image")       || getMeta("name", "twitter:image")       || null;
    const description = getMeta("property", "og:description") || getMeta("name", "twitter:description") || null;

    try {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO link_preview_cache (url, og_title, og_image, og_description, cached_at) VALUES (?, ?, ?, ?, unixepoch())"
      ).bind(targetUrl, title, image, description).run();
    } catch { /* cache write failure is non-fatal */ }

    return jsonResponse({ ok: true, title, image, description, cached: false });

  } catch (e) {
    return jsonResponse({ ok: false, error: e.message || "Fetch failed" }, 502);
  }
}

// ── Meta XML parser/validator ─────────────────────────
function parseAndValidateMetaXml(xml, metaType, vehicleId) {
  const warnings = [];
  let parsed  = {};
  let kitName = null;
  let status  = "ok";

  const getTag  = (src, tag) => { const m = src.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i")); return m ? m[1].trim() : null; };
  const hasTag  = (src, tag) => new RegExp(`<${tag}[\s>]`, "i").test(src);

  try {
    if (metaType === "vehicles") {
      const modelName  = getTag(xml, "modelName");
      const txdName    = getTag(xml, "txdName");
      const handlingId = getTag(xml, "handlingId");
      const vehClass   = getTag(xml, "vehicleClass");
      if (!modelName) { warnings.push("Missing <modelName>"); status = "error"; }
      else if (modelName.toLowerCase() !== vehicleId) warnings.push(`modelName "${modelName}" doesn't match vehicle ID "${vehicleId}"`);
      if (!txdName)    warnings.push("Missing <txdName>");
      if (!handlingId) warnings.push("Missing <handlingId>");
      if (!vehClass)   warnings.push("Missing <vehicleClass>");
      if (!hasTag(xml, "Item")) warnings.push("No <Item> wrapper found — paste the full <Item> block");
      parsed = { modelName, txdName, handlingId, vehicleClass: vehClass };
    }

    else if (metaType === "handling") {
      const handlingName = getTag(xml, "handlingName");
      const fMass        = getTag(xml, "fMass");
      if (!handlingName) { warnings.push("Missing <handlingName>"); status = "error"; }
      const typeMatch    = xml.match(/type="([^"]+)"/);
      const handlingType = typeMatch ? typeMatch[1] : "CHandlingData";
      parsed = { handlingName, fMass, type: handlingType };
    }

    else if (metaType === "carcols") {
      const kitNameMatch = xml.match(/<kitName>([^<]+)<\/kitName>/i);
      kitName = kitNameMatch ? kitNameMatch[1].trim() : null;
      if (!kitName) { warnings.push("No <kitName> found in carcols block"); status = "warning"; }
      else if (kitName === "0_default_modkit") {
        warnings.push("Generic kit name '0_default_modkit' — will be auto-renamed at merge time");
      }
      parsed = { kitName };
    }

    else if (metaType === "carvariations") {
      const modelName    = getTag(xml, "modelName");
      const kitNameMatch = xml.match(/<kitName>([^<]+)<\/kitName>/i);
      kitName = kitNameMatch ? kitNameMatch[1].trim() : null;
      if (!modelName) warnings.push("Missing <modelName> in carvariations block");
      if (!kitName)   warnings.push("No <kitName> reference found in carvariations block");
      parsed = { modelName, kitName };
    }

    if (status === "ok" && warnings.length) status = "warning";

  } catch (e) {
    warnings.push("Parse error: " + String(e));
    status = "error";
  }

  return { parsed, kitName, warnings, status };
}

// ── Community Forum handlers ──────────────────────────────────────────────────
// GET /api/community/threads?page=1&limit=15&category=builds&q=search
async function handleCommunityListThreads(request, env, url) {
  const page     = Math.max(1, parseInt(url.searchParams.get('page')  || '1', 10));
  const limit    = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '15', 10)));
  const offset   = (page - 1) * limit;
  const category = url.searchParams.get('category') || '';
  const q        = (url.searchParams.get('q') || '').trim();

  let where  = '';
  const args = [];

  if (category && category !== 'all') {
    where += ' WHERE t.category = ?';
    args.push(category);
  }
  if (q) {
    where += where ? ' AND' : ' WHERE';
    where += ' (t.title LIKE ? OR t.body LIKE ?)';
    args.push(`%${q}%`, `%${q}%`);
  }

  const countRow = await env.DB
    .prepare(`SELECT COUNT(*) as n FROM community_threads t${where}`)
    .bind(...args).first();
  const total = countRow?.n ?? 0;

  const threads = await env.DB
    .prepare(`
      SELECT t.id, t.category, t.title,
        substr(t.body, 1, 200) AS excerpt,
        t.author_name, t.reply_count, t.view_count, t.file_count,
        t.is_pinned, t.last_reply_at, t.created_at
      FROM community_threads t
      ${where}
      ORDER BY t.is_pinned DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(...args, limit, offset)
    .all();

  // Category counts
  const countRows = await env.DB
    .prepare(`
      SELECT category, COUNT(*) as n FROM community_threads GROUP BY category
      UNION ALL SELECT 'all', COUNT(*) FROM community_threads
    `)
    .all();
  const counts = {};
  for (const r of countRows.results || []) counts[r.category] = r.n;

  return jsonResponse({ ok: true, threads: threads.results || [], total, counts });
}

// GET /api/community/threads/:id
async function handleCommunityGetThread(request, env, url) {
  const id = parseInt(url.pathname.split('/').pop(), 10);

  const thread = await env.DB
    .prepare('SELECT * FROM community_threads WHERE id = ?')
    .bind(id).first();
  if (!thread) return jsonResponse({ ok: false, error: 'Not found' }, 404);

  // Get posts
  const posts = await env.DB
    .prepare('SELECT * FROM community_posts WHERE thread_id = ? ORDER BY created_at ASC')
    .bind(id).all();

  // Get files for thread and all posts
  const files = await env.DB
    .prepare('SELECT * FROM community_files WHERE thread_id = ?')
    .bind(id).all();

  const filesByPost = {};
  const threadFiles = [];
  for (const f of files.results || []) {
    const downloadUrl = `/api/community/files/${f.id}`;
    const enriched = { ...f, url: downloadUrl };
    if (f.post_id) {
      (filesByPost[f.post_id] = filesByPost[f.post_id] || []).push(enriched);
    } else {
      threadFiles.push(enriched);
    }
  }

  const postsWithFiles = (posts.results || []).map(p => ({
    ...p,
    files: filesByPost[p.id] || [],
  }));

  return jsonResponse({
    ok: true,
    thread: { ...thread, files: threadFiles },
    posts: postsWithFiles,
  });
}

// POST /api/community/threads/:id/view  (fire-and-forget view counter)
async function handleCommunityIncrementView(request, env, url) {
  const id = parseInt(url.pathname.split('/')[4], 10);
  await env.DB
    .prepare('UPDATE community_threads SET view_count = view_count + 1 WHERE id = ?')
    .bind(id).run().catch(() => {});
  return jsonResponse({ ok: true });
}

// POST /api/community/threads
async function handleCommunityCreateThread(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ ok: false, error: 'Not authenticated' }, 401);

  const body = await request.json().catch(() => ({}));
  const { category = 'general', title, body: content, files = [] } = body;

  if (!title?.trim())   return jsonResponse({ ok: false, error: 'Title required' }, 400);
  if (!content?.trim()) return jsonResponse({ ok: false, error: 'Body required' }, 400);

  const VALID_CATS = ['builds', 'help', 'tips', 'bugs', 'general'];
  const cat = VALID_CATS.includes(category) ? category : 'general';
  const now = new Date().toISOString();

  const result = await env.DB
    .prepare(`
      INSERT INTO community_threads
        (user_id, author_name, author_plan, category, title, body, file_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      session.userId,
      session.displayName || session.email || 'Unknown',
      session.plan || 'free',
      cat,
      title.trim().slice(0, 120),
      content.trim(),
      files.length,
      now,
      now
    )
    .run();

  const threadId = result.meta?.last_row_id;

  // Associate any pre-uploaded files with this thread
  if (files.length && threadId) {
    for (const f of files) {
      if (f.fileId) {
        await env.DB
          .prepare('UPDATE community_files SET thread_id = ? WHERE id = ? AND user_id = ? AND thread_id IS NULL')
          .bind(threadId, f.fileId, session.userId).run().catch(() => {});
      }
    }
  }

  return jsonResponse({ ok: true, threadId });
}

// POST /api/community/threads/:id/posts
async function handleCommunityCreatePost(request, env, url) {
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ ok: false, error: 'Not authenticated' }, 401);

  const threadId = parseInt(url.pathname.split('/')[4], 10);
  const thread = await env.DB
    .prepare('SELECT id, is_locked FROM community_threads WHERE id = ?')
    .bind(threadId).first();
  if (!thread) return jsonResponse({ ok: false, error: 'Thread not found' }, 404);
  if (thread.is_locked) return jsonResponse({ ok: false, error: 'Thread is locked' }, 403);

  const body = await request.json().catch(() => ({}));
  const { body: content, files = [] } = body;
  if (!content?.trim()) return jsonResponse({ ok: false, error: 'Body required' }, 400);

  const now = new Date().toISOString();

  const result = await env.DB
    .prepare(`
      INSERT INTO community_posts
        (thread_id, user_id, author_name, author_plan, body, file_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      threadId,
      session.userId,
      session.displayName || session.email || 'Unknown',
      session.plan || 'free',
      content.trim(),
      files.length,
      now,
      now
    )
    .run();

  const postId = result.meta?.last_row_id;

  // Update thread reply count + last_reply_at
  await env.DB
    .prepare('UPDATE community_threads SET reply_count = reply_count + 1, last_reply_at = ? WHERE id = ?')
    .bind(now, threadId).run();

  // Associate pre-uploaded files with this post
  if (files.length && postId) {
    for (const f of files) {
      if (f.fileId) {
        await env.DB
          .prepare('UPDATE community_files SET thread_id = ?, post_id = ? WHERE id = ? AND user_id = ? AND post_id IS NULL')
          .bind(threadId, postId, f.fileId, session.userId).run().catch(() => {});
      }
    }
  }

  return jsonResponse({ ok: true, postId });
}

// POST /api/community/upload  (multipart, auth required, stores to R2)
async function handleCommunityUpload(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ ok: false, error: 'Not authenticated' }, 401);

  let formData;
  try { formData = await request.formData(); }
  catch { return jsonResponse({ ok: false, error: 'Invalid multipart body' }, 400); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') return jsonResponse({ ok: false, error: 'No file provided' }, 400);

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_BYTES) return jsonResponse({ ok: false, error: 'File too large (max 10 MB)' }, 413);

  const ALLOWED_EXT = ['.meta', '.dat', '.xml', '.zip', '.txt'];
  const ext = ('.' + file.name.split('.').pop()).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return jsonResponse({ ok: false, error: `File type not allowed. Allowed: ${ALLOWED_EXT.join(', ')}` }, 400);
  }

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 120);
  const r2Key = `community/${session.userId}/${Date.now()}_${safeFilename}`;
  const now   = new Date().toISOString();

  await env.VEHICLE_IMAGES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
    customMetadata: { originalName: file.name, uploaderUserId: session.userId },
  });

  const result = await env.DB
    .prepare(`
      INSERT INTO community_files (user_id, filename, r2_key, file_size, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(session.userId, safeFilename, r2Key, file.size, now)
    .run();

  const fileId = result.meta?.last_row_id;
  return jsonResponse({ ok: true, fileId, filename: safeFilename, size: file.size });
}

// Helper — shared auth check reusing existing session infrastructure
async function requireAuth(request, env) {
  // Reuse the existing auth pattern from the worker
  try {
    const cookieHeader = request.headers.get('Cookie') || '';
    const sessionMatch = cookieHeader.match(/session_token=([^;]+)/);
    if (!sessionMatch) return null;
    const token = sessionMatch[1];

    const row = await env.DB
      .prepare(`
        SELECT u.id, u.email, u.display_name, u.role, u.plan
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `)
      .bind(token).first();

    if (!row) return null;

    return {
      userId:      String(row.id),
      email:       row.email || '',
      displayName: row.display_name || row.email || '',
      role:        row.role  || '',
      plan:        row.plan  || 'free',
    };
  } catch {
    return null;
  }
}
