import { validatePage } from "./validate-page.js";
import { diffPages } from "./diff-pages.js";
import { migrateContent } from "./migrate-content.js";
import { doctorPage, doctorFragment } from "./doctor-page.js";
import { previewPage } from "./preview-page.js";
import { batchValidate } from "./batch-validate.js";
import { listPagesTool } from "./list-pages.js";
import { listPresetsTool } from "./list-presets.js";
import { listModals } from "./list-modals.js";
import { listModules } from "./list-modules.js";
import { listComponents } from "./list-components.js";
import { searchPresets } from "./search-presets.js";
import { readPage } from "./read-page.js";
import { readPreset } from "./read-preset.js";
import { readModal } from "./read-modal.js";
import { readModule } from "./read-module.js";
import { scaffoldPage } from "./scaffold-page.js";
import { editPage } from "./edit-page.js";
import { proposeComponent } from "./propose-component.js";
import { probeComponents } from "./probe-components.js";
import { explainComponent } from "./explain-component.js";
import { getElementSchema } from "./get-element-schema.js";
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
  diffPages,
  migrateContent,
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
  listComponents,
  searchPresets,
  grepPages,
  // read content
  readPage,
  readPreset,
  readModal,
  readModule,
  // write / generate
  scaffoldPage,
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
