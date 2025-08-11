/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useState } from "react";
import { 
  Button, 
  Flex, 
  IconButton,
  ProgressRadial,
  Text, 
  Tooltip,
  Table as UiTable
} from "@itwin/itwinui-react";
import { SvgClose, SvgRefresh, SvgStatusWarning } from "@itwin/itwinui-icons-react";
import { IModelConnection } from "@itwin/core-frontend";
import { QueryRowFormat } from "@itwin/core-common";
import { schemaDiscoveryQuery } from "../utils/QueryBuilders";
import { useSelection } from "../shared/SelectionContext";

export interface SchemaBrowserProps {
  iModel: IModelConnection;
}

interface SchemaClass {
  className: string;
  schemaLabel: string;
  classLabel: string;
  elementCount: number;
}

export function SchemaBrowser({ iModel }: SchemaBrowserProps) {
  const { selectedClassName, setSelectedClassName } = useSelection();
  const [schemaClasses, setSchemaClasses] = useState<SchemaClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchemaClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = schemaDiscoveryQuery();
      
      const results: SchemaClass[] = [];
      const queryReader = iModel.createQueryReader(query, undefined, { rowFormat: QueryRowFormat.UseECSqlPropertyNames });
      for await (const row of queryReader) {
        results.push({
          className: row.className as string,
          schemaLabel: row.schemaLabel as string,
          classLabel: row.classLabel as string,
          elementCount: row.elementCount as number
        });
      }
      
      setSchemaClasses(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema classes");
    } finally {
      setLoading(false);
    }
  }, [iModel]);

  const handleClassSelect = useCallback((className: string) => {
    if (selectedClassName === className) {
      // Deselect if already selected
      setSelectedClassName(undefined);
    } else {
      setSelectedClassName(className);
    }
  }, [selectedClassName, setSelectedClassName]);

  const clearSelection = useCallback(() => {
    setSelectedClassName(undefined);
  }, [setSelectedClassName]);

  useEffect(() => {
    // Auto-load on mount
    void loadSchemaClasses();
  }, [loadSchemaClasses]);

  const columns = [
    {
      Header: "Schema",
      accessor: "schemaLabel",
      width: 200,
    },
    {
      Header: "Class",
      accessor: "classLabel",
      width: 250,
    },
    {
      Header: "Count",
      accessor: "elementCount",
      width: 80,
      Cell: ({ value }: { value: unknown }) => (
        <Text variant="small" style={{ textAlign: "right", display: "block" }}>
          {(value as number).toLocaleString()}
        </Text>
      ),
    },
    {
      Header: "Actions",
      width: 100,
      Cell: ({ row }: { row: { original: SchemaClass } }) => (
        <Button 
          size="small"
          styleType={selectedClassName === row.original.className ? "high-visibility" : "default"}
          onClick={() => handleClassSelect(row.original.className)}
        >
          {selectedClassName === row.original.className ? "Selected" : "Select"}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "1rem", borderBottom: "1px solid #e1e5e9" }}>
        <Flex alignItems="center" justifyContent="space-between">
          <Text variant="title">Class Browser</Text>
          <Flex gap="sm" alignItems="center">
            <Tooltip content="Refresh schema classes">
              <IconButton
                size="small"
                onClick={() => void loadSchemaClasses()}
                disabled={loading}
              >
                <SvgRefresh />
              </IconButton>
            </Tooltip>
            {selectedClassName && (
              <Tooltip content="Clear class selection">
                <IconButton
                  size="small"
                  styleType="high-visibility"
                  onClick={clearSelection}
                >
                  <SvgClose />
                </IconButton>
              </Tooltip>
            )}
          </Flex>
        </Flex>
        
        {selectedClassName && (
          <div style={{ 
            marginTop: "0.5rem", 
            padding: "0.5rem", 
            backgroundColor: "#e3f2fd", 
            borderRadius: "4px",
            border: "1px solid #bbdefb",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <SvgStatusWarning style={{ width: 18, height: 18 }} />
            <Text variant="small" style={{ fontWeight: 500, color: "#1565c0" }}>
              Filtering by class: {selectedClassName}
            </Text>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "1rem" }}>
        {loading && (
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: "200px",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <ProgressRadial size="large" indeterminate={true} />
            <Text>Loading schema classes...</Text>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: "1rem", 
            backgroundColor: "#ffebee", 
            border: "1px solid #ffcdd2",
            borderRadius: "4px",
            color: "#c62828"
          }}>
            <Text variant="small" style={{ fontWeight: 500 }}>
              Error: {error}
            </Text>
          </div>
        )}

        {!loading && !error && schemaClasses.length === 0 && (
          <div style={{ 
            padding: "2rem", 
            textAlign: "center",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px"
          }}>
            <Text>No schema classes found. Click refresh to try again.</Text>
          </div>
        )}

        {!loading && !error && schemaClasses.length > 0 && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <Text variant="small" style={{ color: "#666" }}>
                Found {schemaClasses.length} class{schemaClasses.length === 1 ? "" : "es"} across different schemas
              </Text>
            </div>
            
            <UiTable
              columns={columns}
              data={schemaClasses as unknown as Record<string, unknown>[]}
              enableVirtualization={true}
              density="extra-condensed"
              styleType="zebra-rows"
              emptyTableContent="No schema classes found"
              style={{ height: "400px" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
