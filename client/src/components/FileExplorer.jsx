import { useState } from "react";

function FileExplorer({ files, selectedFile, onSelectFile }) {
  const [openFolders, setOpenFolders] = useState({});
  function buildFileTree(files) {
    const tree = {};

    Object.keys(files).forEach((path) => {
      const parts = path.split("/");
      let current = tree;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;

        if (isFile) {
          current[part] = {
            type: "file",
            path: path,
          };
        } else {
          if (!current[part]) {
            current[part] = {
              type: "folder",
              children: {},
            };
          }

          current = current[part].children;
        }
      });
    });

    return tree;
  }

  function toggleFolder(folderPath) {
    setOpenFolders((previous) => ({
      ...previous,
      [folderPath]: !previous[folderPath],
    }));
  }

  function renderTree(tree, parentPath = "") {
    return Object.entries(tree).map(([name, item]) => {
      const currentPath = parentPath
        ? `${parentPath}/${name}`
        : name;

      if (item.type === "file") {
        return (
          <div
            key={currentPath}
            className={`file-item ${
              selectedFile === item.path ? "active-file" : ""
            }`}
            onClick={() => onSelectFile(item.path)}
          >
            📄 {name}
          </div>
        );
      }

      const isOpen = openFolders[currentPath];

      return (
        <div key={currentPath}>
          <div
            className="folder-item"
            onClick={() => toggleFolder(currentPath)}
          >
            {isOpen ? "▼" : "▶"} 📁 {name}
          </div>

          {isOpen && (
            <div className="folder-children">
              {renderTree(item.children, currentPath)}
            </div>
          )}
        </div>
      );
    });
  }

  const fileTree = buildFileTree(files);

  return (
    <div className="file-explorer">
      <h3>EXPLORER</h3>

      {renderTree(fileTree)}
    </div>
  );
}

export default FileExplorer;