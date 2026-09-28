const fs = require("fs");
const path = require("path");

describe("language-regex", () => {
  let editor;

  const fixture = (name) =>
    fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8").trimEnd();

  const setUp = async (scopeName, text) => {
    const grammar = lumine.grammars.grammarForScopeName(scopeName);
    editor = await lumine.workspace.open();
    editor.setGrammar(grammar);
    editor.setText(text);
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;
    await languageMode.atTransactionEnd();
  };

  const scopesAt = (needle, offset = 0) => {
    const index = editor.getText().indexOf(needle);
    expect(index).not.toBe(-1);
    const point = editor.getBuffer().positionForCharacterIndex(index + offset);
    return editor.scopeDescriptorForBufferPosition(point).getScopesArray();
  };

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-regex");
  });

  it("registers exact pattern and replacement injection names", () => {
    const regex = lumine.grammars.grammarForScopeName("source.regexp");
    const replacement = lumine.grammars.grammarForScopeName("source.regexp.replacement");

    expect(regex.constructor.name).toBe("TreeSitterGrammar");
    expect(regex.injectionNames).toEqual(["regex", "regexp"]);
    expect(replacement.constructor.name).toBe("TreeSitterGrammar");
    expect(replacement.injectionNames).toEqual(["regex-replacement", "regexp-replacement"]);
    for (const alias of replacement.injectionNames) {
      expect(lumine.grammars.treeSitterGrammarForLanguageString(alias)).toBe(replacement);
    }
  });

  it("parses and highlights a regular expression", async () => {
    await setUp("source.regexp", fixture("sample.regex"));
    const root = editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => node.parent == null);

    expect((await editor.getSyntaxDiagnostics()).hasError).toBe(false);
    expect(root.descendantsOfType("named_capturing_group").length).toBe(1);
    expect(scopesAt("^")).toContain("keyword.control.anchor.regexp");
    expect(scopesAt("name")).toContain("variable.other.group-name.regexp");
    expect(scopesAt("+")).toContain("keyword.operator.quantifier.regexp");
    expect(scopesAt("\\k<name>")).toContain("constant.character.escape.backreference.regexp");
  });

  it("parses and highlights replacement references without treating literals as references", async () => {
    await setUp("source.regexp.replacement", fixture("sample.regex-replacement"));
    const root = editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => node.parent == null);

    expect((await editor.getSyntaxDiagnostics()).hasError).toBe(false);
    expect(root.descendantsOfType("capture_reference").map((node) => node.text)).toEqual([
      "$1",
      "$01",
      "$99",
      "$10",
    ]);
    expect(scopesAt("$1")).toContain("variable.regexp.replacement");
    expect(scopesAt("$&")).toContain("variable.regexp.replacement");
    expect(scopesAt("$$")).toContain("constant.character.escape.dollar.regexp.replacement");
    expect(scopesAt("\\n")).toContain("constant.character.escape.backslash.regexp.replacement");
    expect(scopesAt("\\$")).not.toContain("constant.character.escape.backslash.regexp.replacement");
    expect(scopesAt("$0")).not.toContain("variable.regexp.replacement");
  });
});
