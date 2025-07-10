/* eslint-disable @typescript-eslint/no-deprecated */
import { IModelApp } from "@itwin/core-frontend";
import React, { useEffect, useState } from "react";
import { Button, Flex, Input } from "@itwin/itwinui-react";
import { KeySet } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";

interface Model {
  label: string;
  id: string;
}

interface ModelComponentProps {
  onSelectionChange?: (elementIds: string[]) => void;
}

export function ModelComponent({ onSelectionChange }: ModelComponentProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [searchString, setSearchString] = useState<string>("");
  const [iModel, setIModel] = useState(() => IModelApp.viewManager.selectedView?.iModel);

  // Listen for view changes and update iModel
  useEffect(() => {
    const updateIModel = () => {
      const newIModel = IModelApp.viewManager.selectedView?.iModel;
      setIModel(newIModel);
      if (!newIModel) {
        setModels([]);
        setSelectedModelIds([]);
      }
    };
    
    IModelApp.viewManager.onSelectedViewportChanged.addListener(updateIModel);
    updateIModel();
    
    return () => {
      IModelApp.viewManager.onSelectedViewportChanged.removeListener(updateIModel);
    };
  }, []);

  // Fetch models when iModel changes
  useEffect(() => {
    const getModels = async () => {
      if (!iModel) {
        setModels([]);
        return;
      }

      try {
        const queryReader = iModel.createQueryReader(`
          SELECT m.ECInstanceId as modelId, COALESCE(p.UserLabel, p.CodeValue, 'Unnamed Model') as label
          FROM bis.PhysicalModel m 
          JOIN bis.PhysicalPartition p ON p.ECInstanceId = m.ModeledElement.Id 
          WHERE m.ECInstanceId IN (
            SELECT DISTINCT Model.Id 
            FROM bis.GeometricElement3d 
            WHERE Model.Id IS NOT NULL
          )
          ORDER BY label
        `);
        
        const modelRows = await queryReader.toArray();
        const modelList = modelRows.map((row) => ({
          id: row.modelId || row[0], // Use column index as fallback
          label: row.label || row[1] || `Model ${row.modelId || row[0]}`,
        }));
        
        setModels(modelList);
      } catch {
        // Fallback query if the complex query fails
        try {
          const fallbackQuery = iModel.createQueryReader(`
            SELECT ECInstanceId, CodeValue 
            FROM bis.PhysicalModel 
            ORDER BY CodeValue
          `);
          
          const fallbackRows = await fallbackQuery.toArray();
          const fallbackModels = fallbackRows.map((row) => ({
            id: row.ECInstanceId || row[0],
            label: row.CodeValue || row[1] || `Model ${row.ECInstanceId || row[0]}`,
          }));
          
          setModels(fallbackModels);
        } catch {
          setModels([]);
        }
      }
    };

    void getModels();
  }, [iModel]);

  // Update selection when selectedModelIds changes
  useEffect(() => {
    if (!iModel) return;

    const updateSelection = async () => {
      try {
        if (selectedModelIds.length > 0) {
          // Clear existing selections first
          iModel.selectionSet.emptyAll();
          
          // Create KeySet for Presentation with the selected models
          const keySet = new KeySet();
          
          for (const modelId of selectedModelIds) {
            try {
              // Ensure the modelId is properly formatted as a string
              const formattedModelId = String(modelId);
              
              // Add the model itself to the selection for property viewing
              keySet.add({
                className: "BisCore:PhysicalModel",
                id: formattedModelId
              });
            } catch {
              // Handle keySet errors silently
            }
          }
          
          // Update Presentation selection - this will show model properties in the property grid
          Presentation.selection.replaceSelection("ModelComponent", iModel, keySet);
          
          // Optionally also select elements within the models for visualization
          try {
            const elementQuery = `
              SELECT ECInstanceId 
              FROM bis.GeometricElement3d 
              WHERE Model.Id IN (${selectedModelIds.map(id => `'${id}'`).join(',')})
              LIMIT 1000
            `;
            
            const queryReader = iModel.createQueryReader(elementQuery);
            const elements = await queryReader.toArray();
            const elementIds = elements.map((row) => row.ECInstanceId || row[0]);
            
            // Update iModel selection for visual highlighting
            if (elementIds.length > 0) {
              iModel.selectionSet.replace(elementIds);
            }
            
            // Notify parent component
            onSelectionChange?.(elementIds);
          } catch {
            onSelectionChange?.(selectedModelIds);
          }
          
        } else {
          // Clear all selections
          iModel.selectionSet.emptyAll();
          Presentation.selection.clearSelection("ModelComponent", iModel);
          onSelectionChange?.([]);
        }
      } catch {
        // Handle selection errors silently
      }
    };

    void updateSelection();
  }, [selectedModelIds, iModel, onSelectionChange]);

  const handleModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const modelId = event.target.id;
    const isSelected = selectedModelIds.includes(modelId);
    const newSelectedIds = isSelected
      ? selectedModelIds.filter((id) => id !== modelId)
      : [...selectedModelIds, modelId];
    setSelectedModelIds(newSelectedIds);
  };

  const handleClearAll = () => {
    setSelectedModelIds([]);
  };

  const searchTextLower = searchString.toLowerCase();
  const filteredModels = models.filter((model) => {
    const modelLower = model.label.toLowerCase();
    return modelLower.includes(searchTextLower);
  });

  const modelElements = filteredModels.map((model) => (
    <li 
      key={model.id} 
      style={{ 
        listStyle: "none", 
        margin: "0.25rem 0", 
        padding: "0.25rem", 
        display: "flex", 
        alignItems: "center", 
        gap: "0.5rem",
        borderRadius: "4px",
        backgroundColor: selectedModelIds.includes(model.id) ? "#f0f8ff" : "transparent"
      }}
    >
      <label 
        htmlFor={model.id} 
        style={{ 
          cursor: "pointer", 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem",
          width: "100%"
        }}
        title={`Toggle model: ${model.label}`}
      >
        <input
          type="checkbox"
          id={model.id}
          name="model"
          checked={selectedModelIds.includes(model.id)}
          onChange={handleModelChange}
          style={{ cursor: "pointer" }}
        />
        <span style={{ fontSize: "0.875rem" }}>{model.label}</span>
      </label>
    </li>
  ));

  const searchInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search and controls */}
      <Flex 
        style={{ 
          position: "sticky",
          top: 0,
          width: "100%", 
          padding: "0.5rem", 
          zIndex: 1, 
          background: "white",
          borderBottom: "1px solid #e0e0e0"
        }}
        flexDirection="column"
        gap="xs"
      >
        <Flex gap="xs" alignItems="center">
          <Input
            style={{ flex: 1 }}
            placeholder="Search Models"
            value={searchString}
            onChange={searchInputChanged}
          />
          <Button 
            size="small" 
            onClick={handleClearAll} 
            disabled={selectedModelIds.length === 0}
          >
            Clear
          </Button>
        </Flex>
        
        {selectedModelIds.length > 0 && (
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {selectedModelIds.length} model(s) selected
          </div>
        )}
      </Flex>

      {/* Model list */}
      <div style={{ flex: 1, overflow: "auto", padding: "0.25rem" }}>
        {models.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
            {iModel ? "No models found" : "No iModel loaded"}
          </div>
        ) : (
          <ul style={{ padding: 0, margin: 0 }}>
            {modelElements}
          </ul>
        )}
      </div>
    </div>
  );
}
