# Peblor Tool Capability Matrix

This matrix maps major fragment/content kinds to the best discovery, explain, scaffold, and validate tools.

## Sections

- Discover: `list_section_types`
- Explain one: `explain_section_type`
- Scaffold: `scaffold_section_type`
- Validate one file: `validate_section`
- Validate many: `batch_validate_fragments` with `kind: "section"`

## Elements

- Discover: `list_element_types`
- Explain one: `explain_element_type`
- Deep schema: `get_element_schema`
- Explain path: `explain_field_path`
- Path map: `list_field_paths`
- Scaffold: `scaffold_element_type`
- Validate one file: `validate_element`
- Validate many: `batch_validate_fragments` with `kind: "element"`

## Trigger Actions

- Discover all: `list_action_types`
- Explain one: `explain_action_type`
- Scaffold: `scaffold_action_type`
- Validate one object: `validate_action`
- Validate many files: `batch_validate_fragments` with `kind: "action"`

## Backgrounds

- Discover: `list_bg_types`
- Explain one: `explain_bg_type`
- Scaffold: `scaffold_bg_type`
- Validate one file: `validate_bg`
- Validate many: `batch_validate_fragments` with `kind: "bg"`

## Modules

- Discover files: `list_modules`
- Discover type details: `list_module_types`
- Explain one: `explain_module_type`
- Scaffold: `scaffold_module_type`
- Validate one file: `validate_module_fragment`
- Validate many: `batch_validate_fragments` with `kind: "module"`

## Overlays

- Discover files: `list_overlays`
- Read one: `read_overlay`
- Validate one file: `validate_overlay_fragment`
- Validate many: `batch_validate_fragments` with `kind: "overlay"`

## Presets

- List presets: `list_presets`
- Read one: `read_preset`
- Scaffold starter: `scaffold_preset`
- Validate one preset file: `validate_preset`

## Page/Route Operations

- Validate full page: `validate_page`
- Doctor pipelines: `doctor_page`, `doctor_fragment`
- Audit/lint: `audit_page`, `audit_all_pages`, `lint_page`, `lint_all_pages`
- Section surgery: `list_sections`, `add_section`, `remove_section`, `move_section`
- Edit JSON patch: `edit_page`, `batch_edit_pages`
- Stateful edits: `open_page_session` + patch/undo/commit session tools

## Diagnostics Helpers

- Suggest fixes: `suggest_fix`
- Resolve assets: `resolve_asset_url`
- Check routes: `check_routes`
