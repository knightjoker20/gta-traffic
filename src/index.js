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
async function handleLibraryV2Import(request, env) {
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

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

async function handlePackImport(request, env) {
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

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

  if (!vehicle) {
    return jsonResponse(
      {
        ok: false,
        error:
          "The requested vehicle does not exist in the database"
      },
      404
    );
  }

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
    vehicle.model_name;

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
function checkLibraryWriteAuthorization(request, env) {
  if (!env.LIBRARY_WRITE_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error:
          "LIBRARY_WRITE_TOKEN has not been configured for this Worker"
      },
      503
    );
  }

  const suppliedToken =
    request.headers.get("x-library-token") || "";

  if (suppliedToken !== env.LIBRARY_WRITE_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error: "Unauthorized library update"
      },
      401
    );
  }

  return null;
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
    checkLibraryWriteAuthorization(request, env);

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

    tags: {
      column: "tags_json",
      convert: tagsForDatabase
    },

    notes: {
      column: "notes",
      convert: optionalText
    },

    installed: {
      column: "installed",
      convert: booleanInteger
    },

    favorite: {
      column: "favorite",
      convert: booleanInteger
    }
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
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

  const [
    users,
    workspaces,
    packs,
    vehicleAssignments,
    images,
    importJobs
  ] = await Promise.all([
    countAdminTableRows(env, "users"),
    countAdminTableRows(env, "workspaces"),
    countAdminTableRows(env, "pack_records"),
    countAdminTableRows(env, "vehicle_pack_memberships"),
    countAdminTableRows(env, "media_assets"),
    countAdminTableRows(env, "import_jobs")
  ]);

  return jsonResponse({
    ok: true,
    summary: {
      users,
      workspaces,
      packs,
      vehicleAssignments,
      images,
      importJobs,
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
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

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
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
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

  return jsonResponse(
    {
      ok: true,
      user: normalizeAdminUserRow(row)
    },
    201
  );
}


async function handleAdminUserUpdate(request, env, userId) {
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

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
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

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
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
  }

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
  const authorizationError =
    checkLibraryWriteAuthorization(request, env);

  if (authorizationError) {
    return authorizationError;
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
  request.method === "POST" &&
  url.pathname === "/api/packs/import"
) {
  return await handlePackImport(request, env);
}

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
