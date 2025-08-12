import type { Field } from "@itwin/presentation-common";

export interface FieldTypeInfoResult {
  type: any;
  isNavigation: boolean;
  target?: string;
  isFilterable: boolean;
}

// Utility: get type info and filterability for a field (no React deps)
export function getFieldTypeInfo(field?: Field): FieldTypeInfoResult {
  if (!field) return { type: undefined, isNavigation: false, target: undefined, isFilterable: false };
  const property = (field as any).isPropertiesField?.() ? (field as any).properties?.[0]?.property : undefined;
  const relatedClassPath = (field as any).relatedClassPath;
  const pathFromRoot = (field as any).pathFromRoot;
  const isRelatedInstanceSpecification = (field as any).type === "relatedInstanceSpecification";
  // Additional heuristics for nav fields like Model/Category that may not carry relationship metadata
  const nameLower = ((field as any).name ?? "").toString().toLowerCase();
  const labelLower = ((field as any).label ?? "").toString().toLowerCase();
  const explicitNavType = (field as any).type === "navigation" || (field as any).type === "navigationProperty";
  const looksLikeModel = nameLower.includes("model") || labelLower.includes("model");
  const looksLikeCategory = nameLower.includes("category") || labelLower.includes("category");
  const looksLikeTypeDef = nameLower.includes("typedefinition") || labelLower.includes("typedefinition") || labelLower.includes("type");
  const looksLikeParent = nameLower.includes("parent") || labelLower.includes("parent");
  // Consider it a navigation/related field when Presentation indicates it OR via heuristics
  const isNavigation = !!(
    relatedClassPath ||
    pathFromRoot ||
    isRelatedInstanceSpecification ||
    explicitNavType ||
    looksLikeModel ||
    looksLikeCategory ||
    looksLikeTypeDef ||
    looksLikeParent
  );
  const isStringProperty = property?.type === "string";
  const isFilterable = isStringProperty || isNavigation;
  let target: string | undefined;
  if (Array.isArray(relatedClassPath) && relatedClassPath.length > 0) {
    target = relatedClassPath[relatedClassPath.length - 1]?.targetClassName;
  } else if (looksLikeModel) {
    target = "Model";
  } else if (looksLikeCategory) {
    target = "Category";
  } else if (looksLikeTypeDef) {
    target = "PhysicalType";
  } else if (looksLikeParent) {
    target = "Element";
  }
  return {
    type: property?.type ?? (field as any).type,
    isNavigation,
    target,
    isFilterable,
  };
}
