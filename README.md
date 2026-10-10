# After Effects Workflow Scripts
A small collection of Adobe After Effects scripts made to reduce repetitive production work when dealing with many compositions, formats, versions, and exports.
Current scripts:
- `Batch_Rename_Comps.jsx` — bulk rename compositions in the Project panel.
- `Project_Folders_to_AME_v3.jsx` — recreate selected AE Project folder structure on disk and send compositions to Adobe Media Encoder.
These tools were created for real motion-design production workflows with lots of resizes and deliverables.
---
## 1. Batch Rename Comps
`Batch_Rename_Comps.jsx` helps rename many compositions in one pass instead of editing names manually.
### What it can do
- Add a prefix
- Add a suffix
- Remove a specific part of an existing name
- Automatically append the composition resolution, for example `1080x1920`
- Choose a separator for the generated name
- Process compositions inside nested Project folders
### Example
Before:
```text
Trailer_15s_v2
Trailer_6s_v1

After:

Movie_Trailer_15s_v2_1080x1920
Movie_Trailer_6s_v1_1080x1920

The resolution is read directly from each After Effects composition.

Typical workflow

1. Select the compositions or Project folder you want to process.
2. Run Batch_Rename_Comps.jsx.
3. Enable only the rename options you need.
4. Check the settings.
5. Apply the rename.

This is especially useful when preparing many resizes or platform-specific versions that need consistent naming.

⸻

2. Project Folders to AME

Project_Folders_to_AME_v3.jsx is designed for batch export workflows.

If your final compositions are organized in After Effects like this:

1x1
4x5
9x16
_GFX
_CONTROLS

the script can create matching folders on disk and send the compositions inside them to Adobe Media Encoder.

For example:

EXPORT/
├── 1x1/
├── 4x5/
└── 9x16/

What it does

* Reads selected folders from the After Effects Project panel
* Creates corresponding folders on disk
* Can preserve nested folder structure
* Can skip folders whose names start with _
* Adds compositions to the After Effects Render Queue
* Assigns output paths based on their Project folders
* Sends the queued compositions to Adobe Media Encoder
* Can optionally start the AME queue immediately

Folders beginning with _ are useful for technical content such as controls, templates, graphics, safe zones, or other folders that should not become delivery folders.

Important notes

Before using the script:

1. In After Effects, enable:
    Edit → Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network
2. Start with an empty After Effects Render Queue.
    Version 3 intentionally requires an empty Render Queue so that only the compositions selected for the current export are sent to Adobe Media Encoder.
3. Make sure Adobe Media Encoder is installed and compatible with your version of After Effects.
4. The script sets file destinations, but it does not choose your final encoding preset for you.
    Check the preset, codec, bitrate, audio settings, and other delivery requirements in Adobe Media Encoder before starting the final encode.

Typical workflow

1. Organize final compositions into Project folders such as 1x1, 4x5, and 9x16.
2. Select those folders in the Project panel.
3. Run Project_Folders_to_AME_v3.jsx.
4. Choose one root export folder on your computer.
5. Review the generated output paths.
6. Confirm.
7. Check the jobs and presets in Adobe Media Encoder.
8. Start the queue.

⸻

Installation

Option A — Run manually

In After Effects:

File → Scripts → Run Script File…

Then select the .jsx file.

This is the easiest option for testing.

Option B — Add scripts to After Effects

Copy the .jsx files into your After Effects scripts folder and restart After Effects.

Typical Windows path:

C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\

For scripts designed as dockable ScriptUI panels, use:

C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\

After restarting After Effects, ScriptUI panels appear under the Window menu.

⸻

Compatibility

* Adobe After Effects
* Project_Folders_to_AME_v3.jsx is intended for workflows using Adobe Media Encoder
* The scripts were created primarily for Windows-based production workflows

Because After Effects and Media Encoder behavior can vary between versions, test the scripts on a copy of a project before using them in a critical delivery.

⸻

Suggested repository structure

after-effects-workflow-scripts/
│
├── Batch_Rename_Comps.jsx
├── Project_Folders_to_AME_v3.jsx
├── README.md
├── LICENSE
│
└── screenshots/
    ├── batch-rename.png
    └── project-folders-to-ame.png

⸻

Feedback and issues

If you find a bug or have an idea for improving the workflow, feel free to open an Issue in this repository.

When reporting a problem, it helps to include:

* After Effects version
* Adobe Media Encoder version, if relevant
* Windows version
* What you selected in the Project panel
* What you expected to happen
* What actually happened
* A screenshot of any error message

⸻

License

MIT License. See LICENSE⁠￼.

You are free to use, modify, and distribute these scripts under the terms of the MIT License.

