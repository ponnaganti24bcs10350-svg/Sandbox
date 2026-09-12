import Editor from "@monaco-editor/react";

function CodeEditor({ code, onChange, language }) {
  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      onChange={onChange}
      theme="vs-dark"
    />
  );
}

export default CodeEditor;