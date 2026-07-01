/* POPGROUPS_LEGACY_CLOUD_IMAGE_BRIDGE_V1 */

(() => {
  const imageMap = new Map();
  const cloudVehicleMap = new Map();

  function normalizeModelName(value) {
    return String(value || "")
      .trim()
      .replace(/\.(yft|ytd)$/i, "")
      .replace(/(\+hi|_hi)$/i, "")
      .toLowerCase();
  }

  function getImageUrl(record) {
    const custom = record?.custom || {};
    const meta = record?.meta || {};

    return (
      record?.imageUrl ||
      record?.image_url ||
      record?.thumbnailUrl ||
      record?.thumbnail_url ||
      record?.photoUrl ||
      record?.photo_url ||
      record?.image ||
      custom.imageUrl ||
      custom.image_url ||
      custom.thumbnailUrl ||
      meta.imageUrl ||
      meta.image_url ||
      ""
    );
  }

  function getVehicleTitle(record) {
    const custom = record?.custom || {};
    return (
      custom.displayName ||
      record?.displayName ||
      record?.vehicleName ||
      record?.gameName ||
      record?.name ||
      record?.modelName ||
      record?.model ||
      ""
    );
  }

  function getVehicleClass(record) {
    const meta = record?.meta || {};
    return (
      record?.vehicleClass ||
      record?.vehicleClassName ||
      record?.className ||
      record?.class ||
      record?.category ||
      record?.vehicle_class ||
      record?.vehicle_type ||
      meta.vehicleClass ||
      meta.className ||
      meta.class ||
      meta.category ||
      ""
    );
  }

  function normalizeCloudRecord(record) {
    const meta = record?.meta || {};
    const custom = record?.custom || {};

    const modelName = normalizeModelName(
      record?.modelName ||
      record?.model ||
      record?.spawnName ||
      record?.vehicleName ||
      record?.name
    );

    if (!modelName) return null;

    const imageUrl = getImageUrl(record);

    const merged = {
      ...record,
      ...meta,
      modelName,
      gameName: record?.gameName || record?.vehicleName || record?.name || modelName,
      displayName: getVehicleTitle(record) || modelName,
      vehicleName: getVehicleTitle(record) || modelName,
      make:
        record?.make ||
        record?.manufacturer ||
        record?.vehicleMakeName ||
        record?.vehicle_make_name ||
        meta.make ||
        meta.manufacturer ||
        "",
      class:
        getVehicleClass(record) ||
        record?.class ||
        meta.class ||
        "",
      vehicleClass:
        getVehicleClass(record),
      handlingId:
        record?.handlingId ||
        record?.handlingName ||
        record?.handling_id ||
        meta.handlingId ||
        "",
      packName:
        record?.packName ||
        record?.dlcName ||
        record?.sourcePack ||
        record?.pack_name ||
        meta.packName ||
        "",
      imageUrl,
      image: imageUrl,
      custom: {
        ...custom,
        imageUrl: custom.imageUrl || imageUrl
      }
    };

    return merged;
  }

  function collectVehicles(data) {
    const output = [];
    const seen = new Set();

    function visit(value, depth = 0) {
      if (!value || depth > 6) return;

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1));
        return;
      }

      if (typeof value !== "object") return;

      const model = normalizeModelName(
        value.modelName ||
        value.model ||
        value.spawnName ||
        value.vehicleName ||
        value.name
      );

      if (model && !seen.has(model)) {
        seen.add(model);
        output.push(value);
      }

      [
        "vehicles",
        "vehicleMeta",
        "vehicleMetadata",
        "records",
        "items",
        "library",
        "data",
        "metadata",
        "meta"
      ].forEach((key) => {
        if (value[key]) visit(value[key], depth + 1);
      });
    }

    visit(data);
    return output;
  }

  function mergeIntoLegacyVehicleMeta(record) {
    const vehicle = normalizeCloudRecord(record);
    if (!vehicle) return;

    cloudVehicleMap.set(vehicle.modelName, vehicle);

    if (vehicle.imageUrl) {
      imageMap.set(vehicle.modelName, vehicle.imageUrl);
    }

    window.vehicleMeta = window.vehicleMeta || {};

    const existing = window.vehicleMeta[vehicle.modelName] || {};

    window.vehicleMeta[vehicle.modelName] = {
      ...existing,
      ...vehicle,
      imageUrl: vehicle.imageUrl || existing.imageUrl || existing.image,
      image: vehicle.imageUrl || existing.image || existing.imageUrl,
      custom: {
        ...(existing.custom || {}),
        ...(vehicle.custom || {}),
        imageUrl:
          vehicle.imageUrl ||
          existing.custom?.imageUrl ||
          existing.imageUrl ||
          existing.image ||
          ""
      }
    };

    try {
      if (typeof vehicleMeta !== "undefined") {
        vehicleMeta[vehicle.modelName] = {
          ...(vehicleMeta[vehicle.modelName] || {}),
          ...window.vehicleMeta[vehicle.modelName]
        };
      }
    } catch {
      // Ignore if legacy global is not writable.
    }
  }

  async function loadCloudVehicleLibrary() {
    if (!window.vehicleCloud || typeof window.vehicleCloud.getLibraryData !== "function") {
      return;
    }

    try {
      const data = await window.vehicleCloud.getLibraryData([]);
      const vehicles = collectVehicles(data);

      vehicles.forEach(mergeIntoLegacyVehicleMeta);

      const status = document.getElementById("metaStatus");
      if (status) {
        status.innerHTML = `<span style="color:#5ee38a">Cloud vehicle library loaded: ${cloudVehicleMap.size} vehicles</span>`;
      }

      refreshLegacyRender();
    } catch (error) {
      console.error("Cloud vehicle library load failed:", error);
    }
  }

  function refreshLegacyRender() {
    try {
      if (typeof renderVehicleLibrary === "function") {
        renderVehicleLibrary();
      }
    } catch (error) {
      console.warn("renderVehicleLibrary failed:", error);
    }

    try {
      if (typeof renderSection === "function") {
        renderSection(typeof currentSection !== "undefined" ? currentSection : "vehicles");
      }
    } catch (error) {
      console.warn("renderSection failed:", error);
    }

    setTimeout(cleanRenderedCards, 50);
    setTimeout(cleanRenderedCards, 250);
    setTimeout(cleanRenderedCards, 900);
  }

  function cardModelFromElement(card) {
    const direct =
      card.dataset.model ||
      card.dataset.modelName ||
      card.dataset.spawnName ||
      "";

    if (direct) return normalizeModelName(direct);

    const title =
      card.querySelector("h3, h4, .vehicle-title, .library-title")?.textContent ||
      "";

    return normalizeModelName(title);
  }

  function imageForModel(model) {
    const normalized = normalizeModelName(model);

    if (imageMap.has(normalized)) {
      return imageMap.get(normalized);
    }

    const cloud = cloudVehicleMap.get(normalized);
    if (cloud) {
      return getImageUrl(cloud);
    }

    const legacy = window.vehicleMeta?.[normalized];
    return getImageUrl(legacy);
  }

  function injectCardImage(card) {
    const model = cardModelFromElement(card);
    if (!model) return;

    const imageUrl = imageForModel(model);
    if (!imageUrl) return;

    const existingImg = card.querySelector("img");
    if (existingImg) {
      if (!existingImg.getAttribute("src")) {
        existingImg.src = imageUrl;
      }
      return;
    }

    const imageBox =
      card.querySelector(".vehicle-image, .vehicle-photo, .vehicle-thumb, .vehicle-card-image, .library-img, .popgroups-library-img, [class*='image']") ||
      Array.from(card.querySelectorAll("div")).find((node) =>
        /no image/i.test(node.textContent || "")
      );

    if (!imageBox) return;

    imageBox.innerHTML = `<img src="${imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
    imageBox.classList.add("has-cloud-image");
  }

  function hideUnwantedCardButtons(root = document) {
    const labels = new Set([
      "assign active pack",
      "clear pack",
      "find image"
    ]);

    root.querySelectorAll("button, a").forEach((button) => {
      const text = String(button.textContent || "").trim().toLowerCase();
      if (labels.has(text)) {
        button.remove();
      }
    });
  }

  function cleanRenderedCards() {
    document
      .querySelectorAll(".vehicle-card, .library-card, .vehicle-library-card, .pg-work-vehicle-card, .pg-vehicle-card")
      .forEach(injectCardImage);

    hideUnwantedCardButtons(document);
  }

  function bindInstalledScanner() {
    const input = document.getElementById("installedScannerInput");
    const dropZone = document.getElementById("installedScannerDropZone");
    const runButton = document.getElementById("pgRunInstalledScan");
    const copyButton = document.getElementById("pgCopyInstalledModels");
    const clearButton = document.getElementById("pgClearInstalledScan");
    const cloudButton = document.getElementById("pgMarkInstalledCloud");
    const status = document.getElementById("installedScannerStatus");

    const installed = new Set();

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function extractModels(text) {
      return Array.from(
        new Set(
          String(text || "")
            .match(/[A-Za-z0-9_+\-]+?\.(?:yft|ytd)\b/gi) || []
        )
      )
        .map(normalizeModelName)
        .filter((model) => model && !model.includes("vehshare"))
        .sort();
    }

    function runScan() {
      installed.clear();

      extractModels(input?.value || "").forEach((model) => {
        installed.add(model);

        const existing = window.vehicleMeta?.[model] || cloudVehicleMap.get(model) || {};
        window.vehicleMeta = window.vehicleMeta || {};
        window.vehicleMeta[model] = {
          ...existing,
          modelName: model,
          installed: true
        };

        try {
          if (typeof vehicleMeta !== "undefined") {
            vehicleMeta[model] = {
              ...(vehicleMeta[model] || {}),
              ...window.vehicleMeta[model]
            };
          }
        } catch {}
      });

      setStatus(
        installed.size
          ? `Detected ${installed.size} installed add-on vehicle model(s).`
          : "No installed vehicle models detected."
      );

      refreshLegacyRender();
    }

    runButton?.addEventListener("click", runScan);

    copyButton?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(Array.from(installed).join("\n"));
      setStatus(`Copied ${installed.size} installed model name(s).`);
    });

    clearButton?.addEventListener("click", () => {
      installed.clear();
      if (input) input.value = "";
      setStatus("Installed scanner cleared.");
      refreshLegacyRender();
    });

    cloudButton?.addEventListener("click", async () => {
      if (!window.vehicleCloud || typeof window.vehicleCloud.updateVehicle !== "function") {
        setStatus("Cloud update function is not available.");
        return;
      }

      let saved = 0;

      for (const model of installed) {
        try {
          await window.vehicleCloud.updateVehicle(model, {
            installed: true,
            installSource: "installed-addon-scan"
          });
          saved++;
        } catch (error) {
          console.error(error);
        }
      }

      setStatus(`Marked ${saved} installed vehicle(s) in cloud.`);
    });

    dropZone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragover");
    });

    dropZone?.addEventListener("dragleave", () => {
      dropZone.classList.remove("is-dragover");
    });

    dropZone?.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");

      const files = Array.from(event.dataTransfer?.files || []);
      const chunks = [];

      for (const file of files) {
        chunks.push(await file.text());
      }

      if (input) {
        input.value = [input.value, ...chunks].filter(Boolean).join("\n");
      }

      runScan();
    });
  }

  function bindCloudProjectSave() {
    const button = document.getElementById("saveCloudProjectBtn");
    const status = document.getElementById("cloudProjectStatus");

    if (!button) return;

    button.addEventListener("click", async () => {
      const name =
        document.getElementById("projectNameInput")?.value?.trim() ||
        "PopGroups traffic setup";

      const description =
        document.getElementById("projectDescriptionInput")?.value?.trim() ||
        "";

      const payload = {
        tool: "popgroups",
        savedAt: new Date().toISOString(),
        vehicleMeta: window.vehicleMeta || {},
        cloudVehicleCount: cloudVehicleMap.size
      };

      if (status) status.textContent = "Saving cloud project...";

      try {
        const response = await fetch("/api/saved-projects", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            title: name,
            description,
            projectType: "popgroups",
            type: "popgroups",
            payload,
            summary: {
              cloudVehicleCount: cloudVehicleMap.size
            },
            files: []
          })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.ok === false) {
          throw new Error(result.error || "Save failed");
        }

        if (status) status.textContent = "Saved to cloud project dashboard.";
      } catch (error) {
        console.error(error);
        localStorage.setItem(
          "gtaTraffic.popgroups.cloudProjectDraft",
          JSON.stringify({ name, description, payload })
        );

        if (status) {
          status.textContent = "Cloud save failed. Local draft backup saved in this browser.";
        }
      }
    });
  }

  function observeLegacyRender() {
    const target = document.getElementById("results") || document.body;

    const observer = new MutationObserver(() => {
      cleanRenderedCards();
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindInstalledScanner();
    bindCloudProjectSave();
    observeLegacyRender();

    loadCloudVehicleLibrary();

    setTimeout(cleanRenderedCards, 300);
    setTimeout(cleanRenderedCards, 1000);
  });
})();
