import { getFieldTypeInfo } from "../utils/FieldTypeInfo";
import { Field } from "@itwin/presentation-common";
import type { TableFilter } from "../shared/SelectionContext";

// Resolve ECProperty name from a Field (for direct properties)
function getEcPropertyName(field?: Field): string | undefined {
  const props = (field as any)?.properties;
  if (Array.isArray(props) && props.length > 0) {
    const ecProp = props[0]?.property;
    if (ecProp?.name && typeof ecProp.name === "string") return ecProp.name;
  }
  const name = (field as any)?.name;
  return typeof name === "string" ? name : undefined;
}

// Determine nav kind from filter/field metadata
function getNavKind(filter: TableFilter): "model" | "category" | "typedefinition" | "parent" | undefined {
  const id = (filter.id || "").toString().toLowerCase();
  const info = filter.field ? getFieldTypeInfo(filter.field) : undefined;
  const target = (info?.target || "").toString().toLowerCase();
  if (id.includes("model") || target.includes("model")) return "model";
  if (id.includes("category") || target.includes("category")) return "category";
  if (id.includes("typedefinition") || target.includes("physicaltype") || target.includes("typedefinition")) return "typedefinition";
  if (id.includes("parent") || target.includes("element")) return "parent";
  return undefined;
}

// Build WHERE clause from tableFilters (simple LIKE filter)
export function buildFilterWhereClause(tableFilters: TableFilter[]): string {
  if (!tableFilters.length) return "";
  return tableFilters
    .map(filter => {
      const escapedValue = filter.value.replace(/'/g, "''");
      const escapedProperty = filter.id.replace(/]/g, "]]"); // escape closing bracket if any
      // Use $-> with bracket quoting. This form will skip elements missing the property.
      return `e.$->[${escapedProperty}] LIKE '%${escapedValue}%'`;
    })
    .join(" AND ");
}

/**
 * Builds an ECSQL query string to select elements based on selected models, categories, and table filters.
 *
 * @param modelIds - Array of selected model ECInstanceIds
 * @param categoryIds - Array of selected category ECInstanceIds
 * @param filters - Array of TableFilter objects (column filters)
 * @param _availFields - Array of available Field objects (not used here)
 * @param selectedClassNames - Optional class names to filter by
 * @returns ECSQL query string or empty string if no selection
 *
 * Example output:
 * SELECT ... FROM bis.GeometricElement3d e JOIN bis.Model m ... WHERE ...
 */
