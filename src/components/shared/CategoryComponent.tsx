import {
  EmphasizeElements,
  IModelApp,
} from "@itwin/core-frontend";
import React, { useEffect, useState } from "react";
import { Button, Flex, SearchBox, Tooltip } from "@itwin/itwinui-react";
import { useSelection } from "./SelectionContext";
import { KeySet } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";

interface Category {
  label: string;
  id: string;
}

export function CategoryComponent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { selectedCategoryIds, setSelectedCategoryIds } = useSelection();
  const [searchString, setSearchString] = useState<string>("");
  const [iModel, setIModel] = useState(() => IModelApp.viewManager.selectedView?.iModel);

  // Listen for view changes and update iModel
  useEffect(() => {
    const updateIModel = () => {
      const newIModel = IModelApp.viewManager.selectedView?.iModel;
      setIModel(newIModel);
      if (!newIModel) {
        setCategories([]);
        setSelectedCategoryIds([]);
      }
    };
    
    IModelApp.viewManager.onSelectedViewportChanged.addListener(updateIModel);
    updateIModel();
    
    return () => {
      IModelApp.viewManager.onSelectedViewportChanged.removeListener(updateIModel);
    };
  }, [setSelectedCategoryIds]);

  // Fetch categories when iModel changes
  useEffect(() => {
    const getCategories = async () => {
      if (!iModel) {
        setCategories([]);
        return;
      }

      try {
        const queryReader = iModel.createQueryReader(`
          SELECT ECInstanceId, COALESCE(UserLabel, CodeValue, 'Unnamed Category') as label
          FROM bis.SpatialCategory 
          WHERE ECInstanceId IN (
            SELECT DISTINCT Category.Id 
            FROM bis.GeometricElement3d 
            WHERE Category.Id IS NOT NULL
          )
          ORDER BY label
        `);
        
        const categoryRows = await queryReader.toArray();
        const categoryList = categoryRows.map((row) => ({
          id: row.ECInstanceId || row[0],
          label: row.label || row[1] || `Category ${row.ECInstanceId || row[0]}`,
        }));
        
         // Debug log
        setCategories(categoryList);
      } catch (error) {
        
        // Fallback query if the complex query fails
        try {
          const fallbackQuery = iModel.createQueryReader(`
            SELECT ECInstanceId, COALESCE(UserLabel, CodeValue) 
            FROM bis.SpatialCategory 
            ORDER BY UserLabel, CodeValue
          `);
          
          const fallbackRows = await fallbackQuery.toArray();
          const fallbackCategories = fallbackRows.map((row) => ({
            id: row.ECInstanceId || row[0],
            label: row.UserLabel || row.CodeValue || row[1] || `Category ${row.ECInstanceId || row[0]}`,
          }));
          
           // Debug log
          setCategories(fallbackCategories);
        } catch (fallbackError) {
          
          setCategories([]);
        }
      }
    };

    void getCategories();
  }, [iModel]);

  // Update selection when selectedCategoryIds changes
  useEffect(() => {
    if (!iModel) return;

    const updateSelection = async () => {
      try {
        if (selectedCategoryIds.length > 0) {
          // Clear existing selections first
          iModel.selectionSet.emptyAll();
          
          // Create KeySet for Presentation with the selected categories
          const keySet = new KeySet();
          
          for (const categoryId of selectedCategoryIds) {
            try {
              // Ensure the categoryId is properly formatted as a string
              const formattedCategoryId = String(categoryId);
              
              
              // Add the category itself to the selection for property viewing
              keySet.add({
                className: "BisCore:SpatialCategory",
                id: formattedCategoryId
              });
            } catch (keySetError) {
              
            }
          }
          
          // Update Presentation selection - this will show category properties in the property grid
          await Presentation.selection.replaceSelection("CategoryComponent", iModel, keySet);
          
          // Optionally also select elements within the categories for visualization
          try {
            const elementQuery = `
              SELECT ECInstanceId 
              FROM bis.GeometricElement3d 
              WHERE Category.Id IN (${selectedCategoryIds.map(id => `'${id}'`).join(',')})
              LIMIT 1000
            `;
            
            const queryReader = iModel.createQueryReader(elementQuery);
            const elements = await queryReader.toArray();
            const elementIds = elements.map((row) => row.ECInstanceId || row[0]);
            
            // Update iModel selection for visual highlighting
            if (elementIds.length > 0) {
              iModel.selectionSet.replace(elementIds);
              
              // Emphasize elements in viewport
              const vp = IModelApp.viewManager.selectedView;
              if (vp) {
                const emphasize = EmphasizeElements.getOrCreate(vp);
                emphasize.clearEmphasizedElements(vp);
                emphasize.emphasizeElements(elementIds, vp, undefined, true);
              }
            }
          } catch (elementError) {
            
          }
          
        } else {
          // Clear all selections
          iModel.selectionSet.emptyAll();
          await Presentation.selection.clearSelection("CategoryComponent", iModel);
          
          // Clear emphasis
          const vp = IModelApp.viewManager.selectedView;
          if (vp) {
            const emphasize = EmphasizeElements.getOrCreate(vp);
            emphasize.clearEmphasizedElements(vp);
          }
        }
      } catch (error) {
        console.error("Error updating category selection:", error);
      }
    };

    void updateSelection();
  }, [selectedCategoryIds, iModel]);

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const categoryId = event.target.id;
    const isSelected = selectedCategoryIds.includes(categoryId);
    const newSelectedIds = isSelected
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    setSelectedCategoryIds(newSelectedIds);
  };

  const handleClearAll = () => {
    setSelectedCategoryIds([]);
  };

  const searchTextLower = searchString.toLowerCase();
  const filteredCategories = categories.filter((category) => {
    const categoryLower = category.label.toLowerCase();
    return categoryLower.includes(searchTextLower);
  });

  const categoryElements = filteredCategories.map((category) => (
    <li 
      key={category.id} 
      style={{ 
        listStyle: "none", 
        margin: "0.25rem 0", 
        padding: "0.25rem", 
        display: "flex", 
        alignItems: "center", 
        gap: "0.5rem",
        borderRadius: "4px",
        backgroundColor: selectedCategoryIds.includes(category.id) ? "#f0f8ff" : "transparent"
      }}
    >
      <Tooltip content={`Toggle category: ${category.label}`} placement="bottom">
        <label 
          htmlFor={category.id} 
          style={{ 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem",
            width: "100%"
          }}
        >
          <input
            type="checkbox"
            id={category.id}
            name="category"
            checked={selectedCategoryIds.includes(category.id)}
            onChange={handleCategoryChange}
            style={{ cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.875rem" }}>{category.label}</span>
        </label>
      </Tooltip>
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
          <SearchBox
            style={{ flex: 1 }}
            placeholder="Search Categories"
            value={searchString}
            onChange={searchInputChanged}
          />
          <Button 
            size="small" 
            onClick={handleClearAll} 
            disabled={selectedCategoryIds.length === 0}
          >
            Clear
          </Button>
        </Flex>
        
        {selectedCategoryIds.length > 0 && (
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {selectedCategoryIds.length} category(s) selected
          </div>
        )}
      </Flex>

      {/* Category list */}
      <div style={{ flex: 1, overflow: "auto", padding: "0.25rem" }}>
        {categories.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
            {iModel ? "No categories found" : "No iModel loaded"}
          </div>
        ) : (
          <ul style={{ padding: 0, margin: 0 }}>
            {categoryElements}
          </ul>
        )}
      </div>
    </div>
  );
}
