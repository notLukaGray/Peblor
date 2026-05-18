import { validatePage } from "./validate-page.js";
import { validateSection } from "./validate-section.js";
import { validateElement } from "./validate-element.js";
import { validateBg } from "./validate-bg.js";
import { validateFragment } from "./validate-fragment.js";
import { diffPages } from "./diff-pages.js";
import { migrateContent } from "./migrate-content.js";
import { batchValidateFragments } from "./batch-validate-fragments.js";
import { doctorPage, doctorFragment } from "./doctor-page.js";
import { previewPage } from "./preview-page.js";
import { batchValidate } from "./batch-validate.js";
import { listPagesTool } from "./list-pages.js";
import { listPresetsTool } from "./list-presets.js";
import { listModals } from "./list-modals.js";
import { listModules } from "./list-modules.js";
import { listModuleTypes } from "./list-module-types.js";
import { explainModuleType } from "./explain-module-type.js";
import { listComponents } from "./list-components.js";
import { listElementTypes } from "./list-element-types.js";
import { explainElementType } from "./explain-element-type.js";
import { listBgTypes } from "./list-bg-types.js";
import { explainBgType } from "./explain-bg-type.js";
import { searchPresets } from "./search-presets.js";
import { readPage } from "./read-page.js";
import { readPreset } from "./read-preset.js";
import { readModal } from "./read-modal.js";
import { readModule } from "./read-module.js";
import { scaffoldPage } from "./scaffold-page.js";
import { scaffoldElementTypeTool } from "./scaffold-element-type.js";
import { scaffoldBgTypeTool } from "./scaffold-bg-type.js";
import { scaffoldModuleTypeTool } from "./scaffold-module-type.js";
import { scaffoldSectionTypeTool } from "./scaffold-section-type.js";
import { scaffoldActionTypeTool } from "./scaffold-action-type.js";
import { scaffoldPreset } from "./scaffold-preset.js";
import { editPage } from "./edit-page.js";
import { proposeComponent } from "./propose-component.js";
import { probeComponents } from "./probe-components.js";
import { explainComponent } from "./explain-component.js";
import { getElementSchema } from "./get-element-schema.js";
import { explainFieldPath } from "./explain-field-path.js";
import { listFieldPaths } from "./list-field-paths.js";
import { listActionTypes } from "./list-action-types.js";
import { listSectionTypes } from "./list-section-types.js";
import { explainActionType } from "./explain-action-type.js";
import { validateAction } from "./validate-action.js";
import { validateModuleFragment } from "./validate-module-fragment.js";
import { validateOverlayFragment } from "./validate-overlay-fragment.js";
import { suggestFix } from "./suggest-fix.js";
import { schemaDoctor } from "./schema-doctor.js";
import { explainSectionType } from "./explain-section-type.js";
import { listSections, addSection, removeSection, moveSection } from "./section-surgery.js";
import { grepPages } from "./grep-pages.js";
import { writeModal, writeModule } from "./write-content.js";
import {
  listProposals,
  checkProposal,
  checkAllProposals,
  runConformanceTool,
} from "./proposals.js";
import {
  openPageSession,
  patchPageSession,
  undoPageSession,
  previewPageSession,
  commitPageSession,
  closePageSession,
  listPageSessions,
} from "./page-session.js";
// New tools
import { generatePage } from "./generate-page.js";
import { fillSection } from "./fill-section.js";
import { suggestLayout } from "./suggest-layout.js";
import { clonePage } from "./clone-page.js";
import { renameRoute } from "./rename-route.js";
import { extractPreset } from "./extract-preset.js";
import { listUnusedPresets } from "./list-unused-presets.js";
import { listAssets } from "./list-assets.js";
import { resolveAssetUrl } from "./resolve-asset-url.js";
import { auditAssets } from "./audit-assets.js";
import { auditPage, auditAllPages } from "./audit-page.js";
import { lintPage, lintAllPages } from "./lint-page.js";
import { checkRoutes } from "./check-routes.js";
import { listOverlays, readOverlay, writeOverlay } from "./overlays.js";
import { setPageMetadata } from "./set-page-metadata.js";
import { setAnalytics } from "./set-analytics.js";
import { listTags } from "./list-tags.js";
import { listProjectGroups } from "./list-project-groups.js";
import { setPageTags } from "./set-page-tags.js";
import { batchEditPages } from "./batch-edit-pages.js";
import { generateSitemap } from "./generate-sitemap.js";
import { listCapabilities } from "./list-capabilities.js";
import { validateCapability } from "./validate-capability.js";
import { exportPage } from "./export-page.js";
import { exportSession, importSession } from "./session-persistence.js";

export const allTools = [
  // pipeline / validation
  validatePage,
  validateSection,
  validateElement,
  validateBg,
  validateFragment,
  validateModuleFragment,
  validateOverlayFragment,
  diffPages,
  migrateContent,
  batchValidateFragments,
  doctorPage,
  doctorFragment,
  previewPage,
  batchValidate,
  runConformanceTool,
  // discovery
  listPagesTool,
  listPresetsTool,
  listModals,
  listModules,
  listModuleTypes,
  explainModuleType,
  listComponents,
  listElementTypes,
  explainElementType,
  listBgTypes,
  explainBgType,
  searchPresets,
  grepPages,
  // read content
  readPage,
  readPreset,
  readModal,
  readModule,
  // write / generate
  scaffoldPage,
  scaffoldElementTypeTool,
  scaffoldBgTypeTool,
  scaffoldModuleTypeTool,
  scaffoldSectionTypeTool,
  scaffoldActionTypeTool,
  scaffoldPreset,
  editPage,
  addSection,
  removeSection,
  moveSection,
  listSections,
  writeModal,
  writeModule,
  proposeComponent,
  // proposals
  listProposals,
  checkProposal,
  checkAllProposals,
  // component knowledge
  probeComponents,
  explainComponent,
  getElementSchema,
  explainFieldPath,
  listFieldPaths,
  suggestFix,
  schemaDoctor,
  listActionTypes,
  explainActionType,
  validateAction,
  listSectionTypes,
  explainSectionType,
  // page sessions (MCP-native stateful editing)
  openPageSession,
  patchPageSession,
  undoPageSession,
  previewPageSession,
  commitPageSession,
  closePageSession,
  listPageSessions,
  // AI generation (Theme A)
  generatePage,
  fillSection,
  suggestLayout,
  // cross-page operations (Theme B)
  clonePage,
  renameRoute,
  extractPreset,
  listUnusedPresets,
  // asset pipeline (Theme C)
  listAssets,
  resolveAssetUrl,
  auditAssets,
  // advanced diagnostics (Theme D)
  auditPage,
  auditAllPages,
  lintPage,
  lintAllPages,
  checkRoutes,
  // overlay & metadata management (Theme E)
  listOverlays,
  readOverlay,
  writeOverlay,
  setPageMetadata,
  setAnalytics,
  // tag & filter management (Theme F)
  listTags,
  listProjectGroups,
  setPageTags,
  // batch & bulk operations (Theme G)
  batchEditPages,
  generateSitemap,
  // capability schema tooling (Theme H)
  listCapabilities,
  validateCapability,
  exportPage,
  // session persistence (Theme I)
  exportSession,
  importSession,
];
