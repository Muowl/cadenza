import { PaletteFile, resolve, alpha, ansiBright, tint, BRACKETS } from "../lib/palette";

/**
 * Generates the VS Code theme JSON from the source of truth.
 * Project rule: NO hardcoded hex here — everything comes from p.palette
 * or from resolve()/alpha()/ansiBright().
 */
export function generateVscodeTheme(p: PaletteFile): object {
  const c = p.palette;
  const syn = (role: string) => resolve(p, "syntax", role);
  const ui = (role: string) => resolve(p, "ui", role);
  const ansi = (slot: string) => resolve(p, "terminal", slot);
  const bright = (slot: string) => ansiBright(p, slot);
  // Tints drawn behind text: alpha defined in lib/palette.ts, where the
  // validator reads the same value to measure contrast on the composite colour.
  const ch = (name: string) => tint(p, name);

  return {
    $schema: "vscode://schemas/color-theme",
    name: p.meta.name,
    type: p.meta.variant,
    semanticHighlighting: true,

    colors: {
      // Editor
      "editor.background": c.bg0,
      "editor.foreground": c.fg0,
      "editorCursor.foreground": ui("cursor"),
      "editor.selectionBackground": c.selection,
      "editor.selectionHighlightBackground": alpha(c.selection, 0.6),
      "editor.wordHighlightBackground": alpha(c.bg3, 0.7),
      // The fill alone needed a high alpha for the match to pop, and that is
      // what washed out the text underneath. The border restores visibility
      // without flooding the code — the highlight becomes an outline, not a blot.
      "editor.findMatchBackground": ch("find match"),
      "editor.findMatchBorder": c.gold,
      "editor.findMatchHighlightBackground": ch("find match (others)"),
      "editor.findMatchHighlightBorder": alpha(c.gold, 0.5),
      "editor.lineHighlightBackground": alpha(c.bg2, 0.5),
      // The default draws a #282828 border over the current-line highlight.
      // Transparent so no grey outline is left over.
      "editor.lineHighlightBorder": alpha(c.bg2, 0),
      "editor.rangeHighlightBackground": alpha(c.bg2, 0.6),
      "editor.hoverHighlightBackground": alpha(c.jade, 0.12),
      "editorLineNumber.foreground": c.muted,
      "editorLineNumber.activeForeground": c.fg1,
      // CodeLens and inlay hints: supporting text in the editor — without this
      // VS Code falls back to the default cold blue/grey.
      "editorCodeLens.foreground": c.muted,
      "editorInlayHint.foreground": c.fg1,
      "editorInlayHint.background": alpha(c.bg2, 0.7),
      "editorInlayHint.typeForeground": syn("type"),
      "editorInlayHint.typeBackground": alpha(c.bg2, 0.7),
      "editorInlayHint.parameterForeground": c.fg1,
      "editorInlayHint.parameterBackground": alpha(c.bg2, 0.7),
      "editorIndentGuide.background1": c.bg3,
      "editorIndentGuide.activeBackground1": c.muted,
      "editorWhitespace.foreground": c.bg3,
      "editorBracketMatch.background": alpha(c.jade, 0.15),
      "editorBracketMatch.border": alpha(c.jade, 0.6),
      // Sticky scroll on the editor background, closed off by a border: flat,
      // like the rest of the structure. The default (black) shadow disappears
      // on near-black.
      "editorStickyScroll.background": c.bg0,
      "editorStickyScrollHover.background": c.bg1,
      "editorStickyScroll.border": c.bg3,
      "editorStickyScroll.shadow": alpha(c.bg0, 0),
      "editorLink.activeForeground": ui("link"),

      // Minimap and overview ruler
      "minimap.findMatchHighlight": alpha(c.gold, 0.5),
      "minimap.selectionHighlight": c.selection,
      "minimapSlider.background": alpha(c.bg3, 0.4),
      "minimapSlider.hoverBackground": alpha(c.bg3, 0.6),
      "minimapSlider.activeBackground": alpha(c.muted, 0.5),
      "editorOverviewRuler.border": c.bg3,
      "editorOverviewRuler.errorForeground": c.error,
      "editorOverviewRuler.warningForeground": c.warning,
      "editorOverviewRuler.infoForeground": c.info,
      "editorOverviewRuler.findMatchForeground": alpha(c.gold, 0.6),
      "editorOverviewRuler.addedForeground": c.success,
      "editorOverviewRuler.modifiedForeground": c.warning,
      "editorOverviewRuler.deletedForeground": c.error,

      // Bracket pair colorization. The sequence lives in BRACKETS
      // (src/lib/palette.ts) because the colour-blindness check measures the
      // same set: brackets have no channel besides colour. The history
      // (crimson colliding with error, gold with ember, a transparent
      // foreground6) is documented there and in the CHANGELOG.
      ...Object.fromEntries(
        BRACKETS.map((token, i) => [`editorBracketHighlight.foreground${i + 1}`, c[token]])
      ),
      "editorBracketHighlight.unexpectedBracket.foreground": c.error,

      // Gutter / diff
      "editorGutter.addedBackground": c.success,
      "editorGutter.modifiedBackground": c.warning,
      "editorGutter.deletedBackground": c.error,
      "diffEditor.insertedTextBackground": alpha(c.success, 0.12),
      "diffEditor.removedTextBackground": alpha(c.error, 0.12),
      "diffEditor.insertedLineBackground": ch("diff: inserted line"),
      "diffEditor.removedLineBackground": ch("diff: removed line"),
      "diffEditor.border": c.bg3,
      // Without this, the hatching in the empty regions of the side-by-side
      // diff comes out in the default #cccccc33 grey — the biggest cold patch
      // on the diff screen.
      "diffEditor.diagonalFill": alpha(c.bg3, 0.5),
      "diffEditor.unchangedRegionBackground": c.bg1,
      "diffEditor.unchangedRegionForeground": c.muted,
      "diffEditorGutter.insertedLineBackground": alpha(c.success, 0.12),
      "diffEditorGutter.removedLineBackground": alpha(c.error, 0.12),

      // Diagnostics
      "editorError.foreground": c.error,
      "editorWarning.foreground": c.warning,
      "editorInfo.foreground": c.info,
      // The quick-fix light bulb shows up all the time. The defaults are #FFCC00
      // (pure yellow, clashes with gold) and #75BEFF (cold blue) for auto-fix.
      "editorLightBulb.foreground": c.gold,
      "editorLightBulbAutoFix.foreground": c.success,
      "editorLightBulbAi.foreground": c.orchid,

      // Merge conflicts — 12 keys that were all missing. VS Code's defaults are
      // teal (current) and blue (incoming), in large blocks in the middle of
      // the editor: the theme's biggest cold leak.
      "merge.currentHeaderBackground": ch("merge: current header"),
      "merge.currentContentBackground": ch("merge: current content"),
      "merge.incomingHeaderBackground": ch("merge: incoming header"),
      "merge.incomingContentBackground": ch("merge: incoming content"),
      "merge.commonHeaderBackground": alpha(c.bg3, 0.7),
      "merge.commonContentBackground": alpha(c.bg3, 0.35),
      "merge.border": c.bg3,
      "editorOverviewRuler.currentContentForeground": alpha(c.scarlet, 0.6),
      "editorOverviewRuler.incomingContentForeground": alpha(c.info, 0.6),
      "editorOverviewRuler.commonContentForeground": alpha(c.muted, 0.6),

      // Debugger variables panel: the defaults are literally the Dark+
      // colours (#c586c0 purple, #4e94ce blue, #b5cea8 green).
      "debugTokenExpression.name": syn("property"),
      "debugTokenExpression.value": c.fg1,
      "debugTokenExpression.string": syn("string"),
      "debugTokenExpression.number": syn("number"),
      "debugTokenExpression.boolean": syn("constant"),
      "debugTokenExpression.error": c.error,
      "debugConsole.infoForeground": c.info,
      "debugConsole.warningForeground": c.warning,
      "debugConsole.errorForeground": c.error,
      "debugConsole.sourceForeground": c.muted,
      "debugConsoleInputIcon.foreground": ui("accent"),
      // Shell integration is on by default in pwsh and bash; the default is a
      // #1B81A8 teal in the terminal gutter.
      "terminalCommandDecoration.defaultBackground": c.muted,
      "terminalCommandDecoration.successBackground": c.success,
      "terminalCommandDecoration.errorBackground": c.error,
      "minimap.errorHighlight": alpha(c.error, 0.7),
      "minimap.warningHighlight": alpha(c.warning, 0.7),
      "list.dropBackground": alpha(c.bg2, 0.8),
      "welcomePage.tileBackground": c.bg1,
      "welcomePage.tileHoverBackground": c.bg2,
      "welcomePage.tileBorder": c.bg3,
      "welcomePage.progress.background": c.bg3,
      "welcomePage.progress.foreground": ui("accent"),
      "mergeEditor.change.background": alpha(c.gold, 0.14),
      "mergeEditor.change.word.background": ch("mergeEditor: word"),
      "mergeEditor.conflict.unhandledUnfocused.border": alpha(c.error, 0.5),
      "mergeEditor.conflict.unhandledFocused.border": c.error,
      "mergeEditor.conflict.handledUnfocused.border": alpha(c.success, 0.4),
      "mergeEditor.conflict.handledFocused.border": c.success,

      // Workbench: general chrome
      "foreground": c.fg1,
      "focusBorder": ui("accent"),
      "selection.background": c.selection,
      "descriptionForeground": c.muted,
      "errorForeground": c.error,
      "textLink.foreground": ui("link"),
      "textLink.activeForeground": c.fg0,
      "textPreformat.foreground": syn("string"),
      "textBlockQuote.background": c.bg1,
      "textBlockQuote.border": ui("accent"),
      "textSeparator.foreground": c.bg3,
      "sash.hoverBorder": ui("accent"),
      "progressBar.background": ui("accent"),
      "editorGroup.border": c.bg3,
      "editorGroupHeader.noTabsBackground": c.bg0,
      // Feeds tree arrows, toolbar icons and folding controls.
      // Default #C5C5C5: a cold grey spread across the whole chrome.
      "icon.foreground": c.fg1,
      "editorGutter.foldingControlForeground": c.muted,

      // IntelliSense, Outline and breadcrumb icons. They were all missing, so
      // autocomplete opened with Dark+'s #B180D7 purple and #75BEFF blue on
      // every keystroke — the most visible gap left.
      // They follow the same syntax roles, so the icon matches the token.
      "symbolIcon.classForeground": syn("type"),
      "symbolIcon.interfaceForeground": syn("type"),
      "symbolIcon.structForeground": syn("type"),
      "symbolIcon.enumeratorForeground": syn("type"),
      "symbolIcon.typeParameterForeground": syn("type"),
      "symbolIcon.functionForeground": syn("function"),
      "symbolIcon.methodForeground": syn("function"),
      "symbolIcon.constructorForeground": syn("function"),
      "symbolIcon.eventForeground": syn("function"),
      "symbolIcon.variableForeground": syn("variable"),
      "symbolIcon.fieldForeground": syn("property"),
      "symbolIcon.propertyForeground": syn("property"),
      "symbolIcon.objectForeground": syn("property"),
      "symbolIcon.keyForeground": syn("property"),
      "symbolIcon.constantForeground": syn("constant"),
      "symbolIcon.enumeratorMemberForeground": syn("constant"),
      "symbolIcon.numberForeground": syn("number"),
      "symbolIcon.booleanForeground": syn("constant"),
      "symbolIcon.nullForeground": syn("constant"),
      "symbolIcon.stringForeground": syn("string"),
      "symbolIcon.textForeground": c.fg0,
      "symbolIcon.keywordForeground": syn("keyword"),
      "symbolIcon.operatorForeground": syn("operator"),
      "symbolIcon.moduleForeground": syn("namespace"),
      "symbolIcon.namespaceForeground": syn("namespace"),
      "symbolIcon.packageForeground": syn("namespace"),
      "symbolIcon.arrayForeground": c.fg1,
      "symbolIcon.unitForeground": c.fg1,
      "symbolIcon.referenceForeground": c.fg1,
      "symbolIcon.snippetForeground": c.fg1,
      "symbolIcon.colorForeground": c.fg1,
      "symbolIcon.fileForeground": c.fg1,
      "symbolIcon.folderForeground": c.fg1,

      // FLAT STRUCTURE: activity bar, sidebar, tabs, panel, status bar and
      // title bar share the editor's background. Regions are separated by
      // 1px bg3 borders — not grey panels. Only what floats above the code
      // (widgets, menus) rises to bg1.

      // Sidebar / activity bar
      "activityBar.background": c.bg0,
      "activityBar.foreground": c.fg0,
      "activityBar.inactiveForeground": c.muted,
      "activityBar.border": c.bg3,
      // White active-item indicator: red is reserved for the cursor, active
      // tab, badges and focus.
      "activityBar.activeBorder": c.fg0,
      "activityBar.activeBackground": alpha(c.bg2, 0),
      "activityBarBadge.background": ui("accent"),
      "activityBarBadge.foreground": c.bg0,
      "sideBar.background": c.bg0,
      "sideBar.foreground": c.fg1,
      "sideBar.border": c.bg3,
      "sideBarTitle.foreground": c.fg0,
      "sideBarSectionHeader.background": c.bg0,
      "sideBarSectionHeader.foreground": c.fg1,
      "sideBarSectionHeader.border": c.bg3,
      "sideBarStickyScroll.background": c.bg0,
      "sideBarStickyScroll.border": c.bg3,

      // Lists and trees
      "list.activeSelectionBackground": c.bg2,
      "list.activeSelectionForeground": c.fg0,
      "list.inactiveSelectionBackground": alpha(c.bg2, 0.7),
      "list.inactiveSelectionForeground": c.fg0,
      "list.focusBackground": c.bg2,
      "list.focusForeground": c.fg0,
      // Neutral outline: with the accent, every click in the explorer drew a
      // red rectangle. The bg2 background already marks the row.
      "list.focusOutline": c.bg3,
      "list.focusAndSelectionOutline": c.bg3,
      "list.hoverBackground": alpha(c.bg2, 0.5),
      "list.hoverForeground": c.fg0,
      "list.highlightForeground": ui("list-highlight"),
      "list.focusHighlightForeground": ui("list-highlight"),
      "list.errorForeground": c.error,
      "list.warningForeground": c.warning,
      "tree.indentGuidesStroke": c.bg3,
      "tree.inactiveIndentGuidesStroke": alpha(c.bg3, 0.5),

      // Status bar
      "statusBar.background": c.bg0,
      "statusBar.foreground": c.fg1,
      "statusBar.border": c.bg3,
      "statusBar.debuggingBackground": c.gold,
      "statusBar.debuggingForeground": c.bg0,
      "statusBar.debuggingBorder": c.gold,
      "statusBar.noFolderBackground": c.bg0,
      "statusBar.noFolderForeground": c.fg1,
      "statusBarItem.remoteBackground": ui("accent"),
      "statusBarItem.remoteForeground": c.bg0,
      "statusBarItem.hoverBackground": alpha(c.bg3, 0.6),
      "statusBarItem.activeBackground": alpha(c.bg3, 0.9),
      "statusBarItem.errorBackground": c.error,
      "statusBarItem.errorForeground": c.bg0,
      "statusBarItem.warningBackground": c.warning,
      "statusBarItem.warningForeground": c.bg0,

      // Title bar / tabs
      "titleBar.activeBackground": c.bg0,
      "titleBar.activeForeground": c.fg1,
      "titleBar.inactiveBackground": c.bg0,
      "titleBar.inactiveForeground": c.muted,
      "titleBar.border": c.bg3,
      // Tabs on the editor background, with no dividers between them; a bg3
      // line closes the strip underneath. The active tab stands out by its fg0
      // text and a scarlet underline — the jacket's thread running through the UI.
      "editorGroupHeader.tabsBackground": c.bg0,
      "editorGroupHeader.tabsBorder": c.bg3,
      "editorGroupHeader.border": c.bg3,
      "tab.activeBackground": c.bg0,
      "tab.activeForeground": c.fg0,
      "tab.activeBorder": ui("accent"),
      "tab.activeBorderTop": alpha(c.bg0, 0),
      "tab.unfocusedActiveBorder": alpha(ui("accent"), 0.4),
      "tab.unfocusedActiveBorderTop": alpha(c.bg0, 0),
      "tab.inactiveBackground": c.bg0,
      "tab.inactiveForeground": c.muted,
      "tab.border": c.bg0,
      "tab.unfocusedActiveForeground": c.fg1,
      "tab.unfocusedInactiveForeground": c.muted,
      "tab.hoverBackground": c.bg1,
      "tab.hoverForeground": c.fg1,
      "tab.activeModifiedBorder": c.warning,
      "breadcrumb.background": c.bg0,
      "breadcrumb.foreground": c.muted,
      "breadcrumb.focusForeground": c.fg0,
      "breadcrumb.activeSelectionForeground": ui("accent"),
      "breadcrumbPicker.background": c.bg1,

      // Panels, terminal
      "panel.background": c.bg0,
      "panel.border": c.bg3,
      "panelTitle.activeForeground": c.fg0,
      "panelTitle.activeBorder": c.fg0,
      "panelStickyScroll.background": c.bg0,
      "panelStickyScroll.border": c.bg3,
      "panelTitle.inactiveForeground": c.muted,
      "panelInput.border": c.bg3,
      "terminal.background": ui("terminal-bg"),
      "terminal.foreground": c.fg0,
      "terminal.selectionBackground": alpha(c.selection, 0.7),
      "terminalCursor.foreground": ui("cursor"),
      "terminal.border": c.bg3,
      // 16 ANSI slots, all distinct: the 8 bases come from roles.terminal and
      // each bright is the lightened base. Blue and cyan no longer collide.
      "terminal.ansiBlack": ansi("black"),
      "terminal.ansiRed": ansi("red"),
      "terminal.ansiGreen": ansi("green"),
      "terminal.ansiYellow": ansi("yellow"),
      "terminal.ansiBlue": ansi("blue"),
      "terminal.ansiMagenta": ansi("magenta"),
      "terminal.ansiCyan": ansi("cyan"),
      "terminal.ansiWhite": ansi("white"),
      "terminal.ansiBrightBlack": bright("black"),
      "terminal.ansiBrightRed": bright("red"),
      "terminal.ansiBrightGreen": bright("green"),
      "terminal.ansiBrightYellow": bright("yellow"),
      "terminal.ansiBrightBlue": bright("blue"),
      "terminal.ansiBrightMagenta": bright("magenta"),
      "terminal.ansiBrightCyan": bright("cyan"),
      "terminal.ansiBrightWhite": bright("white"),

      // Inputs, buttons, dropdowns
      // Inputs: one step above the background, outlined in bg3. The
      // placeholder is muted itself (5.0:1 on bg1).
      "input.background": c.bg1,
      "input.foreground": c.fg0,
      "input.border": c.bg3,
      "input.placeholderForeground": c.muted,
      "inputOption.activeBorder": ui("accent"),
      "inputOption.activeForeground": c.fg0,
      "inputOption.activeBackground": alpha(ui("accent"), 0.25),
      "inputValidation.errorBackground": c.bg1,
      "inputValidation.errorBorder": c.error,
      "inputValidation.warningBackground": c.bg1,
      "inputValidation.warningBorder": c.warning,
      "inputValidation.infoBackground": c.bg1,
      "inputValidation.infoBorder": c.info,
      // WHITE primary button with near-black text.
      // Red never becomes a button colour — it's kept for what needs attention.
      "button.background": c.fg0,
      "button.foreground": c.bg0,
      "button.hoverBackground": c.fg1,
      "button.border": alpha(c.bg0, 0),
      "button.separator": alpha(c.bg0, 0.4),
      "button.secondaryBackground": c.bg2,
      "button.secondaryForeground": c.fg0,
      "button.secondaryHoverBackground": c.bg3,
      "extensionButton.prominentBackground": c.fg0,
      "extensionButton.prominentForeground": c.bg0,
      "extensionButton.prominentHoverBackground": c.fg1,
      "dropdown.background": c.bg1,
      "dropdown.foreground": c.fg0,
      "dropdown.border": c.bg3,
      "checkbox.background": c.bg1,
      "checkbox.foreground": c.fg0,
      "checkbox.border": c.bg3,

      // Menus and keybinding labels
      "menu.background": c.bg1,
      "menu.foreground": c.fg1,
      "menu.border": c.bg3,
      "menu.selectionBackground": c.bg2,
      "menu.selectionForeground": c.fg0,
      "menu.separatorBackground": c.bg3,
      "menubar.selectionBackground": c.bg2,
      "menubar.selectionForeground": c.fg0,
      "keybindingLabel.background": c.bg2,
      "keybindingLabel.foreground": c.fg0,
      "keybindingLabel.border": c.bg3,
      "keybindingLabel.bottomBorder": c.bg3,

      // Quick open / command palette
      "quickInput.background": c.bg1,
      "quickInput.foreground": c.fg1,
      "quickInputTitle.background": c.bg2,
      "quickInputList.focusBackground": c.bg2,
      "quickInputList.focusForeground": c.fg0,
      "pickerGroup.foreground": ui("accent"),
      "pickerGroup.border": c.bg3,

      // Settings UI
      "settings.headerForeground": c.fg0,
      "settings.modifiedItemIndicator": c.warning,
      "settings.focusedRowBackground": alpha(c.bg2, 0.5),
      "settings.rowHoverBackground": alpha(c.bg2, 0.3),

      // Debug
      "debugToolBar.background": c.bg2,
      "debugToolBar.border": c.bg3,
      "debugIcon.breakpointForeground": c.error,
      "debugIcon.breakpointDisabledForeground": c.muted,
      "editor.stackFrameHighlightBackground": ch("stack frame"),
      "editor.focusedStackFrameHighlightBackground": ch("focused stack frame"),

      // Testing
      "testing.iconPassed": c.success,
      "testing.iconFailed": c.error,
      "testing.iconQueued": c.warning,
      "testing.iconSkipped": c.muted,

      // Widgets (autocomplete, hover, peek)
      "editorWidget.background": c.bg1,
      "editorWidget.foreground": c.fg1,
      "editorWidget.border": c.bg3,
      "editorSuggestWidget.background": c.bg1,
      "editorSuggestWidget.foreground": c.fg1,
      "editorSuggestWidget.border": c.bg3,
      "editorSuggestWidget.selectedBackground": c.bg2,
      "editorSuggestWidget.selectedForeground": c.fg0,
      "editorSuggestWidget.highlightForeground": ui("list-highlight"),
      "editorSuggestWidget.focusHighlightForeground": ui("list-highlight"),
      "editorHoverWidget.background": c.bg1,
      "editorHoverWidget.foreground": c.fg1,
      "editorHoverWidget.border": c.bg3,
      "peekView.border": ui("accent"),
      "peekViewTitle.background": c.bg2,
      "peekViewTitleLabel.foreground": c.fg0,
      "peekViewTitleDescription.foreground": c.muted,
      "peekViewEditor.background": c.bg1,
      "peekViewEditor.matchHighlightBackground": ch("peek: match"),
      "peekViewResult.background": c.bg1,
      "peekViewResult.selectionBackground": c.bg2,
      "peekViewResult.selectionForeground": c.fg0,
      "peekViewResult.lineForeground": c.fg1,
      "peekViewResult.fileForeground": c.fg0,
      "peekViewResult.matchHighlightBackground": ch("peek: match"),

      // Git decorations
      "gitDecoration.modifiedResourceForeground": c.warning,
      "gitDecoration.addedResourceForeground": c.success,
      "gitDecoration.deletedResourceForeground": c.error,
      "gitDecoration.untrackedResourceForeground": c.jade,
      "gitDecoration.ignoredResourceForeground": c.muted,
      "gitDecoration.conflictingResourceForeground": c.orchid,
      "gitDecoration.stageModifiedResourceForeground": c.warning,
      "gitDecoration.stageDeletedResourceForeground": c.error,
      // Defaults #73C991 (Dark+ green) and #8db9e2 (cold blue).
      "gitDecoration.renamedResourceForeground": c.success,
      "gitDecoration.submoduleResourceForeground": c.orchid,

      // Notebooks
      "notebook.cellEditorBackground": c.bg0,
      "notebook.focusedCellBorder": ui("accent"),
      "notebook.cellBorderColor": c.bg3,

      // Notifications, badge, scrollbar
      "badge.background": ui("accent"),
      "badge.foreground": c.bg0,
      "notificationCenterHeader.background": c.bg2,
      "notifications.background": c.bg1,
      "notifications.border": c.bg3,
      "notificationLink.foreground": ui("link"),
      "notificationsErrorIcon.foreground": c.error,
      "notificationsWarningIcon.foreground": c.warning,
      "notificationsInfoIcon.foreground": c.info,
      "scrollbarSlider.background": alpha(c.bg3, 0.5),
      "scrollbarSlider.hoverBackground": alpha(c.bg3, 0.8),
      "scrollbarSlider.activeBackground": alpha(c.muted, 0.6),
      // A shadow is nearly invisible on near-black; widgets get their shape
      // from the bg3 border (widget.border).
      "widget.shadow": alpha(c.bg0, 0.6),
      "widget.border": c.bg3,
      "scrollbar.shadow": alpha(c.bg0, 0),
    },

    tokenColors: [
      { scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: syn("comment"), fontStyle: "italic" } },
      // Documentation tags (@param, <summary>, parameter names in
      // JSDoc/Javadoc) one step above the comment, still italic — without
      // inheriting the code's tag/keyword colour. The "comment X" selectors
      // cover the grammars; comment.documentation.* covers what Roslyn sends
      // for C# XML docs.
      // The selector must match as many segments as the rule it wants to
      // beat: "comment variable" loses to "variable.parameter", because the
      // TextMate engine decides first by depth in the token's scope and only
      // then by ancestors.
      { scope: ["comment keyword", "comment keyword.other", "comment storage.type",
                "comment storage.type.class", "comment variable", "comment variable.parameter",
                "comment variable.other", "comment entity.name", "comment entity.name.tag",
                "comment entity.name.type", "comment punctuation.definition.tag",
                "comment punctuation.definition.block.tag",
                "comment.documentation.name", "comment.documentation.delimiter",
                "comment.documentation.attribute", "keyword.other.documentation",
                "storage.type.class.jsdoc"],
        settings: { foreground: syn("doctag"), fontStyle: "italic" } },
      // Code disabled by #if (C#): dimmed like a comment, without italics.
      { scope: ["support.other.excluded"],
        settings: { foreground: syn("comment"), fontStyle: "" } },

      { scope: ["keyword", "keyword.control"],
        settings: { foreground: syn("keyword") } },

      // Declarations kept apart from control flow (see roles.syntax.storage)
      { scope: ["storage.type", "storage.modifier"],
        settings: { foreground: syn("storage") } },

      // Reserved words that are NOT control flow go to the storage grey,
      // even when the grammar calls them keywords:
      //  - modules: import/export/from/as (TS, Python), import/package
      //    (Java), use (Rust), using (C#), #include/#define (C/C++);
      //  - keyword.other in general: fn/impl/async (Rust), typedef/concept/
      //    requires/= default (C++), debugger (TS);
      //  - keyword.cs and keyword.type (C#): where Roslyn sends every
      //    non-control reserved word (public, int, var, new…).
      { scope: ["keyword.control.import", "keyword.control.export", "keyword.control.from",
                "keyword.control.as", "keyword.control.type.ts", "keyword.control.type.tsx",
                "keyword.control.default.ts", "keyword.control.default.tsx",
                "keyword.control.default.js", "keyword.control.default.jsx",
                "keyword.other", "keyword.cs", "keyword.type", "keyword.generator.asterisk",
                "keyword.control.directive", "keyword.preprocessor", "keyword.control.new",
                "keyword.operator.new"],
        settings: { foreground: syn("storage") } },
      // ...except conditional compilation (#if, #ifdef, #else), which is
      // compile-time control flow, and C#'s await, which Roslyn classifies as
      // a control keyword.
      { scope: ["keyword.control.directive.conditional", "keyword.preprocessor.if",
                "keyword.preprocessor.elif", "keyword.preprocessor.else",
                "keyword.preprocessor.endif", "keyword.operator.expression.await"],
        settings: { foreground: syn("keyword") } },
      // Roslyn also sends true/false/null to keyword.cs: the C# TextMate
      // grammar follows the same grey so the colour doesn't change when the
      // server loads.
      { scope: ["constant.language.null.cs", "constant.language.boolean.true.cs",
                "constant.language.boolean.false.cs"],
        settings: { foreground: syn("storage") } },
      // Java's ternary comes in as keyword.control; it's an operator.
      { scope: ["keyword.control.ternary"],
        settings: { foreground: syn("operator") } },
      // ...but where the grammar uses storage.type for real TYPES
      // (primitive int/float, Java types), it goes back to being a type.
      { scope: ["storage.type.primitive", "storage.type.java", "storage.type.generic.java",
                "storage.type.object.array.java", "storage.type.built-in",
                "storage.type.numeric.rust", "storage.type.core.rust"],
        settings: { foreground: syn("type") } },
      // String prefix (f"…", r"…", b"…") is part of the literal, not storage.
      { scope: ["storage.type.string.python"],
        settings: { foreground: syn("string") } },

      { scope: ["string", "string.quoted", "punctuation.definition.string"],
        settings: { foreground: syn("string") } },

      { scope: ["constant.numeric", "constant.numeric punctuation",
                "punctuation.separator.dot.decimal", "keyword.other.unit"],
        settings: { foreground: syn("number") } },

      { scope: ["constant.language", "constant.character", "variable.other.constant", "support.constant"],
        settings: { foreground: syn("constant") } },
      // The TS grammar marks EVERY const declaration as a constant. Without
      // this exception every `const x = …` lit up orchid and the colour lost
      // its meaning; it's kept for literals and CONSTANTS_IN_UPPER_CASE.
      { scope: ["meta.definition.variable variable.other.constant"],
        settings: { foreground: syn("variable") } },
      // In TS the server marks every const as readonly and the theme paints
      // them as variables (see semanticTokenColors). TextMate follows, so the
      // CONSTANT doesn't flash orchid until the server loads.
      { scope: ["variable.other.constant.ts", "variable.other.constant.tsx",
                "variable.other.constant.js", "variable.other.constant.jsx"],
        settings: { foreground: syn("variable") } },
      { scope: ["constant.other.caps", "entity.name.function.preprocessor",
                "entity.name.function.macro.c", "entity.name.function.macro.cpp"],
        settings: { foreground: syn("constant") } },

      { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function",
                "meta.function-call.generic.python"],
        settings: { foreground: syn("function") } },

      { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"],
        settings: { foreground: syn("type") } },

      { scope: ["variable", "meta.definition.variable"],
        settings: { foreground: syn("variable") } },

      // this / self / super: a variable to the grammar, a keyword to the reader
      { scope: ["variable.language", "variable.parameter.function.language.special",
                "variable.language.special"],
        settings: { foreground: syn("builtin"), fontStyle: "italic" } },

      { scope: ["entity.name.namespace", "entity.name.module", "storage.modifier.package",
                "entity.name.scope-resolution"],
        settings: { foreground: syn("namespace") } },

      // Metaprogramming in a single colour, in every language: @decorator
      // (TS, Python), @Annotation (Java), #[attribute] (Rust), [[attribute]]
      // (C++). The compound selector beats the variable/function rule the
      // grammar applies to the name inside the decorator.
      { scope: ["meta.decorator", "entity.name.function.decorator", "punctuation.decorator",
                "punctuation.definition.decorator", "meta.decorator variable.other",
                "meta.decorator entity.name.function", "meta.function.decorator support.type",
                "meta.function.decorator support.function",
                "meta.function.decorator entity.name.function",
                "storage.type.annotation", "punctuation.definition.annotation",
                "meta.attribute.rust", "punctuation.definition.attribute",
                "punctuation.brackets.attribute",
                "entity.other.attribute", "punctuation.section.attribute"],
        settings: { foreground: syn("decorator") } },
      // Rust lifetimes ('a) are generic parameters: type colour, italic.
      { scope: ["entity.name.type.lifetime", "punctuation.definition.lifetime",
                "storage.modifier.lifetime"],
        settings: { foreground: syn("type"), fontStyle: "italic" } },

      { scope: ["variable.parameter"],
        settings: { foreground: syn("parameter"), fontStyle: "italic" } },

      { scope: ["variable.other.property", "support.variable.property", "meta.object-literal.key"],
        settings: { foreground: syn("property") } },

      { scope: ["keyword.operator"],
        settings: { foreground: syn("operator") } },

      { scope: ["punctuation", "meta.brace"],
        settings: { foreground: syn("punctuation") } },

      { scope: ["entity.name.tag"],
        settings: { foreground: syn("tag") } },

      { scope: ["entity.other.attribute-name"],
        settings: { foreground: syn("attribute"), fontStyle: "italic" } },

      { scope: ["string.regexp", "keyword.control.anchor.regexp",
                "keyword.operator.quantifier.regexp", "keyword.operator.or.regexp",
                "keyword.operator.negation.regexp", "string.regexp keyword.other"],
        settings: { foreground: syn("regexp") } },
      // A named group's name is an identifier, like (?<title>…) in TS — not a tag.
      { scope: ["entity.name.tag.named.group.regexp"],
        settings: { foreground: syn("variable") } },

      { scope: ["constant.character.escape"],
        settings: { foreground: syn("escape") } },

      // The ${ } marks stand out from the template string body
      { scope: ["punctuation.definition.template-expression",
                "punctuation.section.embedded", "punctuation.definition.interpolation",
                "meta.interpolation.rust", "storage.type.format.python"],
        settings: { foreground: syn("interpolation") } },
      // ...but what's INSIDE them is ordinary code again
      { scope: ["meta.embedded", "meta.template.expression"],
        settings: { foreground: syn("variable") } },

      // Markdown / markup
      { scope: ["markup.heading", "entity.name.section"],
        settings: { foreground: syn("keyword"), fontStyle: "bold" } },
      { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
      { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
      { scope: ["markup.inline.raw", "markup.fenced_code"],
        settings: { foreground: syn("string") } },
      { scope: ["markup.underline.link"],
        settings: { foreground: syn("function") } },
      // Also the scope rust-analyzer sends `mut` variables to: the underline
      // marks mutability without spending a colour.
      { scope: ["markup.underline"], settings: { fontStyle: "underline" } },
      { scope: ["markup.quote"],
        settings: { foreground: syn("quote") } },
      { scope: ["markup.list punctuation.definition.list", "beginning.punctuation.definition.list"],
        settings: { foreground: syn("keyword") } },

      // Diffs and patches
      { scope: ["markup.inserted", "meta.diff.header.to-file"],
        settings: { foreground: syn("inserted") } },
      { scope: ["markup.deleted", "meta.diff.header.from-file"],
        settings: { foreground: syn("deleted") } },
      { scope: ["markup.changed"],
        settings: { foreground: syn("changed") } },
      { scope: ["meta.diff.range", "punctuation.definition.range.diff"],
        settings: { foreground: syn("function") } },

      // JSON keys
      { scope: ["support.type.property-name.json"],
        settings: { foreground: syn("function") } },

      // CSS. The empty fontStyle is required: class/id selectors are
      // entity.other.attribute-name, and without it they would inherit the
      // italics of the HTML attribute rule — the style guide limits italics to
      // comments, parameters and HTML attributes.
      //
      // The list must cover SCSS and LESS explicitly. SCSS reuses the `.css`
      // scopes for class/id/pseudo, but has its own for `%placeholder` and for
      // the `&__elem` suffix — which is how BEM writes almost every selector.
      // LESS reuses nothing: it uses a `.less` suffix everywhere, so none of
      // the rules above reached it and EVERY class selector in a .less file
      // came out italic and in the wrong colour. Exactly the bug this block exists to
      // prevent, just outside .css.
      { scope: ["entity.other.attribute-name.class.css", "entity.other.attribute-name.id.css",
                "entity.other.attribute-name.pseudo-class.css", "entity.other.attribute-name.pseudo-element.css",
                "entity.other.attribute-name.placeholder.css",
                "entity.other.attribute-name.parent-selector-suffix.css",
                "entity.other.attribute-name.class.less", "entity.other.attribute-name.id.less",
                "entity.other.attribute-name.pseudo-class.less", "entity.other.attribute-name.pseudo-element.less",
                "entity.other.attribute-name.pseudo-class.extend.less",
                "entity.other.attribute-name.parent.less"],
        settings: { foreground: syn("type"), fontStyle: "" } },
      { scope: ["support.type.property-name.css"],
        settings: { foreground: syn("variable") } },
      { scope: ["keyword.other.unit.css", "constant.numeric.css"],
        settings: { foreground: syn("number") } },

      { scope: ["invalid", "invalid.illegal"],
        settings: { foreground: p.palette.error } },
    ],

    // Semantic tokens come from the language server and paint OVER
    // TextMate. Types without a rule here fall back to the semanticTokenScopes
    // each extension declares (rust-analyzer, C#, Java, C/C++) and from there
    // to the TextMate rules above — which is why several fixes live there, in
    // the fallback scopes (keyword.other.rust, keyword.cs, storage.type.annotation…).
    //
    // There is NO rule for "keyword": rust-analyzer and Roslyn emit keyword
    // for almost every reserved word (fn, let, pub, public, int, true…).
    // Without a rule it falls to keyword.other.rust / keyword.cs (grey), and
    // only keyword.controlFlow / controlKeyword reach scarlet.
    semanticTokenColors: {
      "function": syn("function"),
      "method": syn("function"),
      "magicFunction": syn("function"),
      "class": syn("type"),
      "struct": syn("type"),
      "union": syn("type"),
      "interface": syn("type"),
      "type": syn("type"),
      "typeAlias": syn("type"),
      "builtinType": syn("type"),
      "selfTypeKeyword": syn("type"),
      "concept": syn("type"),
      "enum": syn("type"),
      "typeParameter": syn("type"),
      "enumMember": syn("constant"),
      "const": syn("constant"),
      "constant": syn("constant"),

      // readonly is NOT a synonym for constant: in TS every const is readonly,
      // in Java every final, in C++ every const. Only real constants turn
      // orchid — static, global, library — and, in Python, whatever Pylance
      // marks as readonly (Final, UPPER_CASE).
      "variable.readonly": syn("variable"),
      "property.readonly.static": syn("constant"),
      "variable.readonly.static": syn("constant"),
      "variable.readonly.global": syn("constant"),
      "variable.readonly.globalScope": syn("constant"),
      "variable.readonly.fileScope": syn("constant"),
      "variable.readonly.defaultLibrary": syn("constant"),
      "variable.readonly:python": syn("constant"),
      "variable.defaultLibrary": { foreground: syn("builtin"), italic: true },

      "parameter": { foreground: syn("parameter"), italic: true },
      "selfParameter": { foreground: syn("builtin"), italic: true },
      "clsParameter": { foreground: syn("builtin"), italic: true },
      "selfKeyword": { foreground: syn("builtin"), italic: true },
      "property": syn("property"),
      "annotationMember": syn("property"),
      "comment": { foreground: syn("comment"), italic: true },
      "namespace": syn("namespace"),
      "module": syn("namespace"),

      // Metaprogramming (see the TextMate decorator rule)
      "decorator": syn("decorator"),
      "*.decorator": syn("decorator"),
      "annotation": syn("decorator"),
      "attribute": syn("decorator"),
      "builtinAttribute": syn("decorator"),
      "deriveHelper": syn("decorator"),
      "derive": syn("type"),
      // A C/C++ macro is almost always an UPPER_CASE constant; a Rust macro
      // (println!, vec!) is called like a function.
      "macro": syn("constant"),
      "macro:rust": syn("function"),
      "lifetime": { foreground: syn("type"), italic: true },

      "number": syn("number"),
      "string": syn("string"),
      "formatSpecifier": syn("interpolation"),
      "escapeSequence": syn("escape"),
    },
  };
}
