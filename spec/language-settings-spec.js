describe("language-regex editing defaults", () => {
  let editor;
  beforeEach(async () => {
    jasmine.useRealClock();
    await lumine.packages.activatePackage("language-source");
    await lumine.packages.activatePackage("language-regex");

    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.regexp"));
    editor.setText("[a-z]+");
    await editor.whenGrammarSettled();
  });
  afterEach(() => editor?.destroy());

  it("uses the correct comment operation in source.regexp", async () => {
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.regexp"));
    editor.setText("[a-z]+");
    await editor.whenGrammarSettled();
    await editor.toggleLineCommentsForBufferRows(0, editor.getLastBufferRow());
    await editor.whenGrammarSettled();
    expect(editor.getText()).toBe("[a-z]+");
  });

  it("uses the correct comment operation in source.regexp.replacement", async () => {
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.regexp.replacement"));
    editor.setText("$1");
    await editor.whenGrammarSettled();
    await editor.toggleLineCommentsForBufferRows(0, editor.getLastBufferRow());
    await editor.whenGrammarSettled();
    expect(editor.getText()).toBe("$1");
  });

  it("exposes no inherited C-style delimiters and respects an explicit user override", async () => {
    const before = await editor.getCommentDelimitersForBufferPosition([0, 0]);
    expect(before?.line).toBeUndefined();
    expect(before?.block).toBeUndefined();
    const options = { scopeSelector: ".source.regexp" };
    try {
      lumine.config.set("editor.commentStart", "// ", options);
      lumine.config.set("editor.commentEnd", "", options);
      lumine.config.set("editor.commentDelimiters", { line: "//" }, options);
      await editor.toggleLineCommentsForBufferRows(0, 0);
      await editor.whenGrammarSettled();
      expect(editor.lineTextForBufferRow(0)).toBe("// " + "[a-z]+");
    } finally {
      for (const key of ["commentStart", "commentEnd", "commentDelimiters"])
        lumine.config.unset("editor." + key, options);
    }
  });
});
