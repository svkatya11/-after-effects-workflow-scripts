// Project Folders to AME v3.jsx
// FIX: do NOT wrap Render Queue / queueInAME() calls in app.beginUndoGroup().
// This avoids AE "internal verification failure {Bad rq item index}".

(function (thisObj) {

    var SCRIPT_NAME = "Project Folders to AME v3";

    function trimText(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function safeName(s) {
        s = String(s).replace(/[<>:"\/\\|?*\x00-\x1F]/g, "_");
        s = s.replace(/[\. ]+$/g, "");
        if (s === "") s = "Untitled";
        return s;
    }

    function normalizeExtension(ext) {
        ext = trimText(ext);
        if (ext === "") return "";
        if (ext.charAt(0) !== ".") ext = "." + ext;
        return ext;
    }

    function sep() {
        return ($.os.indexOf("Windows") !== -1) ? "\\" : "/";
    }

    function joinPath(parts) {
        return parts.join(sep());
    }

    function createFolderRecursive(folderObj) {
        if (folderObj.exists) return true;
        var parent = folderObj.parent;
        if (parent && !parent.exists) {
            if (!createFolderRecursive(parent)) return false;
        }
        return folderObj.create();
    }

    function shouldSkipFolder(folderItem, ignoreUnderscore) {
        if (!ignoreUnderscore) return false;
        return String(folderItem.name).charAt(0) === "_";
    }

    function collectFolder(folderItem, relativeParts, options, jobs) {
        for (var i = 1; i <= folderItem.numItems; i++) {
            var item = folderItem.item(i);

            if (item instanceof CompItem) {
                jobs.push({
                    comp: item,
                    relativeParts: relativeParts.slice(0)
                });
            } else if (options.recursive && item instanceof FolderItem) {
                if (shouldSkipFolder(item, options.ignoreUnderscore)) continue;

                var nextParts = relativeParts.slice(0);
                nextParts.push(safeName(item.name));

                collectFolder(item, nextParts, options, jobs);
            }
        }
    }

    function collectJobs(options) {
        var selection = app.project.selection;
        var jobs = [];

        if (!selection || selection.length === 0) return jobs;

        for (var i = 0; i < selection.length; i++) {
            var item = selection[i];

            if (item instanceof FolderItem) {
                if (shouldSkipFolder(item, options.ignoreUnderscore)) continue;

                collectFolder(
                    item,
                    [safeName(item.name)],
                    options,
                    jobs
                );

            } else if (item instanceof CompItem) {
                jobs.push({
                    comp: item,
                    relativeParts: []
                });
            }
        }

        return jobs;
    }

    function uniqueJobs(jobs) {
        var out = [];

        for (var i = 0; i < jobs.length; i++) {
            var found = false;

            for (var j = 0; j < out.length; j++) {
                if (
                    out[j].comp === jobs[i].comp &&
                    out[j].relativeParts.join("/") === jobs[i].relativeParts.join("/")
                ) {
                    found = true;
                    break;
                }
            }

            if (!found) out.push(jobs[i]);
        }

        return out;
    }

    function makeDiskFolders(rootFolder, jobs) {
        var created = [];
        var errors = [];

        for (var i = 0; i < jobs.length; i++) {
            var parts = [rootFolder.fsName];

            for (var p = 0; p < jobs[i].relativeParts.length; p++) {
                parts.push(jobs[i].relativeParts[p]);
            }

            var folderObj = new Folder(joinPath(parts));

            if (!folderObj.exists && !createFolderRecursive(folderObj)) {
                errors.push(folderObj.fsName);
                continue;
            }

            var already = false;
            for (var k = 0; k < created.length; k++) {
                if (created[k] === folderObj.fsName) {
                    already = true;
                    break;
                }
            }

            if (!already) created.push(folderObj.fsName);
        }

        return {created: created, errors: errors};
    }

    function buildOutputFile(rootFolder, job, extension) {
        var parts = [rootFolder.fsName];

        for (var i = 0; i < job.relativeParts.length; i++) {
            parts.push(job.relativeParts[i]);
        }

        parts.push(safeName(job.comp.name) + extension);

        return new File(joinPath(parts));
    }

    function preview(jobs, rootFolder, extension) {
        var txt = "";
        var max = 12;

        for (var i = 0; i < jobs.length && i < max; i++) {
            txt += buildOutputFile(rootFolder, jobs[i], extension).fsName + "\n";
        }

        if (jobs.length > max) {
            txt += "\n... ещё " + (jobs.length - max) + " файлов";
        }

        return txt;
    }

    function send(ui) {

        if (!app.project || !app.project.file) {
            alert("Сначала сохрани After Effects проект.");
            return;
        }

        var rq = app.project.renderQueue;

        if (rq.numItems > 0) {
            alert(
                "Перед запуском очисти Render Queue в After Effects.\n\n" +
                "Так в Media Encoder уйдут только выбранные сейчас композиции."
            );
            return;
        }

        var jobs = uniqueJobs(
            collectJobs({
                recursive: ui.recursive.value,
                ignoreUnderscore: ui.ignoreUnderscore.value
            })
        );

        if (jobs.length === 0) {
            alert(
                "Выдели в Project нужные папки.\n\n" +
                "Например: 1x1, 4x5 и 9x16."
            );
            return;
        }

        var destination = Folder.selectDialog(
            "Выбери ОДНУ корневую папку для рендеров"
        );

        if (!destination) return;

        var extension = normalizeExtension(ui.extension.text);

        var folders = makeDiskFolders(destination, jobs);

        if (folders.errors.length > 0) {
            alert(
                "Не удалось создать папки:\n\n" +
                folders.errors.join("\n")
            );
            return;
        }

        if (!confirm(
            "Папки созданы.\n\n" +
            "В Media Encoder будет отправлено: " + jobs.length +
            "\n\n" +
            preview(jobs, destination, extension) +
            "\n\nПродолжить?"
        )) {
            return;
        }

        var added = 0;
        var errors = [];

        // CRITICAL FIX: no beginUndoGroup/endUndoGroup here.
        for (var i = 0; i < jobs.length; i++) {
            try {
                var rqItem = rq.items.add(jobs[i].comp);
                rqItem.outputModule(1).file =
                    buildOutputFile(destination, jobs[i], extension);
                rqItem.render = true;
                added++;
            } catch (e) {
                errors.push(jobs[i].comp.name + ": " + e.toString());
            }
        }

        if (added === 0) {
            alert(
                "Не удалось добавить композиции в Render Queue.\n\n" +
                (errors.length ? errors.join("\n") : "")
            );
            return;
        }

        try {
            if (rq.canQueueInAME !== true) {
                alert(
                    "Композиции добавлены в Render Queue, но AE сейчас не разрешает Queue in AME.\n\n" +
                    "Проверь, что Media Encoder установлен и совместим с этой версией After Effects."
                );
                return;
            }

            rq.queueInAME(ui.startImmediately.value);

        } catch (eAME) {
            alert(
                "Папки созданы и композиции добавлены в Render Queue,\n" +
                "но Queue in AME завершился ошибкой:\n\n" +
                eAME.toString() +
                "\n\nRender Queue оставлена как есть."
            );
            return;
        }

        var msg =
            "Готово.\n\n" +
            "Папок на диске: " + folders.created.length +
            "\nКомпозиции отправлены в AME: " + added +
            "\n\nКорень:\n" + destination.fsName;

        if (!ui.startImmediately.value) {
            msg += "\n\nОткрой Media Encoder, проверь preset и нажми Start Queue.";
        }

        if (errors.length > 0) {
            msg += "\n\nНе удалось добавить: " + errors.length;
        }

        alert(msg);
    }

    function buildUI(thisObj) {

        var win =
            (thisObj instanceof Panel)
            ? thisObj
            : new Window(
                "palette",
                SCRIPT_NAME,
                undefined,
                {resizeable:true}
            );

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 12;

        win.add(
            "statictext",
            undefined,
            "Выдели папки 1x1 / 4x5 / 9x16 в Project.\n" +
            "Render Queue AE перед запуском должна быть пустой.",
            {multiline:true}
        );

        var panel = win.add("panel", undefined, "Настройки");
        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.margins = 8;

        var recursive = panel.add(
            "checkbox",
            undefined,
            "Повторять вложенные папки"
        );
        recursive.value = true;

        var ignoreUnderscore = panel.add(
            "checkbox",
            undefined,
            "Не рендерить папки, начинающиеся с _"
        );
        ignoreUnderscore.value = true;

        var row = panel.add("group");
        row.add("statictext", undefined, "Расширение:");

        var extension = row.add("edittext", undefined, ".mp4");
        extension.characters = 8;

        var startImmediately = panel.add(
            "checkbox",
            undefined,
            "Сразу запустить очередь AME"
        );
        startImmediately.value = false;

        var btn = win.add(
            "button",
            undefined,
            "СОЗДАТЬ ПАПКИ И ОТПРАВИТЬ В AME"
        );
        btn.preferredSize.height = 40;

        btn.onClick = function () {
            send({
                recursive: recursive,
                ignoreUnderscore: ignoreUnderscore,
                extension: extension,
                startImmediately: startImmediately
            });
        };

        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };

        return win;
    }

    var win = buildUI(thisObj);

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
    }

})(this);
