describe("language-regex", () => {
  let editor;

  const setUp = async (scopeName, text) => {
    const grammar = lumine.grammars.grammarForScopeName(scopeName);
    editor = await lumine.workspace.open();
    editor.setGrammar(grammar);
    editor.setText(text);
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;
    await languageMode.atTransactionEnd();
    return { grammar, languageMode };
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

  it("registers two Tree-sitter-only grammars and one exact injection name", () => {
    const regex = lumine.grammars.grammarForScopeName("source.regexp");
    const replacement = lumine.grammars.grammarForScopeName("source.regexp.replacement");

    expect(regex.constructor.name).toBe("TreeSitterGrammar");
    expect(regex.injectionNames).toEqual(["regex"]);
    expect(replacement.constructor.name).toBe("TreeSitterGrammar");
    expect(replacement.injectionNames).toEqual([]);
  });

  it("parses and highlights a regular expression", async () => {
    const { languageMode } = await setUp("source.regexp", "^(?<name>[a-z]+)\\k<name>$");

    expect(languageMode.tree.rootNode.hasError).toBe(false);
    expect(languageMode.tree.rootNode.descendantsOfType("named_capturing_group").length).toBe(1);
    expect(scopesAt("^")).toContain("keyword.control.anchor.regexp");
    expect(scopesAt("name")).toContain("variable.other.group-name.regexp");
    expect(scopesAt("+")).toContain("keyword.operator.quantifier.regexp");
    expect(scopesAt("\\k<name>")).toContain("constant.character.escape.backreference.regexp");
  });

  it("parses and highlights replacement references without treating literals as references", async () => {
    const { languageMode } = await setUp(
      "source.regexp.replacement",
      "plain $0 $00 $1 $01 $99 $100 $& $` $' $$ \\n \\$",
    );

    expect(languageMode.tree.rootNode.hasError).toBe(false);
    expect(
      languageMode.tree.rootNode.descendantsOfType("capture_reference").map((node) => node.text),
    ).toEqual(["$1", "$01", "$99", "$10"]);
    expect(scopesAt("$1")).toContain("variable.regexp.replacement");
    expect(scopesAt("$&")).toContain("variable.regexp.replacement");
    expect(scopesAt("$$")).toContain("constant.character.escape.dollar.regexp.replacement");
    expect(scopesAt("\\n")).toContain("constant.character.escape.backslash.regexp.replacement");
    expect(scopesAt("\\$")).not.toContain("constant.character.escape.backslash.regexp.replacement");
    expect(scopesAt("$0")).not.toContain("variable.regexp.replacement");
  });
});