export const elementQuery = (
  modelIds: string[],
  categoryIds: string[],
  filters: TableFilter[],
  _availFields: Field[],
  selectedClassNames?: string[],
  selectedSchemaNames?: string[]
) => {
  // If no models, categories, filters, or class selection, return empty string (no query)
  if (
    modelIds.length === 0 &&
    categoryIds.length === 0 &&
    filters.length === 0 &&
    (!selectedClassNames || selectedClassNames.length === 0) &&
    (!selectedSchemaNames || selectedSchemaNames.length === 0)
  ) {
    return "";
  }

  // Split filters into primitive field filters and navigation property filters
  // If field is missing, treat as primitive string filter
  const fieldPropFilters = filters.filter(f => {
    if (!f.field) return !!f.value;
    const info = getFieldTypeInfo(f.field);
    return info.type === "string" && !info.isNavigation && f.value;
  });
  // Navigation property filters: category, model, typedefinition, parent
  const navPropFilters = filters.filter(f => {
    if (!f.field) return false;
    const info = getFieldTypeInfo(f.field);
    return info.isNavigation && f.value;
  });

  // Main table and alias
  const baseTable = "bis.GeometricElement3d";
  const baseAlias = "e";
  // Always select only the required identifiers; dynamic properties are not projected to avoid parse errors
  const selectFields = [
    "e.ECInstanceId as id",
    "ec_classname(e.ECClassId) as className"
  ];
  // If model nav filter present, add me.UserLabel to SELECT
  if (navPropFilters.some(f => getNavKind(f) === "model")) {
    selectFields.push("me.UserLabel");
  }

  // Only add joins if navPropFilters exist
  const joins: { table: string; alias: string; joinOn: string }[] = [];
  if (navPropFilters.length > 0) {
    const hasModel = navPropFilters.some(f => getNavKind(f) === "model");
    const hasCategory = navPropFilters.some(f => getNavKind(f) === "category");
    if (hasModel) {
      joins.push({ table: "bis.Model", alias: "m", joinOn: "e.Model.Id = m.ECInstanceId" });
      joins.push({ table: "bis.Element", alias: "me", joinOn: "m.ModeledElement.Id = me.ECInstanceId" });
    }
    if (hasCategory) {
      joins.push({ table: "bis.Category", alias: "c", joinOn: "e.Category.Id = c.ECInstanceId" });
    }
    for (const f of navPropFilters) {
      const kind = getNavKind(f);
      if (kind === "typedefinition" && !joins.some(j => j.alias === "t")) {
        joins.push({ table: "bis.PhysicalType", alias: "t", joinOn: "e.TypeDefinition.Id = t.ECInstanceId" });
      }
      if (kind === "parent" && !joins.some(j => j.alias === "p")) {
        joins.push({ table: "bis.Element", alias: "p", joinOn: "e.Parent.Id = p.ECInstanceId" });
      }
    }
  }

  // Build WHERE clause
  const whereClauses: string[] = [];
  
  // Class filters (if specified)
  if (selectedClassNames && selectedClassNames.length > 0) {
    const classExprs = selectedClassNames.map((cn) => {
      const token = cn.includes(":") ? cn : cn.replace(".", ":");
      return `e.ECClassId IS (${token})`;
    });
    whereClauses.push(`(${classExprs.join(" OR ")})`);
  }

  // Schema filters (if specified) - join to ECDbMeta to filter by schema name
  const needsSchemaJoin = !!(selectedSchemaNames && selectedSchemaNames.length > 0);
  const schemaNamesEscaped = (selectedSchemaNames || []).map((s) => s.replace(/'/g, "''"));
  
  // Primitive field filters (string properties) - use $-> with bracket syntax
  for (const f of fieldPropFilters) {
    const propName = getEcPropertyName(f.field) ?? f.id;
    if (!propName) continue;
    const val = f.value.replace(/'/g, "''");
    const dynProp = propName.replace(/]/g, "]]");
    whereClauses.push(`e.$->[${dynProp}] LIKE '%${val}%'`);
  }
  // Category id filter
  if (categoryIds.length > 0) {
    whereClauses.push(`e.Category.Id IN (${categoryIds.join(",")})`);
  }
  // Model id filter
  if (modelIds.length > 0) {
    whereClauses.push(`e.Model.Id IN (${modelIds.join(",")})`);
  }
  // Navigation property filters (if any)
  if (navPropFilters.length > 0) {
    for (const f of navPropFilters) {
      const kind = getNavKind(f);
      const val = f.value.replace(/'/g, "''");
      if (kind === "category") {
        whereClauses.push(`(c.UserLabel LIKE '%${val}%' OR c.CodeValue LIKE '%${val}%')`);
      } else if (kind === "model") {
        whereClauses.push(`(me.UserLabel LIKE '%${val}%' OR me.CodeValue LIKE '%${val}%')`);
      } else if (kind === "typedefinition") {
        whereClauses.push(`t.UserLabel LIKE '%${val}%'`);
      } else if (kind === "parent") {
        whereClauses.push(`p.UserLabel LIKE '%${val}%'`);
      }
    }
  }

  // Build query string
  let query = `SELECT ${selectFields.join(", ")} FROM ${baseTable} ${baseAlias}`;
  if (needsSchemaJoin) {
    // Join to ECDbMeta to allow filtering by schema name
    query += ` JOIN ECDbMeta.ECClassDef _c ON _c.ECInstanceId = e.ECClassId JOIN ECDbMeta.ECSchemaDef _s ON _s.ECInstanceId = _c.Schema.Id`;
  }
  for (const join of joins) {
    query += ` JOIN ${join.table} ${join.alias} ON ${join.joinOn}`;
  }
  if (needsSchemaJoin && schemaNamesEscaped.length > 0) {
    whereClauses.push(`_s.Name IN ('${schemaNamesEscaped.join("','")}')`);
  }
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(" AND ")}`;
  }
  return query;
};

// Produce a COUNT(*) variant of the element query for total size determination
export const elementCountQuery = (
  modelIds: string[],
  categoryIds: string[],
  filters: TableFilter[],
  availFields: Field[],
  selectedClassNames?: string[],
  selectedSchemaNames?: string[]
) => {
  const base = elementQuery(
    modelIds,
    categoryIds,
    filters,
    availFields,
    selectedClassNames,
    selectedSchemaNames
  );
  if (!base) return "";
  // Replace the SELECT list with COUNT(*)
  const upper = base.toUpperCase();
  const fromIdx = upper.indexOf(" FROM ");
  if (fromIdx === -1) return ""; // safety
  return `SELECT COUNT(*) as total${base.substring(fromIdx)}`;
};

/**
 * Query to discover all element classes and their schemas in the iModel
 * This gives you a high-level view of what types of elements exist
 */
export const schemaDiscoveryQuery = () => {
  return `
    SELECT
      ec_classname(c.ECInstanceId) className,
  s.Name schemaName,
      COALESCE(s.DisplayLabel, s.Name) schemaLabel,
      COALESCE(c.DisplayLabel, c.Name) classLabel,
      COUNT(*) elementCount
    FROM
      bis.GeometricElement3d ge
      JOIN ECDbMeta.ClassHasAllBaseClasses abc ON abc.SourceECInstanceId = ge.ECClassId
      JOIN ECDbMeta.ECClassDef c ON c.ECInstanceId = abc.TargetECInstanceId
      JOIN ECDbMeta.ECSchemaDef s ON s.ECInstanceId = c.Schema.Id
    WHERE
      s.Name != 'BisCore'
    GROUP BY
      c.ECInstanceId, s.ECInstanceId
    ORDER BY
      schemaLabel, classLabel
  `;
};

/**
 * Query elements by specific class name
 * Use this after discovering classes with schemaDiscoveryQuery
 */
export const elementsByClassQuery = (className: string) => {
  const classToken = className.includes(":") ? className : className.replace(".", ":");
  return `
    SELECT 
      e.ECInstanceId as id,
      ec_classname(e.ECClassId) as className,
  e.UserLabel,
  e.CodeValue
    FROM bis.GeometricElement3d e 
    WHERE e.ECClassId IS (${classToken})
  `;
};

export interface QueryContext {
  modelIds: string[];
  categoryIds: string[];
  filters: TableFilter[];
  selectedSchemaNames?: string[];
  selectedClassNames?: string[];
}

/**
 * Enhanced element query that can filter by schema/class
 */
export const enhancedElementQuery = (context: QueryContext, availFields: Field[]) => {
  const { modelIds, categoryIds, filters, selectedClassNames, selectedSchemaNames } = context;
  
  // The elementQuery function already handles selectedClassName, so just call it directly
  return elementQuery(modelIds, categoryIds, filters, availFields, selectedClassNames, selectedSchemaNames);
};
