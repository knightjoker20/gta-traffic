(function () {
  async function readJsonResponse(response) {
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || payload.message || "Project request failed");
    }

    return payload;
  }

  async function listProjects(options = {}) {
    const params = new URLSearchParams();

    if (options.type) {
      params.set("type", options.type);
    }

    if (options.search) {
      params.set("search", options.search);
    }

    if (options.status) {
      params.set("status", options.status);
    }

    if (options.limit) {
      params.set("limit", String(options.limit));
    }

    if (options.offset) {
      params.set("offset", String(options.offset));
    }

    const query = params.toString();
    const url = query ? "/api/projects?" + query : "/api/projects";

    const response = await fetch(url, {
      credentials: "same-origin"
    });

    return readJsonResponse(response);
  }

  async function createProject(project) {
    const response = await fetch("/api/projects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(project || {})
    });

    return readJsonResponse(response);
  }

  async function getProject(projectId) {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
      credentials: "same-origin"
    });

    return readJsonResponse(response);
  }

  async function updateProject(projectId, updates) {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates || {})
    });

    return readJsonResponse(response);
  }

  async function createProjectVersion(projectId, version) {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const response = await fetch(
      "/api/projects/" + encodeURIComponent(projectId) + "/versions",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(version || {})
      }
    );

    return readJsonResponse(response);
  }

  window.GTATrafficProjects = {
    listProjects,
    createProject,
    getProject,
    updateProject,
    createProjectVersion
  };
})();
