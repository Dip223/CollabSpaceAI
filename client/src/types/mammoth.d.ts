// mammoth's published type support varies by version and isn't reliably
// bundled — declaring the module here (rather than depending on
// @types/mammoth existing/matching) means an npm install can never fail
// the build over missing types for this package. We only use
// convertToHtml with an arrayBuffer input, which is treated as `any`
// and used accordingly in Workspace.tsx.
declare module "mammoth";