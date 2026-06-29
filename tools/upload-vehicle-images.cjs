const fs = require("fs");
const path = require("path");

const uploadFolder = process.argv[2] || "vehicle-image-upload";
const siteBaseUrl = process.argv[3] || "https://gta-traffic.com";
const token = process.env.IMAGE_UPLOAD_TOKEN;

const allowedExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function normalizeModelName(fileName) {
  return path.basename(fileName, path.extname(fileName)).trim();
}

async function uploadImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = allowedExtensions.get(extension);

  if (!contentType) {
    return {
      ok: false,
      skipped: true,
      file: filePath,
      message: "Unsupported file type"
    };
  }

  const fileName = path.basename(filePath);
  const modelName = normalizeModelName(fileName);

  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)) {
    return {
      ok: false,
      skipped: true,
      file: filePath,
      message: "Invalid model name"
    };
  }

  const bytes = fs.readFileSync(filePath);

  const response = await fetch(
    `${siteBaseUrl.replace(/\/$/, "")}/api/vehicle-images/${encodeURIComponent(modelName)}`,
    {
      method: "PUT",
      headers: {
        "content-type": contentType,
        "x-upload-token": token
      },
      body: bytes
    }
  );

  const payload = await response.json().catch(() => ({}));

  return {
    ok: response.ok && payload.ok,
    status: response.status,
    modelName,
    file: fileName,
    payload
  };
}

async function main() {
  if (!token) {
    console.error("Missing IMAGE_UPLOAD_TOKEN environment variable.");
    process.exit(1);
  }

  if (!fs.existsSync(uploadFolder)) {
    console.error(`Upload folder not found: ${uploadFolder}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(uploadFolder)
    .filter(file => allowedExtensions.has(path.extname(file).toLowerCase()))
    .map(file => path.join(uploadFolder, file));

  if (!files.length) {
    console.log("No JPG, PNG, or WebP files found.");
    return;
  }

  console.log(`Uploading ${files.length} vehicle image(s)...`);

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const filePath of files) {
    const result = await uploadImage(filePath);

    if (result.skipped) {
      skipped++;
      console.log(`SKIP ${path.basename(filePath)} — ${result.message}`);
      continue;
    }

    if (result.ok) {
      uploaded++;
      console.log(`OK   ${result.modelName} ? ${result.payload.image?.imageUrl || "uploaded"}`);
    } else {
      failed++;
      console.log(`FAIL ${result.modelName || path.basename(filePath)} — HTTP ${result.status}`);
      console.log(result.payload);
    }
  }

  console.log("");
  console.log("Upload complete:");
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Skipped:  ${skipped}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
