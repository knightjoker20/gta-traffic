(function () {
  const QUICK_CLEAR_CLASS = "group-quick-clear-button";
  let quickClearRetryTimer = null;

  function getCurrentPopgroupsSection() {
    try {
      if (typeof currentSection !== "undefined" && currentSection) {
        return currentSection;
      }
    } catch (error) {
      // Fall back to page title.
    }

    const title = document
      .getElementById("sectionTitle")
      ?.textContent
      ?.trim()
      ?.toLowerCase();

    return title?.includes("ped") ? "peds" : "vehicles";
  }

  function getGroupItems(group) {
    if (!group || typeof group !== "object") {
      return null;
    }

    const preferredKeys = ["models", "entries", "items", "vehicles", "peds"];

    for (const key of preferredKeys) {
      if (Array.isArray(group[key])) {
        return { key, items: group[key] };
      }
    }

    for (const key of Object.keys(group)) {
      if (Array.isArray(group[key])) {
        return { key, items: group[key] };
      }
    }

    return null;
  }

  function getGroupName(group, fallbackIndex) {
    return (
      group?.name ||
      group?.groupName ||
      group?.label ||
      group?.id ||
      "Group " + (Number(fallbackIndex) + 1)
    );
  }

  function markPopgroupsChanged() {
    try {
      hasUnsavedChanges = true;
    } catch (error) {
      // Ignore if state is not available.
    }

    try {
      if (typeof updateUnsavedState === "function") {
        updateUnsavedState();
      }
    } catch (error) {
      // Optional.
    }
  }

  function refreshPopgroupsAfterQuickClear(section) {
    try {
      if (typeof renderSection === "function") {
        renderSection(section);
        injectQuickClearButtons();
        return;
      }
    } catch (error) {
      try {
        renderSection();
        injectQuickClearButtons();
        return;
      } catch (fallbackError) {
        console.warn("Unable to refresh PopGroups section after quick clear.", fallbackError);
      }
    }

    injectQuickClearButtons();
  }

  function quickClearGroup(section, groupIndex) {
    let group = null;

    try {
      group = parsedData?.[section]?.[groupIndex];
    } catch (error) {
      group = null;
    }

    if (!group) {
      alert("That PopGroups group could not be found.");
      return;
    }

    const groupName = getGroupName(group, groupIndex);
    const itemData = getGroupItems(group);
    const itemCount = itemData?.items?.length || 0;

    if (!itemData) {
      alert("This group does not have a clearable entry list.");
      return;
    }

    if (!itemCount) {
      alert(groupName + " is already empty.");
      return;
    }

    const confirmed = window.confirm(
      "Quick Clear " +
        groupName +
        "?\n\nThis will remove all " +
        itemCount +
        " entr" +
        (itemCount === 1 ? "y" : "ies") +
        " from this one group only."
    );

    if (!confirmed) {
      return;
    }

    group[itemData.key] = [];

    try {
      if (openGroups?.[section] instanceof Set) {
        openGroups[section].add(groupName);
      }
    } catch (error) {
      // Optional.
    }

    markPopgroupsChanged();
    refreshPopgroupsAfterQuickClear(section);
  }

  function getGroupControlRow(groupElement) {
    const addInput = groupElement.querySelector('input[id^="add-"]');

    if (addInput?.parentElement) {
      return addInput.parentElement;
    }

    return groupElement.querySelector(".group-header");
  }

  function injectQuickClearButtons() {
    const results = document.getElementById("results");

    if (!results) {
      return false;
    }

    const section = getCurrentPopgroupsSection();
    const groups = Array.from(results.querySelectorAll(".group"));

    if (!groups.length) {
      return false;
    }

    groups.forEach((groupElement, index) => {
      const controlRow = getGroupControlRow(groupElement);

      if (!controlRow) {
        return;
      }

      let button = controlRow.querySelector("." + QUICK_CLEAR_CLASS);

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = QUICK_CLEAR_CLASS;
        button.textContent = "Quick Clear";
        button.title = "Clear all entries from this PopGroups group";

        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();

          quickClearGroup(
            button.getAttribute("data-quick-clear-section") || getCurrentPopgroupsSection(),
            Number(button.getAttribute("data-quick-clear-index"))
          );
        });

        controlRow.appendChild(button);
      }

      button.setAttribute("data-quick-clear-section", section);
      button.setAttribute("data-quick-clear-index", String(index));
    });

    return true;
  }

  function startQuickClearWatcher() {
    injectQuickClearButtons();

    if (quickClearRetryTimer) {
      window.clearInterval(quickClearRetryTimer);
    }

    quickClearRetryTimer = window.setInterval(() => {
      injectQuickClearButtons();
    }, 750);

    const results = document.getElementById("results");

    if (results) {
      const observer = new MutationObserver(() => {
        injectQuickClearButtons();
      });

      observer.observe(results, {
        childList: true,
        subtree: true
      });
    }
  }

  window.quickClearPopgroupsGroup = quickClearGroup;
  window.injectPopgroupsQuickClearButtons = injectQuickClearButtons;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startQuickClearWatcher);
  } else {
    startQuickClearWatcher();
  }
})();
