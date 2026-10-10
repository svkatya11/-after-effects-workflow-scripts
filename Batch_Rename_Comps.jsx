// Batch Rename Comps in Selected Folder.jsx
// After Effects ExtendScript / ScriptUI
// Windows & macOS compatible.
//
// Workflow:
// 1. Select exactly one folder in the Project panel.
// 2. Run this script.
// 3. Configure rename options.
// 4. The script processes all compositions inside the folder,
//    including nested subfolders.
//
// Order of operations:
// Remove text -> Prefix -> Suffix -> Resolution

(function batchRenameComps() {
    app.beginUndoGroup("Batch Rename Comps");

    var proj = app.project;

    if (!proj) {
        alert("No project is open.");
        app.endUndoGroup();
        return;
    }

    var selection = proj.selection;

    if (!selection || selection.length !== 1 || !(selection[0] instanceof FolderItem)) {
        alert("Select exactly one folder in the Project panel, then run the script again.");
        app.endUndoGroup();
        return;
    }

    var targetFolder = selection[0];

    function trimText(s) {
        return s.replace(/^\s+|\s+$/g, "");
    }

    function startsWith(text, prefix) {
        return text.indexOf(prefix) === 0;
    }

    function endsWith(text, suffix) {
        if (suffix === "") return true;
        return text.lastIndexOf(suffix) === text.length - suffix.length;
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // ---------- UI ----------
    var dlg = new Window("dialog", "Batch Rename Compositions");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 10;
    dlg.margins = 16;

    var info = dlg.add(
        "statictext",
        undefined,
        "Selected folder: " + targetFolder.name,
        {multiline: false}
    );

    var sepGroup = dlg.add("group");
    sepGroup.orientation = "row";
    sepGroup.alignChildren = ["left", "center"];
    sepGroup.add("statictext", undefined, "Separator:");
    var sepField = sepGroup.add("edittext", undefined, "_");
    sepField.characters = 5;

    var panel = dlg.add("panel", undefined, "Rename options");
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 8;
    panel.margins = 12;

    // Remove
    var removeGroup = panel.add("group");
    removeGroup.orientation = "row";
    removeGroup.alignChildren = ["left", "center"];

    var removeCheck = removeGroup.add("checkbox", undefined, "Remove text:");
    removeCheck.value = false;

    var removeField = removeGroup.add("edittext", undefined, "");
    removeField.characters = 28;
    removeField.enabled = false;

    removeCheck.onClick = function () {
        removeField.enabled = removeCheck.value;
    };

    // Prefix
    var prefixGroup = panel.add("group");
    prefixGroup.orientation = "row";
    prefixGroup.alignChildren = ["left", "center"];

    var prefixCheck = prefixGroup.add("checkbox", undefined, "Add prefix:");
    prefixCheck.value = false;

    var prefixField = prefixGroup.add("edittext", undefined, "");
    prefixField.characters = 28;
    prefixField.enabled = false;

    prefixCheck.onClick = function () {
        prefixField.enabled = prefixCheck.value;
    };

    // Suffix
    var suffixGroup = panel.add("group");
    suffixGroup.orientation = "row";
    suffixGroup.alignChildren = ["left", "center"];

    var suffixCheck = suffixGroup.add("checkbox", undefined, "Add suffix:");
    suffixCheck.value = false;

    var suffixField = suffixGroup.add("edittext", undefined, "");
    suffixField.characters = 28;
    suffixField.enabled = false;

    suffixCheck.onClick = function () {
        suffixField.enabled = suffixCheck.value;
    };

    // Resolution
    var resolutionCheck = panel.add(
        "checkbox",
        undefined,
        "Add composition resolution at the end (e.g. 1920x1080)"
    );
    resolutionCheck.value = true;

    // Nested folders
    var recursiveCheck = panel.add(
        "checkbox",
        undefined,
        "Include nested folders"
    );
    recursiveCheck.value = true;

    var note = dlg.add(
        "statictext",
        undefined,
        "Order: remove text -> prefix -> suffix -> resolution.\nExisting identical prefix/suffix/resolution will not be added twice.",
        {multiline: true}
    );

    var buttons = dlg.add("group");
    buttons.alignment = "right";

    var cancelBtn = buttons.add("button", undefined, "Cancel", {name: "cancel"});
    var runBtn = buttons.add("button", undefined, "Rename", {name: "ok"});

    if (dlg.show() !== 1) {
        app.endUndoGroup();
        return;
    }

    // ---------- Read settings ----------
    var separator = sepField.text;
    var removeText = trimText(removeField.text);
    var prefixText = trimText(prefixField.text);
    var suffixText = trimText(suffixField.text);

    if (removeCheck.value && removeText === "") {
        alert("Enter the text you want to remove.");
        app.endUndoGroup();
        return;
    }

    if (prefixCheck.value && prefixText === "") {
        alert("Enter a prefix.");
        app.endUndoGroup();
        return;
    }

    if (suffixCheck.value && suffixText === "") {
        alert("Enter a suffix.");
        app.endUndoGroup();
        return;
    }

    var changedCount = 0;
    var unchangedCount = 0;

    function makeToken(text) {
        if (text === "") return "";
        return text;
    }

    function addPrefixSafely(name, prefix, sep) {
        if (prefix === "") return name;

        var token = prefix + sep;

        if (startsWith(name, token) || name === prefix) {
            return name;
        }

        return token + name;
    }

    function addSuffixSafely(name, suffix, sep) {
        if (suffix === "") return name;

        var token = sep + suffix;

        if (endsWith(name, token) || name === suffix) {
            return name;
        }

        return name + token;
    }

    function addResolutionSafely(name, comp, sep) {
        var resolution = comp.width + "x" + comp.height;
        var token = sep + resolution;

        if (endsWith(name, token) || name === resolution) {
            return name;
        }

        return name + token;
    }

    function renameComp(comp) {
        var oldName = comp.name;
        var newName = oldName;

        // 1. Remove all occurrences of a literal text fragment.
        if (removeCheck.value && removeText !== "") {
            var re = new RegExp(escapeRegExp(removeText), "g");
            newName = newName.replace(re, "");

            // Clean common duplicate separators/spaces caused by removal.
            if (separator !== "") {
                var escSep = escapeRegExp(separator);
                newName = newName.replace(new RegExp(escSep + "{2,}", "g"), separator);
                newName = newName.replace(new RegExp("^" + escSep + "|" + escSep + "$", "g"), "");
            }

            newName = newName.replace(/\s{2,}/g, " ");
            newName = trimText(newName);
        }

        // 2. Prefix
        if (prefixCheck.value) {
            newName = addPrefixSafely(newName, prefixText, separator);
        }

        // 3. Suffix
        if (suffixCheck.value) {
            newName = addSuffixSafely(newName, suffixText, separator);
        }

        // 4. Resolution
        if (resolutionCheck.value) {
            newName = addResolutionSafely(newName, comp, separator);
        }

        if (newName !== oldName) {
            comp.name = newName;
            changedCount++;
        } else {
            unchangedCount++;
        }
    }

    function processFolder(folder) {
        for (var i = 1; i <= folder.numItems; i++) {
            var item = folder.item(i);

            if (item instanceof CompItem) {
                renameComp(item);
            } else if (item instanceof FolderItem && recursiveCheck.value) {
                processFolder(item);
            }
        }
    }

    processFolder(targetFolder);

    alert(
        "Done.\n\n" +
        "Renamed: " + changedCount +
        "\nUnchanged: " + unchangedCount
    );

    app.endUndoGroup();
})();
